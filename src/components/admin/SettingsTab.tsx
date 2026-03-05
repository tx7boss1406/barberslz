import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Save, Clock, DollarSign, Bell, Building2, CreditCard } from "lucide-react";
import { motion } from "framer-motion";

const DIAS_SEMANA = [
  { key: "seg", label: "Seg" },
  { key: "ter", label: "Ter" },
  { key: "qua", label: "Qua" },
  { key: "qui", label: "Qui" },
  { key: "sex", label: "Sex" },
  { key: "sab", label: "Sáb" },
  { key: "dom", label: "Dom" },
];

export default function SettingsTab() {
  const qc = useQueryClient();

  // Operational
  const [abertura, setAbertura] = useState("09:00");
  const [fechamento, setFechamento] = useState("20:00");
  const [intervalo, setIntervalo] = useState(30);
  const [diasAtivos, setDiasAtivos] = useState<string[]>(["seg", "ter", "qua", "qui", "sex", "sab"]);

  // Financial
  const [metaMensal, setMetaMensal] = useState(10000);

  // Notifications
  const [pushAdmin, setPushAdmin] = useState(true);
  const [lembrete24h, setLembrete24h] = useState(true);
  const [lembrete2h, setLembrete2h] = useState(true);

  // Business info
  const [nomeBarbearia, setNomeBarbearia] = useState("Barber Club & Tattoo");
  const [whatsapp, setWhatsapp] = useState("98982415349");
  const [instagram, setInstagram] = useState("juniorr_barber_");
  const [enderecoUrl, setEnderecoUrl] = useState("");
  const [planoPreco, setPlanoPreco] = useState(150);
  const [planoCreditos, setPlanoCreditos] = useState(5);
  const [planoNome, setPlanoNome] = useState("Plano Premium Mensal");

  const { data: config } = useQuery({
    queryKey: ["admin-config"],
    queryFn: async () => {
      const { data } = await supabase.from("configuracoes").select("*").limit(1).single();
      return data as any;
    },
  });

  useEffect(() => {
    if (config) {
      setAbertura(config.horario_abertura?.slice(0, 5) || "09:00");
      setFechamento(config.horario_fechamento?.slice(0, 5) || "20:00");
      setIntervalo(config.intervalo_minutos || 30);
      setDiasAtivos(config.dias_ativos || ["seg", "ter", "qua", "qui", "sex", "sab"]);
      setMetaMensal(Number(config.meta_mensal) || 10000);
      setPushAdmin(config.push_admin_ativo ?? true);
      setLembrete24h(config.lembrete_24h ?? true);
      setLembrete2h(config.lembrete_2h ?? true);
      setNomeBarbearia(config.nome_barbearia || "Barber Club & Tattoo");
      setWhatsapp(config.whatsapp || "98982415349");
      setInstagram(config.instagram || "juniorr_barber_");
      setEnderecoUrl(config.endereco_url || "");
      setPlanoPreco(Number(config.plano_preco || 15000) / 100);
      setPlanoCreditos(Number(config.plano_creditos || 5));
      setPlanoNome(config.plano_nome || "Plano Premium Mensal");
    }
  }, [config]);

  const save = useMutation({
    mutationFn: async () => {
      if (!config?.id) return;
      const { error } = await supabase.from("configuracoes").update({
        horario_abertura: abertura,
        horario_fechamento: fechamento,
        intervalo_minutos: intervalo,
        dias_ativos: diasAtivos,
        meta_mensal: metaMensal,
        push_admin_ativo: pushAdmin,
        lembrete_24h: lembrete24h,
        lembrete_2h: lembrete2h,
        nome_barbearia: nomeBarbearia,
        whatsapp,
        instagram,
        endereco_url: enderecoUrl,
        pix_key: '',
        pix_copy_paste_code: '',
        pix_qr_image_url: '',
        plano_preco: Math.round(planoPreco * 100),
        plano_creditos: planoCreditos,
        plano_nome: planoNome,
      } as any).eq("id", config.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-config"] });
      toast.success("Configurações salvas com sucesso");
    },
    onError: () => toast.error("Erro ao salvar configurações"),
  });

  const toggleDia = (dia: string) => {
    setDiasAtivos((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]
    );
  };

  const Section = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-6"
    >
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-lg bg-gold/15 p-2">
          <Icon className="h-4 w-4 text-gold" />
        </div>
        <h3 className="font-heading text-lg font-semibold text-foreground">{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
    </motion.div>
  );

  const InputField = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="mb-1.5 block font-body text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );

  const inputClass = "w-full rounded-lg border border-border bg-secondary px-4 py-2.5 font-body text-sm text-foreground focus:border-gold focus:outline-none transition-colors";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Operacional */}
      <Section title="Operacional" icon={Clock}>
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField label="Horário de Abertura">
            <input type="time" value={abertura} onChange={(e) => setAbertura(e.target.value)} className={inputClass} />
          </InputField>
          <InputField label="Horário de Fechamento">
            <input type="time" value={fechamento} onChange={(e) => setFechamento(e.target.value)} className={inputClass} />
          </InputField>
        </div>
        <InputField label="Intervalo entre atendimentos (minutos)">
          <input type="number" value={intervalo} onChange={(e) => setIntervalo(+e.target.value)} className={inputClass} />
        </InputField>
        <InputField label="Dias ativos">
          <div className="flex flex-wrap gap-2">
            {DIAS_SEMANA.map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => toggleDia(d.key)}
                className={`rounded-lg px-4 py-2 font-body text-xs font-medium transition-all ${
                  diasAtivos.includes(d.key)
                    ? "bg-gold text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </InputField>
      </Section>

      {/* Financeiro */}
      <Section title="Financeiro" icon={DollarSign}>
        <InputField label="Meta Mensal (R$)">
          <input type="number" step="100" value={metaMensal} onChange={(e) => setMetaMensal(+e.target.value)} className={inputClass} />
        </InputField>
      </Section>

      {/* Notificações */}
      <Section title="Notificações" icon={Bell}>
        <ToggleItem label="Push para admin (novos agendamentos)" checked={pushAdmin} onChange={setPushAdmin} />
        <ToggleItem label="Lembrete automático 24h antes" checked={lembrete24h} onChange={setLembrete24h} />
        <ToggleItem label="Lembrete automático 2h antes" checked={lembrete2h} onChange={setLembrete2h} />
      </Section>

      {/* Info da Barbearia */}
      <Section title="Informações da Barbearia" icon={Building2}>
        <InputField label="Nome">
          <input value={nomeBarbearia} onChange={(e) => setNomeBarbearia(e.target.value)} className={inputClass} />
        </InputField>
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField label="WhatsApp">
            <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className={inputClass} />
          </InputField>
          <InputField label="Instagram">
            <input value={instagram} onChange={(e) => setInstagram(e.target.value)} className={inputClass} />
          </InputField>
        </div>
        <InputField label="URL do endereço (Google Maps)">
          <input value={enderecoUrl} onChange={(e) => setEnderecoUrl(e.target.value)} className={inputClass} placeholder="https://maps.google.com/..." />
        </InputField>
      </Section>

      {/* Plano Premium */}
      <Section title="Plano Premium" icon={CreditCard}>
        <InputField label="Nome do Plano">
          <input value={planoNome} onChange={(e) => setPlanoNome(e.target.value)} className={inputClass} />
        </InputField>
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField label="Preço (R$)">
            <input type="number" step="10" value={planoPreco} onChange={(e) => setPlanoPreco(+e.target.value)} className={inputClass} />
          </InputField>
          <InputField label="Créditos por mês">
            <input type="number" value={planoCreditos} onChange={(e) => setPlanoCreditos(+e.target.value)} className={inputClass} />
          </InputField>
        </div>
      </Section>

      {/* Save */}
      <motion.button
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="gold-gradient btn-premium flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-body text-sm font-semibold text-primary-foreground disabled:opacity-50"
        whileTap={{ scale: 0.98 }}
      >
        <Save className="h-4 w-4" /> {save.isPending ? "Salvando..." : "Salvar Configurações"}
      </motion.button>
    </div>
  );
}

function ToggleItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-lg bg-secondary/50 px-4 py-3 transition-colors hover:bg-secondary">
      <span className="font-body text-sm text-foreground">{label}</span>
      <div
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 cursor-pointer rounded-full transition-colors ${checked ? "bg-gold" : "bg-muted"}`}
      >
        <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-foreground shadow-sm transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </div>
    </label>
  );
}
