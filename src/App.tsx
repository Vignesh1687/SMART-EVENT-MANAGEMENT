import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import MyEvents from "./pages/MyEvents";
import StudentEvents from "./pages/StudentEvents";
import AdminEvents from "./pages/AdminEvents";
import AdminRegistrations from "./pages/AdminRegistrations";
import AdminReports from "./pages/AdminReports";
import VenueBlocks from "./pages/VenueBlocks";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Index />} />
            <Route
              path="/events"
              element={
                <ProtectedRoute>
                  <AppLayout><StudentEvents /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-events"
              element={
                <ProtectedRoute>
                  <AppLayout><MyEvents /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/events"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AppLayout><AdminEvents /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/registrations"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AppLayout><AdminRegistrations /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AppLayout><AdminReports /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/venues"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AppLayout><VenueBlocks /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
