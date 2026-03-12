-- Drop the existing participation_status check constraint
ALTER TABLE sharing_session_participants
DROP CONSTRAINT IF EXISTS sharing_session_participants_participation_status_check;

-- Add it back with 'absen' included
ALTER TABLE sharing_session_participants
ADD CONSTRAINT sharing_session_participants_participation_status_check 
CHECK (participation_status IN ('full', 'half', 'none', 'absen'));

-- Add the 'alasan' column
ALTER TABLE sharing_session_participants
ADD COLUMN IF NOT EXISTS alasan TEXT;
