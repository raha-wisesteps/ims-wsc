-- 1. Add session_type column to sharing_sessions
ALTER TABLE sharing_sessions
ADD COLUMN IF NOT EXISTS session_type TEXT NOT NULL DEFAULT 'sharing_session';

-- Add check constraint for session_type
ALTER TABLE sharing_sessions
ADD CONSTRAINT sharing_sessions_session_type_check
CHECK (session_type IN ('internal_training', 'sharing_session'));

-- 2. Convert existing 'half' participation data to 'full' (Join)
UPDATE sharing_session_participants
SET participation_status = 'full'
WHERE participation_status = 'half';

-- 3. Drop old participation_status check constraint and recreate without 'half'
ALTER TABLE sharing_session_participants
DROP CONSTRAINT IF EXISTS sharing_session_participants_participation_status_check;

ALTER TABLE sharing_session_participants
ADD CONSTRAINT sharing_session_participants_participation_status_check
CHECK (participation_status IN ('full', 'none', 'absen'));
