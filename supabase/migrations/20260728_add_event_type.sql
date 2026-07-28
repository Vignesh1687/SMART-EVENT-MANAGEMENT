-- Add event_type to events table for event category tracking
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='events' AND column_name='event_type'
  ) THEN
    ALTER TABLE public.events
    ADD COLUMN event_type TEXT;
  END IF;
END$$;
