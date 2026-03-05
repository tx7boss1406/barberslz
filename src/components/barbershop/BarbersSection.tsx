import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function BarbersSection() {
  const { data: barbeiros = [], isLoading } = useQuery({
    queryKey: ["barbeiros-public"],
    queryFn: async () => {
      const { data } = await supabase
        .from("barbeiros")
        .select("*")
        .eq("status", true)
        .order("nome");
      return data || [];
    },
  });

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <section id="barbeiros" className="py-24" style={{ background: 'linear-gradient(180deg, hsl(var(--background)) 0%, hsl(0 0% 5%) 50%, hsl(var(--background)) 100%)' }}>
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <p className="mb-3 font-body text-sm uppercase tracking-[0.3em] text-gold">Profissionais</p>
          <h2 className="font-heading text-4xl font-bold text-foreground md:text-5xl lg:text-6xl">
            Nossos <span className="gold-text-gradient">Barbeiros</span>
          </h2>
        </motion.div>

        {isLoading ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-72 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {barbeiros.map((b, i) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="group rounded-xl glass-card-elevated p-8 text-center transition-all duration-500 gold-glow-hover"
              >
                <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border-2 border-gold/60 bg-secondary transition-all duration-300 group-hover:border-gold group-hover:shadow-[0_0_20px_-5px_hsl(var(--gold)/0.3)]">
                  {b.foto_url ? (
                    <img src={b.foto_url} alt={b.nome} className="h-full w-full rounded-full object-cover" loading="lazy" />
                  ) : (
                    <span className="font-heading text-2xl font-bold gold-text-gradient">{getInitials(b.nome)}</span>
                  )}
                </div>
                <h3 className="mb-1 font-heading text-xl font-semibold text-foreground">{b.nome}</h3>
                <p className="mb-3 font-body text-sm text-gold">{b.especialidade}</p>
                <div className="mb-4 flex items-center justify-center gap-1">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star
                      key={idx}
                      className={`h-4 w-4 ${idx < Math.round(Number(b.avaliacao)) ? "fill-gold text-gold" : "text-muted"}`}
                    />
                  ))}
                  <span className="ml-1 font-body text-xs text-muted-foreground">{Number(b.avaliacao).toFixed(1)}</span>
                </div>
                <p className="mb-6 font-body text-sm leading-relaxed text-muted-foreground">{b.bio}</p>
                <Link
                  to={`/agendar?barbeiro=${b.id}`}
                  className="group/btn inline-flex items-center gap-2 rounded-lg border border-gold/60 px-6 py-2.5 font-body text-xs uppercase tracking-wider text-gold transition-all duration-300 hover:bg-gold hover:text-primary-foreground hover:shadow-[0_0_20px_-8px_hsl(var(--gold)/0.4)]"
                >
                  Agendar com {b.nome.split(" ")[0]}
                  <ArrowRight className="h-3 w-3 transition-transform group-hover/btn:translate-x-0.5" />
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
