import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, ClipboardCheck, Clock, BarChart3, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { getReportSummary } from "@/lib/admin-reports";

const AdminDashboard = () => {
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [events, regs, pending, reportSummary] = await Promise.all([
        supabase.from("events").select("id", { count: "exact", head: true }),
        supabase.from("registrations").select("id", { count: "exact", head: true }),
        supabase.from("registrations").select("id", { count: "exact", head: true }).eq("status", "pending"),
        getReportSummary(),
      ]);
      return {
        totalEvents: events.count || 0,
        totalRegistrations: regs.count || 0,
        pendingApprovals: pending.count || 0,
        activeStudents: reportSummary.activeStudents,
        multiEventStudents: reportSummary.multiEventStudentCount,
      };
    },
  });

  const cards = [
    { title: "Total Events", value: stats?.totalEvents ?? 0, icon: Calendar, color: "text-blue-600" },
    { title: "Total Registrations", value: stats?.totalRegistrations ?? 0, icon: Users, color: "text-green-600" },
    { title: "Pending Approvals", value: stats?.pendingApprovals ?? 0, icon: Clock, color: "text-amber-600" },
    { title: "Active Students", value: stats?.activeStudents ?? 0, icon: Users, color: "text-purple-600" },
    { title: "Multi-Event Students", value: stats?.multiEventStudents ?? 0, icon: AlertCircle, color: "text-orange-600" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      
      <div className="grid gap-4 sm:grid-cols-5">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detailed Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Access comprehensive reports on event participation, student engagement, and scheduling analytics.
          </p>
          <Button onClick={() => navigate("/admin/reports")} className="gap-2">
            <BarChart3 className="h-4 w-4" />
            View Detailed Reports
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
