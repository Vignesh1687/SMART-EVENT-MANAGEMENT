-- Add start_time and end_time fields to events table
ALTER TABLE public.events
ADD COLUMN start_time TIME NOT NULL DEFAULT '00:00:00',
ADD COLUMN end_time TIME NOT NULL DEFAULT '01:00:00';

-- Drop the old event_time column if it exists
ALTER TABLE public.events
DROP COLUMN event_time;

-- Create index for venue+date+time conflict detection
CREATE INDEX idx_events_venue_date_time ON public.events(venue, event_date, start_time, end_time);
