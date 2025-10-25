/**
 * Type definitions for The Blue Alliance API responses
 * API Documentation: https://www.thebluealliance.com/apidocs/v3
 */

// TBA Event response
export interface TBAEvent {
  key: string; // e.g., "2025txaus"
  name: string; // e.g., "FRC Greater Austin District Event"
  event_code: string; // e.g., "txaus"
  event_type: number; // 0=Regional, 1=District, 2=District Championship, etc.
  event_type_string: string; // Human-readable event type
  district?: {
    abbreviation: string; // e.g., "tx"
    display_name: string; // e.g., "FIRST In Texas"
    key: string; // e.g., "2025tx"
    year: number;
  };
  city: string;
  state_prov: string;
  country: string;
  start_date: string; // YYYY-MM-DD format
  end_date: string; // YYYY-MM-DD format
  year: number;
  short_name?: string; // Shorter version of event name
  week?: number; // Competition week (0-8, null for offseason)
  address?: string; // Venue address
  postal_code?: string;
  location_name?: string; // Venue name
  website?: string; // Event website
  first_event_id?: string; // Official FIRST event ID
  first_event_code?: string; // Official FIRST event code
  webcasts?: Array<{
    type: string; // e.g., "twitch", "youtube"
    channel: string;
    date?: string;
    file?: string;
  }>;
  division_keys?: string[]; // For championship divisions
  parent_event_key?: string; // For divisions of championships
  playoff_type?: number; // Playoff bracket type
  playoff_type_string?: string;
}

// TBA Team response
export interface TBATeam {
  key: string; // e.g., "frc930"
  team_number: number; // e.g., 930
  nickname: string; // e.g., "Mukwonago BEARs"
  name: string; // Full team name/sponsors
  school_name?: string;
  city: string;
  state_prov: string;
  country: string;
  address?: string;
  postal_code?: string;
  gmaps_place_id?: string; // Google Maps place ID
  gmaps_url?: string; // Google Maps URL
  lat?: number; // Latitude
  lng?: number; // Longitude
  location_name?: string;
  website?: string;
  rookie_year: number;
  motto?: string;
  home_championship?: {
    [year: string]: string; // Championship event key by year
  };
}

// TBA Match response
export interface TBAMatch {
  key: string; // e.g., "2025txaus_qm1"
  comp_level: 'qm' | 'ef' | 'qf' | 'sf' | 'f'; // Qualification, Elimination (Eighth), Quarter, Semi, Final
  set_number: number; // Which set of matches (1 for quals, varies for playoffs)
  match_number: number; // Match number within the set
  event_key: string; // Event this match belongs to

  // Alliance data
  alliances: {
    red: TBAAlliance;
    blue: TBAAlliance;
  };

  // Timing information
  time?: number; // Unix timestamp of scheduled time
  actual_time?: number; // Unix timestamp of actual match start
  predicted_time?: number; // Unix timestamp of TBA's predicted time
  post_result_time?: number; // Unix timestamp when results were posted

  // Score breakdown (game-specific, optional)
  score_breakdown?: Record<string, unknown>; // This varies by year/game

  // Video information
  videos?: Array<{
    type: string; // e.g., "youtube", "tba"
    key: string; // Video ID
  }>;
}

// Alliance information in a match
export interface TBAAlliance {
  score: number; // Alliance score (-1 if not played yet)
  team_keys: string[]; // Array of team keys, e.g., ["frc930", "frc148", "frc1477"]
  surrogate_team_keys?: string[]; // Teams playing as surrogates
  dq_team_keys?: string[]; // Disqualified teams
}

// TBA Rankings response
export interface TBARanking {
  team_key: string;
  rank: number;

  // Common ranking values (varies by year)
  sort_orders?: number[]; // Values used for ranking tiebreakers
  record?: {
    wins: number;
    losses: number;
    ties: number;
  };
  qual_average?: number; // Average qualification score
  matches_played?: number;

  // Extra stats (varies by year)
  extra_stats?: number[];
}

// TBA Event Rankings response
export interface TBAEventRankings {
  rankings: TBARanking[];

  // Headers describing what each value means
  sort_order_info?: Array<{
    name: string;
    precision: number;
  }>;

  extra_stats_info?: Array<{
    name: string;
    precision: number;
  }>;
}

// TBA Match Result (simple version for event matches)
export interface TBAMatchSimple {
  key: string;
  comp_level: string;
  set_number: number;
  match_number: number;
  alliances: {
    red: {
      score: number;
      team_keys: string[];
    };
    blue: {
      score: number;
      team_keys: string[];
    };
  };
  winning_alliance?: 'red' | 'blue' | ''; // Empty string for ties
  time?: number;
  actual_time?: number;
  predicted_time?: number;
}

// TBA API Error response
export interface TBAErrorResponse {
  Error: string;
  error?: string;
  message?: string;
}

// Custom Error class for TBA API errors
export class TBAApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public endpoint?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'TBAApiError';

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TBAApiError);
    }
  }

  toString(): string {
    let result = `${this.name}: ${this.message}`;
    if (this.statusCode) result += ` (HTTP ${this.statusCode})`;
    if (this.endpoint) result += ` at ${this.endpoint}`;
    return result;
  }
}

// Rate limit error
export class TBARateLimitError extends TBAApiError {
  constructor(
    public retryAfter?: number, // Seconds to wait before retry
    endpoint?: string
  ) {
    const message = retryAfter
      ? `Rate limit exceeded. Retry after ${retryAfter} seconds.`
      : 'Rate limit exceeded.';
    super(message, 429, endpoint);
    this.name = 'TBARateLimitError';
  }
}

// Type guards
export function isTBAEvent(data: unknown): data is TBAEvent {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as TBAEvent).key === 'string' &&
    typeof (data as TBAEvent).name === 'string' &&
    typeof (data as TBAEvent).event_code === 'string' &&
    typeof (data as TBAEvent).year === 'number'
  );
}

export function isTBATeam(data: unknown): data is TBATeam {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as TBATeam).key === 'string' &&
    typeof (data as TBATeam).team_number === 'number' &&
    typeof (data as TBATeam).nickname === 'string'
  );
}

export function isTBAMatch(data: unknown): data is TBAMatch {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as TBAMatch).key === 'string' &&
    typeof (data as TBAMatch).comp_level === 'string' &&
    typeof (data as TBAMatch).match_number === 'number' &&
    !!(data as TBAMatch).alliances &&
    !!(data as TBAMatch).alliances.red &&
    !!(data as TBAMatch).alliances.blue
  );
}