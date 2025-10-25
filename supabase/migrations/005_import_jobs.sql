-- Create import_jobs table for tracking TBA data import operations
-- This table logs all import attempts from The Blue Alliance API

CREATE TABLE IF NOT EXISTS import_jobs (
    job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_key TEXT NOT NULL REFERENCES events(event_key) ON DELETE CASCADE,
    job_type TEXT NOT NULL CHECK (job_type IN ('teams', 'matches', 'full', 'results')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
    progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    total_items INTEGER DEFAULT 0 CHECK (total_items >= 0),
    processed_items INTEGER DEFAULT 0 CHECK (processed_items >= 0),
    error_message TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    -- Ensure processed_items doesn't exceed total_items
    CONSTRAINT valid_progress CHECK (processed_items <= total_items)
);

-- Create indexes for efficient querying
CREATE INDEX idx_import_jobs_event_key ON import_jobs(event_key);
CREATE INDEX idx_import_jobs_status ON import_jobs(status);
CREATE INDEX idx_import_jobs_created_by ON import_jobs(created_by);
CREATE INDEX idx_import_jobs_created_at ON import_jobs(created_at DESC);

-- Create updated_at trigger
CREATE TRIGGER update_import_jobs_updated_at
    BEFORE UPDATE ON import_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Note: RLS policies will be added when authentication/user system is fully configured
-- For now, access is controlled at the application level via middleware
-- All /admin/* routes require admin authentication through Next.js middleware

-- Add comments for documentation
COMMENT ON TABLE import_jobs IS 'Tracks data import operations from The Blue Alliance API';
COMMENT ON COLUMN import_jobs.job_id IS 'Unique identifier for the import job';
COMMENT ON COLUMN import_jobs.event_key IS 'FRC event key (e.g., "2025txaus")';
COMMENT ON COLUMN import_jobs.job_type IS 'Type of import: teams, matches, full (both), or results';
COMMENT ON COLUMN import_jobs.status IS 'Current status of the import job';
COMMENT ON COLUMN import_jobs.progress_percent IS 'Percentage of import completion (0-100)';
COMMENT ON COLUMN import_jobs.total_items IS 'Total number of items to import';
COMMENT ON COLUMN import_jobs.processed_items IS 'Number of items successfully processed';
COMMENT ON COLUMN import_jobs.error_message IS 'Error details if the job failed';
COMMENT ON COLUMN import_jobs.created_by IS 'User who initiated the import';
COMMENT ON COLUMN import_jobs.created_at IS 'When the import job was created';
COMMENT ON COLUMN import_jobs.updated_at IS 'Last time the job status was updated';
COMMENT ON COLUMN import_jobs.completed_at IS 'When the import job finished (success or failure)';