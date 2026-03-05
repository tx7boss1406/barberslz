import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Scissors, Check, ArrowLeft, Sparkles, CreditCard, Clock, Shield, Zap, History } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/barbershop/Navbar";
import { format, differenceInDays } from "date-fns";

export default function Subscription() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const { user, loading: authLoading } = useAuth();

  // Fetch plan config
  const { data: config } = useQuery({
    queryKey: ["plan-config"],
    queryFn: async () => {
      const { data } = await supabase.from("configuracoes").select("plano_preco, plano_creditos, plano_nome").limit(1).single();
      return data as any;
    },
  });

  // Fetch active subscription with realtime
  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["my-subscription", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("subscriptions")
        .select("*")
        .eq("user_id", user!.id)
        .in("status", ["active", "pending_payment"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Fetch subscription events
  const { data: events = [] } = useQuery({
    queryKey: ["sub-events", subscription?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("subscription_events")
        .select("*")
        .eq("subscription_id", subscription!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!subscription?.id,
  });

  // Realtime subscription updates
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("my-sub-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["my-subscription"] });
        qc.invalidateQueries({ queryKey: ["sub-events"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  // Handle return from external checkout
  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "success") {
      toast.success("Pagamento em processamento! Aguarde ativação automática.");
    } else if (status === "failure") {
      toast.error("Pagamento não concluído.");
    }
  }, [searchParams]);

  const planPrice = Number(config?.plano_preco || 15000) / 100;
  const planCredits = Number(config?.plano_creditos || 5);
  const planName = config?.plano_nome || "Plano Premium Mensal";

  // Average service price (for savings calc)
  const { data: avgPrice } = useQuery({
    queryKey: ["avg-service-price"],
    queryFn: async () => {
      const { data } = await supabase.from("servicos").select("preco").eq("status", true);
      if (!data?.length) return 0;
      return data.reduce((s: number, r: any) => s + Number(r.preco), 0) / data.length;
    },
  });

  const savings = avgPrice ? (avgPrice * planCredits - planPrice).toFixed(2) : "0.00";

  // Create subscription via Edge Function
  const createSubscription = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("create-subscription-checkout");
      if (error) throw new Error(error.message || "Erro ao criar assinatura");
      const result = data as any;
      if (result.error) throw new Error(result.error);

      // If checkout_url exists (mercadopago mode), redirect
      if (result.checkout_url) {
        window.location.href = result.checkout_url;
        return result;
      }

      return result;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["my-subscription"] });
      if (!data?.checkout_url) {
        toast.success("Assinatura criada! Aguardando pagamento.");
      }
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Simulate payment (mock mode only)
  const simulatePayment = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("simulate-payment-approval", {
        body: { subscription_id: subscription.id },
      });
      if (error) throw new Error(error.message || "Erro na simulação");
      const result = data as any;
      if (result.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-subscription"] });
      qc.invalidateQueries({ queryKey: ["sub-events"] });
      toast.success("🎉 Pagamento simulado! Plano ativado.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth?redirect=/plano");
    }
  }, [authLoading, user, navigate]);

  if (authLoading || subLoading || (!authLoading && !user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  const isActive = subscription?.status === "active";
  const isPending = subscription?.status === "pending_payment";
  const isMock = subscription?.provider === "mock";
  const daysLeft = subscription?.renewal_date
    ? differenceInDays(new Date(subscription.renewal_date), new Date())
    : 0;

  const eventLabels: Record<string, string> = {
    payment_created: "Pagamento criado",
    payment_approved: "Pagamento aprovado",
    renewed: "Renovado",
    expired: "Expirado",
    cancelled: "Cancelado",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pb-16 pt-28">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 font-body text-sm text-muted-foreground hover:text-gold">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        {/* Active subscription */}
        {isActive && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-lg space-y-6">
            <div className="rounded-2xl border border-gold/30 bg-gradient-to-br from-card to-gold/5 p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-full gold-gradient p-3">
                  <Crown className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="font-heading text-2xl font-bold text-foreground">Cliente Premium</h2>
                  <p className="font-body text-xs text-gold">👑 Plano ativo</p>
                </div>
              </div>

              <div className="mb-6 space-y-4">
                <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3">
                  <span className="font-body text-sm text-muted-foreground">Créditos restantes</span>
                  <span className="font-heading text-xl font-bold text-gold">
                    {subscription.credits_available} / {subscription.credits_total}
                  </span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-secondary">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${((subscription.credits_total - subscription.credits_available) / subscription.credits_total) * 100}%` }}
                    transition={{ duration: 1 }}
                    className="h-full rounded-full gold-gradient"
                  />
                </div>
                <p className="text-center font-body text-xs text-muted-foreground">
                  {subscription.credits_used} de {subscription.credits_total} usados
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-secondary/50 p-3 text-center">
                    <p className="font-body text-xs text-muted-foreground">Renova em</p>
                    <p className="font-heading text-lg font-bold text-foreground">{daysLeft} dias</p>
                  </div>
                  <div className="rounded-lg bg-secondary/50 p-3 text-center">
                    <p className="font-body text-xs text-muted-foreground">Economia</p>
                    <p className="font-heading text-lg font-bold text-gold">R${savings}</p>
                  </div>
                </div>

                {subscription.renewal_date && (
                  <p className="text-center font-body text-xs text-muted-foreground">
                    Próxima renovação: {format(new Date(subscription.renewal_date), "dd/MM/yyyy")}
                  </p>
                )}
              </div>

              <div className="space-y-2 rounded-lg border border-gold/20 bg-gold/5 p-4">
                <p className="font-body text-xs font-medium text-gold">✨ Benefícios Premium</p>
                {["Até 5 cortes por mês", "Qualquer serviço disponível", "Prioridade de horário", "Selo VIP no perfil"].map((b) => (
                  <div key={b} className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-gold" />
                    <span className="font-body text-xs text-foreground">{b}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Events history */}
            {events.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="mb-4 flex items-center gap-2">
                  <History className="h-4 w-4 text-gold" />
                  <h3 className="font-heading text-sm font-semibold text-foreground">Histórico</h3>
                </div>
                <div className="space-y-2">
                  {events.map((e: any) => (
                    <div key={e.id} className="flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-2">
                      <span className="font-body text-xs text-foreground">{eventLabels[e.event_type] || e.event_type}</span>
                      <span className="font-body text-[10px] text-muted-foreground">{format(new Date(e.created_at), "dd/MM HH:mm")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Pending payment */}
        {isPending && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-lg space-y-4">
            <div className="rounded-2xl border border-yellow-500/30 bg-card p-8 text-center">
              <Clock className="mx-auto mb-4 h-12 w-12 text-yellow-400" />
              <h2 className="mb-2 font-heading text-2xl font-bold text-foreground">Pagamento Pendente</h2>
              <p className="mb-6 font-body text-sm text-muted-foreground">
                Sua assinatura está aguardando confirmação do pagamento.
              </p>
              <div className="rounded-lg bg-secondary/50 p-4">
                <p className="font-body text-sm text-foreground">
                  Valor: <span className="font-bold text-gold">R${planPrice.toFixed(2)}</span>
                </p>
                <p className="font-body text-xs text-muted-foreground mt-1">
                  Criado em: {format(new Date(subscription.created_at), "dd/MM/yyyy HH:mm")}
                </p>
                <p className="font-body text-xs text-muted-foreground mt-1">
                  Provider: <span className="text-foreground">{subscription.provider}</span>
                </p>
              </div>

              {/* Mock simulation button - DEV ONLY */}
              {isMock && (
                <motion.button
                  onClick={() => simulatePayment.mutate()}
                  disabled={simulatePayment.isPending}
                  className="mt-6 w-full rounded-xl border-2 border-dashed border-yellow-500/40 bg-yellow-500/10 py-3 font-body text-sm font-medium text-yellow-400 transition-colors hover:bg-yellow-500/20 disabled:opacity-50"
                  whileTap={{ scale: 0.98 }}
                >
                  <Zap className="mr-2 inline h-4 w-4" />
                  {simulatePayment.isPending ? "Simulando..." : "⚡ Simular pagamento aprovado (DEV)"}
                </motion.button>
              )}
            </div>
          </motion.div>
        )}

        {/* No subscription - show plan card */}
        {!isActive && !isPending && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-lg"
          >
            <div className="relative overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-br from-card via-card to-gold/5">
              <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-gold/10 blur-3xl" />
              <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-gold/5 blur-3xl" />

              <div className="relative p-8">
                <div className="mb-6 flex justify-center">
                  <div className="flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5">
                    <Sparkles className="h-3 w-3 text-gold" />
                    <span className="font-body text-xs font-medium text-gold">MAIS POPULAR</span>
                  </div>
                </div>

                <div className="mb-8 text-center">
                  <Crown className="mx-auto mb-4 h-12 w-12 text-gold" />
                  <h2 className="font-heading text-3xl font-bold text-foreground">{planName}</h2>
                  <div className="mt-4 flex items-baseline justify-center gap-1">
                    <span className="font-heading text-5xl font-bold text-gold">R${planPrice.toFixed(0)}</span>
                    <span className="font-body text-sm text-muted-foreground">/mês</span>
                  </div>
                  {Number(savings) > 0 && (
                    <p className="mt-2 font-body text-sm text-green-400">
                      Economize até R${savings} por mês
                    </p>
                  )}
                </div>

                <div className="mb-8 space-y-3">
                  {[
                    { icon: Scissors, text: `Até ${planCredits} cortes por mês` },
                    { icon: Check, text: "Qualquer serviço disponível" },
                    { icon: Crown, text: "Selo VIP no perfil" },
                    { icon: Clock, text: "Prioridade de horário" },
                    { icon: Shield, text: "Cancelamento flexível" },
                    { icon: Sparkles, text: "Acesso antecipado a promoções" },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-center gap-3 rounded-lg bg-secondary/30 px-4 py-3">
                      <div className="rounded-lg bg-gold/15 p-1.5">
                        <Icon className="h-4 w-4 text-gold" />
                      </div>
                      <span className="font-body text-sm text-foreground">{text}</span>
                    </div>
                  ))}
                </div>

                <motion.button
                  onClick={() => createSubscription.mutate()}
                  disabled={createSubscription.isPending}
                  className="gold-gradient btn-premium flex w-full items-center justify-center gap-2 rounded-xl py-4 font-body text-base font-bold text-primary-foreground disabled:opacity-50"
                  whileTap={{ scale: 0.98 }}
                >
                  <CreditCard className="h-5 w-5" />
                  {createSubscription.isPending ? "Processando..." : "Assinar agora"}
                </motion.button>

                <p className="mt-4 text-center font-body text-xs text-muted-foreground">
                  Pagamento seguro • Renovação mensal
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
