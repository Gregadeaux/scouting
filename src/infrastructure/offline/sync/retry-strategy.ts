/**
 * Retry Strategy with Exponential Backoff
 * Handles retry logic for failed sync operations
 */

/**
 * Retry strategy configuration
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterMs: number;
}

/**
 * Retry attempt information
 */
export interface RetryAttempt {
  attemptNumber: number;
  delayMs: number;
  totalElapsedMs: number;
  shouldRetry: boolean;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,
  initialDelayMs: 1000, // 1 second
  maxDelayMs: 60000, // 1 minute
  backoffMultiplier: 2,
  jitterMs: 500
};

/**
 * Implements exponential backoff retry strategy
 */
export class RetryStrategy {
  private readonly config: RetryConfig;

  constructor(config?: Partial<RetryConfig>) {
    this.config = {
      ...DEFAULT_RETRY_CONFIG,
      ...config
    };
  }

  /**
   * Calculates delay for next retry attempt
   */
  calculateDelay(attemptNumber: number): number {
    if (attemptNumber <= 0) {
      return 0;
    }

    // Exponential backoff: delay = initialDelay * (multiplier ^ attemptNumber)
    const exponentialDelay = this.config.initialDelayMs *
      Math.pow(this.config.backoffMultiplier, attemptNumber - 1);

    // Cap at max delay
    const cappedDelay = Math.min(exponentialDelay, this.config.maxDelayMs);

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * this.config.jitterMs;

    return Math.floor(cappedDelay + jitter);
  }

  /**
   * Determines if should retry based on attempt number
   */
  shouldRetry(attemptNumber: number): boolean {
    return attemptNumber < this.config.maxRetries;
  }

  /**
   * Gets retry attempt information
   */
  getRetryAttempt(currentAttempt: number, startTime: number): RetryAttempt {
    const delayMs = this.calculateDelay(currentAttempt);
    const totalElapsedMs = Date.now() - startTime;
    const shouldRetry = this.shouldRetry(currentAttempt);

    return {
      attemptNumber: currentAttempt,
      delayMs,
      totalElapsedMs,
      shouldRetry
    };
  }

  /**
   * Executes function with retry logic
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    onRetry?: (attempt: RetryAttempt) => void
  ): Promise<T> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        // Execute function
        const result = await fn();
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if should retry
        const retryInfo = this.getRetryAttempt(attempt + 1, startTime);

        if (!retryInfo.shouldRetry) {
          // No more retries, throw error
          throw lastError;
        }

        // Notify retry callback
        if (onRetry) {
          onRetry(retryInfo);
        }

        // Wait before next retry
        await this.delay(retryInfo.delayMs);
      }
    }

    // Should not reach here, but throw last error if it does
    throw lastError || new Error('Retry failed with unknown error');
  }

  /**
   * Delays execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Gets configuration
   */
  getConfig(): RetryConfig {
    return { ...this.config };
  }

  /**
   * Updates configuration
   */
  updateConfig(config: Partial<RetryConfig>): void {
    Object.assign(this.config, config);
  }
}

/**
 * Creates retry strategy with default config
 */
export function createRetryStrategy(config?: Partial<RetryConfig>): RetryStrategy {
  return new RetryStrategy(config);
}

/**
 * Determines if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const errorName = error.name.toLowerCase();
    const errorMessage = error.message.toLowerCase();

    // Network errors are retryable
    if (
      errorName.includes('network') ||
      errorName.includes('timeout') ||
      errorMessage.includes('network') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('fetch')
    ) {
      return true;
    }

    // HTTP status codes
    if ('status' in error && typeof (error as any).status === 'number') {
      const status = (error as any).status;
      // Retry on 5xx server errors and 429 rate limit
      return status >= 500 || status === 429;
    }
  }

  return false;
}

/**
 * Determines if should abort retry
 */
export function shouldAbortRetry(error: unknown): boolean {
  if (error instanceof Error) {
    // Check for client errors that shouldn't be retried
    if ('status' in error && typeof (error as any).status === 'number') {
      const status = (error as any).status;
      // Don't retry 4xx client errors (except 429 rate limit)
      if (status >= 400 && status < 500 && status !== 429) {
        return true;
      }
    }

    // Check for specific error messages
    const errorMessage = error.message.toLowerCase();
    if (
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('forbidden') ||
      errorMessage.includes('not found') ||
      errorMessage.includes('bad request')
    ) {
      return true;
    }
  }

  return false;
}