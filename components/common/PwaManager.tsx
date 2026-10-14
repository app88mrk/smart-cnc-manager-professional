"use client";

import { useEffect, useState } from "react";
import { Download, WifiOff, X } from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function PwaManager() {
  const [online, setOnline] = useState(true);
  const [installPrompt, setInstallPrompt] =
    useState<InstallPromptEvent | null>(null);
  const [installHidden, setInstallHidden] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);
    const onlineHandler = () => setOnline(true);
    const offlineHandler = () => setOnline(false);
    const installHandler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };

    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);
    window.addEventListener("beforeinstallprompt", installHandler);

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // L’app resta utilizzabile online se il browser blocca il service worker.
      });
    }

    return () => {
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
      window.removeEventListener("beforeinstallprompt", installHandler);
    };
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      await navigator.storage?.persist?.();
    }
    setInstallPrompt(null);
  }

  return (
    <div className="pwaManager" aria-live="polite">
      {!online && (
        <div className="offlineBanner">
          <WifiOff size={17} />
          <div>
            <b>Modalità offline</b>
            <span>I dati già sincronizzati restano disponibili; le modifiche verranno inviate al ritorno della connessione.</span>
          </div>
        </div>
      )}
      {online && installPrompt && !installHidden && (
        <div className="installAppPrompt">
          <span><Download size={17} /> Installa Smart CNC sul dispositivo</span>
          <button type="button" onClick={install}>Installa</button>
          <button type="button" onClick={() => setInstallHidden(true)} aria-label="Nascondi">
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
