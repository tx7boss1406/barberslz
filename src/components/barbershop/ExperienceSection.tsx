import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Award, Gem, Crown, CalendarCheck } from "lucide-react";

const cards = [
  { icon: Award, title: "Profissionais Certificados", desc: "Equipe treinada com as melhores técnicas do mercado" },
  { icon: Gem, title: "Produtos Premium", desc: "Utilizamos apenas produtos de alta performance" },
  { icon: Crown, title: "Ambiente Exclusivo", desc: "Um espaço pensado para conforto e sofisticação" },
  { icon: CalendarCheck, title: "Agendamento Inteligente", desc: "Reserve seu horário de forma rápida e prática" },
];

export default function ExperienceSection() {
  return (
    <section className="relative overflow-hidden py-24">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/30 to-background" />
      <div className="container relative mx-auto px-4">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="mb-4 font-heading text-4xl font-bold leading-tight text-foreground md:text-5xl">
              Uma experiência{" "}
              <span className="gold-text-gradient">além do corte</span>
            </h2>
            <p className="mb-3 font-heading text-xl text-gold">
              Estilo, atitude e precisão
            </p>
            <p className="mb-8 max-w-lg font-body text-base leading-relaxed text-muted-foreground">
              Barber Club & Tattoo oferece uma experiência premium combinando
              tradição, técnicas modernas e um ambiente exclusivo para quem exige
              o melhor.
            </p>
            <Link
              to="/agendar"
              className="gold-gradient btn-premium inline-block rounded-lg px-10 py-4 font-body text-sm font-bold uppercase tracking-widest text-primary-foreground"
            >
              Agendar Minha Visita
            </Link>
          </motion.div>

          {/* Right - Cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            {cards.map((c, i) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="glass-card-elevated border-glow-gold group rounded-xl p-6 transition-all duration-300 hover:-translate-y-1"
              >
                <c.icon className="mb-4 h-8 w-8 text-gold transition-transform group-hover:scale-110" />
                <h3 className="mb-2 font-heading text-lg font-bold text-foreground">
                  {c.title}
                </h3>
                <p className="font-body text-sm leading-relaxed text-muted-foreground">
                  {c.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
