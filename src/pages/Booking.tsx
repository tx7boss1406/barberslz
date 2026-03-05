import { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Star, Clock, Scissors, User, Phone, CalendarDays, CheckCircle2, Crown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import Navbar from "@/components/barbershop/Navbar";
import { useAuth } from "@/contexts/AuthContext";

type Barbeiro = { id: string; nome: string; especialidade: string; bio: string; foto_url: string; avaliacao: number };
type Servico = { id: string; nome: string; descricao: string; duracao: number; preco: number };

export default function Booking() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedBarbeiro, setSelectedBarbeiro] = useState<Barbeiro | null>(null);
  const [selectedServico, setSelectedServico] = useState<Servico | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState("");
  const [clienteNome, setClienteNome] = useState("");
  const [clienteTelefone, setClienteTelefone] = useState("");
  const [useCredit, setUseCredit] = useState(false);
  const [success, setSuccess] = useState(false);

  const { data: barbeiros = [] } = useQuery({
    queryKey: ["barbeiros-booking"],
    queryFn: async () => {
      const { data } = await supabase.from("barbeiros").select("*").eq("status", true).order("nome");
      return (data || []) as Barbeiro[];
    },
  });

  const { data: servicos = [] } = useQuery({
    queryKey: ["servicos-booking"],
    queryFn: async () => {
      const { data } = await supabase.from("servicos").select("*").eq("status", true).order("preco");
      return (data || []) as Servico[];
    },
  });

  const { data: reservasExistentes = [] } = useQuery({
    queryKey: ["reservas-horarios", selectedBarbeiro?.id, selectedDate],
    queryFn: async () => {
      if (!selectedBarbeiro || !selectedDate) return [];
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const { data } = await supabase
        .from("reservas")
        .select("horario")
        .eq("barbeiro_id", selectedBarbeiro.id)
        .eq("data", dateStr)
        .in("status", ["pendente", "confirmado"]);
      return (data || []).map((r: { horario: string }) => r.horario);
    },
    enabled: !!selectedBarbeiro && !!selectedDate,
  });

  // Active subscription for credit usage
  const { data: activeSubscription } = useQuery({
    queryKey: ["booking-subscription", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("subscriptions")
        .select("*")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .gt("credits_available", 0)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Pre-select barber from URL
  useEffect(() => {
    const bId = searchParams.get("barbeiro");
    if (bId && barbeiros.length) {
      const b = barbeiros.find((b) => b.id === bId);
      if (b) { setSelectedBarbeiro(b); setStep(2); }
    }
  }, [searchParams, barbeiros]);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth?redirect=/agendar");
    }
  }, [authLoading, user, navigate]);

  // Pre-fill client data from profile
  useEffect(() => {
    if (profile) {
      if (profile.nome && !clienteNome) setClienteNome(profile.nome);
      if (profile.telefone && !clienteTelefone) setClienteTelefone(profile.telefone);
    }
  }, [profile]);

  const createReserva = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("reservas").insert({
        cliente_nome: clienteNome,
        cliente_telefone: clienteTelefone,
        barbeiro_id: selectedBarbeiro!.id,
        servico_id: selectedServico!.id,
        data: format(selectedDate!, "yyyy-MM-dd"),
        horario: selectedTime,
        user_id: user?.id,
      });
      if (error) throw error;

      // Decrement subscription credit if using plan
      if (useCredit && activeSubscription) {
        const newUsed = (activeSubscription.credits_used || 0) + 1;
        const newAvailable = (activeSubscription.credits_available || 1) - 1;
        await (supabase as any)
          .from("subscriptions")
          .update({
            credits_used: newUsed,
            credits_available: Math.max(0, newAvailable),
            updated_at: new Date().toISOString(),
          })
          .eq("id", activeSubscription.id);
      }

      // Notify admin about new booking
      try {
        await supabase.functions.invoke("notify-admin", {
          body: {
            title: "📅 Novo Agendamento",
            body: `${clienteNome} agendou ${selectedServico!.nome} com ${selectedBarbeiro!.nome} em ${format(selectedDate!, "dd/MM/yyyy")} às ${selectedTime.slice(0, 5)}`,
            type: "novo_agendamento",
          },
        });
      } catch (e) {
        console.warn("[Booking] Admin notification failed:", e);
      }
    },
    onSuccess: () => setSuccess(true),
    onError: (err: any) => toast.error(err.message || "Erro ao criar reserva. Tente novamente."),
  });

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  const generateTimeSlots = () => {
    const slots: string[] = [];
    const now = new Date();
    const isToday = selectedDate && format(selectedDate, "yyyy-MM-dd") === format(now, "yyyy-MM-dd");
    for (let h = 9; h < 20; h++) {
      for (let m = 0; m < 60; m += 30) {
        const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
        if (isToday) {
          const slotDate = new Date(selectedDate!);
          slotDate.setHours(h, m, 0);
          if (slotDate <= now) continue;
        }
        slots.push(time);
      }
    }
    return slots;
  };

  const formatPhone = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const formatTime = (t: string) => t.slice(0, 5);

  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto flex min-h-screen items-center justify-center px-4 pt-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg rounded-lg border border-gold/30 bg-card p-8 text-center"
          >
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}>
              <CheckCircle2 className="mx-auto mb-6 h-20 w-20 text-gold" />
            </motion.div>
            <h2 className="mb-2 font-heading text-3xl font-bold text-foreground">
              Reserva Confirmada, {clienteNome.split(" ")[0]}!
            </h2>
            <p className="mb-8 font-body text-muted-foreground">Seu horário foi registrado com sucesso.</p>
            <div className="mb-8 space-y-3 rounded-lg bg-secondary p-6 text-left">
              <p className="font-body text-sm text-foreground"><span className="text-muted-foreground">👤 Cliente:</span> {clienteNome}</p>
              <p className="font-body text-sm text-foreground"><span className="text-muted-foreground">📞 Telefone:</span> {clienteTelefone}</p>
              <p className="font-body text-sm text-foreground"><span className="text-muted-foreground">💈 Barbeiro:</span> {selectedBarbeiro?.nome}</p>
              <p className="font-body text-sm text-foreground"><span className="text-muted-foreground">🛠 Serviço:</span> {selectedServico?.nome}</p>
              <p className="font-body text-sm text-foreground"><span className="text-muted-foreground">📆 Data:</span> {selectedDate && format(selectedDate, "dd/MM/yyyy")}</p>
              <p className="font-body text-sm text-foreground"><span className="text-muted-foreground">⏰ Horário:</span> {formatTime(selectedTime)}</p>
              <p className="font-body text-sm text-gold">📌 Status: Pendente de confirmação</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to="/" className="flex-1 rounded border border-border px-6 py-3 font-body text-sm text-foreground transition-colors hover:bg-secondary">
                Voltar ao Início
              </Link>
              <button
                onClick={() => { setSuccess(false); setStep(1); setSelectedBarbeiro(null); setSelectedServico(null); setSelectedDate(undefined); setSelectedTime(""); setClienteNome(""); setClienteTelefone(""); }}
                className="gold-gradient flex-1 rounded px-6 py-3 font-body text-sm font-semibold text-primary-foreground"
              >
                Nova Reserva
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const stepTitles = ["Escolha o Barbeiro", "Escolha o Serviço", "Data e Horário", "Seus Dados"];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pb-16 pt-28">
        {/* Progress */}
        <div className="mb-12 flex items-center justify-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full font-body text-sm font-bold transition-all ${s <= step ? "gold-gradient text-primary-foreground" : "border border-border text-muted-foreground"}`}>
                {s < step ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 4 && <div className={`hidden h-0.5 w-12 sm:block ${s < step ? "bg-gold" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        <h2 className="mb-8 text-center font-heading text-3xl font-bold text-foreground">{stepTitles[step - 1]}</h2>

        <AnimatePresence mode="wait">
          {/* Step 1 - Barbeiro */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {barbeiros.map((b) => (
                <button
                  key={b.id}
                  onClick={() => { setSelectedBarbeiro(b); setStep(2); }}
                  className={`rounded-lg border p-6 text-center transition-all hover:border-gold/50 ${selectedBarbeiro?.id === b.id ? "border-gold bg-gold/10" : "border-border bg-card"}`}
                >
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-gold bg-secondary">
                    <span className="font-heading text-lg font-bold text-gold">{getInitials(b.nome)}</span>
                  </div>
                  <h3 className="font-heading text-lg font-semibold text-foreground">{b.nome}</h3>
                  <p className="mb-2 font-body text-xs text-gold">{b.especialidade}</p>
                  <div className="flex items-center justify-center gap-1">
                    <Star className="h-3 w-3 fill-gold text-gold" />
                    <span className="font-body text-xs text-muted-foreground">{Number(b.avaliacao).toFixed(1)}</span>
                  </div>
                </button>
              ))}
            </motion.div>
          )}

          {/* Step 2 - Serviço */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="mx-auto max-w-2xl space-y-3">
              {servicos.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedServico(s); setStep(3); }}
                  className={`flex w-full items-center justify-between rounded-lg border p-5 transition-all hover:border-gold/50 ${selectedServico?.id === s.id ? "border-gold bg-gold/10" : "border-border bg-card"}`}
                >
                  <div className="text-left">
                    <h3 className="font-heading text-lg font-semibold text-foreground">{s.nome}</h3>
                    <p className="font-body text-sm text-muted-foreground">{s.descricao}</p>
                    <div className="mt-2 flex items-center gap-3 text-muted-foreground">
                      <span className="flex items-center gap-1 font-body text-xs"><Clock className="h-3 w-3" />{s.duracao} min</span>
                    </div>
                  </div>
                  <span className="font-heading text-xl font-bold text-gold">R${Number(s.preco).toFixed(2)}</span>
                </button>
              ))}
              <button onClick={() => setStep(1)} className="mt-4 flex items-center gap-2 font-body text-sm text-muted-foreground hover:text-gold">
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>
            </motion.div>
          )}

          {/* Step 3 - Data e Horário */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="mx-auto max-w-3xl">
              <div className="grid gap-8 lg:grid-cols-2">
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => { setSelectedDate(d); setSelectedTime(""); }}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0)) || date.getDay() === 0}
                    className="pointer-events-auto rounded-lg border border-border bg-card p-4"
                    locale={ptBR}
                  />
                </div>
                <div>
                  {selectedDate ? (
                    <>
                      <p className="mb-4 font-body text-sm text-muted-foreground">
                        Horários para <span className="text-gold">{format(selectedDate, "dd/MM/yyyy")}</span>
                      </p>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {generateTimeSlots().map((t) => {
                          const occupied = reservasExistentes.includes(t);
                          return (
                            <button
                              key={t}
                              disabled={occupied}
                              onClick={() => setSelectedTime(t)}
                              className={`rounded border px-3 py-2.5 font-body text-sm transition-all ${
                                occupied
                                  ? "cursor-not-allowed border-border bg-secondary/50 text-muted-foreground line-through opacity-50"
                                  : selectedTime === t
                                  ? "border-gold bg-gold text-primary-foreground"
                                  : "border-border bg-card text-foreground hover:border-gold/50"
                              }`}
                            >
                              {formatTime(t)}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <p className="font-body text-sm text-muted-foreground">Selecione uma data ao lado.</p>
                  )}
                </div>
              </div>

              {/* Summary */}
              {selectedDate && selectedTime && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 rounded-lg bg-secondary p-4">
                  <div className="flex flex-wrap items-center gap-4 font-body text-sm text-foreground">
                    <span>📆 {format(selectedDate, "dd/MM/yyyy")}</span>
                    <span>⏰ {formatTime(selectedTime)}</span>
                    <span>💈 {selectedBarbeiro?.nome}</span>
                    <span>🛠 {selectedServico?.nome}</span>
                  </div>
                </motion.div>
              )}

              <div className="mt-6 flex items-center justify-between">
                <button onClick={() => setStep(2)} className="flex items-center gap-2 font-body text-sm text-muted-foreground hover:text-gold">
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </button>
                <button
                  disabled={!selectedDate || !selectedTime}
                  onClick={() => setStep(4)}
                  className="gold-gradient flex items-center gap-2 rounded px-6 py-3 font-body text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  Próximo <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 4 - Dados */}
          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="mx-auto max-w-md">
              <div className="mb-8 rounded-lg bg-secondary p-4">
                <div className="space-y-2 font-body text-sm text-foreground">
                  <p>💈 {selectedBarbeiro?.nome} • 🛠 {selectedServico?.nome}</p>
                  <p>📆 {selectedDate && format(selectedDate, "dd/MM/yyyy")} • ⏰ {formatTime(selectedTime)}</p>
                  {useCredit ? (
                    <p className="text-gold">👑 Usando crédito do plano (grátis)</p>
                  ) : (
                    <p className="text-gold">R${selectedServico && Number(selectedServico.preco).toFixed(2)}</p>
                  )}
                </div>
              </div>

              {/* Credit usage toggle */}
              {activeSubscription && (
                <div className="mb-6">
                  <button
                    onClick={() => setUseCredit(!useCredit)}
                    className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 transition-all ${
                      useCredit
                        ? "border-gold/40 bg-gold/10"
                        : "border-border bg-secondary/50 hover:border-gold/30"
                    }`}
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${useCredit ? "gold-gradient" : "bg-secondary"}`}>
                      <Crown className={`h-4 w-4 ${useCredit ? "text-primary-foreground" : "text-gold"}`} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-body text-sm font-medium text-foreground">
                        {useCredit ? "Crédito do plano selecionado" : "Usar crédito do plano"}
                      </p>
                      <p className="font-body text-[10px] text-muted-foreground">
                        {activeSubscription.credits_available} crédito(s) restante(s)
                      </p>
                    </div>
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${useCredit ? "border-gold bg-gold" : "border-muted"}`}>
                      {useCredit && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                  </button>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block font-body text-sm text-muted-foreground">Nome completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input
                      value={clienteNome}
                      onChange={(e) => setClienteNome(e.target.value)}
                      placeholder="Seu nome completo"
                      className="w-full rounded-lg border border-border bg-card py-3 pl-10 pr-4 font-body text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block font-body text-sm text-muted-foreground">Telefone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input
                      value={clienteTelefone}
                      onChange={(e) => setClienteTelefone(formatPhone(e.target.value))}
                      placeholder="(11) 99999-9999"
                      className="w-full rounded-lg border border-border bg-card py-3 pl-10 pr-4 font-body text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <button onClick={() => setStep(3)} className="flex items-center gap-2 font-body text-sm text-muted-foreground hover:text-gold">
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </button>
                <button
                  disabled={!clienteNome.trim() || clienteTelefone.replace(/\D/g, "").length < 10 || createReserva.isPending}
                  onClick={() => createReserva.mutate()}
                  className="gold-gradient flex items-center gap-2 rounded px-8 py-3 font-body text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {createReserva.isPending ? "Confirmando..." : "Confirmar Reserva"}
                  <Check className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
