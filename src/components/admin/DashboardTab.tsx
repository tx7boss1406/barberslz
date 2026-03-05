import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingUp, Receipt, Percent, Clock, CheckCircle2, XCircle, Award } from "lucide-react";
import { format, subDays } from "date-fns";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

type ChartMode = "receita7" | "reservas7" | "receita30";

export default function DashboardTab() {
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd");
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const currentDay = new Date().getDate();
  const [chartMode, setChartMode] = useState<ChartMode>("receita7");

  // Fetch ALL reservas for the month (one query for everything)
  const { data: allReservas = [], isLoading } = useQuery({
    queryKey: ["admin-dashboard-reservas", monthStart],
    queryFn: async () => {
      const { data } = await supabase
        .from("reservas")
        .select("*, servicos(preco, nome)")
        .gte("data", format(subDays(new Date(), 30), "yyyy-MM-dd"));
      return data || [];
    },
  });

  const { data: config } = useQuery({
    queryKey: ["admin-config"],
    queryFn: async () => {
      const { data } = await supabase.from("configuracoes").select("*").limit(1).single();
      return data as any;
    },
  });

  // Realtime invalidation
  useEffect(() => {
    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "reservas" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-dashboard-reservas"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  // ── Metrics (RECEITA = SOMENTE CONCLUÍDO) ──
  const reservasHoje = allReservas.filter((r: any) => r.data === today);
  const reservasMes = allReservas.filter((r: any) => r.data >= monthStart);

  const pendentesHoje = reservasHoje.filter((r: any) => r.status === "pendente").length;
  const confirmadosHoje = reservasHoje.filter((r: any) => r.status === "confirmado").length;
  const concluidosHoje = reservasHoje.filter((r: any) => r.status === "concluido").length;
  const canceladosHoje = reservasHoje.filter((r: any) => r.status === "cancelado").length;

  // RECEITA = SOMENTE status === "concluido"
  const receitaHoje = reservasHoje
    .filter((r: any) => r.status === "concluido")
    .reduce((sum: number, r: any) => sum + Number(r.servicos?.preco || 0), 0);

  const concluidosMes = reservasMes.filter((r: any) => r.status === "concluido");
  const receitaMes = concluidosMes.reduce((sum: number, r: any) => sum + Number(r.servicos?.preco || 0), 0);

  const ticketMedio = concluidosMes.length > 0 ? receitaMes / concluidosMes.length : 0;
  const taxaConversao = reservasMes.length > 0 ? (concluidosMes.length / reservasMes.length) * 100 : 0;

  // Projeção
  const metaMensal = Number(config?.meta_mensal || 10000);
  const projecao = currentDay > 0 ? (receitaMes / currentDay) * daysInMonth : 0;
  const progressoMeta = metaMensal > 0 ? Math.min((receitaMes / metaMensal) * 100, 100) : 0;

  // ── Chart data ──
  const getChartData = () => {
    const days = chartMode === "receita30" ? 30 : 7;
    return Array.from({ length: days }).map((_, i) => {
      const date = format(subDays(new Date(), days - 1 - i), "yyyy-MM-dd");
      const label = format(subDays(new Date(), days - 1 - i), "dd/MM");
      const dayReservas = allReservas.filter((r: any) => r.data === date);

      if (chartMode === "reservas7") {
        return { label, value: dayReservas.length };
      }
      // receita7 or receita30 — SOMENTE CONCLUÍDO
      const receita = dayReservas
        .filter((r: any) => r.status === "concluido")
        .reduce((s: number, r: any) => s + Number(r.servicos?.preco || 0), 0);
      return { label, value: receita };
    });
  };

  const chartData = getChartData();
  const chartLabel = chartMode === "reservas7" ? "Reservas" : "Receita (R$)";

  const kpis = [
    { label: "Receita Hoje", value: `R$${receitaHoje.toFixed(2)}`, icon: DollarSign, accent: true },
    { label: "Receita Mês", value: `R$${receitaMes.toFixed(2)}`, icon: TrendingUp, accent: true },
    { label: "Ticket Médio", value: `R$${ticketMedio.toFixed(2)}`, icon: Receipt, accent: false },
    { label: "Conversão", value: `${taxaConversao.toFixed(1)}%`, icon: Percent, accent: false },
  ];

  const statusCards = [
    { label: "Pendentes", value: pendentesHoje, color: "text-yellow-400", bg: "bg-yellow-500/10", icon: Clock },
    { label: "Confirmadas", value: confirmadosHoje, color: "text-green-400", bg: "bg-green-500/10", icon: CheckCircle2 },
    { label: "Concluídas", value: concluidosHoje, color: "text-blue-400", bg: "bg-blue-500/10", icon: Award },
    { label: "Canceladas", value: canceladosHoje, color: "text-red-400", bg: "bg-red-500/10", icon: XCircle },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`rounded-xl border p-6 transition-all hover:shadow-lg ${
              k.accent
                ? "border-gold/30 bg-gradient-to-br from-card to-gold/5"
                : "border-border bg-card"
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-body text-xs uppercase tracking-wider text-muted-foreground">{k.label}</span>
              <div className={`rounded-lg p-2 ${k.accent ? "bg-gold/15" : "bg-secondary"}`}>
                <k.icon className={`h-4 w-4 ${k.accent ? "text-gold" : "text-muted-foreground"}`} />
              </div>
            </div>
            <p className={`font-heading text-2xl font-bold ${k.accent ? "text-gold" : "text-foreground"}`}>{k.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Status Cards - Today */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statusCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.05 }}
            className="flex items-center gap-4 rounded-xl border border-border bg-card p-5"
          >
            <div className={`rounded-lg p-2.5 ${s.bg}`}>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <div>
              <p className="font-heading text-2xl font-bold text-foreground">{s.value}</p>
              <p className="font-body text-xs text-muted-foreground">{s.label} hoje</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Meta progress */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="rounded-xl border border-border bg-card p-6"
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-heading text-base font-semibold text-foreground">Meta Mensal</h3>
            <p className="font-body text-xs text-muted-foreground">
              R${receitaMes.toFixed(2)} de R${metaMensal.toFixed(2)} • Projeção: R${projecao.toFixed(2)}
            </p>
          </div>
          <span className="font-heading text-lg font-bold text-gold">{progressoMeta.toFixed(0)}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-secondary">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressoMeta}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full rounded-full gold-gradient"
          />
        </div>
      </motion.div>

      {/* Chart */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="rounded-xl border border-border bg-card p-6"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-heading text-base font-semibold text-foreground">{chartLabel}</h3>
          <div className="flex gap-1 rounded-lg bg-secondary p-1">
            {([
              { k: "receita7" as ChartMode, l: "Receita 7d" },
              { k: "reservas7" as ChartMode, l: "Reservas 7d" },
              { k: "receita30" as ChartMode, l: "Receita 30d" },
            ]).map((m) => (
              <button
                key={m.k}
                onClick={() => setChartMode(m.k)}
                className={`rounded-md px-3 py-1.5 font-body text-xs transition-all ${
                  chartMode === m.k ? "bg-gold text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m.l}
              </button>
            ))}
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(40 45% 57%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(40 45% 57%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "hsl(0 0% 60%)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "hsl(0 0% 60%)" }}
                axisLine={false}
                tickLine={false}
                width={60}
                tickFormatter={(v) => chartMode === "reservas7" ? v : `R$${v}`}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(0 0% 7%)",
                  border: "1px solid hsl(0 0% 18%)",
                  borderRadius: "10px",
                  fontSize: "12px",
                  fontFamily: "var(--font-body)",
                }}
                labelStyle={{ color: "hsl(0 0% 96%)" }}
                itemStyle={{ color: "hsl(40 45% 57%)" }}
                formatter={(value: number) =>
                  chartMode === "reservas7" ? [value, "Reservas"] : [`R$${value.toFixed(2)}`, "Receita"]
                }
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(40 45% 57%)"
                strokeWidth={2}
                fill="url(#goldGrad)"
                dot={{ r: 3, fill: "hsl(40 45% 57%)", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "hsl(40 45% 57%)", strokeWidth: 2, stroke: "hsl(0 0% 7%)" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}
