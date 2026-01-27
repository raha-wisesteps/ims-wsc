-- Add UPDATE and DELETE policies for knowledge_resources

-- 1. UPDATE POLICY
drop policy if exists "Users can update resources" on public.knowledge_resources;
create policy "Users can update resources" on public.knowledge_resources
    for update
    using (
        -- Allow CEO, Super Admin, Office Manager
        exists (
            select 1 from public.profiles
            where id = auth.uid()
            and (
                role in ('super_admin', 'ceo') 
                or is_office_manager = true
            )
        )
        OR
        -- Allow Creator to update their own resources
        created_by = auth.uid()
    );

-- 2. DELETE POLICY
drop policy if exists "Users can delete resources" on public.knowledge_resources;
create policy "Users can delete resources" on public.knowledge_resources
    for delete
    using (
        -- Allow CEO, Super Admin, Office Manager
        exists (
            select 1 from public.profiles
            where id = auth.uid()
            and (
                role in ('super_admin', 'ceo') 
                or is_office_manager = true
            )
        )
        OR
        -- Allow Creator to delete their own resources
        created_by = auth.uid()
    );
