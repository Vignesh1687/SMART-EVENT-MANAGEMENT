import { useQuery } from "@tanstack/react-query";
import { getEventParticipationReport, getSameDayConflictStudents, getStudentParticipationReport, getMultiEventStudents } from "@/lib/admin-reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from "date-fns";
import { formatTime } from "@/lib/conflict-detection";
import { AlertCircle } from "lucide-react";

const AdminReports = () => {
  const { data: eventReport, isLoading: isLoadingEvents } = useQuery({
    queryKey: ["event-participation-report"],
    queryFn: async () => {
      const report = await getEventParticipationReport();
      return report;
    },
  });

  const { data: studentReport, isLoading: isLoadingStudents } = useQuery({
    queryKey: ["student-participation-report"],
    queryFn: async () => {
      const report = await getStudentParticipationReport();
      return report;
    },
  });

  const { data: multiEventStudents, isLoading: isLoadingMultiEvent } = useQuery({
    queryKey: ["multi-event-students"],
    queryFn: async () => {
      const report = await getMultiEventStudents();
      return report;
    },
  });

  const { data: sameDayConflicts, isLoading: isLoadingConflicts } = useQuery({
    queryKey: ["same-day-conflicts"],
    queryFn: async () => {
      const report = await getSameDayConflictStudents();
      return report;
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Admin Reports</h1>
        <p className="text-muted-foreground">View event participation and student engagement analytics</p>
      </div>

      <Tabs defaultValue="events" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="events">Event-wise Participation</TabsTrigger>
          <TabsTrigger value="students">Student-wise Participation</TabsTrigger>
          <TabsTrigger value="multi-event">Multi-Event Students</TabsTrigger>
          <TabsTrigger value="same-day">Same-Day Conflicts</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          <div className="grid gap-4">
            {eventReport?.map((report) => (
              <Card key={report.event.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{report.event.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {format(new Date(report.event.event_date), "PPP")} • {formatTime(report.event.start_time)}–{formatTime(report.event.end_time)}
                      </p>
                      {report.event.venue && <p className="text-sm text-muted-foreground">📍 {report.event.venue}</p>}
                    </div>
                    <Badge variant="default" className="ml-2">
                      {report.participantCount} participants
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {report.participants.length > 0 ? (
                    <div className="space-y-2">
                      {report.participants.map((participant) => (
                        <div key={participant.user_id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div>
                            <p className="font-medium">{participant.full_name}</p>
                            {participant.register_number && <p className="text-xs text-muted-foreground">{participant.register_number}</p>}
                            {participant.department && <p className="text-xs text-muted-foreground">{participant.department}</p>}
                          </div>
                          <Badge variant="outline" className={getStatusColor(participant.registrationStatus)}>
                            {participant.registrationStatus}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No participants yet</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <div className="text-sm text-muted-foreground mb-4">
            Showing all students and their registered events
          </div>
          {isLoadingStudents ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Register Number</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Events Count</TableHead>
                      <TableHead>Events</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentReport && studentReport.length > 0 ? (
                      studentReport.map((student) => (
                        <TableRow key={student.profile.user_id}>
                          <TableCell className="font-medium">{student.profile.full_name}</TableCell>
                          <TableCell>{student.profile.register_number || "—"}</TableCell>
                          <TableCell>{student.profile.department || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{student.eventCount}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {student.events.map((event) => (
                                <Badge key={event.id} variant="outline" className="text-xs">
                                  {event.title}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="multi-event" className="space-y-4">
          <div className="text-sm text-muted-foreground mb-4">
            Students participating in more than one event
          </div>
          {isLoadingMultiEvent ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Events Count</TableHead>
                      <TableHead>Events</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {multiEventStudents && multiEventStudents.length > 0 ? (
                      multiEventStudents.map((student) => (
                        <TableRow key={student.profile.user_id}>
                          <TableCell className="font-medium">{student.profile.full_name}</TableCell>
                          <TableCell>
                            <Badge variant="default">{student.eventCount}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {student.events.map((event) => (
                                <Badge key={event.id} variant="outline" className="text-xs">
                                  {event.title}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          No students in multiple events
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="same-day" className="space-y-4">
          <div className="text-sm text-muted-foreground mb-4">
            Students with overlapping events on the same day
          </div>
          {isLoadingConflicts ? (
            <div className="text-center py-8">Loading...</div>
          ) : sameDayConflicts && sameDayConflicts.length > 0 ? (
            <div className="grid gap-4">
              {sameDayConflicts.map((conflict) => (
                <Card key={conflict.profile.user_id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{conflict.profile.full_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {conflict.profile.register_number && `Reg. No: ${conflict.profile.register_number}`}
                      {conflict.profile.department && ` | ${conflict.profile.department}`}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {conflict.conflictGroups.map((group) => (
                        <div key={group.date} className="border-l-4 border-orange-500 pl-4 py-2">
                          <h4 className="font-semibold mb-2">{format(new Date(group.date), "PPP")}</h4>
                          <Alert className="border-orange-200 bg-orange-50 mb-3">
                            <AlertCircle className="h-4 w-4 text-orange-600" />
                            <AlertTitle className="text-orange-900 text-sm">Schedule Conflict</AlertTitle>
                            <AlertDescription className="text-orange-800 text-xs">
                              This student has {group.events.length} events with overlapping times on this day
                            </AlertDescription>
                          </Alert>
                          <div className="space-y-2">
                            {group.events
                              .sort((a, b) => a.start_time.localeCompare(b.start_time))
                              .map((event) => (
                                <div key={event.id} className="bg-slate-50 p-3 rounded border border-slate-200">
                                  <p className="font-medium">{event.title}</p>
                                  <p className="text-sm text-muted-foreground">
                                    ⏰ {formatTime(event.start_time)}–{formatTime(event.end_time)}
                                  </p>
                                  {event.venue && (
                                    <p className="text-sm text-muted-foreground">
                                      📍 {event.venue}
                                    </p>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                ✅ No schedule conflicts detected. All students have non-overlapping events!
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminReports;
