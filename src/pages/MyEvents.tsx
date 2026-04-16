import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, FileText } from "lucide-react";
import { format } from "date-fns";
import { generateODLetter } from "@/lib/od-letter";

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
      <h1 className="text-2xl font-bold mb-6">My Events</h1>
      {!registrations?.length ? (
        <p className="text-muted-foreground text-center py-12">You haven't registered for any events yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {registrations.map((reg: any) => (
            <Card key={reg.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{reg.events?.title}</CardTitle>
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
                    onClick={() =>
                      generateODLetter({
                        studentName: profile?.full_name || "",
                        registerNumber: profile?.register_number || "",
                        department: profile?.department || "",
                        eventName: reg.events?.title || "",
                        eventDate: reg.events?.event_date || "",
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
