import { useModalFocus } from "@/lib/use-modal-focus";
import { ArrowDownToLine, Info, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};
export function usePwa() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [offline, setOffline] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [shellUnavailable, setShellUnavailable] = useState(false);
  const [installError, setInstallError] = useState("");
  useEffect(() => {
    setOffline(!navigator.onLine);
    setInstalled(
      window.matchMedia("(display-mode: standalone)").matches ||
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
    );
    const online = () => setOffline(false);
    const offlineHandler = () => setOffline(true);
    const ready = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const complete = () => {
      setPrompt(null);
      setInstalled(true);
    };
    window.addEventListener("online", online);
    window.addEventListener("offline", offlineHandler);
    window.addEventListener("beforeinstallprompt", ready);
    window.addEventListener("appinstalled", complete);
    // Development never registers a worker, avoiding stale modules during edits.
    if (
      import.meta.env.PROD &&
      "serviceWorker" in navigator &&
      window.isSecureContext
    ) {
      navigator.serviceWorker
        .register(`${import.meta.env.BASE_URL}sw.js`, {
          scope: import.meta.env.BASE_URL,
        })
        .catch(() => setShellUnavailable(true));
    }
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offlineHandler);
      window.removeEventListener("beforeinstallprompt", ready);
      window.removeEventListener("appinstalled", complete);
    };
  }, []);
  async function install() {
    if (!prompt || installing) return;
    setInstalling(true);
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch {
      setInstallError(
        "This browser could not open the install prompt. Use its app menu instead.",
      );
    } finally {
      // A browser prompt is single-use, including when the user dismisses it.
      setPrompt(null);
      setInstalling(false);
    }
  }
  return {
    canInstall: Boolean(prompt) && !installed,
    installed,
    offline,
    installing,
    shellUnavailable,
    installError,
    install,
  };
}
export function InstallApp({ pwa }: { pwa: ReturnType<typeof usePwa> }) {
  const [help, setHelp] = useState(false);
  useModalFocus(help);
  useEffect(() => {
    if (!help) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setHelp(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [help]);
  if (pwa.installed) return null;
  return (
    <>
      <div className="install-app-controls">
        {pwa.canInstall ? (
          <button
            className="install-app-button"
            onClick={() => void pwa.install()}
            disabled={pwa.installing}
          >
            <ArrowDownToLine size={14} />
            {pwa.installing ? "Opening install prompt…" : "Install Pitwall"}
          </button>
        ) : (
          <button
            className="install-app-help"
            onClick={(event) => {
              event.currentTarget.focus();
              setHelp(true);
            }}
          >
            <Smartphone size={14} />
            Use Pitwall as an app
            <Info size={11} />
          </button>
        )}
        {pwa.installError && (
          <p className="install-feedback">{pwa.installError}</p>
        )}
      </div>
      {help &&
        createPortal(
          <div className="modal-scrim" onClick={() => setHelp(false)}>
            <section
              className="modal app-install-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="install-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="modal-head">
                <div>
                  <div className="eyebrow">YOUR WEATHER DESK, ONE TAP AWAY</div>
                  <h2 id="install-title">Take Pitwall to the paddock.</h2>
                </div>
                <button
                  className="icon-button"
                  aria-label="Close app installation help"
                  onClick={() => setHelp(false)}
                >
                  <X size={19} />
                </button>
              </div>
              <div className="form-body">
                <p className="install-description">
                  Install this web app to open it in its own window. Your saved
                  circuits, preferences, sessions and forecast log stay on this
                  device.
                </p>
                <div className="install-instruction">
                  <strong>Chrome or Edge</strong>
                  <p>
                    Use the install icon in the address bar or the browser’s app
                    menu when offered. An “Install Pitwall” button appears here
                    when your browser makes installation available.
                  </p>
                </div>
                <div className="install-instruction">
                  <strong>Safari on iPhone or iPad</strong>
                  <p>
                    Open this page in Safari, tap Share, then Add to Home
                    Screen.
                  </p>
                </div>
                <div className="install-instruction">
                  <strong>Safari on Mac</strong>
                  <p>Use File → Add to Dock when available.</p>
                </div>
                <p className="field-note">
                  The app shell can open offline after a successful online
                  visit. Current weather, map tiles and radar need a connection.
                  Forecasts are never silently substituted with cached weather.
                </p>
                {pwa.shellUnavailable && (
                  <p className="inline-warning">
                    Offline app storage could not be enabled in this browser.
                    You can still use Pitwall while connected.
                  </p>
                )}
                <button
                  className="button full-width"
                  onClick={() => setHelp(false)}
                >
                  Got it
                </button>
              </div>
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}
