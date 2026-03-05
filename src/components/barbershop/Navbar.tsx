import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Scissors, User, LogOut, Bell, BellOff, CalendarDays, Crown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import NotificationBell from "@/components/NotificationBell";

const navLinks = [
  { label: "Início", href: "/#inicio" },
  { label: "Serviços", href: "/#servicos" },
  { label: "Barbeiros", href: "/#barbeiros" },
  { label: "Depoimentos", href: "/#depoimentos" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, loading } = useAuth();
  const { isSubscribed, subscribe, loading: pushLoading, supported, checking } = usePushNotifications(user?.id);
  const [pushSuccess, setPushSuccess] = useState(false);

  const scrollTo = (id: string) => {
    setOpen(false);
    if (location.pathname !== "/") {
      window.location.href = id;
      return;
    }
    const el = document.getElementById(id.replace("/#", ""));
    el?.scrollIntoView({ behavior: "smooth" });
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const handleTogglePush = async () => {
    if (isSubscribed || pushSuccess) return;
    console.log("[Navbar] Activating push notifications...");
    const ok = await subscribe();
    if (ok) {
      setPushSuccess(true);
      console.log("[Navbar] ✅ Push notifications activated!");
    }
  };

  const pushActive = isSubscribed || pushSuccess;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <Link to="/" className="flex items-center gap-2">
          <Scissors className="h-6 w-6 text-gold" />
          <span className="font-heading text-xl font-bold tracking-wider text-foreground">
            BARBER CLUB <span className="text-gold">&</span> TATTOO
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-6 md:flex">
          {navLinks.map((l) => (
            <button
              key={l.label}
              onClick={() => scrollTo(l.href)}
              className="font-body text-sm uppercase tracking-widest text-muted-foreground transition-colors hover:text-gold"
            >
              {l.label}
            </button>
          ))}
          <Link
            to="/agendar"
            className="gold-gradient btn-premium rounded px-6 py-2.5 font-body text-sm font-semibold uppercase tracking-wider text-primary-foreground"
          >
            Agendar
          </Link>

          {!loading && (
            <>
              {user ? (
                <div className="flex items-center gap-2">
                  <NotificationBell />
                  {/* Desktop push bell */}
                  {supported && !checking && (
                    <button
                      onClick={handleTogglePush}
                      disabled={pushLoading || pushActive}
                      title={pushActive ? "Notificações push ativadas" : "Ativar notificações push"}
                      className={`rounded-full p-2 transition-all ${
                        pushActive
                          ? "text-gold"
                          : "text-muted-foreground hover:text-gold hover:shadow-[0_0_12px_-3px_hsl(var(--gold)/0.4)]"
                      } disabled:opacity-70`}
                    >
                      {pushActive ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                    </button>
                  )}
                  <Link
                    to="/plano"
                    className="rounded-full p-2 text-muted-foreground transition-colors hover:text-gold"
                    title="Plano Premium"
                  >
                    <Crown className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/meus-agendamentos"
                    className="rounded-full p-2 text-muted-foreground transition-colors hover:text-gold"
                    title="Meus Agendamentos"
                  >
                    <CalendarDays className="h-4 w-4" />
                  </Link>
                  <div className="flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1.5">
                    <User className="h-4 w-4 text-gold" />
                    <span className="font-body text-xs text-foreground">
                      {profile?.nome?.split(" ")[0] || "Conta"}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    title="Sair"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <Link
                  to="/auth"
                  className="rounded border border-border px-4 py-2 font-body text-xs text-muted-foreground transition-colors hover:border-gold hover:text-gold"
                >
                  Entrar / Criar Conta
                </Link>
              )}
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setOpen(!open)} className="text-foreground md:hidden">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-border md:hidden"
          >
            <div className="flex flex-col gap-4 px-4 py-6">
              {navLinks.map((l) => (
                <button
                  key={l.label}
                  onClick={() => scrollTo(l.href)}
                  className="text-left font-body text-sm uppercase tracking-widest text-muted-foreground transition-colors hover:text-gold"
                >
                  {l.label}
                </button>
              ))}
              <Link
                to="/agendar"
                onClick={() => setOpen(false)}
                className="gold-gradient mt-2 rounded px-6 py-3 text-center font-body text-sm font-semibold uppercase tracking-wider text-primary-foreground"
              >
                Agendar
              </Link>

              {!loading && (
                <>
                  {user ? (
                    <div className="space-y-3 border-t border-border pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gold" />
                          <span className="font-body text-sm text-foreground">
                            {profile?.nome?.split(" ")[0] || "Conta"}
                          </span>
                        </div>
                        <button
                          onClick={() => { handleLogout(); setOpen(false); }}
                          className="font-body text-xs text-destructive"
                        >
                          Sair
                        </button>
                      </div>

                      {/* Meus Agendamentos link */}
                      <Link
                        to="/meus-agendamentos"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 rounded-lg border border-border bg-secondary/50 px-4 py-3 transition-all hover:border-gold/30"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                          <CalendarDays className="h-4 w-4 text-gold" />
                        </div>
                        <div className="text-left">
                          <p className="font-body text-sm font-medium text-foreground">Meus Agendamentos</p>
                          <p className="font-body text-[10px] text-muted-foreground">Ver histórico de reservas</p>
                        </div>
                      </Link>

                      {/* Plano Premium link */}
                      <Link
                        to="/plano"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 rounded-lg border border-gold/20 bg-gold/5 px-4 py-3 transition-all hover:border-gold/40"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg gold-gradient">
                          <Crown className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <div className="text-left">
                          <p className="font-body text-sm font-medium text-gold">Plano Premium</p>
                          <p className="font-body text-[10px] text-muted-foreground">Até 5 cortes por mês</p>
                        </div>
                      </Link>

                      {/* Push notifications toggle - mobile */}
                      {supported && !checking && (
                        <motion.button
                          onClick={handleTogglePush}
                          disabled={pushLoading || pushActive}
                          className={`group flex w-full items-center gap-3 rounded-lg border px-4 py-3 transition-all ${
                            pushActive
                              ? "border-gold/40 bg-gold/10"
                              : "border-border bg-secondary/50 hover:border-gold/30 hover:shadow-[0_0_20px_-8px_hsl(var(--gold)/0.3)]"
                          } disabled:opacity-70`}
                          whileTap={{ scale: 0.98 }}
                        >
                          <motion.div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                              pushActive ? "gold-gradient" : "bg-secondary"
                            }`}
                            animate={pushSuccess ? { rotate: [0, -15, 15, -10, 10, 0] } : {}}
                            transition={{ duration: 0.5 }}
                          >
                            {pushActive ? (
                              <Bell className="h-4 w-4 text-primary-foreground" />
                            ) : (
                              <BellOff className="h-4 w-4 text-muted-foreground group-hover:text-gold" />
                            )}
                          </motion.div>
                          <div className="text-left">
                            <p className="font-body text-sm font-medium text-foreground">
                              {pushLoading ? "Ativando..." : pushActive ? "Notificações ativadas" : "Notificações"}
                            </p>
                            <p className="font-body text-[10px] text-muted-foreground">
                              {pushActive ? "Você receberá alertas de agendamento" : "Ativar alertas de agendamento"}
                            </p>
                          </div>
                          {pushActive && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="ml-auto">
                              <div className="h-2 w-2 rounded-full bg-gold shadow-[0_0_6px_hsl(var(--gold)/0.6)]" />
                            </motion.div>
                          )}
                        </motion.button>
                      )}
                    </div>
                  ) : (
                    <Link
                      to="/auth"
                      onClick={() => setOpen(false)}
                      className="mt-2 rounded border border-border px-6 py-3 text-center font-body text-sm text-muted-foreground transition-colors hover:border-gold"
                    >
                      Entrar / Criar Conta
                    </Link>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
