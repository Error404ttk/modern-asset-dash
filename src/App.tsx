import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Navbar } from "@/components/Navbar";
import Dashboard from "./pages/Dashboard";
import Equipment from "./pages/Equipment";
import AddEquipment from "./pages/AddEquipment";
import EquipmentDetail from "./pages/EquipmentDetail";
import BorrowReturn from "./pages/BorrowReturn";
import History from "./pages/History";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            <div className="flex-1 flex flex-col">
              <Navbar />
              <main className="flex-1 p-6 bg-background">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/equipment" element={<Equipment />} />
                  <Route path="/equipment/add" element={<AddEquipment />} />
                  <Route path="/equipment/:id" element={<EquipmentDetail />} />
                  <Route path="/reports" element={<Dashboard />} />
                  <Route path="/borrow-return" element={<BorrowReturn />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/settings" element={<Settings />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </div>
        </SidebarProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
