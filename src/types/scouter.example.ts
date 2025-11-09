/**
 * EXAMPLE USAGE OF SCOUTER TYPES
 * This file demonstrates how to use the scouter types in the application
 *
 * DO NOT IMPORT THIS FILE - It's for documentation purposes only
 */

import type {
  Scouter,
  ScouterWithUser,
  ScouterWithStats,
  CreateScouterInput,
  UpdateScouterInput,
  ScouterRegistrationData,
  ScouterFilters,
  ExperienceLevel,
  PreferredRole,
  Certification,
} from './scouter';

import {
  CERTIFICATION_LABELS,
  EXPERIENCE_LEVEL_LABELS,
  PREFERRED_ROLE_LABELS,
  isExperienceLevel,
  isCertification,
  areCertifications,
} from './scouter';

// ============================================================================
// EXAMPLE 1: Creating a new scouter (Service/Repository)
// ============================================================================

async function exampleCreateScouter(userId: string): Promise<Scouter> {
  const input: CreateScouterInput = {
    user_id: userId,
    experience_level: 'rookie',
    preferred_role: 'match_scouting',
    team_number: 930,
    certifications: ['match_certified'],
    availability_notes: 'Available all weekend, prefer morning shifts',
  };

  // In actual implementation, this would call Supabase
  const newScouter: Scouter = {
    id: crypto.randomUUID(),
    user_id: input.user_id,
    team_number: input.team_number ?? null,
    experience_level: input.experience_level,
    preferred_role: input.preferred_role ?? null,
    total_matches_scouted: 0,
    total_events_attended: 0,
    certifications: input.certifications ?? [],
    availability_notes: input.availability_notes ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return newScouter;
}

// ============================================================================
// EXAMPLE 2: Updating a scouter (Promotion to veteran)
// ============================================================================

async function examplePromoteScouter(scouterId: string): Promise<void> {
  const update: UpdateScouterInput = {
    experience_level: 'veteran',
    certifications: ['match_certified', 'pit_certified', 'lead_scout', 'trainer'],
  };

  // In actual implementation: await supabase.from('scouters').update(update).eq('id', scouterId)
  console.log('Promoted scouter', scouterId, update);
}

// ============================================================================
// EXAMPLE 3: Filtering scouters for match assignment
// ============================================================================

async function exampleFindAvailableScouters(): Promise<ScouterWithUser[]> {
  const filters: ScouterFilters = {
    experience_level: 'veteran',
    has_certification: 'match_certified',
    min_matches_scouted: 10,
    sort_by: 'matches',
    sort_order: 'desc',
    limit: 10,
  };

  // In actual implementation: complex Supabase query with joins
  const scouters: ScouterWithUser[] = []; // Would be populated from database
  return scouters;
}

// ============================================================================
// EXAMPLE 4: Registration form submission
// ============================================================================

function exampleHandleScouterRegistration(
  formData: ScouterRegistrationData
): CreateScouterInput {
  // Validate form data
  if (!isExperienceLevel(formData.experience_level)) {
    throw new Error('Invalid experience level');
  }

  // Convert form data to creation input
  const input: CreateScouterInput = {
    user_id: 'current-user-id', // Would come from auth context
    experience_level: formData.experience_level,
    preferred_role: formData.preferred_role ?? null,
    team_number: formData.team_number,
    certifications: [], // New scouts start with no certifications
    availability_notes: formData.availability_notes,
  };

  return input;
}

// ============================================================================
// EXAMPLE 5: Displaying scouter information in UI (Data Preparation)
// ============================================================================

function examplePrepareScouterDisplayData(scouter: ScouterWithUser): {
  displayName: string;
  experienceLabel: string;
  roleLabel: string | null;
  certificationLabels: string[];
  stats: { label: string; value: number }[];
  teamInfo: string | null;
} {
  return {
    displayName: scouter.display_name || scouter.full_name || scouter.email,
    experienceLabel: EXPERIENCE_LEVEL_LABELS[scouter.experience_level],
    roleLabel: scouter.preferred_role
      ? PREFERRED_ROLE_LABELS[scouter.preferred_role]
      : null,
    certificationLabels: scouter.certifications.map(
      (cert) => CERTIFICATION_LABELS[cert]
    ),
    stats: [
      { label: 'Matches Scouted', value: scouter.total_matches_scouted },
      { label: 'Events Attended', value: scouter.total_events_attended },
    ],
    teamInfo: scouter.team_name
      ? `Team ${scouter.team_number}: ${scouter.team_name}`
      : null,
  };
}

// ============================================================================
// EXAMPLE 6: Validation with type guards
// ============================================================================

function exampleValidateCertifications(input: unknown): Certification[] {
  if (!areCertifications(input)) {
    throw new Error('Invalid certifications array');
  }
  return input;
}

function exampleParseExperienceLevel(input: string): ExperienceLevel {
  if (!isExperienceLevel(input)) {
    throw new Error(`Invalid experience level: ${input}`);
  }
  return input;
}

// ============================================================================
// EXAMPLE 7: Statistics dashboard
// ============================================================================

async function exampleScouterStatsDashboard(): Promise<ScouterWithStats[]> {
  const filters: ScouterFilters = {
    is_active: true, // Only show scouts who have scouted this season
    sort_by: 'matches',
    sort_order: 'desc',
  };

  // This would return scouters with extended statistics
  const scoutersWithStats: ScouterWithStats[] = [
    {
      // Base Scouter fields
      id: '123',
      user_id: '456',
      team_number: 930,
      experience_level: 'veteran',
      preferred_role: 'both',
      total_matches_scouted: 120,
      total_events_attended: 8,
      certifications: ['match_certified', 'pit_certified', 'lead_scout'],
      availability_notes: null,
      created_at: '2023-01-15T10:00:00Z',
      updated_at: '2025-11-08T10:00:00Z',

      // User fields (from join)
      email: 'veteran.scout@team930.org',
      full_name: 'Jane Smith',
      display_name: 'Jane',

      // Team fields (from join)
      team_name: 'The Zebracorns',
      team_nickname: 'Zebracorns',

      // Statistics fields
      current_season_matches: 35,
      current_season_events: 3,
      avg_confidence_level: 4.2,
      data_accuracy_score: 0.95,
      last_scouting_date: '2025-11-07T18:30:00Z',
      first_scouting_date: '2023-02-10T09:00:00Z',
    },
  ];

  return scoutersWithStats;
}

// ============================================================================
// EXAMPLE 8: API Route Handler
// ============================================================================

async function exampleApiRouteHandler(
  request: Request
): Promise<Response> {
  const { searchParams } = new URL(request.url);

  // Parse query parameters into filters
  const filters: ScouterFilters = {
    team_number: searchParams.get('team_number')
      ? parseInt(searchParams.get('team_number')!)
      : undefined,
    experience_level: searchParams.get('experience_level') as ExperienceLevel | undefined,
    preferred_role: searchParams.get('preferred_role') as PreferredRole | undefined,
    search: searchParams.get('search') || undefined,
    limit: searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : 50,
    offset: searchParams.get('offset')
      ? parseInt(searchParams.get('offset')!)
      : 0,
  };

  // Fetch from database (pseudo-code)
  const scouters: ScouterWithUser[] = []; // await fetchScouters(filters);
  const total = 0; // await countScouters(filters);

  // Return typed response
  return Response.json({
    success: true,
    data: scouters,
    total,
    limit: filters.limit,
    offset: filters.offset,
    has_more: (filters.offset ?? 0) + (filters.limit ?? 50) < total,
  });
}

// ============================================================================
// EXAMPLE 9: Conditional rendering based on certifications
// ============================================================================

function exampleCanAssignAsLeadScout(scouter: Scouter): boolean {
  return (
    scouter.experience_level === 'veteran' &&
    scouter.certifications.includes('lead_scout')
  );
}

function exampleCanTrainNewScouts(scouter: Scouter): boolean {
  return scouter.certifications.includes('trainer');
}

function exampleCanPerformRole(
  scouter: Scouter,
  role: 'match_scouting' | 'pit_scouting'
): boolean {
  const cert: Certification = role === 'match_scouting' ? 'match_certified' : 'pit_certified';
  return scouter.certifications.includes(cert);
}

// ============================================================================
// EXPORT NOTE
// ============================================================================

// DO NOT export anything from this file - it's for documentation only
export {};
