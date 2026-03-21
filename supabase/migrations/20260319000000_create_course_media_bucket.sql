-- Create the course-media storage bucket for uploaded course assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-media',
  'course-media',
  true,
  52428800, -- 50 MB
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/svg+xml',
    'image/webp',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
    'application/pdf'
  ]
);

-- Anyone can read files (public bucket)
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-media');

-- Authenticated users can upload into their own user folder
CREATE POLICY "Authenticated upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own files
CREATE POLICY "Owner delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'course-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
