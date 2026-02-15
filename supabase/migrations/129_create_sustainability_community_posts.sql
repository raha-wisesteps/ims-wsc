-- Migration: Create Sustainability Community Forum
-- Description: Creates a table for community posts, restricting interns from posting.

-- 1. Create Table
CREATE TABLE IF NOT EXISTS public.sustainability_forum_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  content text NOT NULL,
  author_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT sustainability_forum_posts_pkey PRIMARY KEY (id),
  CONSTRAINT sustainability_forum_posts_author_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- 2. Indexes
CREATE INDEX idx_sustainability_forum_created_at ON public.sustainability_forum_posts(created_at DESC);
CREATE INDEX idx_sustainability_forum_author ON public.sustainability_forum_posts(author_id);

-- 3. RLS
ALTER TABLE public.sustainability_forum_posts ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read
CREATE POLICY "Enable read access for all authenticated users"
ON public.sustainability_forum_posts
FOR SELECT
TO authenticated
USING (true);

-- Policy: Insert only for non-interns
-- Users can only insert their own posts, and must not have role = 'intern'
CREATE POLICY "Enable insert for non-interns"
ON public.sustainability_forum_posts
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = author_id AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role != 'intern'
  )
);

-- Policy: Update own posts (optional, but good practice)
CREATE POLICY "Enable update for own posts"
ON public.sustainability_forum_posts
FOR UPDATE
TO authenticated
USING (auth.uid() = author_id);

-- Policy: Delete own posts or Admins
CREATE POLICY "Enable delete for own posts or admins"
ON public.sustainability_forum_posts
FOR DELETE
TO authenticated
USING (
  auth.uid() = author_id OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'ceo', 'hr', 'owner')
  )
);
