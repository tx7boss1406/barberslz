import { useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

const cuts = [
  { name: "Fade Clássico", desc: "Degradê suave com acabamento impecável", img: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&h=500&fit=crop" },
  { name: "Pompadour Moderno", desc: "Volume e estilo para quem quer se destacar", img: "https://images.unsplash.com/photo-1503951914875-452f5fce95e5?w=400&h=500&fit=crop" },
  { name: "Buzz Cut Premium", desc: "Corte militar com detalhes precisos", img: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&h=500&fit=crop" },
  { name: "Undercut Texturizado", desc: "Contraste marcante com textura natural", img: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400&h=500&fit=crop" },
  { name: "Navalhado Artístico", desc: "Detalhes artísticos com navalha", img: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400&h=500&fit=crop" },
  { name: "Degradê Alto", desc: "Transição alta com topo texturizado", img: "https://images.unsplash.com/photo-1593702288056-f5834cfb0203?w=400&h=500&fit=crop" },
];

export default function GallerySection() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 320;
    scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 flex items-end justify-between"
        >
          <div>
            <p className="mb-2 font-body text-sm uppercase tracking-widest text-gold">
              Galeria
            </p>
            <h2 className="font-heading text-4xl font-bold text-foreground">
              Nossos Estilos
            </h2>
          </div>
          <div className="hidden gap-2 md:flex">
            <button
              onClick={() => scroll("left")}
              className="rounded-full border border-border bg-card p-2 text-muted-foreground transition-colors hover:border-gold hover:text-gold"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="rounded-full border border-border bg-card p-2 text-muted-foreground transition-colors hover:border-gold hover:text-gold"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </motion.div>

        <div
          ref={scrollRef}
          className="scrollbar-hide flex gap-5 overflow-x-auto pb-4"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {cuts.map((cut, i) => (
            <motion.div
              key={cut.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="group relative min-w-[280px] flex-shrink-0 overflow-hidden rounded-xl"
              style={{ scrollSnapAlign: "start" }}
            >
              <img
                src={cut.img}
                alt={cut.name}
                loading="lazy"
                className="h-[360px] w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <h3 className="mb-1 font-heading text-lg font-bold text-white">
                  {cut.name}
                </h3>
                <p className="mb-3 font-body text-xs text-white/70">
                  {cut.desc}
                </p>
                <Link
                  to="/agendar"
                  className="inline-block rounded-full border border-gold/50 px-4 py-1.5 font-body text-xs text-gold transition-all hover:bg-gold hover:text-primary-foreground"
                >
                  Agendar esse estilo
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
