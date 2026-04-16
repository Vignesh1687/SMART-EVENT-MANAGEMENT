import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Pencil, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { checkVenueConflicts, formatTime } from "@/lib/conflict-detection";
import { COLLEGE_VENUES } from "@/lib/venue-management";
import type { Event } from "@/types/database";

const AdminEvents = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [venueConflict, setVenueConflict] = useState<Event | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [venue, setVenue] = useState("");
  const [hasConflict, setHasConflict] = useState(false);

  const { data: events, isLoading } = useQuery({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").order("event_date", { ascending: false });
      if (error) throw error;
      return data as Event[];
    },
  });

  const resetForm = () => {
    setTitle(""); setDescription(""); setEventDate(""); setStartTime(""); setEndTime(""); setVenue("");
    setVenueConflict(null);
    setHasConflict(false);
    setEditing(null);
  };

  // Real-time conflict detection using useEffect
  useEffect(() => {
    const checkConflicts = async () => {
      // Only check if all required fields are filled
      if (!venue || !eventDate || !startTime || !endTime) {
        setHasConflict(false);
        setVenueConflict(null);
        return;
      }

      try {
        const startTimeFormatted = startTime.padEnd(8, ":00");
        const endTimeFormatted = endTime.padEnd(8, ":00");

        const conflicts = await checkVenueConflicts(
          venue,
          eventDate,
          startTimeFormatted,
          endTimeFormatted,
          editing?.id
        );

        if (conflicts.length > 0) {
          setVenueConflict(conflicts[0]);
          setHasConflict(true);
        } else {
          setVenueConflict(null);
          setHasConflict(false);
        }
      } catch (error) {
        console.error("Error checking conflicts:", error);
        setHasConflict(false);
      }
    };

    // Call immediately without debounce for better responsiveness
    checkConflicts();
  }, [venue, eventDate, startTime, endTime, editing?.id]);

  const openEdit = (event: Event) => {
    setEditing(event);
    setTitle(event.title);
    setDescription(event.description || "");
    setEventDate(event.event_date);
    setStartTime(event.start_time);
    setEndTime(event.end_time);
    setVenue(event.venue || "");
    setVenueConflict(null);
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      console.log("💾 [SAVE MUTATION TRIGGERED]");
      console.log("  hasConflict state:", hasConflict);

      // CRITICAL: Check for venue conflicts BEFORE saving
      if (venue && eventDate && startTime && endTime) {
        console.log("🔍 [FINAL VALIDATION BEFORE SAVE]");
        console.log("  Venue:", venue);
        console.log("  Date:", eventDate);
        console.log("  Start:", startTime);
        console.log("  End:", endTime);

        const startTimeFormatted = startTime.padEnd(8, ":00");
        const endTimeFormatted = endTime.padEnd(8, ":00");

        const conflicts = await checkVenueConflicts(
          venue,
          eventDate,
          startTimeFormatted,
          endTimeFormatted,
          editing?.id
        );

        console.log("  📊 Conflicts found:", conflicts.length);

        if (conflicts.length > 0) {
          const conflictEvent = conflicts[0];
          console.log("  ❌ CONFLICT BLOCK:", conflictEvent.title, conflictEvent.start_time, "-", conflictEvent.end_time);
          setVenueConflict(conflictEvent);
          setHasConflict(true);
          const errorMsg =
            `❌ VENUE CONFLICT - CANNOT CREATE!\n\n` +
            `${venue} is booked ${formatTime(conflictEvent.start_time)}–${formatTime(conflictEvent.end_time)} for "${conflictEvent.title}"\n\n` +
            `Your request: ${startTime}–${endTime}\n\n` +
            `These times OVERLAP and conflict!\n\n` +
            `Solution: Start time must be ${formatTime(conflictEvent.end_time)} or later`;
          throw new Error(errorMsg);
        } else {
          console.log("  ✅ No conflicts - proceeding with save");
        }
      }

      // All checks passed - proceed with creating/updating event
      const startTimeFormatted = startTime.padEnd(8, ":00");
      const endTimeFormatted = endTime.padEnd(8, ":00");

      const payload = {
        title,
        description,
        event_date: eventDate,
        start_time: startTimeFormatted,
        end_time: endTimeFormatted,
        venue: venue || null,
        created_by: user!.id,
      };

      console.log("✅ Payload ready for database:", payload);

      // FINAL CHECK: If this is a NEW event (not editing), do one more venue check
      if (!editing && venue) {
        console.log("🔒 [FINAL SAFETY CHECK BEFORE INSERT]");
        const finalConflicts = await checkVenueConflicts(
          venue,
          eventDate,
          startTimeFormatted,
          endTimeFormatted
        );
        
        if (finalConflicts.length > 0) {
          const conflictEvent = finalConflicts[0];
          console.log("❌ FINAL CHECK DETECTED CONFLICT:", conflictEvent.title);
          const errorMsg = 
            `❌ VENUE JUST BOOKED!\n\n` +
            `${venue} was just booked by another user for ${formatTime(conflictEvent.start_time)}–${formatTime(conflictEvent.end_time)}\n\n` +
            `Please try again with different time or venue.`;
          throw new Error(errorMsg);
        }
        console.log("✅ Final check passed - venue still available!");
      }

      if (editing) {
        const { error } = await supabase.from("events").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("events").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      console.log("🎉 Event saved successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      toast.success(editing ? "Event updated!" : "Event created!");
      setOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      console.log("❌ Save error:", err.message);
      setHasConflict(true);
      toast.error(err.message || "Failed to save event");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      toast.success("Event deleted!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Manage Events</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> New Event</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Event" : "Create Event"}</DialogTitle>
            </DialogHeader>
            
            <form 
              onSubmit={(e) => { 
                e.preventDefault();
                // Double-check: don't allow submission if conflict exists
                if (hasConflict) {
                  toast.error("⛔ Cannot create event - venue conflict detected!");
                  return;
                }
                // Also check: all required fields must be filled
                if (!title || !eventDate || !startTime || !endTime || !venue) {
                  toast.error("❌ Please fill all required fields");
                  return;
                }
                saveMutation.mutate();
              }} 
              className="space-y-4"
            >
              {venueConflict && (
                <Alert className="border-red-600 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800 font-bold">
                    ⛔ CANNOT CREATE - VENUE CONFLICT!
                    <div className="mt-2 text-sm font-normal">
                      <strong>{venue}</strong> is already booked from <strong>{formatTime(venueConflict.start_time)}–{formatTime(venueConflict.end_time)}</strong> 
                      for "<strong>{venueConflict.title}</strong>"
                    </div>
                    <div className="mt-2 text-sm font-normal">
                      Your event time: <strong>{startTime}–{endTime}</strong>
                    </div>
                    <div className="mt-2 text-sm font-normal text-red-700">
                      These times overlap! This booking is not allowed.
                    </div>
                    <div className="mt-2 text-sm font-normal">
                      <strong>Options:</strong>
                      <ul className="list-disc ml-4 mt-1">
                        <li>Change start time to <strong>{formatTime(venueConflict.end_time)}</strong> or later</li>
                        <li>Choose a different venue block</li>
                        <li>Choose a different date</li>
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input 
                  type="date" 
                  value={eventDate} 
                  onChange={(e) => setEventDate(e.target.value)} 
                  required 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input 
                    type="time" 
                    value={startTime} 
                    onChange={(e) => setStartTime(e.target.value)} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input 
                    type="time" 
                    value={endTime} 
                    onChange={(e) => setEndTime(e.target.value)} 
                    required 
                  />
                  {startTime && endTime && endTime < startTime && (
                    <p className="text-xs text-amber-600 mt-1">⏰ This event crosses midnight (overnight)</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Venue (College Blocks)</Label>
                <select
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="w-full border rounded px-3 py-2 bg-white"
                >
                  <option value="">Select a venue block...</option>
                  {COLLEGE_VENUES.map((v) => (
                    <option key={v.id} value={v.name}>
                      {v.name} ({v.buildingName}, Capacity: {v.capacity})
                    </option>
                  ))}
                </select>
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={hasConflict || saveMutation.isPending}
                onClick={(e) => {
                  if (hasConflict) {
                    e.preventDefault();
                    console.log("🛑 SUBMIT BLOCKED: Conflict exists!");
                    toast.error("❌ Cannot submit - venue conflict exists!");
                  }
                }}
              >
                {hasConflict 
                  ? "🛑 BLOCKED - Venue Conflict" 
                  : saveMutation.isPending 
                    ? "Saving..." 
                    : editing 
                      ? "Update Event" 
                      : "Create Event"
                }
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Venue</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events?.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium">{event.title}</TableCell>
                  <TableCell>{format(new Date(event.event_date), "PPP")}</TableCell>
                  <TableCell>{formatTime(event.start_time)}–{formatTime(event.end_time)}</TableCell>
                  <TableCell>{event.venue || "—"}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(event)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(event.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {!events?.length && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No events yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminEvents;
