-- Add Eleven Labs sync tracking to clinic_knowledge_base
ALTER TABLE public.clinic_knowledge_base
ADD COLUMN IF NOT EXISTS elevenlabs_doc_id TEXT,
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'synced', 'failed')),
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sync_error TEXT;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_kb_sync_status ON public.clinic_knowledge_base(sync_status);
CREATE INDEX IF NOT EXISTS idx_kb_elevenlabs_doc_id ON public.clinic_knowledge_base(elevenlabs_doc_id) WHERE elevenlabs_doc_id IS NOT NULL;

-- Add comments
COMMENT ON COLUMN public.clinic_knowledge_base.elevenlabs_doc_id IS 'Document ID from Eleven Labs knowledge base';
COMMENT ON COLUMN public.clinic_knowledge_base.sync_status IS 'Sync status: pending, syncing, synced, or failed';
COMMENT ON COLUMN public.clinic_knowledge_base.synced_at IS 'Timestamp when document was successfully synced';
COMMENT ON COLUMN public.clinic_knowledge_base.sync_error IS 'Error message if sync failed';