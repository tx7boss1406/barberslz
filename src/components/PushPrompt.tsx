import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, CheckCircle } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/contexts/AuthContext";

export default function PushPrompt() {
  const { user } = useAuth();
  const { isSubscribed, subscribe, loading, supported } = usePushNotifications(user?.id);
  const [dismissed, setDismissed] = useState(false);
  const [success, setSuccess] = useState(false);

  // Only show for logged-in users with push support, not yet subscribed/dismissed
  if (!user || !supported || isSubscribed || dismissed) return null;

  const handleSubscribe = async () => {
    console.log("[PushPrompt] Button clicked, calling subscribe()...");
    const ok = await subscribe();
    console.log("[PushPrompt] subscribe() returned:", ok);
    if (ok) {
      setSuccess(true);
      setTimeout(() => setDismissed(true), 2500);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("push-prompt-dismissed", "true");
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        className="fixed bottom-6 left-4 right-4 z-[100] mx-auto max-w-sm"
      >
        <div className="relative overflow-hidden rounded-xl border border-gold/30 bg-card p-5 shadow-[0_0_40px_-10px_hsl(var(--gold)/0.3)]">
          <button
            onClick={handleDismiss}
            className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl gold-gradient">
              {success ? (
                <CheckCircle className="h-6 w-6 text-primary-foreground" />
              ) : (
                <Bell className="h-6 w-6 text-primary-foreground" />
              )}
            </div>
            <div>
              <p className="font-heading text-base font-bold text-foreground">
                {success ? "Notificações Ativadas!" : "Ativar Notificações"}
              </p>
              <p className="font-body text-xs text-muted-foreground">
                {success
                  ? "Você receberá alertas sobre seus agendamentos"
                  : "Receba alertas sobre seus agendamentos"}
              </p>
            </div>
          </div>
          {!success && (
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="mt-4 w-full rounded-lg gold-gradient py-2.5 font-body text-sm font-semibold text-primary-foreground transition-all hover:shadow-[0_0_20px_-5px_hsl(var(--gold)/0.4)] disabled:opacity-50"
            >
              {loading ? "Ativando..." : "Ativar Notificações"}
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
