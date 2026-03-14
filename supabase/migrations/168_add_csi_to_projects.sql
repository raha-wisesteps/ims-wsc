-- Add CSI (Client Satisfaction Index) column to projects table
-- CSI is a numeric score from 0.0 to 5.0 representing client satisfaction
-- Used for KPI S3 "Indeks Kepuasan Klien" calculation
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS csi numeric(3,1) DEFAULT NULL CHECK (csi >= 0 AND csi <= 5);
