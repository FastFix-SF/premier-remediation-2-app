-- Create storage bucket for hero images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('hero-images', 'hero-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to hero images bucket
CREATE POLICY IF NOT EXISTS "Hero images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'hero-images');

-- Allow authenticated users to upload hero images
CREATE POLICY IF NOT EXISTS "Authenticated users can upload hero images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'hero-images' AND auth.role() = 'authenticated');

-- Allow service role to manage hero images
CREATE POLICY IF NOT EXISTS "Service role can manage hero images"
  ON storage.objects FOR ALL
  USING (bucket_id = 'hero-images');

-- Add hero_image column to services table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'services' AND column_name = 'hero_image'
  ) THEN
    ALTER TABLE services ADD COLUMN hero_image TEXT;
  END IF;
END $$;

-- Add hero_image column to areas table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'areas' AND column_name = 'hero_image'
  ) THEN
    ALTER TABLE areas ADD COLUMN hero_image TEXT;
  END IF;
END $$;

-- Add image_generation_status column to track generation state
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'services' AND column_name = 'image_generation_status'
  ) THEN
    ALTER TABLE services ADD COLUMN image_generation_status TEXT DEFAULT 'pending';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'areas' AND column_name = 'image_generation_status'
  ) THEN
    ALTER TABLE areas ADD COLUMN image_generation_status TEXT DEFAULT 'pending';
  END IF;
END $$;

-- Function to trigger hero image generation via Edge Function
CREATE OR REPLACE FUNCTION trigger_hero_image_generation()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  edge_function_url TEXT;
BEGIN
  -- Only trigger if hero_image is null and status is pending
  IF NEW.hero_image IS NULL AND (NEW.image_generation_status IS NULL OR NEW.image_generation_status = 'pending') THEN
    -- Mark as generating
    NEW.image_generation_status := 'generating';

    -- Build payload based on table type
    IF TG_TABLE_NAME = 'services' THEN
      payload := jsonb_build_object(
        'type', 'service',
        'recordId', NEW.id,
        'saveToStorage', true,
        'data', jsonb_build_object(
          'name', NEW.name,
          'shortDescription', COALESCE(NEW.short_description, NEW.description, ''),
          'icon', NEW.icon
        )
      );
    ELSIF TG_TABLE_NAME = 'areas' THEN
      payload := jsonb_build_object(
        'type', 'area',
        'recordId', NEW.id,
        'saveToStorage', true,
        'data', jsonb_build_object(
          'name', NEW.name,
          'fullName', COALESCE(NEW.full_name, NEW.name || ', California'),
          'population', NEW.population
        )
      );
    END IF;

    -- Queue the edge function call using pg_net if available
    -- This is async so it won't block the insert
    BEGIN
      PERFORM net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/generate-hero-image',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := payload
      );
    EXCEPTION WHEN OTHERS THEN
      -- If pg_net is not available, just log and continue
      RAISE NOTICE 'Could not queue hero image generation: %', SQLERRM;
      NEW.image_generation_status := 'pending';
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for auto-generation (disabled by default, enable when ready)
DROP TRIGGER IF EXISTS services_hero_image_trigger ON services;
-- CREATE TRIGGER services_hero_image_trigger
--   BEFORE INSERT ON services
--   FOR EACH ROW
--   EXECUTE FUNCTION trigger_hero_image_generation();

DROP TRIGGER IF EXISTS areas_hero_image_trigger ON areas;
-- CREATE TRIGGER areas_hero_image_trigger
--   BEFORE INSERT ON areas
--   FOR EACH ROW
--   EXECUTE FUNCTION trigger_hero_image_generation();

-- Comment: Uncomment the triggers above to enable auto-generation
-- For now, image generation can be triggered manually via the Edge Function
