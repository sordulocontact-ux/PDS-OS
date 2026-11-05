-- Master files up to 500 MB (Ibé, 02/11/2026: « Impossible de mettre des fichiers
-- de plus de 50 Mo »). Same limit as the production-files bucket. Stems, audio
-- versions and deliveries of a title are big WAV/AIFF files.
-- The Supabase project's global upload limit (Storage settings) must be
-- raised to at least 500 MB too, or the bucket limit is capped by it.

alter table public.master_files
  drop constraint master_files_bytes_check,
  add constraint master_files_bytes_check
    check (bytes > 0 and bytes <= 524288000);

update storage.buckets
   set file_size_limit = 524288000
 where id = 'master-files';
