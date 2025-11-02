/**
 * Supabase Mocks
 *
 * Type-safe mocks for Supabase client and methods.
 * Use these mocks in tests to avoid needing a real database connection.
 */

import { vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Mock query builder chain
 * Supports chaining methods like .from().select().eq()
 */
export class MockQueryBuilder {
  private mockData: unknown = null;
  private mockError: Error | null = null;
  private mockCount: number | null = null;
  private isSingle = false;

  constructor(data?: unknown, error?: Error | null, count?: number | null) {
    this.mockData = data;
    this.mockError = error ?? null;
    this.mockCount = count ?? null;
  }

  // Query methods that return this for chaining
  select(columns?: string) {
    return this;
  }

  insert(data: unknown) {
    return this;
  }

  update(data: unknown) {
    return this;
  }

  upsert(data: unknown) {
    return this;
  }

  delete() {
    return this;
  }

  eq(column: string, value: unknown) {
    return this;
  }

  neq(column: string, value: unknown) {
    return this;
  }

  gt(column: string, value: unknown) {
    return this;
  }

  gte(column: string, value: unknown) {
    return this;
  }

  lt(column: string, value: unknown) {
    return this;
  }

  lte(column: string, value: unknown) {
    return this;
  }

  like(column: string, pattern: string) {
    return this;
  }

  ilike(column: string, pattern: string) {
    return this;
  }

  is(column: string, value: unknown) {
    return this;
  }

  in(column: string, values: unknown[]) {
    return this;
  }

  contains(column: string, value: unknown) {
    return this;
  }

  containedBy(column: string, value: unknown) {
    return this;
  }

  range(from: number, to: number) {
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    return this;
  }

  limit(count: number) {
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isSingle = true;
    return this;
  }

  // Terminal method that returns the result
  then(
    onfulfilled?: (value: { data: unknown; error: Error | null; count?: number | null }) => unknown,
    onrejected?: (reason: unknown) => unknown
  ) {
    const result = {
      data: this.mockData,
      error: this.mockError,
      ...(this.mockCount !== null ? { count: this.mockCount } : {}),
    };
    return Promise.resolve(result).then(onfulfilled, onrejected);
  }
}

/**
 * Mock storage bucket
 */
export class MockStorageBucket {
  private mockData: unknown = null;
  private mockError: Error | null = null;

  constructor(data?: unknown, error?: Error | null) {
    this.mockData = data;
    this.mockError = error ?? null;
  }

  upload(path: string, file: File | Blob, options?: unknown) {
    return Promise.resolve({
      data: this.mockData || { path, id: 'mock-file-id' },
      error: this.mockError,
    });
  }

  download(path: string) {
    return Promise.resolve({
      data: this.mockData || new Blob(),
      error: this.mockError,
    });
  }

  remove(paths: string[]) {
    return Promise.resolve({
      data: this.mockData || paths,
      error: this.mockError,
    });
  }

  list(path?: string, options?: unknown) {
    return Promise.resolve({
      data: this.mockData || [],
      error: this.mockError,
    });
  }

  getPublicUrl(path: string) {
    return {
      data: { publicUrl: `https://example.com/storage/v1/object/public/bucket/${path}` },
    };
  }

  createSignedUrl(path: string, expiresIn: number) {
    return Promise.resolve({
      data: {
        signedUrl: `https://example.com/storage/v1/object/sign/bucket/${path}?token=mock-token`,
      },
      error: this.mockError,
    });
  }
}

/**
 * Mock Supabase client
 */
export interface MockSupabaseClient {
  from: ReturnType<typeof vi.fn>;
  storage: {
    from: ReturnType<typeof vi.fn>;
  };
  auth: {
    getSession: ReturnType<typeof vi.fn>;
    getUser: ReturnType<typeof vi.fn>;
    signInWithPassword: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
    onAuthStateChange: ReturnType<typeof vi.fn>;
  };
  rpc: ReturnType<typeof vi.fn>;
}

/**
 * Create a mock Supabase client
 */
export function createMockSupabaseClient(
  options: {
    data?: unknown;
    error?: Error | null;
    count?: number | null;
    storageData?: unknown;
    storageError?: Error | null;
  } = {}
): MockSupabaseClient {
  const { data, error, count, storageData, storageError } = options;

  return {
    from: vi.fn((table: string) => new MockQueryBuilder(data, error, count)),
    storage: {
      from: vi.fn((bucket: string) => new MockStorageBucket(storageData, storageError)),
    },
    auth: {
      getSession: vi.fn(() =>
        Promise.resolve({
          data: {
            session: {
              user: { id: 'mock-user-id', email: 'test@example.com' },
              access_token: 'mock-token',
            },
          },
          error: null,
        })
      ),
      getUser: vi.fn(() =>
        Promise.resolve({
          data: {
            user: { id: 'mock-user-id', email: 'test@example.com' },
          },
          error: null,
        })
      ),
      signInWithPassword: vi.fn(() =>
        Promise.resolve({
          data: {
            user: { id: 'mock-user-id', email: 'test@example.com' },
            session: { access_token: 'mock-token' },
          },
          error: null,
        })
      ),
      signOut: vi.fn(() =>
        Promise.resolve({
          error: null,
        })
      ),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    rpc: vi.fn((functionName: string, params?: unknown) =>
      Promise.resolve({
        data,
        error,
      })
    ),
  };
}

/**
 * Mock team data
 */
export const mockTeam = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  team_number: 930,
  team_name: 'Mukwonago BEARs',
  city: 'Mukwonago',
  state_prov: 'Wisconsin',
  country: 'USA',
  rookie_year: 2002,
  website: 'https://team930.com',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

/**
 * Mock event data
 */
export const mockEvent = {
  id: '123e4567-e89b-12d3-a456-426614174001',
  event_key: '2025wimi',
  event_code: 'wimi',
  year: 2025,
  name: 'Wisconsin Regional',
  event_type: 'regional',
  city: 'Milwaukee',
  state_prov: 'WI',
  country: 'USA',
  start_date: '2025-03-14',
  end_date: '2025-03-16',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

/**
 * Mock match data
 */
export const mockMatch = {
  id: '123e4567-e89b-12d3-a456-426614174002',
  event_key: '2025wimi',
  match_key: '2025wimi_qm1',
  comp_level: 'qm',
  set_number: 1,
  match_number: 1,
  alliance_red: ['930', '1234', '5678'],
  alliance_blue: ['111', '222', '333'],
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

/**
 * Mock auto performance data (2025 season)
 */
export const mockAutoPerformance2025 = {
  schema_version: '2025.1',
  left_starting_zone: true,
  coral_scored_L1: 2,
  coral_scored_L2: 1,
  coral_scored_L3: 0,
  coral_scored_L4: 0,
  coral_missed: 0,
  preloaded_piece_type: 'coral',
  preloaded_piece_scored: true,
  notes: 'Strong auto',
};

/**
 * Mock teleop performance data (2025 season)
 */
export const mockTeleopPerformance2025 = {
  schema_version: '2025.1',
  coral_scored_L1: 5,
  coral_scored_L2: 3,
  coral_scored_L3: 2,
  coral_scored_L4: 1,
  coral_missed: 0,
  algae_scored_barge: 2,
  algae_scored_processor: 3,
  algae_missed: 1,
  cycles_completed: 8,
  ground_pickup_coral: 4,
  station_pickup_coral: 2,
  ground_pickup_algae: 3,
  reef_pickup_algae: 1,
  lollipop_pickup_algae: 1,
  defense_time_seconds: 10,
  defense_effectiveness: 'moderate',
  defended_by_opponent_seconds: 5,
  penalties_caused: 0,
  notes: 'Consistent cycles',
};

/**
 * Mock endgame performance data (2025 season)
 */
export const mockEndgamePerformance2025 = {
  schema_version: '2025.1',
  cage_climb_attempted: true,
  cage_climb_successful: true,
  cage_level_achieved: 'shallow',
  endgame_start_time_seconds: 135,
  endgame_completion_time_seconds: 15,
  endgame_points: 6,
  cooperation_with_alliance: 'good',
  notes: 'Successful climb',
};

/**
 * Helper to reset all mocks
 */
export function resetAllMocks() {
  vi.clearAllMocks();
}

/**
 * Type guard to cast mock as SupabaseClient for TypeScript
 */
export function asMockSupabaseClient(mock: MockSupabaseClient): SupabaseClient {
  return mock as unknown as SupabaseClient;
}
