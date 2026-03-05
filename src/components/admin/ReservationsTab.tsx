import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { Check, X, RotateCcw, Trash2, CheckCircle2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const statusColors: Record<string, string> = {
  pendente: "bg-yellow-500/20 text-yellow-400",
  confirmado: "bg-green-500/20 text-green-400",
  cancelado: "bg-red-500/20 text-red-400",
  concluido: "bg-blue-500/20 text-blue-400",
};

const PAGE_SIZE = 10;

async function sendPushNotification(userId: string, title: string, body: string) {
  try {
    console.log(`[Admin] 📨 Sending push to user ${userId}: "${title}"`);
    const { data, error } = await supabase.functions.invoke("send-push", {
      body: { user_id: userId, title, body, url: "/meus-agendamentos" },
    });
    console.log("[Admin] Push response:", data, error);
  } catch (error) {
    console.warn("[Admin] Push notification failed:", error);
  }
}

async function createInternalNotification(userId: string, title: string, body: string, type: string) {
  try {
    console.log(`[Admin] 🔔 Creating internal notification for user ${userId}`);
    const { error } = await (supabase as any).from("notifications").insert({
      user_id: userId,
      title,
      body,
      type,
    });
    if (error) console.warn("[Admin] Notification insert error:", error);
    else console.log("[Admin] ✅ Internal notification created");
  } catch (error) {
    console.warn("[Admin] Internal notification failed:", error);
  }
}

export default function ReservationsTab() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("todos");
  const [dateFilter, setDateFilter] = useState("todos");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const { data: reservas = [], isLoading } = useQuery({
    queryKey: ["admin-reservas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservas")
        .select("*, barbeiros(nome), servicos(nome, preco)")
        .order("data", { ascending: false })
        .order("horario", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Realtime for reservations
  useEffect(() => {
    const channel = supabase
      .channel("admin-reservas-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservas" },
        () => {
          qc.invalidateQueries({ queryKey: ["admin-reservas"] });
          qc.invalidateQueries({ queryKey: ["admin-reservas-hoje"] });
          qc.invalidateQueries({ queryKey: ["admin-reservas-mes"] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, reserva }: { id: string; status: "pendente" | "confirmado" | "cancelado" | "concluido"; reserva?: any }) => {
      const { error } = await supabase.from("reservas").update({ status }).eq("id", id);
      if (error) throw error;

      // Send push + internal notification
      if (reserva?.user_id) {
        const clienteNome = reserva.cliente_nome?.split(" ")[0] || "Cliente";
        const barbeiroNome = reserva.barbeiros?.nome || "nosso barbeiro";
        const dataFormatada = reserva.data;
        const horaFormatada = reserva.horario?.slice(0, 5);

        let pushTitle = "";
        let pushBody = "";

        if (status === "confirmado") {
          pushTitle = "✅ Reserva Confirmada!";
          pushBody = `${clienteNome}, sua reserva com ${barbeiroNome} em ${dataFormatada} às ${horaFormatada} foi confirmada!`;
        } else if (status === "cancelado") {
          pushTitle = "❌ Reserva Cancelada";
          pushBody = `${clienteNome}, sua reserva foi cancelada. Entre em contato para reagendar.`;
        } else if (status === "concluido") {
          pushTitle = "🎉 Atendimento Concluído";
          pushBody = `Obrigado pela visita, ${clienteNome}! Esperamos vê-lo novamente.`;
        }

        if (pushTitle) {
          // Internal notification (always works - fallback)
          await createInternalNotification(reserva.user_id, pushTitle, pushBody, status);
          // Push notification (best effort)
          await sendPushNotification(reserva.user_id, pushTitle, pushBody);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reservas"] });
      qc.invalidateQueries({ queryKey: ["admin-reservas-hoje"] });
      qc.invalidateQueries({ queryKey: ["admin-reservas-mes"] });
      toast.success("Status atualizado com sucesso");
    },
    onError: (err: any) => toast.error(err.message || "Erro ao atualizar status"),
  });

  const deleteReserva = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reservas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reservas"] });
      toast.success("Reserva excluída com sucesso");
    },
    onError: (err: any) => toast.error(err.message || "Erro ao excluir reserva"),
  });

  const today = format(new Date(), "yyyy-MM-dd");
  const weekAgo = format(new Date(Date.now() - 7 * 86400000), "yyyy-MM-dd");
  const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd");

  const filtered = reservas.filter((r: any) => {
    if (statusFilter !== "todos" && r.status !== statusFilter) return false;
    if (dateFilter === "hoje" && r.data !== today) return false;
    if (dateFilter === "semana" && r.data < weekAgo) return false;
    if (dateFilter === "mes" && r.data < monthStart) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !r.cliente_nome?.toLowerCase().includes(q) &&
        !r.cliente_telefone?.includes(q) &&
        !r.barbeiros?.nome?.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div>
      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Buscar cliente, telefone ou barbeiro..."
            className="w-full rounded-lg border border-border bg-secondary py-2 pl-10 pr-4 font-body text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        {["todos", "pendente", "confirmado", "cancelado", "concluido"].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(0); }}
            className={`rounded-full px-4 py-1.5 font-body text-xs capitalize transition-colors ${statusFilter === s ? "bg-gold text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
          >
            {s}
          </button>
        ))}
        <span className="mx-2 self-center text-border">|</span>
        {[{ k: "todos", l: "Todos" }, { k: "hoje", l: "Hoje" }, { k: "semana", l: "Semana" }, { k: "mes", l: "Mês" }].map((d) => (
          <button
            key={d.k}
            onClick={() => { setDateFilter(d.k); setPage(0); }}
            className={`rounded-full px-4 py-1.5 font-body text-xs transition-colors ${dateFilter === d.k ? "bg-gold text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
          >
            {d.l}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full font-body text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Telefone</th>
                  <th className="px-4 py-3">Barbeiro</th>
                  <th className="px-4 py-3">Serviço</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Horário</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((r: any) => (
                  <tr key={r.id} className="border-b border-border transition-colors hover:bg-secondary/30">
                    <td className="px-4 py-3 text-foreground">{r.cliente_nome}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.cliente_telefone}</td>
                    <td className="px-4 py-3 text-foreground">{r.barbeiros?.nome}</td>
                    <td className="px-4 py-3 text-foreground">{r.servicos?.nome}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.data}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.horario?.slice(0, 5)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusColors[r.status] || ""}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {r.status === "pendente" && (
                          <button
                            onClick={() => updateStatus.mutate({ id: r.id, status: "confirmado", reserva: r })}
                            disabled={updateStatus.isPending}
                            title="Confirmar"
                            className="rounded p-1.5 text-green-400 hover:bg-green-500/10 disabled:opacity-50"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        {r.status !== "cancelado" && r.status !== "concluido" && (
                          <button
                            onClick={() => updateStatus.mutate({ id: r.id, status: "cancelado", reserva: r })}
                            disabled={updateStatus.isPending}
                            title="Cancelar"
                            className="rounded p-1.5 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                        {r.status === "confirmado" && (
                          <button
                            onClick={() => updateStatus.mutate({ id: r.id, status: "concluido", reserva: r })}
                            disabled={updateStatus.isPending}
                            title="Concluir"
                            className="rounded p-1.5 text-blue-400 hover:bg-blue-500/10 disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}
                        {r.status === "cancelado" && (
                          <button
                            onClick={() => updateStatus.mutate({ id: r.id, status: "pendente", reserva: r })}
                            disabled={updateStatus.isPending}
                            title="Reativar"
                            className="rounded p-1.5 text-yellow-400 hover:bg-yellow-500/10 disabled:opacity-50"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => { if (confirm("Excluir permanentemente?")) deleteReserva.mutate(r.id); }}
                          disabled={deleteReserva.isPending}
                          title="Excluir"
                          className="rounded p-1.5 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">Nenhuma reserva encontrada</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="font-body text-xs text-muted-foreground">
                {filtered.length} reserva(s) • Página {page + 1} de {totalPages}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="rounded p-2 text-muted-foreground hover:bg-secondary disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="rounded p-2 text-muted-foreground hover:bg-secondary disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
