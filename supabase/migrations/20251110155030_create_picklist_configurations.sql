-- Migration: Create picklist_configurations table for saving/loading picklist view configurations
-- Purpose: Allow users to persist their picklist column setups for quick restoration during competitions
-- Related: SCOUT-58

-- Create picklist_configurations table
CREATE TABLE IF NOT EXISTS picklist_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_key VARCHAR NOT NULL REFERENCES events(event_key) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  configuration JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique names per user/event combination
  CONSTRAINT unique_user_event_name UNIQUE(user_id, event_key, name)
);

-- Create index for fast lookups by user and event
CREATE INDEX idx_picklist_configs_user_event ON picklist_configurations(user_id, event_key);

-- Create index for default configurations
CREATE INDEX idx_picklist_configs_is_default ON picklist_configurations(user_id, event_key, is_default)
WHERE is_default = true;

-- Add updated_at trigger
CREATE TRIGGER update_picklist_configurations_updated_at
  BEFORE UPDATE ON picklist_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE picklist_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own configurations
CREATE POLICY "Users can view their own picklist configurations"
  ON picklist_configurations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own picklist configurations"
  ON picklist_configurations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own picklist configurations"
  ON picklist_configurations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own picklist configurations"
  ON picklist_configurations FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE picklist_configurations IS 'Stores saved picklist view configurations (column setups) for users to quickly restore during competitions';
COMMENT ON COLUMN picklist_configurations.configuration IS 'JSONB object containing columns array with sortMetric and sortDirection for each column';
COMMENT ON COLUMN picklist_configurations.is_default IS 'If true, this configuration will auto-load when user opens picklist for this event';
