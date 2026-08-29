-- Module 2: human-manageable website gallery metadata.
-- Google Drive remains the image source; Supabase stores only presentation metadata.

ALTER TABLE public.gallery_albums
  ADD COLUMN IF NOT EXISTS source_folder_name text,
  ADD COLUMN IF NOT EXISTS public_title text,
  ADD COLUMN IF NOT EXISTS public_slug text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS project_type text,
  ADD COLUMN IF NOT EXISTS services text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS location_label text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS cover_image_id uuid,
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS display_position integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.gallery_albums ALTER COLUMN status SET DEFAULT 'draft';

ALTER TABLE public.gallery_images
  ADD COLUMN IF NOT EXISTS source_filename text,
  ADD COLUMN IF NOT EXISTS display_title text,
  ADD COLUMN IF NOT EXISTS caption text,
  ADD COLUMN IF NOT EXISTS alt_text text,
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'progress',
  ADD COLUMN IF NOT EXISTS display_position integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.gallery_albums
SET
  public_title = CASE
    WHEN lower(coalesce(public_slug, slug, name, '')) ~ '(project[-_ ]?001|renovation-project-001|trombley)' THEN 'A Brighter Way to Live'
    WHEN lower(coalesce(public_slug, slug, name, '')) ~ '(project[-_ ]?002|renovation-project-002|lentil|daycare)' THEN 'Ready for Busy Little Days'
    WHEN lower(coalesce(public_slug, slug, name, '')) ~ '(project[-_ ]?003|renovation-project-003|buckingham)' THEN 'Connected From Room to Room'
    WHEN lower(coalesce(public_slug, slug, name, '')) ~ '(project[-_ ]?004|p004|greenstone-1|greenstone 1)' THEN 'Clean Lines, Room to Grow'
    WHEN lower(coalesce(public_slug, slug, name, '')) ~ '(project[-_ ]?005|p005|greenstone-2|greenstone 2)' THEN 'From Unfinished to Refined'
    WHEN lower(coalesce(public_slug, slug, name, '')) ~ '(project[-_ ]?009|p009|stapleford)' THEN 'Every Detail Brought Together'
    ELSE coalesce(public_title, name, 'Completed Cstle Project')
  END,
  public_slug = coalesce(nullif(public_slug, ''), slug),
  description = CASE
    WHEN lower(coalesce(public_slug, slug, name, '')) ~ '(project[-_ ]?001|renovation-project-001|trombley)' THEN 'Painting, doors, trim, flooring transitions and bathroom details come together in a clean, comfortable space.'
    WHEN lower(coalesce(public_slug, slug, name, '')) ~ '(project[-_ ]?002|renovation-project-002|lentil|daycare)' THEN 'A practical space shaped for childcare, with durable surfaces, open circulation, a compact washroom and considered finishing details.'
    WHEN lower(coalesce(public_slug, slug, name, '')) ~ '(project[-_ ]?003|renovation-project-003|buckingham)' THEN 'A compact suite brought together through consistent kitchen, bathroom, living, flooring, door and trim details.'
    WHEN lower(coalesce(public_slug, slug, name, '')) ~ '(project[-_ ]?004|p004|greenstone-1|greenstone 1)' THEN 'Consistent flooring, door and closet trim, hallway alignment and stair details give this space a calm, connected finish.'
    WHEN lower(coalesce(public_slug, slug, name, '')) ~ '(project[-_ ]?005|p005|greenstone-2|greenstone 2)' THEN 'A transformation documented from early construction through flooring, trim and stair installation to the finished space.'
    WHEN lower(coalesce(public_slug, slug, name, '')) ~ '(project[-_ ]?009|p009|stapleford)' THEN 'Drywall, flooring, painting, stair work and kitchenette installation combine in a functional, complete space.'
    ELSE description
  END,
  project_type = CASE
    WHEN lower(coalesce(public_slug, slug, name, '')) ~ '(001|002|003|004|005|009|trombley|lentil|daycare|buckingham|greenstone|stapleford)' THEN 'Basement renovation'
    ELSE coalesce(project_type, 'Other')
  END,
  services = CASE
    WHEN lower(coalesce(public_slug, slug, name, '')) ~ '(project[-_ ]?001|renovation-project-001|trombley)' THEN ARRAY['Basement finishing','Painting','Flooring','Trim & doors','Bathrooms']
    WHEN lower(coalesce(public_slug, slug, name, '')) ~ '(project[-_ ]?002|renovation-project-002|lentil|daycare)' THEN ARRAY['Basement finishing','Flooring','Trim & doors','Bathrooms','Installations']
    WHEN lower(coalesce(public_slug, slug, name, '')) ~ '(project[-_ ]?003|renovation-project-003|buckingham)' THEN ARRAY['Basement finishing','Kitchens','Bathrooms','Flooring','Trim & doors']
    WHEN lower(coalesce(public_slug, slug, name, '')) ~ '(project[-_ ]?00[45]|p00[45]|greenstone)' THEN ARRAY['Basement finishing','Flooring','Trim & doors','Painting']
    WHEN lower(coalesce(public_slug, slug, name, '')) ~ '(project[-_ ]?009|p009|stapleford)' THEN ARRAY['Basement finishing','Flooring','Painting','Trim & doors','Installations']
    ELSE services
  END,
  status = 'completed',
  published = true,
  published_at = coalesce(published_at, now()),
  updated_at = now()
WHERE is_active IS DISTINCT FROM false;

UPDATE public.gallery_images
SET
  display_title = coalesce(nullif(display_title, ''), title, 'Project image'),
  alt_text = coalesce(nullif(alt_text, ''), nullif(display_title, ''), title, 'Cstle construction project image'),
  stage = CASE
    WHEN lower(coalesce(display_title, title, source_filename, '')) ~ '(concept|visualization)' THEN 'concept'
    WHEN lower(coalesce(display_title, title, source_filename, '')) ~ '(^|[^a-z])before([^a-z]|$)|early' THEN 'before'
    WHEN lower(coalesce(display_title, title, source_filename, '')) ~ '(complete|finished)' THEN 'completed'
    WHEN lower(coalesce(display_title, title, source_filename, '')) ~ '(progress|installation|later)' THEN 'progress'
    ELSE 'completed'
  END,
  display_position = coalesce(display_position, position, 0),
  updated_at = now();

CREATE UNIQUE INDEX IF NOT EXISTS gallery_albums_public_slug_key
  ON public.gallery_albums(public_slug) WHERE public_slug IS NOT NULL;

ALTER TABLE public.gallery_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gallery_albums_public_read" ON public.gallery_albums;
DROP POLICY IF EXISTS "Public read gallery_albums" ON public.gallery_albums;
CREATE POLICY "Public read published gallery albums"
  ON public.gallery_albums FOR SELECT TO anon
  USING (is_active = true AND published = true);

DROP POLICY IF EXISTS "gallery_images_public_read" ON public.gallery_images;
DROP POLICY IF EXISTS "Public read gallery_images" ON public.gallery_images;
CREATE POLICY "Public read published gallery images"
  ON public.gallery_images FOR SELECT TO anon
  USING (
    is_active = true AND published = true AND EXISTS (
      SELECT 1 FROM public.gallery_albums album
      WHERE album.id = gallery_images.album_id
        AND album.is_active = true
        AND album.published = true
    )
  );

GRANT SELECT ON public.gallery_albums, public.gallery_images TO anon, authenticated;
