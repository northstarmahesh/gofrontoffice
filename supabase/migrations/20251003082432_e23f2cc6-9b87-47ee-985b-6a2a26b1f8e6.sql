-- Update clinic_knowledge_base table to support different source types
ALTER TABLE public.clinic_knowledge_base 
DROP COLUMN IF EXISTS question,
DROP COLUMN IF EXISTS category,
DROP COLUMN IF EXISTS priority;

ALTER TABLE public.clinic_knowledge_base
ADD COLUMN source_type text NOT NULL DEFAULT 'url' CHECK (source_type IN ('website', 'url', 'pdf')),
ADD COLUMN source_url text,
ADD COLUMN file_path text,
ADD COLUMN content text,
ADD COLUMN title text;

-- Rename answer column to content if exists, or just ensure content exists
ALTER TABLE public.clinic_knowledge_base 
DROP COLUMN IF EXISTS answer;

-- Create storage bucket for knowledge base PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'knowledge-base-pdfs',
  'knowledge-base-pdfs',
  false,
  20971520,
  ARRAY['application/pdf']
);

-- Storage policies for knowledge base PDFs
CREATE POLICY "Users can view PDFs for their clinics"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'knowledge-base-pdfs' AND
  EXISTS (
    SELECT 1 FROM public.clinic_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.clinic_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Users can upload PDFs for their clinics"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'knowledge-base-pdfs' AND
  EXISTS (
    SELECT 1 FROM public.clinic_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.clinic_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Users can delete PDFs for their clinics"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'knowledge-base-pdfs' AND
  EXISTS (
    SELECT 1 FROM public.clinic_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.clinic_id::text = (storage.foldername(name))[1]
  )
);