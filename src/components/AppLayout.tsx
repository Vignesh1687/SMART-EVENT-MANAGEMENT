import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, Calendar, ClipboardList, LayoutDashboard, LogOut, Menu, X, BarChart3, Grid3x3 } from "lucide-react";
import { useState } from "react";

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, role, profile, signOut } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = role === "admin";

  const navItems = isAdmin
    ? [
        { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
        { to: "/admin/events", label: "Manage Events", icon: Calendar },
        { to: "/admin/venues", label: "Venue Blocks", icon: Grid3x3 },
        { to: "/admin/registrations", label: "Registrations", icon: ClipboardList },
        { to: "/admin/reports", label: "Reports", icon: BarChart3 },
      ]
    : [
        { to: "/events", label: "Events", icon: Calendar },
        { to: "/my-events", label: "My Events", icon: ClipboardList },
      ];

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top Nav */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg hidden sm:inline">Smart Events</span>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.to} to={item.to}>
                <Button variant={location.pathname === item.to ? "secondary" : "ghost"} size="sm" className="gap-2">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {profile?.full_name || user?.email}
            </span>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden border-t bg-background p-2 space-y-1">
            {navItems.map((item) => (
              <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)}>
                <Button variant={location.pathname === item.to ? "secondary" : "ghost"} className="w-full justify-start gap-2">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </div>
        )}
      </header>

      <main className="container py-6">{children}</main>
    </div>
  );
};

export default AppLayout;
