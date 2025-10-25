/**
 * Admin Dashboard Type Definitions
 * Additional types for admin functionality not covered in main types
 */

// ============================================================================
// SCOUTER MANAGEMENT TYPES
// ============================================================================

export interface Scouter {
  id: string;
  scout_name: string;
  team_affiliation?: number;
  role?: 'lead' | 'scout' | 'admin';
  email?: string;
  phone?: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// DATA TABLE TYPES
// ============================================================================

export interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
  className?: string;
}

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export interface FilterConfig {
  [key: string]: unknown;
}

export interface PaginationConfig {
  page: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

// ============================================================================
// API QUERY TYPES
// ============================================================================

export interface AdminQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, unknown>;
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface EventFormData {
  event_key: string;
  event_name: string;
  event_code: string;
  year: number;
  event_type: 'regional' | 'district' | 'district_championship' | 'championship_subdivision' | 'championship' | 'offseason';
  district?: string;
  week?: number;
  city?: string;
  state_province?: string;
  country?: string;
  start_date: string;
  end_date: string;
}

export interface TeamFormData {
  team_number: number;
  team_key: string;
  team_name: string;
  team_nickname?: string;
  city?: string;
  state_province?: string;
  country?: string;
  postal_code?: string;
  rookie_year?: number;
  website?: string;
}

export interface ScouterFormData {
  scout_name: string;
  team_affiliation?: number;
  role?: 'lead' | 'scout' | 'admin';
  email?: string;
  phone?: string;
  active: boolean;
}

export interface MatchFormData {
  event_key: string;
  match_key: string;
  comp_level: 'qm' | 'ef' | 'qf' | 'sf' | 'f';
  set_number?: number;
  match_number: number;
  red_1?: number;
  red_2?: number;
  red_3?: number;
  blue_1?: number;
  blue_2?: number;
  blue_3?: number;
  scheduled_time?: string;
}

// ============================================================================
// DASHBOARD STATISTICS TYPES
// ============================================================================

export interface DashboardStats {
  totalTeams: number;
  totalEvents: number;
  totalMatches: number;
  activeScouters: number;
  totalScoutingEntries: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'event_created' | 'team_created' | 'match_scheduled' | 'match_scouted' | 'scouter_added';
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface FormErrors {
  [key: string]: string;
}
