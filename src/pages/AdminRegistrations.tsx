import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Check, X, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useState } from "react";
import type { Event } from "@/types/database";

const AdminRegistrations = () => {
  const { role, user } = useAuth();
  const queryClient = useQueryClient();
  const [filterEvent, setFilterEvent] = useState<string>("all");

  const { data: events } = useQuery({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").order("event_date", { ascending: false });
      if (error) throw error;
      return data as Event[];
    },
  });

  // Simplified approach: fetch registrations, then get events and profiles separately
  const { data: registrations, isLoading, error: registrationsError } = useQuery({
    queryKey: ["admin-registrations", filterEvent],
    queryFn: async () => {
      // Step 1: Get all registrations
      let query = supabase
        .from("registrations")
        .select("*")
        .order("created_at", { ascending: false });

      if (filterEvent !== "all") {
        query = query.eq("event_id", filterEvent);
      }

      const { data: regs, error: regError } = await query;
      if (regError) {
        console.error("Registrations fetch error:", regError);
        throw regError;
      }

      if (!regs || regs.length === 0) return [];

      // Step 2: Get all event IDs and fetch events
      const eventIds = [...new Set(regs.map(r => r.event_id))];
      const { data: events, error: eventError } = await supabase
        .from("events")
        .select("id, title, event_date")
        .in("id", eventIds);

      if (eventError) {
        console.error("Events fetch error:", eventError);
        throw eventError;
      }

      // Step 3: Get all user IDs and fetch profiles
      const userIds = [...new Set(regs.map(r => r.user_id))];
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, register_number, department")
        .in("user_id", userIds);

      if (profileError) {
        console.error("Profiles fetch error:", profileError);
        throw profileError;
      }

      // Step 4: Manually join the data
      return regs.map(reg => ({
        ...reg,
        events: events?.find(e => e.id === reg.event_id) || null,
        profiles: profiles?.find(p => p.user_id === reg.user_id) || null,
      }));
    },
  });

  // Fallback query to check if registrations exist without joins
  const { data: rawRegistrationCount } = useQuery({
    queryKey: ["registration-count"],
    queryFn: async () => {
      const { data, error } = await supabase.from("registrations").select("id", { count: "exact" });
      if (error) console.error("Count query error:", error);
      return data?.length || 0;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const { error } = await supabase.from("registrations").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-registrations"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Status updated!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Registrations</h1>
        <Select value={filterEvent} onValueChange={setFilterEvent}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by event" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            {events?.map((event) => (
              <SelectItem key={event.id} value={event.id}>{event.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {role !== "admin" && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Admin Role Missing</AlertTitle>
          <AlertDescription>
            Your account doesn't have the admin role. Current role: <strong>{role}</strong>. Contact your system administrator to grant admin access.
          </AlertDescription>
        </Alert>
      )}

      {role === "admin" && !registrations?.length && !registrationsError && rawRegistrationCount === 0 && (
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900">No Registrations Yet</AlertTitle>
          <AlertDescription className="text-blue-800">
            Students haven't registered for any events yet. They can register from the "Upcoming Events" page.
          </AlertDescription>
        </Alert>
      )}

      {registrationsError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error loading registrations</AlertTitle>
          <AlertDescription>
            {registrationsError instanceof Error ? registrationsError.message : "An error occurred while fetching registrations. Check the browser console for details."}
          </AlertDescription>
        </Alert>
      )}

      {!registrationsError && !registrations?.length && rawRegistrationCount && rawRegistrationCount > 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Data Loading Issue</AlertTitle>
          <AlertDescription>
            Found {rawRegistrationCount} registration(s) in database, but unable to load with event and profile details. This may be a permissions issue. Check browser console for details.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Reg. No</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrations?.map((reg: any) => (
                  <TableRow key={reg.id}>
                    <TableCell className="font-medium">{reg.profiles?.full_name ?? <span style={{color: '#888'}}>No profile</span>}</TableCell>
                    <TableCell>{reg.profiles?.register_number ?? <span style={{color: '#888'}}>—</span>}</TableCell>
                    <TableCell>{reg.profiles?.department ?? <span style={{color: '#888'}}>—</span>}</TableCell>
                    <TableCell>{reg.events?.title ?? <span style={{color: '#888'}}>No event</span>}</TableCell>
                    <TableCell>{reg.events?.event_date ? format(new Date(reg.events.event_date), "PP") : <span style={{color: '#888'}}>—</span>}</TableCell>
                    <TableCell>
                      <Badge variant={reg.status === "approved" ? "default" : reg.status === "rejected" ? "destructive" : "secondary"}>
                        {reg.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {reg.status === "pending" && (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => updateStatus.mutate({ id: reg.id, status: "approved" })}>
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => updateStatus.mutate({ id: reg.id, status: "rejected" })}>
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!registrations?.length && !registrationsError && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No registrations</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminRegistrations;
