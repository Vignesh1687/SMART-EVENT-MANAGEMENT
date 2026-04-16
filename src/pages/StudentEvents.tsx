import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calendar, MapPin, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { checkTimeConflicts, formatTime } from "@/lib/conflict-detection";
import { useState } from "react";
import type { Event } from "@/types/database";

const StudentEvents = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [timeConflicts, setTimeConflicts] = useState<Map<string, Event[]>>(new Map());

  const { data: events, isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").order("event_date", { ascending: true });
      if (error) throw error;
      return data as Event[];
    },
  });

  const { data: myRegistrations } = useQuery({
    queryKey: ["my-registrations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("registrations").select("event_id, status").eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const registerMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase.from("registrations").insert({ user_id: user!.id, event_id: eventId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-registrations"] });
      toast.success("Registered successfully! Awaiting admin approval.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleRegisterClick = async (event: Event) => {
    // Check for time conflicts
    const conflicts = await checkTimeConflicts(user!.id, event.event_date, event.start_time, event.end_time);
    
    if (conflicts.length > 0) {
      setTimeConflicts(new Map(timeConflicts).set(event.id, conflicts));
      toast.warning(`Time conflict detected with "${conflicts[0].title}"`);
    } else {
      setTimeConflicts(new Map(timeConflicts).set(event.id, []));
      registerMutation.mutate(event.id);
    }
  };

  const getRegistration = (eventId: string) => myRegistrations?.find((r) => r.event_id === eventId);

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Upcoming Events</h1>
      {!events?.length ? (
        <p className="text-muted-foreground text-center py-12">No events available yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => {
            const reg = getRegistration(event.id);
            const conflicts = timeConflicts.get(event.id) || [];

            return (
              <Card key={event.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{event.title}</CardTitle>
                  <CardDescription>{event.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {conflicts.length > 0 && (
                    <Alert className="border-amber-200 bg-amber-50">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertTitle className="text-amber-900 text-sm">Time Conflict</AlertTitle>
                      <AlertDescription className="text-amber-800 text-xs mt-1">
                        You are already registered for "<strong>{conflicts[0].title}</strong>" from {formatTime(conflicts[0].start_time)}–{formatTime(conflicts[0].end_time)} on the same day.
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(event.event_date), "PPP")}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {formatTime(event.start_time)}–{formatTime(event.end_time)}
                  </div>
                  {event.venue && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {event.venue}
                    </div>
                  )}
                  {reg ? (
                    <Badge variant={reg.status === "approved" ? "default" : reg.status === "rejected" ? "destructive" : "secondary"}>
                      {reg.status.charAt(0).toUpperCase() + reg.status.slice(1)}
                    </Badge>
                  ) : (
                    <Button 
                      size="sm" 
                      onClick={() => handleRegisterClick(event)} 
                      disabled={registerMutation.isPending}
                      variant={conflicts.length > 0 ? "outline" : "default"}
                    >
                      {conflicts.length > 0 ? "Register Anyway" : "Register"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentEvents;
