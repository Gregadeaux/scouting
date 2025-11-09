/**
 * Data Generator Test Helpers
 *
 * Provides utilities for generating test data in E2E tests
 */

/**
 * Generate a unique test email address
 *
 * @param prefix - Optional prefix for the email (default: 'test-user')
 * @returns Unique email address
 *
 * @example
 * ```typescript
 * const email = generateTestEmail();
 * // Returns: test-user-1699999999999-1234@example.com
 *
 * const adminEmail = generateTestEmail('admin');
 * // Returns: admin-1699999999999-5678@example.com
 * ```
 */
export function generateTestEmail(prefix: string = 'test-user'): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${prefix}-${timestamp}-${random}@example.com`;
}

/**
 * Generate test user data
 *
 * @param role - Optional user role (default: 'scouter')
 * @returns User object with test data
 *
 * @example
 * ```typescript
 * const user = generateTestUser('admin');
 * // Returns: { email: '...', password: '...', full_name: '...', role: 'admin' }
 * ```
 */
export function generateTestUser(role: 'admin' | 'mentor' | 'scouter' = 'scouter'): {
  email: string;
  password: string;
  full_name: string;
  role: string;
  team_number?: string;
} {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);

  return {
    email: generateTestEmail(role),
    password: 'TestPassword123!',
    full_name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)} ${random}`,
    role,
    team_number: role !== 'admin' ? String(930 + (random % 100)) : undefined,
  };
}

/**
 * Generate test team data
 *
 * @param teamNumber - Optional team number (generates random if not provided)
 * @returns Team object with test data
 *
 * @example
 * ```typescript
 * const team = generateTestTeam(930);
 * const randomTeam = generateTestTeam();
 * ```
 */
export function generateTestTeam(teamNumber?: number): {
  team_number: number;
  team_name: string;
  team_nickname: string;
  city: string;
  state_province: string;
  country: string;
  rookie_year: number;
} {
  const number = teamNumber || Math.floor(Math.random() * 9000) + 1000;
  const random = Math.floor(Math.random() * 1000);

  return {
    team_number: number,
    team_name: `Test Team ${number}`,
    team_nickname: `Test ${random}`,
    city: 'Austin',
    state_province: 'Texas',
    country: 'USA',
    rookie_year: 2020,
  };
}

/**
 * Generate test event data
 *
 * @param year - Optional year (defaults to current year)
 * @returns Event object with test data
 *
 * @example
 * ```typescript
 * const event = generateTestEvent(2025);
 * const currentYearEvent = generateTestEvent();
 * ```
 */
export function generateTestEvent(year?: number): {
  event_key: string;
  event_name: string;
  event_code: string;
  year: number;
  event_type: string;
  city: string;
  state_province: string;
  country: string;
  start_date: string;
  end_date: string;
} {
  const eventYear = year || new Date().getFullYear();
  const random = Math.floor(Math.random() * 1000);
  const code = `test${random}`;

  // Generate dates for the event (3 days in March)
  const startDate = new Date(eventYear, 2, 15); // March 15
  const endDate = new Date(eventYear, 2, 17); // March 17

  return {
    event_key: `${eventYear}${code}`,
    event_name: `Test Event ${random}`,
    event_code: code,
    year: eventYear,
    event_type: 'regional',
    city: 'Austin',
    state_province: 'Texas',
    country: 'USA',
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
  };
}

/**
 * Generate unique team number
 *
 * @returns Random team number between 1-9999
 *
 * @example
 * ```typescript
 * const teamNumber = generateUniqueTeamNumber();
 * ```
 */
export function generateUniqueTeamNumber(): number {
  return Math.floor(Math.random() * 9000) + 1000;
}

/**
 * Generate unique event key
 *
 * @param year - Optional year (defaults to current year)
 * @returns Unique event key
 *
 * @example
 * ```typescript
 * const eventKey = generateUniqueEventKey(2025);
 * // Returns: 2025test1234
 * ```
 */
export function generateUniqueEventKey(year?: number): string {
  const eventYear = year || new Date().getFullYear();
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${eventYear}test${timestamp}${random}`;
}

/**
 * Generate match scouting payload
 *
 * @param overrides - Optional field overrides
 * @returns Match scouting data object
 *
 * @example
 * ```typescript
 * const data = generateMatchScoutingPayload({
 *   team_number: 930,
 *   match_key: '2025txaus_qm1',
 * });
 * ```
 */
export function generateMatchScoutingPayload(overrides?: Record<string, unknown>): {
  team_number: number;
  event_key: string;
  match_key: string;
  alliance: 'red' | 'blue';
  auto_performance: Record<string, unknown>;
  teleop_performance: Record<string, unknown>;
  endgame_performance: Record<string, unknown>;
} {
  const year = new Date().getFullYear();
  const teamNumber = Math.floor(Math.random() * 9000) + 1000;
  const matchNumber = Math.floor(Math.random() * 100) + 1;

  return {
    team_number: teamNumber,
    event_key: `${year}txaus`,
    match_key: `${year}txaus_qm${matchNumber}`,
    alliance: Math.random() > 0.5 ? 'red' : 'blue',
    auto_performance: {
      schema_version: '2025.1',
      left_starting_zone: true,
      coral_scored_l1: 2,
      coral_scored_l2: 1,
      coral_scored_l3: 0,
      algae_scored: 3,
      ...(overrides?.auto_performance as Record<string, unknown> || {}),
    },
    teleop_performance: {
      schema_version: '2025.1',
      coral_scored_l1: 5,
      coral_scored_l2: 3,
      coral_scored_l3: 1,
      algae_scored: 8,
      ...(overrides?.teleop_performance as Record<string, unknown> || {}),
    },
    endgame_performance: {
      schema_version: '2025.1',
      parking_location: 'none',
      climb_level: 'none',
      ...(overrides?.endgame_performance as Record<string, unknown> || {}),
    },
    ...overrides,
  };
}

/**
 * Generate pit scouting payload
 *
 * @param overrides - Optional field overrides
 * @returns Pit scouting data object
 *
 * @example
 * ```typescript
 * const data = generatePitScoutingPayload({
 *   team_number: 930,
 *   event_key: '2025txaus',
 * });
 * ```
 */
export function generatePitScoutingPayload(overrides?: Record<string, unknown>): {
  team_number: number;
  event_key: string;
  robot_capabilities: Record<string, unknown>;
  autonomous_capabilities: Record<string, unknown>;
} {
  const year = new Date().getFullYear();
  const teamNumber = Math.floor(Math.random() * 9000) + 1000;

  return {
    team_number: teamNumber,
    event_key: `${year}txaus`,
    robot_capabilities: {
      schema_version: '2025.1',
      can_score_coral: true,
      can_score_algae: true,
      max_coral_height: 'l2',
      drivetrain_type: 'swerve',
      ...(overrides?.robot_capabilities as Record<string, unknown> || {}),
    },
    autonomous_capabilities: {
      schema_version: '2025.1',
      has_autonomous: true,
      auto_coral_capability: 'l2',
      auto_algae_capability: true,
      ...(overrides?.autonomous_capabilities as Record<string, unknown> || {}),
    },
    ...overrides,
  };
}

/**
 * Generate random string
 *
 * @param length - Length of string (default: 10)
 * @returns Random alphanumeric string
 *
 * @example
 * ```typescript
 * const randomStr = generateRandomString(8);
 * ```
 */
export function generateRandomString(length: number = 10): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

/**
 * Generate random date within a range
 *
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Random date between start and end
 *
 * @example
 * ```typescript
 * const date = generateRandomDate(
 *   new Date('2025-01-01'),
 *   new Date('2025-12-31')
 * );
 * ```
 */
export function generateRandomDate(startDate: Date, endDate: Date): Date {
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();
  const randomTime = startTime + Math.random() * (endTime - startTime);
  return new Date(randomTime);
}

/**
 * Generate array of test items
 *
 * @param generator - Generator function
 * @param count - Number of items to generate
 * @returns Array of generated items
 *
 * @example
 * ```typescript
 * const teams = generateArray(generateTestTeam, 5);
 * const users = generateArray(() => generateTestUser('scouter'), 10);
 * ```
 */
export function generateArray<T>(generator: () => T, count: number): T[] {
  return Array.from({ length: count }, generator);
}
