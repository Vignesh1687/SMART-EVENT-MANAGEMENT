import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek } from "date-fns";
import { formatTime } from "@/lib/conflict-detection";
import type { Event } from "@/types/database";

interface EventCalendarProps {
  date?: Date;
}

const EventCalendar: React.FC<EventCalendarProps> = ({ date = new Date() }) => {
  const { data: events } = useQuery({
    queryKey: ["calendar-events", date],
    queryFn: async () => {
      const startDate = format(startOfMonth(date), "yyyy-MM-dd");
      const endDate = format(endOfMonth(date), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .gte("event_date", startDate)
        .lte("event_date", endDate)
        .order("event_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;
      return (data || []) as Event[];
    },
  });

  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  // Group events by date
  const eventsByDate = new Map<string, Event[]>();
  events?.forEach((event) => {
    const key = event.event_date;
    if (!eventsByDate.has(key)) {
      eventsByDate.set(key, []);
    }
    eventsByDate.get(key)!.push(event);
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-2">Event Calendar</h2>
        <p className="text-muted-foreground">{format(monthStart, "MMMM yyyy")}</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 gap-0 border-b">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="p-4 text-center font-semibold border-r last:border-r-0 border-gray-200">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0">
            {days.map((day, idx) => {
              const dayEvents = eventsByDate.get(format(day, "yyyy-MM-dd")) || [];
              const isCurrentMonth = isSameMonth(day, monthStart);

              return (
                <div
                  key={idx}
                  className={`min-h-[150px] p-2 border-r border-b last:border-r-0 ${
                    isCurrentMonth ? "bg-white" : "bg-gray-50"
                  }`}
                >
                  <div className="font-semibold text-sm mb-2 text-muted-foreground">
                    {format(day, "d")}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div key={event.id} className="text-xs">
                        <div className="bg-blue-100 text-blue-800 rounded px-2 py-1 truncate">
                          <div className="font-medium truncate">{event.title}</div>
                          <div className="text-blue-700">{formatTime(event.start_time)}–{formatTime(event.end_time)}</div>
                          {event.venue && <div className="text-blue-600">📍 {event.venue}</div>}
                        </div>
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <Badge variant="secondary" className="text-xs">
                        +{dayEvents.length - 2} more
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Events</CardTitle>
        </CardHeader>
        <CardContent>
          {events && events.length > 0 ? (
            <div className="space-y-4">
              {events.slice(0, 10).map((event) => (
                <div key={event.id} className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0">
                  <div className="flex-1">
                    <h3 className="font-semibold">{event.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(event.event_date), "PPP")} • {formatTime(event.start_time)}–{formatTime(event.end_time)}
                    </p>
                    {event.venue && (
                      <p className="text-sm text-muted-foreground">📍 {event.venue}</p>
                    )}
                    {event.description && (
                      <p className="text-sm mt-2">{event.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No events scheduled</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EventCalendar;
