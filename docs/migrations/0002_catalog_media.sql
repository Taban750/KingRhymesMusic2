-- Additive catalog schema for paid video downloads and album archive sales.
CREATE TABLE IF NOT EXISTS albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(255) NOT NULL,
  slug varchar(255) NOT NULL UNIQUE,
  cover_url text,
  archive_path text,
  preview_path text,
  description text,
  price_usd numeric(10,2) NOT NULL DEFAULT '9.99',
  is_free boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS media_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(255) NOT NULL,
  slug varchar(255) NOT NULL UNIQUE,
  cover_url text,
  video_full_path text,
  video_preview_path text,
  description text,
  price_usd numeric(10,2) NOT NULL DEFAULT '1.99',
  is_free boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now()
);
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS album_id uuid REFERENCES albums(id) ON DELETE RESTRICT;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS video_id uuid REFERENCES media_videos(id) ON DELETE RESTRICT;
