-- 1. Add new columns: document_subtype and tags
ALTER TABLE public.knowledge_resources
ADD COLUMN IF NOT EXISTS document_subtype text,
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[];

COMMENT ON COLUMN public.knowledge_resources.document_subtype IS 'Subtype for documents: sop, ebook, template, whitepaper, other';
COMMENT ON COLUMN public.knowledge_resources.tags IS 'Hashtags for search and categorization';

-- 2. Migrate existing SOP records to document with subtype
UPDATE public.knowledge_resources
SET type = 'document', document_subtype = 'sop'
WHERE type = 'sop';

-- 3. Migrate existing Template records to document with subtype
UPDATE public.knowledge_resources
SET type = 'document', document_subtype = 'template'
WHERE type = 'template';

-- 4. Drop old CHECK constraint and create new one (without sop/template)
ALTER TABLE public.knowledge_resources
DROP CONSTRAINT IF EXISTS knowledge_resources_type_check;

ALTER TABLE public.knowledge_resources
ADD CONSTRAINT knowledge_resources_type_check
CHECK (type IN ('document', 'video', 'link', 'mom'));

-- 5. Update the INSERT RLS policy to allow interns to insert any type
DROP POLICY IF EXISTS "Users can upload resources" ON public.knowledge_resources;
CREATE POLICY "Users can upload resources" ON public.knowledge_resources
    FOR INSERT
    WITH CHECK (
        -- Any authenticated user can upload
        auth.uid() IS NOT NULL
    );
