import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  { name: "João Silva", text: "Melhor barbearia da cidade! Atendimento impecável e resultado sempre perfeito.", rating: 5 },
  { name: "Pedro Santos", text: "Ambiente sofisticado e profissionais de primeira. Voltarei sempre!", rating: 5 },
  { name: "Lucas Oliveira", text: "O fade do Carlos é incomparável. Recomendo para todos os amigos.", rating: 5 },
  { name: "Marcos Ribeiro", text: "Experiência premium do início ao fim. A barba ficou impecável.", rating: 5 },
];

export default function TestimonialsSection() {
  return (
    <section id="depoimentos" className="py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <p className="mb-3 font-body text-sm uppercase tracking-[0.3em] text-gold">Feedback</p>
          <h2 className="font-heading text-4xl font-bold text-foreground md:text-5xl">
            O que dizem nossos <span className="gold-text-gradient">clientes</span>
          </h2>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group rounded-xl glass-card-elevated p-6 transition-all duration-300 gold-glow-hover"
            >
              <Quote className="mb-4 h-6 w-6 text-gold/30" />
              <div className="mb-4 flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, idx) => (
                  <Star key={idx} className="h-4 w-4 fill-gold text-gold" />
                ))}
              </div>
              <p className="mb-5 font-body text-sm leading-relaxed italic text-muted-foreground">"{t.text}"</p>
              <p className="font-heading text-sm font-semibold text-foreground">{t.name}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
