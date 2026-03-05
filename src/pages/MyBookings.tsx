import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { CalendarDays, Clock, User, Scissors, ArrowLeft, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/barbershop/Navbar";

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  pendente: { label: "Pendente", color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", icon: "⏳" },
  confirmado: { label: "Confirmado", color: "bg-green-500/15 text-green-400 border-green-500/30", icon: "✅" },
  cancelado: { label: "Cancelado", color: "bg-red-500/15 text-red-400 border-red-500/30", icon: "❌" },
  concluido: { label: "Concluído", color: "bg-blue-500/15 text-blue-400 border-blue-500/30", icon: "🎉" },
};

export default function MyBookings() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth?redirect=/meus-agendamentos");
  }, [authLoading, user, navigate]);

  const { data: reservas = [], isLoading } = useQuery({
    queryKey: ["my-bookings", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("reservas")
        .select("*, barbeiros(nome), servicos(nome, preco)")
        .eq("user_id", user.id)
        .order("data", { ascending: false })
        .order("horario", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Realtime subscription for status changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("my-reservas-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "reservas", filter: `user_id=eq.${user.id}` },
        () => { qc.invalidateQueries({ queryKey: ["my-bookings"] }); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pb-16 pt-28">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link to="/" className="mb-2 inline-flex items-center gap-1 font-body text-xs text-muted-foreground hover:text-gold">
              <ArrowLeft className="h-3 w-3" /> Voltar
            </Link>
            <h1 className="font-heading text-3xl font-bold text-foreground">Meus Agendamentos</h1>
            <p className="mt-1 font-body text-sm text-muted-foreground">Acompanhe suas reservas em tempo real</p>
          </div>
          <Link
            to="/agendar"
            className="gold-gradient btn-premium flex items-center gap-2 rounded-lg px-5 py-2.5 font-body text-sm font-semibold text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> Nova Reserva
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
          </div>
        ) : reservas.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-lg border border-border bg-card p-12 text-center"
          >
            <CalendarDays className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
            <h3 className="mb-2 font-heading text-xl font-semibold text-foreground">Nenhum agendamento</h3>
            <p className="mb-6 font-body text-sm text-muted-foreground">
              Você ainda não fez nenhuma reserva.
            </p>
            <Link
              to="/agendar"
              className="gold-gradient inline-block rounded-lg px-8 py-3 font-body text-sm font-semibold text-primary-foreground"
            >
              Agendar Agora
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {reservas.map((r: any, i: number) => {
              const status = statusConfig[r.status] || statusConfig.pendente;
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-gold/20"
                >
                  <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-body text-xs font-medium ${status.color}`}>
                          {status.icon} {status.label}
                        </span>
                        <span className="font-body text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 font-body text-sm text-foreground">
                        <span className="flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5 text-gold" />
                          {r.data}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-gold" />
                          {r.horario?.slice(0, 5)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-gold" />
                          {(r.barbeiros as any)?.nome || "—"}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Scissors className="h-3.5 w-3.5 text-gold" />
                          {(r.servicos as any)?.nome || "—"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-heading text-xl font-bold text-gold">
                        R${Number((r.servicos as any)?.preco || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
