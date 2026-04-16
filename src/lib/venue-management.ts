import { supabase } from "@/integrations/supabase/client";
import type { Event } from "@/types/database";

/**
 * College venue blocks (100 rooms)
 * Named with block numbers and designations
 */
export const COLLEGE_VENUES = Array.from({ length: 100 }, (_, i) => {
  const blockNum = i + 1;
  const building = Math.floor((blockNum - 1) / 25) + 1; // Buildings A, B, C, D
  const buildingName = ["A", "B", "C", "D"][building - 1];
  const roomNum = ((blockNum - 1) % 25) + 1;
  
  return {
    id: blockNum,
    name: `Block ${buildingName}-${roomNum}`,
    buildingName: `Building ${buildingName}`,
    capacity: 30 + (blockNum % 50), // Varying capacities
    floor: Math.ceil(roomNum / 5),
  };
});

export type VenueBlockStatus = "available" | "occupied" | "upcoming" | "error";

export interface VenueBlockInfo {
  venue: typeof COLLEGE_VENUES[0];
  status: VenueBlockStatus;
  currentEvent: Event | null;
  nextEvent: Event | null;
  endTime: string | null;
  nextStartTime: string | null;
}

/**
 * Get all venues with their current status
 */
export const getVenueBlocksStatus = async (): Promise<VenueBlockInfo[]> => {
  try {
    const now = new Date();
    const todayString = now.toISOString().split("T")[0];
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:00`;

    // Get all events for today and upcoming
    const { data: events, error } = await supabase
      .from("events")
      .select("*")
      .gte("event_date", todayString)
      .order("event_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) throw error;

    const statusMap = new Map<string, VenueBlockInfo>();

    // Initialize all venues
    for (const venue of COLLEGE_VENUES) {
      statusMap.set(venue.name, {
        venue,
        status: "available",
        currentEvent: null,
        nextEvent: null,
        endTime: null,
        nextStartTime: null,
      });
    }

    // Map events to venues
    for (const event of events || []) {
      if (!event.venue) continue;

      const blockInfo = statusMap.get(event.venue);
      if (!blockInfo) continue;

      const isToday = event.event_date === todayString;
      const eventHasEnded = isToday && event.end_time <= currentTime;
      const eventIsHappening =
        isToday && event.start_time <= currentTime && event.end_time > currentTime;

      if (eventIsHappening) {
        // RED: Currently occupied
        blockInfo.status = "occupied";
        blockInfo.currentEvent = event;
        blockInfo.endTime = event.end_time;
      } else if (!eventHasEnded && !blockInfo.currentEvent) {
        // YELLOW: Upcoming event (next in queue)
        blockInfo.status = "upcoming";
        blockInfo.nextEvent = event;
        blockInfo.nextStartTime = event.start_time;
      }
    }

    return Array.from(statusMap.values());
  } catch (error) {
    console.error("Error getting venue blocks status:", error);
    return COLLEGE_VENUES.map((venue) => ({
      venue,
      status: "error",
      currentEvent: null,
      nextEvent: null,
      endTime: null,
      nextStartTime: null,
    }));
  }
};

/**
 * Get status color for a venue
 * RED: occupied, YELLOW: upcoming, GREEN: available
 */
export const getStatusColor = (status: VenueBlockStatus): string => {
  switch (status) {
    case "occupied":
      return "bg-red-100 border-red-500 text-red-900"; // RED: Cannot select
    case "upcoming":
      return "bg-yellow-100 border-yellow-500 text-yellow-900"; // YELLOW: Waiting for venue
    case "available":
      return "bg-green-100 border-green-500 text-green-900"; // GREEN: Ready to use
    case "error":
      return "bg-gray-100 border-gray-500 text-gray-900";
    default:
      return "bg-gray-100 border-gray-500 text-gray-900";
  }
};

export const getStatusLabel = (status: VenueBlockStatus): string => {
  switch (status) {
    case "occupied":
      return "❌ OCCUPIED";
    case "upcoming":
      return "⏳ NEXT EVENT";
    case "available":
      return "✅ AVAILABLE";
    case "error":
      return "⚠️ ERROR";
    default:
      return "UNKNOWN";
  }
};

/**
 * Check if a venue is available for booking at specified time
 */
export const isVenueAvailable = (
  venueStatus: VenueBlockInfo,
  eventDate: string,
  startTime: string,
  endTime: string
): boolean => {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  // If event is today, check real-time status
  if (eventDate === today) {
    if (venueStatus.status === "occupied") {
      // Check if event ends before new event starts
      return venueStatus.endTime! <= startTime;
    }
  }

  // For future dates or when not occupied, it's available
  return true;
};

/**
 * Get availability percentage for a venue on a given date
 */
export const getVenueAvailability = (
  events: Event[],
  venueName: string,
  eventDate: string
): number => {
  const venueEvents = events.filter(
    (e) => e.venue === venueName && e.event_date === eventDate
  );

  if (venueEvents.length === 0) return 100;

  let occupiedMinutes = 0;
  const totalMinutes = 24 * 60;

  for (const event of venueEvents) {
    const startParts = event.start_time.split(":");
    const endParts = event.end_time.split(":");

    const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
    const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);

    occupiedMinutes += endMinutes - startMinutes;
  }

  return Math.max(0, Math.round((1 - occupiedMinutes / totalMinutes) * 100));
};
