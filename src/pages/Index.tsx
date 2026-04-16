import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import StudentEvents from "@/pages/StudentEvents";
import AdminDashboard from "@/pages/AdminDashboard";

const Index = () => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <AppLayout>
      {role === "admin" ? <AdminDashboard /> : <StudentEvents />}
    </AppLayout>
  );
};

export default Index;
