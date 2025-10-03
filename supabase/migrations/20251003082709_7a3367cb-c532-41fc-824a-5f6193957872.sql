-- Check and add missing columns to clinic_knowledge_base
DO $$ 
BEGIN
  -- Add source_url if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinic_knowledge_base' AND column_name = 'source_url') THEN
    ALTER TABLE public.clinic_knowledge_base ADD COLUMN source_url text;
  END IF;

  -- Add file_path if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinic_knowledge_base' AND column_name = 'file_path') THEN
    ALTER TABLE public.clinic_knowledge_base ADD COLUMN file_path text;
  END IF;

  -- Add content if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinic_knowledge_base' AND column_name = 'content') THEN
    ALTER TABLE public.clinic_knowledge_base ADD COLUMN content text;
  END IF;

  -- Add title if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinic_knowledge_base' AND column_name = 'title') THEN
    ALTER TABLE public.clinic_knowledge_base ADD COLUMN title text;
  END IF;
END $$;

-- Drop old columns if they exist
ALTER TABLE public.clinic_knowledge_base DROP COLUMN IF EXISTS question;
ALTER TABLE public.clinic_knowledge_base DROP COLUMN IF EXISTS category;
ALTER TABLE public.clinic_knowledge_base DROP COLUMN IF EXISTS priority;
ALTER TABLE public.clinic_knowledge_base DROP COLUMN IF EXISTS answer;

-- Create storage bucket for knowledge base PDFs if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'knowledge-base-pdfs',
  'knowledge-base-pdfs',
  false,
  20971520,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for knowledge base PDFs
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can view PDFs for their clinics" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload PDFs for their clinics" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete PDFs for their clinics" ON storage.objects;

  -- Create new policies
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
END $$;