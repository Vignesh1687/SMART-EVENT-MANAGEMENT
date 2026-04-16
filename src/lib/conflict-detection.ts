import { supabase } from "@/integrations/supabase/client";
import type { Event } from "@/types/database";

/**
 * Check if two time ranges overlap (events can be back-to-back)
 * Event A: 10:00-12:00 and Event B: 12:00-13:00 are NOT considered overlapping
 * Handles overnight events: 23:00-01:00 (crosses midnight)
 */
export const timesOverlap = (
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean => {
  try {
    // Convert time strings (HH:MM:SS) to minutes for comparison
    const parts1Start = start1.split(":");
    const parts1End = end1.split(":");
    const parts2Start = start2.split(":");
    const parts2End = end2.split(":");

    const h1 = parseInt(parts1Start[0], 10);
    const m1 = parseInt(parts1Start[1], 10);
    const h1e = parseInt(parts1End[0], 10);
    const m1e = parseInt(parts1End[1], 10);
    const h2 = parseInt(parts2Start[0], 10);
    const m2 = parseInt(parts2Start[1], 10);
    const h2e = parseInt(parts2End[0], 10);
    const m2e = parseInt(parts2End[1], 10);

    const s1 = h1 * 60 + m1;
    const e1 = h1e * 60 + m1e;
    const s2 = h2 * 60 + m2;
    const e2 = h2e * 60 + m2e;

    // Handle overnight events (when end time < start time)
    // Event 1 crosses midnight
    const event1OvernightFlag = e1 < s1;
    // Event 2 crosses midnight
    const event2OvernightFlag = e2 < s2;

    // If both events are normal (no midnight crossing)
    if (!event1OvernightFlag && !event2OvernightFlag) {
      // Allow back-to-back events: e1 <= s2 means no conflict
      return !(e1 <= s2 || e2 <= s1);
    }

    // If event 1 crosses midnight but event 2 doesn't
    if (event1OvernightFlag && !event2OvernightFlag) {
      // Event 1: s1 to 24:00 (1440 min) and 00:00 to e1
      // Overlap if: s1 <= s2 < 1440 OR 0 <= s2 <= e1 OR s1 <= e2 < 1440 OR 0 <= e2 <= e1
      return (s1 <= s2) || (s2 <= e1) || (s1 <= e2) || (e2 <= e1);
    }

    // If event 2 crosses midnight but event 1 doesn't
    if (!event1OvernightFlag && event2OvernightFlag) {
      // Event 2: s2 to 24:00 (1440 min) and 00:00 to e2
      // Overlap if: s2 <= s1 < 1440 OR 0 <= s1 <= e2 OR s2 <= e1 < 1440 OR 0 <= e1 <= e2
      return (s2 <= s1) || (s1 <= e2) || (s2 <= e1) || (e1 <= e2);
    }

    // Both events cross midnight
    // They always overlap since both cover 00:00 time or meet at boundaries
    return true;
  } catch (error) {
    console.error("Error in timesOverlap:", error);
    return false;
  }
};

/**
 * Check if two time ranges have same-day conflict (for student warning)
 * Shows warning even if times don't strictly overlap but student has multiple events same day
 */
export const hasSameDayEvents = (
  eventDate1: string,
  startTime1: string,
  endTime1: string,
  eventDate2: string,
  startTime2: string,
  endTime2: string
): boolean => {
  // Same day and times overlap
  return eventDate1 === eventDate2 && timesOverlap(startTime1, endTime1, startTime2, endTime2);
};

/**
 * Check for time conflicts with other registered events
 */
export const checkTimeConflicts = async (
  userId: string,
  eventDate: string,
  startTime: string,
  endTime: string,
  excludeEventId?: string
): Promise<Event[]> => {
  try {
    // Get all registered events for the user on the same date
    const { data: registrations, error: regError } = await supabase
      .from("registrations")
      .select("event_id")
      .eq("user_id", userId)
      .eq("status", "approved");

    if (regError) throw regError;

    if (!registrations || registrations.length === 0) {
      return [];
    }

    const eventIds = registrations.map((r) => r.event_id);

    // Get all events for these registrations on the same date
    const { data: events, error: eventError } = await supabase
      .from("events")
      .select("*")
      .in("id", eventIds)
      .eq("event_date", eventDate)
      .neq("id", excludeEventId || "");

    if (eventError) throw eventError;

    // Filter events that have time conflicts
    const conflictingEvents = (events || []).filter((event: Event) =>
      timesOverlap(startTime, endTime, event.start_time, event.end_time)
    );

    return conflictingEvents;
  } catch (error) {
    console.error("Error checking time conflicts:", error);
    return [];
  }
};

/**
 * Check for venue conflicts - SIMPLIFIED VERSION
 * Returns conflicting events or empty array
 */
export const checkVenueConflicts = async (
  venue: string,
  eventDate: string,
  startTime: string,
  endTime: string,
  excludeEventId?: string
): Promise<Event[]> => {
  try {
    if (!venue || !eventDate || !startTime || !endTime) {
      return [];
    }

    // Query: Get ALL events first to debug
    const { data: allEvents, error: allError } = await supabase
      .from("events")
      .select("*");

    if (allError) {
      console.error("Database error:", allError.message);
      return [];
    }

    if (!allEvents || allEvents.length === 0) {
      return [];
    }

    // Filter to events at this venue on this date
    const eventsAtVenueAndDate = allEvents.filter((e: Event) => {
      const venueMatch = e.venue === venue;
      const dateMatch = e.event_date === eventDate;
      return venueMatch && dateMatch;
    });

    if (eventsAtVenueAndDate.length === 0) {
      return [];
    }

    // Filter to exclude the current event if editing
    const otherEvents = excludeEventId
      ? eventsAtVenueAndDate.filter((e: Event) => e.id !== excludeEventId)
      : eventsAtVenueAndDate;

    // Check each event for time overlap
    const conflicts = otherEvents.filter((event: Event) => {
      return timesOverlap(startTime, endTime, event.start_time, event.end_time);
    });

    return conflicts;
  } catch (error) {
    console.error("Error in checkVenueConflicts:", error);
    return [];
  }
};

/**
 * Format time string for display (HH:MM:SS to HH:MM)
 */
export const formatTime = (timeStr: string): string => {
  if (!timeStr) return "";
  return timeStr.substring(0, 5);
};
