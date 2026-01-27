-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing tables to ensure clean slate (development mode)
DROP TABLE IF EXISTS public.project_helpers CASCADE;
DROP TABLE IF EXISTS public.project_members CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;

-- Create projects table
CREATE TABLE public.projects (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    status text NOT NULL DEFAULT 'planning' CHECK (status IN ('active', 'review', 'planning', 'completed', 'onhold')),
    category text NOT NULL DEFAULT 'project' CHECK (category IN ('project', 'proposal', 'event', 'internal', 'etc')),
    progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    start_date date,
    due_date date,
    expected_finish_date date,
    lead_id uuid REFERENCES public.profiles(id),
    jira_link text,
    drive_link text,
    is_archived boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT projects_pkey PRIMARY KEY (id)
);

-- Create project_members table
CREATE TABLE public.project_members (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    profile_id uuid REFERENCES public.profiles(id),
    role text DEFAULT 'member',
    joined_at timestamp with time zone DEFAULT now(),
    CONSTRAINT project_members_pkey PRIMARY KEY (id),
    CONSTRAINT project_members_unique_member UNIQUE (project_id, profile_id)
);

-- Create project_helpers table
CREATE TABLE public.project_helpers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    start_date date,
    end_date date,
    color text DEFAULT 'indigo',
    CONSTRAINT project_helpers_pkey PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_helpers ENABLE ROW LEVEL SECURITY;

-- Create Policies (Allow authenticated users to do everything for now as it's an internal tool)
CREATE POLICY "Enable all for authenticated users on projects"
    ON public.projects
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users on project_members"
    ON public.project_members
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users on project_helpers"
    ON public.project_helpers
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create updated_at trigger for projects
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
