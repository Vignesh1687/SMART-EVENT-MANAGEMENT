import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, FileText } from "lucide-react";
import { format } from "date-fns";
import { generateODLetter } from "@/lib/od-letter";
import { Database } from "@/integrations/supabase/types";

type RegistrationWithEvent = Database['public']['Tables']['registrations']['Row'] & {
  events?: Database['public']['Tables']['events']['Row'];
};

const MyEvents = () => {
  const { user, profile } = useAuth();

  const { data: registrations, isLoading } = useQuery({
    queryKey: ["my-registrations-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select("*, events(*)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div>
      <h1 className="text-4xl font-bold uppercase tracking-[0.2em] text-white futuristic-title mb-2">My Events</h1>
      <p className="text-slate-300 mb-6">Your registered events and approvals</p>
      {!registrations?.length ? (
        <p className="text-slate-400 text-center py-12">You haven't registered for any events yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {registrations.map((reg: RegistrationWithEvent) => (
            <Card key={reg.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">{reg.events?.title}</CardTitle>
                    {reg.events?.event_type && (
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{reg.events.event_type}</p>
                    )}
                  </div>
                  <Badge variant={reg.status === "approved" ? "default" : reg.status === "rejected" ? "destructive" : "secondary"}>
                    {reg.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {reg.events?.event_date && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(reg.events.event_date), "PPP")}
                  </div>
                )}
                {reg.events?.venue && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {reg.events.venue}
                  </div>
                )}
                {reg.status === "approved" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={async () =>
                      await generateODLetter({
                        studentName: profile?.full_name || "",
                        registerNumber: profile?.register_number || "",
                        department: profile?.department || "",
                        eventName: reg.events?.title || "",
                        eventType: reg.events?.event_type || undefined,
                        eventDate: reg.events?.event_date || "",
                        eventTime: reg.events?.start_time && reg.events?.end_time ? `${format(new Date(`1970-01-01T${reg.events.start_time}`), "hh:mm a")} - ${format(new Date(`1970-01-01T${reg.events.end_time}`), "hh:mm a")}` : undefined,
                        eventVenue: reg.events?.venue || undefined,
                      })
                    }
                  >
                    <FileText className="h-4 w-4" />
                    Download OD Letter
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyEvents;
