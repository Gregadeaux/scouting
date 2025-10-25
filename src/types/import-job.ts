/**
 * Type definitions for import jobs from The Blue Alliance
 */

// Types of imports that can be performed
export type ImportJobType = 'teams' | 'matches' | 'full' | 'results';

// Status states for import jobs
export type ImportJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

/**
 * Import job record from the database
 */
export interface ImportJob {
  job_id: string;
  event_key: string;
  job_type: ImportJobType;
  status: ImportJobStatus;
  progress_percent: number;
  total_items: number;
  processed_items: number;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

/**
 * Input for creating a new import job
 */
export interface CreateImportJobInput {
  event_key: string;
  job_type: ImportJobType;
  created_by?: string;
}

/**
 * Progress update for an import job
 */
export interface UpdateImportJobProgress {
  processed_items: number;
  total_items: number;
  progress_percent: number;
  status?: ImportJobStatus;
  error_message?: string | null;
}

/**
 * Complete import job update
 */
export interface CompleteImportJobInput {
  status: 'completed' | 'failed' | 'cancelled';
  error_message?: string | null;
  completed_at?: string;
}

/**
 * Import job with computed fields
 */
export interface ImportJobWithMetadata extends ImportJob {
  duration_seconds?: number; // Time from created_at to completed_at
  items_per_second?: number; // Processing rate
  is_running: boolean; // True if status is 'processing'
  can_cancel: boolean; // True if status is 'pending' or 'processing'
  can_retry: boolean; // True if status is 'failed' or 'cancelled'
}

/**
 * Summary statistics for import jobs
 */
export interface ImportJobStats {
  total_jobs: number;
  pending_jobs: number;
  processing_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  cancelled_jobs: number;
  average_duration_seconds: number;
  average_items_per_second: number;
  success_rate: number; // Percentage of completed vs failed
}

/**
 * Filter options for querying import jobs
 */
export interface ImportJobFilters {
  event_key?: string;
  job_type?: ImportJobType;
  status?: ImportJobStatus | ImportJobStatus[];
  created_by?: string;
  created_after?: string; // ISO date string
  created_before?: string; // ISO date string
  limit?: number;
  offset?: number;
  order_by?: 'created_at' | 'updated_at' | 'completed_at';
  order_direction?: 'asc' | 'desc';
}

/**
 * Result of an import operation
 */
export interface ImportResult {
  success: boolean;
  job_id: string;
  items_imported: number;
  errors: ImportError[];
  warnings: ImportWarning[];
}

/**
 * Error that occurred during import
 */
export interface ImportError {
  item_key: string; // e.g., team key or match key
  error_type: 'validation' | 'duplicate' | 'missing_dependency' | 'api_error' | 'unknown';
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Warning that occurred during import
 */
export interface ImportWarning {
  item_key: string;
  warning_type: 'data_mismatch' | 'partial_data' | 'deprecated_field' | 'unknown';
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Options for import operations
 */
export interface ImportOptions {
  // Whether to update existing records or skip them
  update_existing: boolean;

  // Whether to continue on errors or stop
  continue_on_error: boolean;

  // Maximum number of retries for failed API calls
  max_retries: number;

  // Delay between API calls in milliseconds
  rate_limit_delay: number;

  // Whether to validate data before importing
  validate_before_import: boolean;

  // Whether to run in dry-run mode (no actual imports)
  dry_run: boolean;
}

// Default import options
export const DEFAULT_IMPORT_OPTIONS: ImportOptions = {
  update_existing: true,
  continue_on_error: true,
  max_retries: 3,
  rate_limit_delay: 100, // 100ms between API calls
  validate_before_import: true,
  dry_run: false,
};

// Type guards
export function isImportJob(data: unknown): data is ImportJob {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as ImportJob).job_id === 'string' &&
    typeof (data as ImportJob).event_key === 'string' &&
    ['teams', 'matches', 'full', 'results'].includes((data as ImportJob).job_type) &&
    ['pending', 'processing', 'completed', 'failed', 'cancelled'].includes((data as ImportJob).status)
  );
}

export function isValidImportJobType(type: string): type is ImportJobType {
  return ['teams', 'matches', 'full', 'results'].includes(type);
}

export function isValidImportJobStatus(status: string): status is ImportJobStatus {
  return ['pending', 'processing', 'completed', 'failed', 'cancelled'].includes(status);
}