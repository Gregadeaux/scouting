/**
 * The Blue Alliance API Service
 *
 * Implements communication with The Blue Alliance v3 API
 * with rate limiting, retry logic, and error handling.
 *
 * Rate Limits: 100 requests per 60 seconds
 * API Documentation: https://www.thebluealliance.com/apidocs/v3
 */

import {
  TBAEvent,
  TBATeam,
  TBAMatch,
  TBAEventRankings,
  TBAApiError,
  TBARateLimitError,
  isTBAEvent,
  isTBATeam,
  isTBAMatch,
  type TBAErrorResponse,
} from '@/types/tba';

/**
 * Interface for TBA API Service
 * Follows Interface Segregation Principle (ISP)
 */
export interface ITBAApiService {
  // Event operations
  getEvent(eventKey: string): Promise<TBAEvent>;
  getEventTeams(eventKey: string): Promise<TBATeam[]>;
  getEventMatches(eventKey: string): Promise<TBAMatch[]>;
  getEventRankings(eventKey: string): Promise<TBAEventRankings | null>;

  // Team operations
  getTeam(teamKey: string): Promise<TBATeam>;

  // Health check
  isHealthy(): Promise<boolean>;
}

/**
 * Configuration options for TBA API Service
 */
export interface TBAApiConfig {
  apiKey?: string;
  baseUrl?: string;
  maxRequestsPerMinute?: number;
  requestTimeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  enableLogging?: boolean;
}

/**
/**
 * TBA API Service Implementation
 *
 * Features:
 * - Rate limiting (100 requests per 60 seconds)
 * - Automatic retry with exponential backoff
 * - Request queuing
 * - Comprehensive error handling
 */
export class TBAApiService implements ITBAApiService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly maxRequestsPerMinute: number;
  private readonly requestTimeoutMs: number;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly enableLogging: boolean;

  // Rate limiting
  private requestTimestamps: number[] = [];
  private requestQueue: Array<() => Promise<unknown>> = [];
  private isProcessingQueue = false;

  constructor(config?: TBAApiConfig) {
    // Configuration with defaults
    this.apiKey = config?.apiKey || process.env.TBA_API_KEY || '';
    this.baseUrl = config?.baseUrl || 'https://www.thebluealliance.com/api/v3';
    this.maxRequestsPerMinute = config?.maxRequestsPerMinute || 100;
    this.requestTimeoutMs = config?.requestTimeoutMs || 30000; // 30 seconds
    this.maxRetries = config?.maxRetries || 3;
    this.retryDelayMs = config?.retryDelayMs || 1000; // Start with 1 second
    this.enableLogging = config?.enableLogging || process.env.NODE_ENV === 'development';

    // Validate API key
    if (!this.apiKey) {
      throw new TBAApiError(
        'TBA_API_KEY is not configured. Get your key from https://www.thebluealliance.com/account'
      );
    }

    this.log('TBA API Service initialized', { baseUrl: this.baseUrl });
  }

  /**
   * Check if the API service is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Use the status endpoint which doesn't count against rate limits
      const response = await this.makeRequest('/status', { skipRateLimit: true });
      return response.ok;
    } catch (error) {
      this.log('Health check failed', error);
      return false;
    }
  }

  /**
   * Get event details
   */
  async getEvent(eventKey: string): Promise<TBAEvent> {
    this.validateEventKey(eventKey);
    const data = await this.fetch<TBAEvent>(`/event/${eventKey}`);

    if (!isTBAEvent(data)) {
      throw new TBAApiError('Invalid event data received from TBA', 500, `/event/${eventKey}`);
    }

    return data;
  }

  /**
   * Get teams attending an event
   */
  async getEventTeams(eventKey: string): Promise<TBATeam[]> {
    this.validateEventKey(eventKey);
    const data = await this.fetch<TBATeam[]>(`/event/${eventKey}/teams`);

    if (!Array.isArray(data)) {
      throw new TBAApiError('Invalid teams data received from TBA', 500, `/event/${eventKey}/teams`);
    }

    // Validate each team
    data.forEach((team, index) => {
      if (!isTBATeam(team)) {
        throw new TBAApiError(
          `Invalid team data at index ${index}`,
          500,
          `/event/${eventKey}/teams`
        );
      }
    });

    return data;
  }

  /**
   * Get matches for an event
   */
  async getEventMatches(eventKey: string): Promise<TBAMatch[]> {
    this.validateEventKey(eventKey);
    const data = await this.fetch<TBAMatch[]>(`/event/${eventKey}/matches`);

    if (!Array.isArray(data)) {
      throw new TBAApiError('Invalid matches data received from TBA', 500, `/event/${eventKey}/matches`);
    }

    // Validate and sort matches
    const validatedMatches = data.map((match, index) => {
      if (!isTBAMatch(match)) {
        throw new TBAApiError(
          `Invalid match data at index ${index}`,
          500,
          `/event/${eventKey}/matches`
        );
      }
      return match;
    });

    // Sort matches by comp level and match number
    return this.sortMatches(validatedMatches);
  }

  /**
   * Get rankings for an event
   */
  async getEventRankings(eventKey: string): Promise<TBAEventRankings | null> {
    this.validateEventKey(eventKey);

    try {
      const data = await this.fetch<TBAEventRankings>(`/event/${eventKey}/rankings`);
      return data;
    } catch (error) {
      // Rankings might not be available yet for an event
      if (error instanceof TBAApiError && error.statusCode === 404) {
        this.log('Rankings not available for event', { eventKey });
        return null;
      }
      throw error;
    }
  }

  /**
   * Get team details
   */
  async getTeam(teamKey: string): Promise<TBATeam> {
    this.validateTeamKey(teamKey);
    const data = await this.fetch<TBATeam>(`/team/${teamKey}`);

    if (!isTBATeam(data)) {
      throw new TBAApiError('Invalid team data received from TBA', 500, `/team/${teamKey}`);
    }

    return data;
  }

  /**
   * Generic fetch method with rate limiting and retry logic
   */
  private async fetch<T>(endpoint: string): Promise<T> {
    return this.withRateLimit(() => this.fetchWithRetry<T>(endpoint));
  }

  /**
   * Fetch with automatic retry on failure
   */
  private async fetchWithRetry<T>(endpoint: string, attempt = 1): Promise<T> {
    try {
      const response = await this.makeRequest(endpoint);

      if (!response.ok) {
        await this.handleErrorResponse(response, endpoint, attempt);
      }

      const data = await response.json();
      return data as T;

    } catch (error) {
      // Handle network errors and timeouts
      if (attempt <= this.maxRetries) {
        const delay = this.calculateRetryDelay(attempt);
        this.log(`Retry attempt ${attempt}/${this.maxRetries} after ${delay}ms`, { endpoint });

        await this.sleep(delay);
        return this.fetchWithRetry<T>(endpoint, attempt + 1);
      }

      // Max retries exceeded
      if (error instanceof TBAApiError) {
        throw error;
      }

      throw new TBAApiError(
        `Failed to fetch after ${this.maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        endpoint
      );
    }
  }

  /**
   * Make an HTTP request to TBA API
   */
  private async makeRequest(endpoint: string, options?: { skipRateLimit?: boolean }): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-TBA-Auth-Key': this.apiKey,
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Log request
      if (!options?.skipRateLimit) {
        this.requestTimestamps.push(Date.now());
      }

      this.log('API request completed', {
        endpoint,
        status: response.status,
        ok: response.ok
      });

      return response;

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new TBAApiError(`Request timeout after ${this.requestTimeoutMs}ms`, 408, endpoint);
      }

      throw error;
    }
  }

  /**
   * Handle error responses from TBA API
   */
  private async handleErrorResponse(response: Response, endpoint: string, attempt: number): Promise<never> {
    const statusCode = response.status;

    // Try to parse error message from response
    let errorMessage = `HTTP ${statusCode}`;
    try {
      const errorData: TBAErrorResponse = await response.json();
      errorMessage = errorData.Error || errorData.error || errorData.message || errorMessage;
    } catch {
      // If we can't parse JSON, use status text
      errorMessage = response.statusText || errorMessage;
    }

    // Handle specific error codes
    switch (statusCode) {
      case 401:
        throw new TBAApiError('Invalid API key', 401, endpoint);

      case 404:
        throw new TBAApiError(`Resource not found: ${endpoint}`, 404, endpoint);

      case 429:
        // Rate limit exceeded
        const retryAfter = response.headers.get('Retry-After');
        throw new TBARateLimitError(
          retryAfter ? parseInt(retryAfter, 10) : undefined,
          endpoint
        );

      case 500:
      case 502:
      case 503:
      case 504:
        // Server errors - retry if we haven't exceeded max attempts
        if (attempt <= this.maxRetries) {
          const delay = this.calculateRetryDelay(attempt);
          this.log(`Server error ${statusCode}, retrying in ${delay}ms`, { endpoint, attempt });
          await this.sleep(delay);
          throw new Error('Retry'); // This will be caught by fetchWithRetry
        }
        throw new TBAApiError(`Server error: ${errorMessage}`, statusCode, endpoint);

      default:
        throw new TBAApiError(errorMessage, statusCode, endpoint);
    }
  }

  /**
   * Rate limiting implementation
   */
  private async withRateLimit<T>(fn: () => Promise<T>): Promise<T> {
    // Clean up old timestamps (older than 60 seconds)
    const oneMinuteAgo = Date.now() - 60000;
    this.requestTimestamps = this.requestTimestamps.filter(ts => ts > oneMinuteAgo);

    // Check if we're at the rate limit
    if (this.requestTimestamps.length >= this.maxRequestsPerMinute) {
      // Calculate how long to wait
      const oldestTimestamp = this.requestTimestamps[0];
      const waitTime = Math.max(0, (oldestTimestamp + 60000) - Date.now() + 100); // Add 100ms buffer

      this.log(`Rate limit reached, waiting ${waitTime}ms`);
      await this.sleep(waitTime);

      // Recursive call to ensure we're under the limit
      return this.withRateLimit(fn);
    }

    // Execute the function
    return fn();
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s, etc.
    const baseDelay = this.retryDelayMs * Math.pow(2, attempt - 1);
    // Add jitter (random 0-500ms) to avoid thundering herd
    const jitter = Math.random() * 500;
    return Math.min(baseDelay + jitter, 30000); // Cap at 30 seconds
  }

  /**
   * Sort matches by competition level and match number
   */
  private sortMatches(matches: TBAMatch[]): TBAMatch[] {
    const compLevelOrder: Record<string, number> = {
      qm: 1, // Qualification
      ef: 2, // Eighth-final
      qf: 3, // Quarter-final
      sf: 4, // Semi-final
      f: 5,  // Final
    };

    return matches.sort((a, b) => {
      // First sort by comp level
      const levelDiff = (compLevelOrder[a.comp_level] || 99) - (compLevelOrder[b.comp_level] || 99);
      if (levelDiff !== 0) return levelDiff;

      // Then by set number
      if (a.set_number !== b.set_number) {
        return (a.set_number || 0) - (b.set_number || 0);
      }

      // Finally by match number
      return a.match_number - b.match_number;
    });
  }

  /**
   * Validate event key format
   */
  private validateEventKey(eventKey: string): void {
    // Event key format: YYYY{EVENT_CODE} (e.g., "2025txaus")
    const eventKeyRegex = /^\d{4}[a-z0-9]+$/;
    if (!eventKeyRegex.test(eventKey)) {
      throw new TBAApiError(`Invalid event key format: ${eventKey}`);
    }
  }

  /**
   * Validate team key format
   */
  private validateTeamKey(teamKey: string): void {
    // Team key format: frc{NUMBER} (e.g., "frc930")
    const teamKeyRegex = /^frc\d+$/;
    if (!teamKeyRegex.test(teamKey)) {
      throw new TBAApiError(`Invalid team key format: ${teamKey}`);
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Logging utility
   */
  private log(message: string, data?: unknown): void {
    if (this.enableLogging) {
      console.log(`[TBAApiService] ${message}`, data || '');
    }
  }
}

/**
 * Factory function to create TBA API Service instance
 * Supports dependency injection pattern
 */
export function createTBAApiService(config?: TBAApiConfig): ITBAApiService {
  return new TBAApiService(config);
}

/**
 * Default singleton instance (can be overridden for testing)
 */
let defaultInstance: ITBAApiService | null = null;

export function getTBAApiService(config?: TBAApiConfig): ITBAApiService {
  if (!defaultInstance) {
    defaultInstance = createTBAApiService(config);
  }
  return defaultInstance;
}

/**
 * Reset the default instance (useful for testing)
 */
export function resetTBAApiService(): void {
  defaultInstance = null;
}