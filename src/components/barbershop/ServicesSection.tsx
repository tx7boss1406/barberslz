import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Clock, Scissors, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

export default function ServicesSection() {
  const { data: servicos = [], isLoading } = useQuery({
    queryKey: ["servicos-public"],
    queryFn: async () => {
      const { data } = await supabase
        .from("servicos")
        .select("*")
        .eq("status", true)
        .order("preco", { ascending: true });
      return data || [];
    },
  });

  const mostExpensiveIdx = servicos.length > 0
    ? servicos.reduce((maxIdx, s, i, arr) => Number(s.preco) > Number(arr[maxIdx].preco) ? i : maxIdx, 0)
    : -1;

  return (
    <section id="servicos" className="py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <p className="mb-3 font-body text-sm uppercase tracking-[0.3em] text-gold">O que oferecemos</p>
          <h2 className="font-heading text-4xl font-bold text-foreground md:text-5xl lg:text-6xl">
            Nossos <span className="gold-text-gradient">Serviços</span>
          </h2>
        </motion.div>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {servicos.map((s, i) => {
              const isPopular = i === mostExpensiveIdx;
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`group relative rounded-xl border p-7 transition-all duration-500 border-glow-gold gold-glow-hover ${
                    isPopular
                      ? "border-gold/40 glass-card-elevated gold-glow"
                      : "border-border glass-card-elevated"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1 rounded-full gold-gradient px-4 py-1 font-body text-xs font-bold uppercase tracking-wider text-primary-foreground">
                        <Crown className="h-3 w-3" /> Mais Popular
                      </span>
                    </div>
                  )}

                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gold/10">
                      <Scissors className="h-5 w-5 text-gold" />
                    </div>
                    <span className="font-heading text-3xl font-bold gold-text-gradient">
                      R${Number(s.preco).toFixed(2)}
                    </span>
                  </div>

                  <h3 className="mb-2 font-heading text-xl font-semibold text-foreground">{s.nome}</h3>
                  <p className="mb-5 font-body text-sm leading-relaxed text-muted-foreground">{s.descricao}</p>

                  <div className="mb-6 flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="font-body text-sm">{s.duracao} min</span>
                  </div>

                  <Link
                    to="/agendar"
                    className="block w-full rounded-lg gold-gradient py-3 text-center font-body text-sm font-semibold uppercase tracking-wider text-primary-foreground btn-premium"
                  >
                    Agendar Agora
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
