-- Migration: Create Travel Log Tables
-- Description: Creates tables for Sustainability Travel Log feature (Activity -> Logs -> Participants)

-- =============================================
-- 1. Travel Emission Config (Settings)
-- =============================================
CREATE TABLE public.travel_emission_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  config_key text NOT NULL UNIQUE,
  config_label text NOT NULL,
  emission_factor numeric NOT NULL DEFAULT 0, -- kgCO2e/km
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT travel_emission_config_pkey PRIMARY KEY (id)
);

-- Seed Default Configs
INSERT INTO public.travel_emission_config (config_key, config_label, emission_factor) VALUES
('plane_short_haul', 'Pesawat (Short-haul ≤3700km)', 0.14825),
('plane_long_haul', 'Pesawat (Long-haul >3700km)', 0.14165),
('car_bensin', 'Mobil (Bensin)', 0.20871),
('car_hybrid', 'Mobil (Hybrid)', 0.16140),
('car_ev', 'Mobil (EV)', 0.15200),
('train_eksekutif', 'Kereta Eksekutif', 0.02250),
('train_ekonomi_newgen', 'Kereta Ekonomi (New Gen)', 0.01450),
('train_ekonomi_pso', 'Kereta Ekonomi (PSO)', 0.00700),
('train_whoosh', 'Kereta Cepat (Whoosh)', 0.00450),
('travel', 'Mobil Travel', 0.06917),
('motorcycle_bensin', 'Sepeda Motor (Bensin)', 0.12716),
('motorcycle_ev', 'Sepeda Motor (EV)', 0.02700),
('ferry', 'Kapal Ferry', 0.02295);

-- =============================================
-- 2. Travel Activities (Parent)
-- =============================================
CREATE TABLE public.travel_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  total_emission numeric DEFAULT 0,
  total_distance numeric DEFAULT 0,
  log_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT travel_activities_pkey PRIMARY KEY (id),
  CONSTRAINT travel_activities_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);

-- =============================================
-- 3. Travel Logs (Child)
-- =============================================
CREATE TABLE public.travel_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL,
  created_by uuid NOT NULL,
  travel_date date NOT NULL DEFAULT CURRENT_DATE,
  transport_mode text NOT NULL, -- plane, car, train, etc
  transport_subtype text, -- short_haul, bensin, eksekutif, etc
  distance_km numeric NOT NULL DEFAULT 0,
  passenger_count integer DEFAULT 1, -- important for car division
  activity_type text NOT NULL, -- meeting_client, site_visit, etc
  origin text,
  destination text,
  notes text,
  emission_factor numeric NOT NULL DEFAULT 0, -- snapshot at creation
  total_emission numeric NOT NULL DEFAULT 0,
  emission_per_person numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT travel_logs_pkey PRIMARY KEY (id),
  CONSTRAINT travel_logs_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.travel_activities(id) ON DELETE CASCADE,
  CONSTRAINT travel_logs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);

-- =============================================
-- 4. Travel Log Participants (Junction)
-- =============================================
CREATE TABLE public.travel_log_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  travel_log_id uuid NOT NULL,
  profile_id uuid NOT NULL,
  CONSTRAINT travel_log_participants_pkey PRIMARY KEY (id),
  CONSTRAINT travel_log_participants_log_fkey FOREIGN KEY (travel_log_id) REFERENCES public.travel_logs(id) ON DELETE CASCADE,
  CONSTRAINT travel_log_participants_profile_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  UNIQUE(travel_log_id, profile_id)
);

-- =============================================
-- Indexes
-- =============================================
CREATE INDEX idx_travel_activities_created_by ON public.travel_activities(created_by);
CREATE INDEX idx_travel_logs_activity_id ON public.travel_logs(activity_id);
CREATE INDEX idx_travel_logs_created_by ON public.travel_logs(created_by);
CREATE INDEX idx_travel_logs_date ON public.travel_logs(travel_date);
CREATE INDEX idx_travel_log_participants_log ON public.travel_log_participants(travel_log_id);
CREATE INDEX idx_travel_log_participants_profile ON public.travel_log_participants(profile_id);

-- =============================================
-- RLS Policies
-- =============================================
ALTER TABLE public.travel_emission_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_log_participants ENABLE ROW LEVEL SECURITY;

-- 1. Config Policies (Read: Everyone, Update: Admins Only)
CREATE POLICY "config_read_all" ON public.travel_emission_config FOR SELECT USING (true);

CREATE POLICY "config_update_admin" ON public.travel_emission_config FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role IN ('ceo', 'super_admin', 'hr'))
  )
);

-- 2. Activities Policies
-- Read: Everyone
CREATE POLICY "activities_read_all" ON public.travel_activities FOR SELECT USING (true);

-- Insert: Authenticated
CREATE POLICY "activities_insert_auth" ON public.travel_activities FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
);

-- Update: Creator OR Admins
CREATE POLICY "activities_update_owner_admin" ON public.travel_activities FOR UPDATE USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role IN ('ceo', 'super_admin', 'hr'))
  )
);

-- Delete: Creator OR Admins
CREATE POLICY "activities_delete_owner_admin" ON public.travel_activities FOR DELETE USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role IN ('ceo', 'super_admin', 'hr'))
  )
);

-- 3. Logs Policies (Same as Activities)
CREATE POLICY "logs_read_all" ON public.travel_logs FOR SELECT USING (true);

CREATE POLICY "logs_insert_auth" ON public.travel_logs FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
);

CREATE POLICY "logs_update_owner_admin" ON public.travel_logs FOR UPDATE USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role IN ('ceo', 'super_admin', 'hr'))
  )
);

CREATE POLICY "logs_delete_owner_admin" ON public.travel_logs FOR DELETE USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role IN ('ceo', 'super_admin', 'hr'))
  )
);

-- 4. Participants Policies (Inherit form Log access ideally, but for simplicity: same rules)
CREATE POLICY "participants_read_all" ON public.travel_log_participants FOR SELECT USING (true);

-- Insert: Authenticated (usually done together with log creation)
CREATE POLICY "participants_insert_auth" ON public.travel_log_participants FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
);

-- Delete: If you can delete the log, you can delete participants (cascade handles it mostly, but for manual removal)
CREATE POLICY "participants_delete_owner_admin" ON public.travel_log_participants FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.travel_logs
    WHERE id = travel_log_participants.travel_log_id
    AND (
      created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND (role IN ('ceo', 'super_admin', 'hr'))
      )
    )
  )
);
