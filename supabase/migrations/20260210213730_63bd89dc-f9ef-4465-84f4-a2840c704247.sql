
-- Create storage bucket for certificates
INSERT INTO storage.buckets (id, name, public) VALUES ('certificados', 'certificados', false);

-- RLS policies for certificados bucket
CREATE POLICY "Anyone can upload certificados"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'certificados');

CREATE POLICY "Anyone can read certificados"
ON storage.objects FOR SELECT
USING (bucket_id = 'certificados');

CREATE POLICY "Anyone can delete certificados"
ON storage.objects FOR DELETE
USING (bucket_id = 'certificados');

CREATE POLICY "Anyone can update certificados"
ON storage.objects FOR UPDATE
USING (bucket_id = 'certificados');

-- Add certificate columns to emitentes table
ALTER TABLE public.emitentes
ADD COLUMN cert_file_path TEXT DEFAULT NULL,
ADD COLUMN cert_file_name TEXT DEFAULT NULL,
ADD COLUMN cert_validade TEXT DEFAULT NULL;
