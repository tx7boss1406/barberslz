import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X } from "lucide-react";

type Barbeiro = { id?: string; nome: string; especialidade: string; bio: string; foto_url: string; status: boolean; avaliacao: number };

const empty: Barbeiro = { nome: "", especialidade: "", bio: "", foto_url: "", status: true, avaliacao: 4.5 };

export default function BarbersTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Barbeiro | null>(null);
  const [isNew, setIsNew] = useState(false);

  const { data: barbeiros = [] } = useQuery({
    queryKey: ["admin-barbeiros"],
    queryFn: async () => {
      const { data } = await supabase.from("barbeiros").select("*").order("nome");
      return data || [];
    },
  });

  const save = useMutation({
    mutationFn: async (b: Barbeiro) => {
      const payload = { nome: b.nome, especialidade: b.especialidade, bio: b.bio, foto_url: b.foto_url, status: b.status, avaliacao: b.avaliacao };
      if (b.id) {
        const { error } = await supabase.from("barbeiros").update(payload).eq("id", b.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("barbeiros").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-barbeiros"] }); setEditing(null); setIsNew(false); toast.success("Barbeiro salvo"); },
    onError: () => toast.error("Erro ao salvar"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("barbeiros").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-barbeiros"] }); toast.success("Barbeiro removido"); },
  });

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="font-body text-sm text-muted-foreground">{barbeiros.length} barbeiro(s)</p>
        <button onClick={() => { setEditing({ ...empty }); setIsNew(true); }} className="gold-gradient flex items-center gap-2 rounded px-4 py-2 font-body text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> Novo Barbeiro
        </button>
      </div>

      {editing && (
        <div className="mb-6 rounded-lg border border-gold/30 bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-heading text-lg font-semibold text-foreground">{isNew ? "Novo Barbeiro" : "Editar Barbeiro"}</h3>
            <button onClick={() => { setEditing(null); setIsNew(false); }}><X className="h-5 w-5 text-muted-foreground" /></button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <input value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} placeholder="Nome" className="rounded border border-border bg-secondary px-4 py-2 font-body text-sm text-foreground focus:border-gold focus:outline-none" />
            <input value={editing.especialidade} onChange={(e) => setEditing({ ...editing, especialidade: e.target.value })} placeholder="Especialidade" className="rounded border border-border bg-secondary px-4 py-2 font-body text-sm text-foreground focus:border-gold focus:outline-none" />
            <input value={editing.bio} onChange={(e) => setEditing({ ...editing, bio: e.target.value })} placeholder="Bio" className="rounded border border-border bg-secondary px-4 py-2 font-body text-sm text-foreground focus:border-gold focus:outline-none" />
            <input value={editing.foto_url} onChange={(e) => setEditing({ ...editing, foto_url: e.target.value })} placeholder="URL da foto (opcional)" className="rounded border border-border bg-secondary px-4 py-2 font-body text-sm text-foreground focus:border-gold focus:outline-none" />
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {barbeiros.map((b: any) => (
          <div key={b.id} className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gold bg-secondary">
                {b.foto_url ? <img src={b.foto_url} alt={b.nome} className="h-full w-full rounded-full object-cover" /> : <span className="font-heading text-sm font-bold text-gold">{getInitials(b.nome)}</span>}
              </div>
              <div>
                <h3 className="font-heading text-base font-semibold text-foreground">{b.nome}</h3>
                <p className="font-body text-xs text-gold">{b.especialidade}</p>
              </div>
            </div>
            <p className="mb-4 font-body text-xs text-muted-foreground">{b.bio}</p>
            <div className="flex items-center justify-between">
              <span className={`rounded-full px-2 py-0.5 text-xs ${b.status ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>{b.status ? "Ativo" : "Inativo"}</span>
              <div className="flex gap-1">
                <button onClick={() => { setEditing(b); setIsNew(false); }} className="rounded p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => { if (confirm("Remover barbeiro?")) remove.mutate(b.id); }} className="rounded p-2 text-red-400 hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
