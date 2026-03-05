import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Crown, DollarSign, Users, TrendingDown, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

const statusColors: Record<string, string> = {
  pending_payment: "bg-yellow-500/20 text-yellow-400",
  active: "bg-green-500/20 text-green-400",
  expired: "bg-red-500/20 text-red-400",
  canceled: "bg-muted text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  pending_payment: "Pendente",
  active: "Ativo",
  expired: "Expirado",
  canceled: "Cancelado",
};

export default function SubscriptionsTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("todos");

  const { data: subs = [], isLoading } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("subscriptions")
        .select("*, profiles!subscriptions_user_id_fkey(nome, email, telefone)")
        .order("created_at", { ascending: false });
      if (error) {
        const { data: d2 } = await (supabase as any)
          .from("subscriptions")
          .select("*")
          .order("created_at", { ascending: false });
        return d2 || [];
      }
      return data || [];
    },
  });

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel("admin-subs-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  // Metrics
  const activeCount = subs.filter((s: any) => s.status === "active").length;
  const canceledCount = subs.filter((s: any) => s.status === "canceled").length;
  const pendingCount = subs.filter((s: any) => s.status === "pending_payment").length;
  const mrrCents = subs.filter((s: any) => s.status === "active").reduce((s: number, r: any) => s + Number(r.price || 0), 0);
  const mrr = (mrrCents / 100).toFixed(2);
  const churn = subs.length > 0 ? ((canceledCount / subs.length) * 100).toFixed(1) : "0.0";

  const filtered = filter === "todos" ? subs : subs.filter((s: any) => s.status === filter);

  const kpis = [
    { label: "Ativos", value: activeCount, icon: Users, color: "text-green-400", bg: "bg-green-500/10" },
    { label: "Pendentes", value: pendingCount, icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/10" },
    { label: "MRR", value: `R$${mrr}`, icon: DollarSign, color: "text-gold", bg: "bg-gold/10" },
    { label: "Churn", value: `${churn}%`, icon: TrendingDown, color: "text-red-400", bg: "bg-red-500/10" },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-4 rounded-xl border border-border bg-card p-5"
          >
            <div className={`rounded-lg p-2.5 ${k.bg}`}>
              <k.icon className={`h-5 w-5 ${k.color}`} />
            </div>
            <div>
              <p className="font-heading text-2xl font-bold text-foreground">{k.value}</p>
              <p className="font-body text-xs text-muted-foreground">{k.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {["todos", "pending_payment", "active", "expired", "canceled"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-1.5 font-body text-xs transition-colors ${
              filter === s ? "bg-gold text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {s === "todos" ? "Todos" : statusLabels[s]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full font-body text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Créditos</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Renovação</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s: any) => (
              <tr key={s.id} className="border-b border-border transition-colors hover:bg-secondary/30">
                <td className="px-4 py-3">
                  <div>
                    <p className="text-foreground">{s.profiles?.nome || s.user_id?.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">{s.profiles?.email || ""}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[s.status] || ""}`}>
                    {statusLabels[s.status] || s.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                    {s.provider || "—"}
                  </span>
                </td>
                <td className="px-4 py-3 text-foreground">
                  {s.credits_available}/{s.credits_total}
                </td>
                <td className="px-4 py-3 text-gold">
                  R${(Number(s.price) / 100).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {s.renewal_date ? format(new Date(s.renewal_date), "dd/MM/yyyy") : "—"}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Nenhuma assinatura encontrada</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
