-- ============================================================================
-- Admin Audit Log Table
-- ============================================================================
-- Tracks all administrative actions for security and compliance

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Action details
  action_type VARCHAR(50) NOT NULL, -- e.g., 'user_created', 'user_updated', 'user_deleted', 'role_changed'
  entity_type VARCHAR(50) NOT NULL, -- e.g., 'user', 'team', 'event', 'match'
  entity_id VARCHAR(255), -- ID of the entity being acted upon

  -- User who performed the action
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  performer_email VARCHAR(255), -- Cached email for display

  -- Action metadata
  description TEXT NOT NULL, -- Human-readable description
  changes JSONB, -- JSON object with before/after values
  metadata JSONB, -- Additional context (IP address, user agent, etc.)

  -- Status
  status VARCHAR(20) DEFAULT 'success', -- 'success', 'failed', 'pending'
  error_message TEXT, -- If status is 'failed'

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CHECK (action_type IN (
    'user_created', 'user_updated', 'user_deleted', 'user_role_changed',
    'team_created', 'team_updated', 'team_deleted',
    'event_created', 'event_updated', 'event_deleted',
    'match_created', 'match_updated', 'match_deleted',
    'settings_changed', 'data_exported', 'data_imported'
  )),
  CHECK (entity_type IN ('user', 'team', 'event', 'match', 'settings', 'data')),
  CHECK (status IN ('success', 'failed', 'pending'))
);

-- Indexes for performance
CREATE INDEX idx_audit_log_action_type ON admin_audit_log(action_type);
CREATE INDEX idx_audit_log_entity ON admin_audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_performer ON admin_audit_log(performed_by);
CREATE INDEX idx_audit_log_created_at ON admin_audit_log(created_at DESC);
CREATE INDEX idx_audit_log_status ON admin_audit_log(status);

-- Comments for documentation
COMMENT ON TABLE admin_audit_log IS 'Tracks all administrative actions for security, compliance, and activity monitoring';
COMMENT ON COLUMN admin_audit_log.action_type IS 'Type of action performed (e.g., user_created, user_updated)';
COMMENT ON COLUMN admin_audit_log.entity_type IS 'Type of entity affected (e.g., user, team, event)';
COMMENT ON COLUMN admin_audit_log.entity_id IS 'ID of the entity that was affected';
COMMENT ON COLUMN admin_audit_log.performed_by IS 'User who performed the action';
COMMENT ON COLUMN admin_audit_log.description IS 'Human-readable description of the action';
COMMENT ON COLUMN admin_audit_log.changes IS 'JSON object containing before/after values for updates';

-- Grant permissions
GRANT SELECT ON admin_audit_log TO authenticated;
GRANT INSERT ON admin_audit_log TO authenticated;

-- Function to automatically log user profile changes
CREATE OR REPLACE FUNCTION log_user_profile_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO admin_audit_log (
      action_type,
      entity_type,
      entity_id,
      performed_by,
      performer_email,
      description,
      changes
    ) VALUES (
      'user_created',
      'user',
      NEW.id::TEXT,
      NEW.created_by,
      NEW.email,
      'User ' || NEW.email || ' was created',
      jsonb_build_object(
        'email', NEW.email,
        'full_name', NEW.full_name,
        'role', NEW.role,
        'primary_team_number', NEW.primary_team_number
      )
    );
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Only log if significant fields changed
    IF (NEW.role != OLD.role OR
        NEW.primary_team_number IS DISTINCT FROM OLD.primary_team_number OR
        NEW.is_active != OLD.is_active) THEN

      INSERT INTO admin_audit_log (
        action_type,
        entity_type,
        entity_id,
        description,
        changes
      ) VALUES (
        CASE
          WHEN NEW.role != OLD.role THEN 'user_role_changed'
          ELSE 'user_updated'
        END,
        'user',
        NEW.id::TEXT,
        'User ' || NEW.email ||
          CASE
            WHEN NEW.role != OLD.role THEN ' role changed from ' || OLD.role || ' to ' || NEW.role
            WHEN NEW.is_active != OLD.is_active THEN
              CASE WHEN NEW.is_active THEN ' was activated' ELSE ' was deactivated' END
            WHEN NEW.primary_team_number IS DISTINCT FROM OLD.primary_team_number THEN
              ' team changed to ' || COALESCE(NEW.primary_team_number::TEXT, 'none')
            ELSE ' was updated'
          END,
        jsonb_build_object(
          'before', jsonb_build_object(
            'role', OLD.role,
            'primary_team_number', OLD.primary_team_number,
            'is_active', OLD.is_active
          ),
          'after', jsonb_build_object(
            'role', NEW.role,
            'primary_team_number', NEW.primary_team_number,
            'is_active', NEW.is_active
          )
        )
      );
    END IF;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO admin_audit_log (
      action_type,
      entity_type,
      entity_id,
      description,
      changes
    ) VALUES (
      'user_deleted',
      'user',
      OLD.id::TEXT,
      'User ' || OLD.email || ' was deleted',
      jsonb_build_object(
        'email', OLD.email,
        'full_name', OLD.full_name,
        'role', OLD.role
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for user profile changes
DROP TRIGGER IF EXISTS user_profile_audit_trigger ON user_profiles;
CREATE TRIGGER user_profile_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION log_user_profile_changes();

COMMENT ON FUNCTION log_user_profile_changes() IS 'Automatically logs significant changes to user profiles in the audit log';
