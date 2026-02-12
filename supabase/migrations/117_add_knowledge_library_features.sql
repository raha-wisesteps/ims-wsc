-- Add columns for Library Feature (Offline Books)
ALTER TABLE public.knowledge_resources
ADD COLUMN IF NOT EXISTS is_library_item boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS stock_total integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_borrowers jsonb DEFAULT '[]'::jsonb;

-- Comment on columns
COMMENT ON COLUMN public.knowledge_resources.is_library_item IS 'If true, this is a physical item available for borrowing';
COMMENT ON COLUMN public.knowledge_resources.stock_total IS 'Total physical copies available';
COMMENT ON COLUMN public.knowledge_resources.current_borrowers IS 'List of users currently borrowing the item';
