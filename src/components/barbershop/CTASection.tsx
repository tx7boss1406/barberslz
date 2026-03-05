import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function CTASection() {
  return (
    <section className="relative overflow-hidden py-28">
      <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-transparent to-gold/5" />
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, hsl(var(--gold) / 0.08) 0%, transparent 70%)' }} />
      <div className="container relative mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <p className="mb-4 font-body text-sm uppercase tracking-[0.3em] text-gold">Não perca tempo</p>
          <h2 className="mb-5 font-heading text-4xl font-bold text-foreground md:text-5xl lg:text-6xl">
            Reserve seu horário{" "}
            <span className="gold-text-gradient">agora mesmo</span>
          </h2>
          <p className="mx-auto mb-12 max-w-lg font-body text-lg leading-relaxed text-muted-foreground">
            Garanta um atendimento exclusivo com nossos profissionais de excelência.
          </p>
          <Link
            to="/agendar"
            className="group inline-flex items-center gap-3 rounded-lg gold-gradient px-14 py-5 font-body text-sm font-bold uppercase tracking-widest text-primary-foreground btn-premium"
          >
            Agendar Agora
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
