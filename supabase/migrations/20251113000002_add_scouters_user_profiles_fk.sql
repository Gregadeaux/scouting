-- Add foreign key relationship between scouters and user_profiles
-- This enables Supabase PostgREST to automatically join these tables

-- Add the foreign key constraint
ALTER TABLE scouters
ADD CONSTRAINT scouters_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES user_profiles(id)
ON DELETE CASCADE;

-- Add an index on user_id for better join performance
CREATE INDEX IF NOT EXISTS idx_scouters_user_id ON scouters(user_id);
