import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X } from "lucide-react";

type Servico = { id?: string; nome: string; descricao: string; duracao: number; preco: number; status: boolean };

const empty: Servico = { nome: "", descricao: "", duracao: 30, preco: 0, status: true };

export default function ServicesTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Servico | null>(null);
  const [isNew, setIsNew] = useState(false);

  const { data: servicos = [] } = useQuery({
    queryKey: ["admin-servicos"],
    queryFn: async () => {
      const { data } = await supabase.from("servicos").select("*").order("nome");
      return data || [];
    },
  });

  const save = useMutation({
    mutationFn: async (s: Servico) => {
      if (s.id) {
        const { error } = await supabase.from("servicos").update({ nome: s.nome, descricao: s.descricao, duracao: s.duracao, preco: s.preco, status: s.status }).eq("id", s.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("servicos").insert({ nome: s.nome, descricao: s.descricao, duracao: s.duracao, preco: s.preco, status: s.status });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-servicos"] }); setEditing(null); setIsNew(false); toast.success("Serviço salvo"); },
    onError: () => toast.error("Erro ao salvar"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("servicos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-servicos"] }); toast.success("Serviço removido"); },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="font-body text-sm text-muted-foreground">{servicos.length} serviço(s)</p>
        <button onClick={() => { setEditing({ ...empty }); setIsNew(true); }} className="gold-gradient flex items-center gap-2 rounded px-4 py-2 font-body text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> Novo Serviço
        </button>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="mb-6 rounded-lg border border-gold/30 bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-heading text-lg font-semibold text-foreground">{isNew ? "Novo Serviço" : "Editar Serviço"}</h3>
            <button onClick={() => { setEditing(null); setIsNew(false); }}><X className="h-5 w-5 text-muted-foreground" /></button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <input value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} placeholder="Nome" className="rounded border border-border bg-secondary px-4 py-2 font-body text-sm text-foreground focus:border-gold focus:outline-none" />
            <input value={editing.descricao} onChange={(e) => setEditing({ ...editing, descricao: e.target.value })} placeholder="Descrição" className="rounded border border-border bg-secondary px-4 py-2 font-body text-sm text-foreground focus:border-gold focus:outline-none" />
            <input type="number" value={editing.duracao} onChange={(e) => setEditing({ ...editing, duracao: +e.target.value })} placeholder="Duração (min)" className="rounded border border-border bg-secondary px-4 py-2 font-body text-sm text-foreground focus:border-gold focus:outline-none" />
            <input type="number" step="0.01" value={editing.preco} onChange={(e) => setEditing({ ...editing, preco: +e.target.value })} placeholder="Preço" className="rounded border border-border bg-secondary px-4 py-2 font-body text-sm text-foreground focus:border-gold focus:outline-none" />
          </div>
          <div className="mt-4 flex items-center gap-4">
            <label className="flex items-center gap-2 font-body text-sm text-foreground">
              <input type="checkbox" checked={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.checked })} className="accent-gold" />
              Ativo
            </label>
            <button onClick={() => save.mutate(editing)} disabled={!editing.nome} className="gold-gradient rounded px-6 py-2 font-body text-sm font-semibold text-primary-foreground disabled:opacity-50">Salvar</button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {servicos.map((s: any) => (
          <div key={s.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-base font-semibold text-foreground">{s.nome}</h3>
                <span className={`rounded-full px-2 py-0.5 text-xs ${s.status ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>{s.status ? "Ativo" : "Inativo"}</span>
              </div>
              <p className="font-body text-xs text-muted-foreground">{s.descricao} • {s.duracao}min • R${Number(s.preco).toFixed(2)}</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => { setEditing(s); setIsNew(false); }} className="rounded p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => { if (confirm("Remover serviço?")) remove.mutate(s.id); }} className="rounded p-2 text-red-400 hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
