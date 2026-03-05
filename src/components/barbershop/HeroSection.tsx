import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronDown, ArrowRight } from "lucide-react";
import heroImg from "@/assets/hero-barbershop.jpg";

const stats = [
  { value: "8+", label: "Anos de Experiência" },
  { value: "500+", label: "Clientes Satisfeitos" },
  { value: "6", label: "Serviços Premium" },
];

export default function HeroSection() {
  return (
    <section id="inicio" className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Background with parallax effect */}
      <div className="absolute inset-0">
        <img src={heroImg} alt="Barbearia premium" className="h-full w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/60 to-background" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 50% 30%, hsl(var(--gold) / 0.06) 0%, transparent 60%)' }} />
      </div>

      <div className="container relative z-10 mx-auto px-4 pt-20 text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7 }}
          className="mb-4 font-body text-sm uppercase tracking-[0.4em] text-gold"
        >
          Onde o estilo encontra a tradição
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="mb-6 font-heading text-5xl font-bold leading-tight text-foreground md:text-7xl lg:text-8xl"
        >
          Bem-vindo à{" "}
          <span className="gold-text-gradient">BARBER CLUB</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.7 }}
          className="mx-auto mb-12 max-w-xl font-body text-lg leading-relaxed text-muted-foreground"
        >
          Experiência premium em barbearia com os melhores profissionais da cidade.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.7 }}
          className="flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link
            to="/agendar"
            className="group inline-flex items-center gap-2 rounded-lg gold-gradient px-10 py-4 font-body text-sm font-bold uppercase tracking-wider text-primary-foreground btn-premium"
          >
            Reservar Agora
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <button
            onClick={() => document.getElementById("barbeiros")?.scrollIntoView({ behavior: "smooth" })}
            className="rounded-lg border border-gold/60 px-10 py-4 font-body text-sm font-bold uppercase tracking-wider text-gold transition-all duration-300 hover:bg-gold/10 hover:shadow-[0_0_20px_-8px_hsl(var(--gold)/0.3)]"
          >
            Nossos Barbeiros
          </button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.8 }}
          className="mt-20 grid grid-cols-3 gap-4"
        >
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-heading text-4xl font-bold gold-text-gradient md:text-5xl">{s.value}</p>
              <p className="mt-2 font-body text-xs uppercase tracking-widest text-muted-foreground md:text-sm">
                {s.label}
              </p>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-16"
        >
          <ChevronDown className="mx-auto h-6 w-6 animate-bounce text-gold/60" />
        </motion.div>
      </div>
    </section>
  );
}
