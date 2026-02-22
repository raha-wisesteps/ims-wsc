-- Add session_end_time to sharing_sessions table
ALTER TABLE sharing_sessions 
ADD COLUMN session_end_time TIME;

-- Set a default value for existing rows if needed (optional, assuming no data yet since it's brand new)
-- UPDATE sharing_sessions SET session_end_time = session_time + interval '1 hour' WHERE session_end_time IS NULL;

-- Make it NOT NULL for future records if desired, but we can keep it nullable or set a default.
-- Let's just keep it nullable for safety with existing data, though the UI will enforce it.
