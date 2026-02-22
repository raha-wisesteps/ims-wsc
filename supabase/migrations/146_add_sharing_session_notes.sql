-- Add speaker_notes column to sharing_sessions table
ALTER TABLE sharing_sessions 
ADD COLUMN speaker_notes TEXT;
