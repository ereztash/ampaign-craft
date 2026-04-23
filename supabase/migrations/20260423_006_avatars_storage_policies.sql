-- Storage-level access control for the "avatars" bucket.
--
-- The bucket is referenced from src/pages/Profile.tsx but no migration
-- defined its policies, so the rules existed only in the Supabase
-- dashboard (or not at all, depending on environment). That meant writes
-- to `${victim_id}/avatar.jpg` from an attacker token could succeed on any
-- deploy where the dashboard had loose defaults — and the bucket is served
-- publicly, so a malicious file would load from the victim's avatar URL.
--
-- This migration codifies the intended policies so every environment
-- enforces them identically:
--   - The bucket exists, is public for reads (avatars are displayed to
--     anyone who can see a profile).
--   - Writes, updates, and deletes are restricted to authenticated users,
--     and only under a path prefix matching their own auth.uid().
--   - 4 MB per-object size cap, matching the client-side check.
--   - image/jpeg, image/png, image/webp MIME whitelist — no svg, no html.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  4 * 1024 * 1024,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read stays unchanged (the bucket is marked public) so we skip
-- a SELECT policy; supabase/storage honours the bucket public flag.

DROP POLICY IF EXISTS "Avatars: owner writes only" ON storage.objects;
CREATE POLICY "Avatars: owner writes only"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Avatars: owner updates only" ON storage.objects;
CREATE POLICY "Avatars: owner updates only"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Avatars: owner deletes only" ON storage.objects;
CREATE POLICY "Avatars: owner deletes only"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

COMMENT ON POLICY "Avatars: owner writes only" ON storage.objects IS
  'Storage writes to the avatars bucket require the top-level folder name '
  'to match auth.uid(), preventing cross-user avatar overwrites.';
