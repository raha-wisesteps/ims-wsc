-- Create knowledge_resources table
create table if not exists public.knowledge_resources (
    id uuid not null default gen_random_uuid(),
    title text not null,
    description text,
    type text not null check (type in ('document', 'video', 'template', 'link', 'sop', 'mom')),
    resource_url text not null,
    thumbnail_url text,
    min_access_level text not null default 'intern' check (min_access_level in ('intern', 'staff', 'senior', 'owner')),
    target_roles text[] default array['all']::text[],
    created_by uuid references public.profiles(id),
    created_at timestamp with time zone default now(),
    constraint knowledge_resources_pkey primary key (id)
);

-- Enable RLS
alter table public.knowledge_resources enable row level security;

-- Policies

-- VIEW POLICY
drop policy if exists "Users can view relevant resources" on public.knowledge_resources;
create policy "Users can view relevant resources" on public.knowledge_resources
    for select
    using (
        -- 1. Super Users (Owner, CEO, Super Admin) - See Everything, ignore department filter
        exists (
            select 1 from public.profiles
            where id = auth.uid()
            and role in ('super_admin', 'ceo', 'owner')
        )
        OR
        (
            -- 2. Access Level Check
            (
                -- Intern content: Everyone
                min_access_level = 'intern'
                OR
                -- Staff content: Non-interns
                (
                    min_access_level = 'staff' 
                    AND NOT exists (select 1 from public.profiles where id = auth.uid() and is_intern = true)
                ) 
                OR
                -- Senior content: Analyst III+, Consultant, Manager, HR
                (
                    min_access_level = 'senior'
                    AND exists (
                        select 1 from public.profiles 
                        where id = auth.uid() 
                        and (
                            job_level ilike '%III%' OR job_level ilike '%IV%' 
                            OR job_level ilike '%Senior%' OR job_level ilike '%Consultant%' 
                            OR job_level ilike '%Manager%'
                            OR role = 'hr' OR is_hr = true
                        )
                    )
                )
            )
            AND
            -- 3. Department/Role Target Check
            (
                'all' = ANY(target_roles)
                OR
                exists (
                    select 1 from public.profiles
                    where id = auth.uid()
                    and (
                        job_type = ANY(target_roles) -- Matches 'analyst', 'bisdev', etc.
                        OR
                        department = ANY(target_roles) -- Matches department name if stored there
                        OR
                        role = ANY(target_roles) -- Matches 'hr'
                    )
                )
            )
        )
        OR
        -- Allow creator to always see their own
        created_by = auth.uid()
    );

-- UPLOAD POLICY
drop policy if exists "Users can upload resources" on public.knowledge_resources;
create policy "Users can upload resources" on public.knowledge_resources
    for insert
    with check (
        -- Owner/CEO/Super Admin/HR/Senior (Consultant/Manager) can upload anything
        exists (
            select 1 from public.profiles
            where id = auth.uid()
            and (
                role in ('super_admin', 'ceo', 'owner', 'hr') 
                or is_hr = true
                or job_level ilike '%Manager%'
                or job_level ilike '%Consultant%'
                or job_level ilike '%Senior%'
            )
        )
        or
        -- Interns can only upload 'mom'
        (
            exists (select 1 from public.profiles where id = auth.uid() and is_intern = true)
            and type = 'mom'
        )
        or
        -- Regular Staff can upload anything (as originally requested: "level staff... upload opsi lainnya")
        (
            exists (select 1 from public.profiles where id = auth.uid() and role = 'employee' and (is_intern = false or is_intern is null))
        )
    );

-- STORAGE BUCKET
insert into storage.buckets (id, name, public)
values ('knowledge_thumbnails', 'knowledge_thumbnails', true)
on conflict (id) do nothing;

-- Storage Policies
drop policy if exists "Knowledge Thumbnails Public Access" on storage.objects;
create policy "Knowledge Thumbnails Public Access"
  on storage.objects for select
  using ( bucket_id = 'knowledge_thumbnails' );

drop policy if exists "Knowledge Thumbnails Upload" on storage.objects;
create policy "Knowledge Thumbnails Upload"
  on storage.objects for insert
  with check (
    bucket_id = 'knowledge_thumbnails' 
    and auth.role() = 'authenticated'
);