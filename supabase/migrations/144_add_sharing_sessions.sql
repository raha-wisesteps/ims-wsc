-- Create sharing_sessions table
CREATE TABLE sharing_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    session_date DATE NOT NULL,
    session_time TIME NOT NULL,
    recording_link TEXT,
    speaker_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create sharing_session_participants table
CREATE TABLE sharing_session_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sharing_sessions(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    participation_status TEXT CHECK (participation_status IN ('full', 'half', 'none')) DEFAULT 'none',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(session_id, profile_id)
);

-- Add RLS Policies
ALTER TABLE sharing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sharing_session_participants ENABLE ROW LEVEL SECURITY;

-- sharing_sessions policies
-- Everyone can view sharing sessions
CREATE POLICY "Everyone can view sharing sessions" ON sharing_sessions
    FOR SELECT USING (true);

-- Authenticated users can create sharing sessions
CREATE POLICY "Authenticated users can create sharing sessions" ON sharing_sessions
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Creator, Assigned Speaker, or Admins (CEO/HR/Super Admin) can update
CREATE POLICY "Authorized users can update sharing sessions" ON sharing_sessions
    FOR UPDATE USING (
        auth.uid() = created_by OR 
        auth.uid() = speaker_id OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND (role IN ('ceo', 'hr', 'super_admin') OR is_hr = true)
        )
    );

-- Creator or Admins can delete
CREATE POLICY "Authorized users can delete sharing sessions" ON sharing_sessions
    FOR DELETE USING (
        auth.uid() = created_by OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND (role IN ('ceo', 'hr', 'super_admin') OR is_hr = true)
        )
    );

-- sharing_session_participants policies
-- Everyone can view participants
CREATE POLICY "Everyone can view session participants" ON sharing_session_participants
    FOR SELECT USING (true);

-- Authenticated users can manage participants for sessions they have rights to
-- (For simplicity, we let the creator, speaker, or admins manage participants)
CREATE POLICY "Authorized users can manage participants" ON sharing_session_participants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM sharing_sessions
            WHERE id = session_id AND (
                created_by = auth.uid() OR
                speaker_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE id = auth.uid() AND (role IN ('ceo', 'hr', 'super_admin') OR is_hr = true)
                )
            )
        )
    );

-- Add a trigger to update updated_at
CREATE OR REPLACE FUNCTION update_sharing_sessions_modtime_func()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sharing_sessions_modtime
    BEFORE UPDATE ON sharing_sessions
    FOR EACH ROW EXECUTE PROCEDURE update_sharing_sessions_modtime_func();
