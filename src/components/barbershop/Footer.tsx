import { Scissors, Instagram, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const WHATSAPP_URL = "https://wa.me/5598982415349";
const INSTAGRAM_URL = "https://instagram.com/juniorr_barber_";
const MAPS_URL = "https://www.google.com/maps/search/?api=1&query=Av.+Principal+-+Jardim+das+Margaridas%2C+S%C3%A3o+Lu%C3%ADs+-+MA%2C+65052-875";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card py-12">
      <div className="container mx-auto grid gap-8 px-4 md:grid-cols-3">
        <div>
          <div className="mb-4 flex items-center gap-2">
            <Scissors className="h-5 w-5 text-gold" />
            <span className="font-heading text-lg font-bold text-foreground">BARBER CLUB & TATTOO</span>
          </div>
          <p className="font-body text-sm text-muted-foreground">
            Onde o estilo encontra a tradição. Experiência premium em barbearia.
          </p>
        </div>
        <div>
          <h4 className="mb-4 font-heading text-sm font-semibold uppercase tracking-widest text-gold">Contato</h4>
          <div className="space-y-2 font-body text-sm text-muted-foreground">
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 transition-colors hover:text-gold">
              <Phone className="h-4 w-4" /> (98) 98241-5349
            </a>
            <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 transition-colors hover:text-gold">
              <MapPin className="h-4 w-4" /> Av. Principal - Jardim das Margaridas, São Luís
            </a>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 transition-colors hover:text-gold">
              <Instagram className="h-4 w-4" /> @juniorr_barber_
            </a>
          </div>
        </div>
        <div>
          <h4 className="mb-4 font-heading text-sm font-semibold uppercase tracking-widest text-gold">Links</h4>
          <div className="flex flex-col gap-2 font-body text-sm text-muted-foreground">
            <Link to="/agendar" className="hover:text-gold">Agendar</Link>
            <Link to="/meus-agendamentos" className="hover:text-gold">Meus Agendamentos</Link>
            <Link to="/admin" className="hover:text-gold">Área Admin</Link>
          </div>
        </div>
      </div>
      <div className="container mx-auto mt-8 border-t border-border px-4 pt-6 text-center">
        <p className="font-body text-xs text-muted-foreground">
          © {new Date().getFullYear()} BARBER CLUB & TATTOO. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
