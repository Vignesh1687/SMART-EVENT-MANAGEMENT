import { supabase } from "@/integrations/supabase/client";
import type { Event, Registration, Profile } from "@/types/database";

export interface EventReport {
  event: Event;
  participantCount: number;
  participants: (Profile & { registrationStatus: string })[];
}

export interface StudentParticipation {
  profile: Profile;
  events: Event[];
  eventCount: number;
}

export interface StudentSameDayConflict {
  profile: Profile;
  conflictGroups: Array<{
    date: string;
    events: Event[];
  }>;
  totalConflictDays: number;
}

/**
 * Get event-wise participation report
 */
export const getEventParticipationReport = async (): Promise<EventReport[]> => {
  try {
    const { data: events, error: eventError } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: true });

    if (eventError) throw eventError;

    const reports: EventReport[] = [];

    for (const event of events || []) {
      const { data: registrations, error: regError } = await supabase
        .from("registrations")
        .select("user_id, status")
        .eq("event_id", event.id);

      if (regError) throw regError;

      const participants: (Profile & { registrationStatus: string })[] = [];

      for (const reg of registrations || []) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", reg.user_id)
          .single();

        if (!profileError && profile) {
          participants.push({
            ...profile,
            registrationStatus: reg.status,
          });
        }
      }

      reports.push({
        event,
        participantCount: registrations?.length || 0,
        participants,
      });
    }

    return reports;
  } catch (error) {
    console.error("Error getting event participation report:", error);
    return [];
  }
};

/**
 * Get student-wise participation report
 */
export const getStudentParticipationReport = async (): Promise<StudentParticipation[]> => {
  try {
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name", { ascending: true });

    if (profileError) throw profileError;

    const reports: StudentParticipation[] = [];

    for (const profile of profiles || []) {
      const { data: registrations, error: regError } = await supabase
        .from("registrations")
        .select("event_id, status")
        .eq("user_id", profile.user_id);

      if (regError) throw regError;

      const eventIds = (registrations || []).map((r) => r.event_id);
      let events: Event[] = [];

      if (eventIds.length > 0) {
        const { data: eventData, error: eventError } = await supabase
          .from("events")
          .select("*")
          .in("id", eventIds)
          .order("event_date", { ascending: true });

        if (eventError) throw eventError;
        events = (eventData || []) as Event[];
      }

      reports.push({
        profile,
        events,
        eventCount: eventIds.length,
      });
    }

    return reports;
  } catch (error) {
    console.error("Error getting student participation report:", error);
    return [];
  }
};

/**
 * Get students participating in multiple events
 */
export const getMultiEventStudents = async (): Promise<MultiEventStudent[]> => {
  try {
    // Get all students with registrations (any status)
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("*");

    if (profileError) throw profileError;

    const multiEventStudents: MultiEventStudent[] = [];

    for (const profile of profiles || []) {
      const { data: registrations, error: regError } = await supabase
        .from("registrations")
        .select("event_id, status")
        .eq("user_id", profile.user_id);

      if (regError) throw regError;

      if ((registrations || []).length > 1) {
        const eventIds = registrations!.map((r) => r.event_id);
        const { data: events, error: eventError } = await supabase
          .from("events")
          .select("*")
          .in("id", eventIds)
          .order("event_date", { ascending: true });

        if (eventError) throw eventError;

        multiEventStudents.push({
          profile,
          eventCount: registrations!.length,
          events: (events || []) as Event[],
        });
      }
    }

    // Sort by event count descending
    multiEventStudents.sort((a, b) => b.eventCount - a.eventCount);

    return multiEventStudents;
  } catch (error) {
    console.error("Error getting multi-event students:", error);
    return [];
  }
};

/**
 * Get students with same-day event conflicts
 * Shows students who have multiple events on the SAME DAY with overlapping times
 */
export const getSameDayConflictStudents = async (): Promise<StudentSameDayConflict[]> => {
  try {
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("*");

    if (profileError) throw profileError;

    const conflictStudents: StudentSameDayConflict[] = [];

    for (const profile of profiles || []) {
      const { data: registrations, error: regError } = await supabase
        .from("registrations")
        .select("event_id, status")
        .eq("user_id", profile.user_id);

      if (regError) throw regError;

      if (!registrations || registrations.length < 2) continue;

      const eventIds = registrations.map((r) => r.event_id);
      const { data: events, error: eventError } = await supabase
        .from("events")
        .select("*")
        .in("id", eventIds)
        .order("event_date", { ascending: true });

      if (eventError) throw eventError;

      // Group events by date and find conflicts
      const eventsByDate = new Map<string, Event[]>();
      (events || []).forEach((event) => {
        const key = event.event_date;
        if (!eventsByDate.has(key)) {
          eventsByDate.set(key, []);
        }
        eventsByDate.get(key)!.push(event);
      });

      // Find dates with conflicts (multiple events that overlap)
      const conflictGroups: Array<{ date: string; events: Event[] }> = [];

      eventsByDate.forEach((dayEvents, date) => {
        if (dayEvents.length > 1) {
          // Check if any events on this day overlap
          let hasConflict = false;
          const conflictingEvents: Event[] = [];

          for (let i = 0; i < dayEvents.length; i++) {
            for (let j = i + 1; j < dayEvents.length; j++) {
              // Parse time strings more carefully
              const startParts1 = dayEvents[i].start_time.split(":");
              const endParts1 = dayEvents[i].end_time.split(":");
              const startParts2 = dayEvents[j].start_time.split(":");
              const endParts2 = dayEvents[j].end_time.split(":");

              const h1 = parseInt(startParts1[0], 10);
              const m1 = parseInt(startParts1[1], 10);
              const h1e = parseInt(endParts1[0], 10);
              const m1e = parseInt(endParts1[1], 10);
              const h2 = parseInt(startParts2[0], 10);
              const m2 = parseInt(startParts2[1], 10);
              const h2e = parseInt(endParts2[0], 10);
              const m2e = parseInt(endParts2[1], 10);

              const s1 = h1 * 60 + m1;
              const e1 = h1e * 60 + m1e;
              const s2 = h2 * 60 + m2;
              const e2 = h2e * 60 + m2e;

              // Check for overlap
              if (!(e1 <= s2 || e2 <= s1)) {
                hasConflict = true;
                if (!conflictingEvents.find((e) => e.id === dayEvents[i].id)) {
                  conflictingEvents.push(dayEvents[i]);
                }
                if (!conflictingEvents.find((e) => e.id === dayEvents[j].id)) {
                  conflictingEvents.push(dayEvents[j]);
                }
              }
            }
          }

          if (hasConflict && conflictingEvents.length > 0) {
            conflictGroups.push({ date, events: conflictingEvents.sort((a, b) => a.start_time.localeCompare(b.start_time)) });
          }
        }
      });

      if (conflictGroups.length > 0) {
        conflictStudents.push({
          profile,
          conflictGroups,
          totalConflictDays: conflictGroups.length,
        });
      }
    }

    // Sort by number of conflict days descending
    conflictStudents.sort((a, b) => b.totalConflictDays - a.totalConflictDays);

    return conflictStudents;
  } catch (error) {
    console.error("Error getting same-day conflict students:", error);
    return [];
  }
};

/**
 * Get summary statistics
 */
export const getReportSummary = async () => {
  try {
    const [eventReport, studentReport, multiEventStudents] = await Promise.all([
      getEventParticipationReport(),
      getStudentParticipationReport(),
      getMultiEventStudents(),
    ]);

    const totalParticipations = eventReport.reduce((sum, r) => sum + r.participantCount, 0);
    const activeStudents = studentReport.filter((s) => s.eventCount > 0).length;

    return {
      totalEvents: eventReport.length,
      totalParticipations,
      activeStudents,
      multiEventStudentCount: multiEventStudents.length,
    };
  } catch (error) {
    console.error("Error getting report summary:", error);
    return {
      totalEvents: 0,
      totalParticipations: 0,
      activeStudents: 0,
      multiEventStudentCount: 0,
    };
  }
};
