import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, CalendarDays, Scissors, Users, LogOut, Settings, Menu, X, Crown } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import DashboardTab from "@/components/admin/DashboardTab";
import ReservationsTab from "@/components/admin/ReservationsTab";
import ServicesTab from "@/components/admin/ServicesTab";
import BarbersTab from "@/components/admin/BarbersTab";
import SettingsTab from "@/components/admin/SettingsTab";
import SubscriptionsTab from "@/components/admin/SubscriptionsTab";
import { toast } from "sonner";

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "reservas", label: "Reservas", icon: CalendarDays },
  { id: "assinaturas", label: "Assinaturas", icon: Crown },
  { id: "servicos", label: "Serviços", icon: Scissors },
  { id: "barbeiros", label: "Barbeiros", icon: Users },
  { id: "config", label: "Configurações", icon: Settings },
];

export default function Admin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/admin/login"); return; }
      setLoading(false);
    };
    check();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) navigate("/admin/login");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado");
    navigate("/admin/login");
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" /></div>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-background/80 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-border bg-card transition-transform lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center justify-between border-b border-border px-6">
          <div className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-gold" />
            <span className="font-heading text-sm font-bold text-foreground">BARBER CLUB</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden"><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => { setActiveTab(t.id); setSidebarOpen(false); }}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 font-body text-sm transition-colors ${activeTab === t.id ? "bg-gold/10 text-gold" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-border p-4">
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-4 py-3 font-body text-sm text-destructive hover:bg-secondary">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <header className="flex h-16 items-center gap-4 border-b border-border px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden"><Menu className="h-5 w-5 text-foreground" /></button>
          <h1 className="flex-1 font-heading text-xl font-bold text-foreground">{tabs.find((t) => t.id === activeTab)?.label}</h1>
          <NotificationBell />
        </header>
        <div className="p-6">
          {activeTab === "dashboard" && <DashboardTab />}
          {activeTab === "reservas" && <ReservationsTab />}
          {activeTab === "assinaturas" && <SubscriptionsTab />}
          {activeTab === "servicos" && <ServicesTab />}
          {activeTab === "barbeiros" && <BarbersTab />}
          {activeTab === "config" && <SettingsTab />}
        </div>
      </main>
    </div>
  );
}
