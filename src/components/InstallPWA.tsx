import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      const wasDismissed = sessionStorage.getItem("pwa-dismissed");
      if (!wasDismissed) setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setShow(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    sessionStorage.setItem("pwa-dismissed", "true");
  };

  if (!show || dismissed) return null;

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
              <Download className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <p className="font-heading text-base font-bold text-foreground">Instalar App</p>
              <p className="font-body text-xs text-muted-foreground">Acesse rapidamente pelo celular</p>
            </div>
          </div>
          <button
            onClick={handleInstall}
            className="mt-4 w-full rounded-lg gold-gradient py-2.5 font-body text-sm font-semibold text-primary-foreground transition-all hover:shadow-[0_0_20px_-5px_hsl(var(--gold)/0.4)]"
          >
            Instalar Agora
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
