-- Create talent_profiles table
CREATE TABLE IF NOT EXISTS talent_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT,
    linkedin TEXT,
    phone TEXT,
    cv_link TEXT,
    first_met_date DATE,
    category TEXT CHECK (category IN (
        'Hospitality & Operations',
        'Destination Management & Policy',
        'Planning & Infrastructure',
        'Business & Investment',
        'Marketing & Sales',
        'IT, Data & Smart Tourism',
        'Sustainability & Environment',
        'Community, Culture & Heritage',
        'MICE & Events',
        'Etc.'
    )),
    group_classification TEXT CHECK (group_classification IN ('Proven & Trusted', 'Warm Leads', 'Cold Leads')),
    status TEXT CHECK (status IN ('Recommended', 'Not recommended', 'Potential')),
    tags TEXT[], -- Array of strings for skills/keywords
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create talent_project_logs table
CREATE TABLE IF NOT EXISTS talent_project_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    talent_id UUID REFERENCES talent_profiles(id) ON DELETE CASCADE NOT NULL,
    project_name TEXT NOT NULL,
    role TEXT,
    performance_rating INT CHECK (performance_rating BETWEEN 1 AND 5),
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies

-- Enable RLS
ALTER TABLE talent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_project_logs ENABLE ROW LEVEL SECURITY;

-- Policies for talent_profiles
CREATE POLICY "Enable read access for all users" ON talent_profiles
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authorized roles" ON talent_profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND (role IN ('super_admin', 'ceo', 'hr', 'bisdev') OR job_type IN ('operational', 'bisdev'))
        )
    );

CREATE POLICY "Enable update for authorized roles" ON talent_profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND (role IN ('super_admin', 'ceo', 'hr', 'bisdev') OR job_type IN ('operational', 'bisdev'))
        )
    );

CREATE POLICY "Enable delete for admins" ON talent_profiles
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND (role IN ('super_admin', 'ceo', 'hr'))
        )
    );

-- Policies for talent_project_logs
CREATE POLICY "Enable read access for all users" ON talent_project_logs
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authorized roles" ON talent_project_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND (role IN ('super_admin', 'ceo', 'hr', 'bisdev') OR job_type IN ('operational', 'bisdev'))
        )
    );

CREATE POLICY "Enable update/delete for admins" ON talent_project_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND (role IN ('super_admin', 'ceo', 'hr'))
        )
    );

-- Trigger for updated_at
CREATE TRIGGER update_talent_profiles_modtime
    BEFORE UPDATE ON talent_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
