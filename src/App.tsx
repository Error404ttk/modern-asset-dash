import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Dashboard from "./pages/Dashboard";
import Equipment from "./pages/Equipment";
import AddEquipment from "./pages/AddEquipment";
import EquipmentDetail from "./pages/EquipmentDetail";
import BorrowReturn from "./pages/BorrowReturn";
import History from "./pages/History";
import Scan from "./pages/Scan";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { OrganizationSettingsProvider } from "@/hooks/useOrganizationSettings";

const queryClient = new QueryClient();

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">กำลังโหลด...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

// Main App Layout Component
function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/30">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar />
          <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
              {children}
            </div>
          </main>
          <Footer />
        </div>
      </div>
    </SidebarProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <OrganizationSettingsProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={
              <ProtectedRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/equipment" element={
              <ProtectedRoute>
                <AppLayout>
                  <Equipment />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/equipment/add" element={
              <ProtectedRoute>
                <AppLayout>
                  <AddEquipment />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/equipment/:id" element={
              <ProtectedRoute>
                <AppLayout>
                  <EquipmentDetail />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/borrow-return" element={
              <ProtectedRoute>
                <AppLayout>
                  <BorrowReturn />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/scan" element={
              <ProtectedRoute>
                <AppLayout>
                  <Scan />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/history" element={
              <ProtectedRoute>
                <AppLayout>
                  <History />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/users" element={
              <ProtectedRoute>
                <AppLayout>
                  <Users />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <AppLayout>
                  <Settings />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </OrganizationSettingsProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
