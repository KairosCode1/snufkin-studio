// ── Update modal ──────────────────────────────────────────────────────────────
function UpdateModal() {
  const { useState, useEffect } = React;
  // states: null | 'available' | 'downloading' | 'installing'
  const [updateState, setUpdateState] = useState(null);
  const [newVersion,  setNewVersion]  = useState("");
  const [progress,    setProgress]    = useState(0);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;
    api.onUpdateAvailable?.((info) => {
      setNewVersion(info.version);
      setUpdateState('available');
    });
    api.onUpdateProgress?.((info) => {
      setProgress(info.percent || 0);
      setUpdateState('downloading');
    });
    api.onUpdateReady?.((info) => {
      setNewVersion(info.version);
      // Descarga completa → instalar en silencio y reabrir
      setUpdateState('installing');
      setTimeout(() => window.electronAPI?.updateInstall(), 800);
    });
  }, []);

  if (!updateState) return null;

  const isDownloading = updateState === 'downloading';
  const isInstalling  = updateState === 'installing';

  function handleUpdate() {
    setUpdateState('downloading');
    setProgress(0);
    window.electronAPI?.updateDownload();
  }

  return (
    <div style={{
      position: "fixed", inset: 0,
      zIndex: 99998,
      background: "rgba(4,4,7,0.80)",
      backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {/* Ambient blobs */}
      <div className="blob-1" style={{ opacity: 0.5 }} />
      <div className="blob-3" style={{ opacity: 0.4 }} />

      {/* Card */}
      <div className="liquid-glass-strong" style={{
        borderRadius: "1.5rem",
        padding: "52px 56px 48px",
        width: "100%", maxWidth: 460,
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 0, position: "relative", zIndex: 2,
        margin: "0 24px",
      }}>
        {/* Icon */}
        <div style={{
          width: 64, height: 64, borderRadius: "1.1rem",
          background: "linear-gradient(135deg, rgba(94,106,210,0.30) 0%, rgba(94,106,210,0.10) 100%)",
          border: "1px solid rgba(94,106,210,0.35)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 28,
          boxShadow: "0 0 40px rgba(94,106,210,0.20)",
        }}>
          {isInstalling ? (
            /* Checkmark */
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M6 14.5L11.5 20L22 9" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            /* Download arrow */
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 5v13M8 13l6 6 6-6" stroke="#5E6AD2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 22h18" stroke="#5E6AD2" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          )}
        </div>

        {/* Title */}
        <div style={{
          fontFamily: "'Outfit', sans-serif", fontWeight: 700,
          fontSize: 26, color: "#EDEDEF", letterSpacing: "-0.3px",
          marginBottom: 10, textAlign: "center",
        }}>
          {isInstalling ? "Instalando actualización…"
           : isDownloading ? `Descargando v${newVersion}…`
           : "Nueva actualización disponible"}
        </div>

        {/* Subtitle */}
        <div style={{
          fontFamily: "'Inter', sans-serif", fontSize: 14,
          color: "rgba(237,237,239,0.45)", fontWeight: 400,
          textAlign: "center", lineHeight: 1.6, marginBottom: 36,
          maxWidth: 300,
        }}>
          {isInstalling
            ? "La app se cerrará y volverá a abrirse con la nueva versión."
            : isDownloading
              ? "La app se instalará sola al terminar la descarga."
              : `La versión ${newVersion} ya está disponible con mejoras y correcciones.`}
        </div>

        {/* Progress bar — visible while downloading or installing */}
        {(isDownloading || isInstalling) && (
          <div style={{
            width: "100%", height: 4, borderRadius: 9999,
            background: "rgba(255,255,255,0.07)",
            overflow: "hidden", marginBottom: 36,
          }}>
            <div style={{
              height: "100%", borderRadius: 9999,
              background: "linear-gradient(90deg, #5E6AD2, #818cf8)",
              width: isInstalling ? "100%" : `${progress}%`,
              transition: "width 0.4s ease",
            }} />
          </div>
        )}

        {/* Percent label */}
        {isDownloading && (
          <div style={{
            fontFamily: "'Outfit', sans-serif", fontSize: 13,
            color: "rgba(237,237,239,0.40)", marginTop: -28, marginBottom: 28,
            textAlign: "center",
          }}>
            {progress}%
          </div>
        )}

        {/* CTA button — only on 'available' state */}
        {updateState === 'available' && (
          <button
            onClick={handleUpdate}
            style={{
              width: "100%", padding: "15px 0",
              borderRadius: "0.75rem", border: "none",
              background: "linear-gradient(135deg, #5E6AD2 0%, #6872D9 100%)",
              color: "#fff",
              fontFamily: "'Outfit', sans-serif", fontWeight: 700,
              fontSize: 15, letterSpacing: "0.02em",
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(94,106,210,0.40)",
              transition: "opacity 0.15s, transform 0.1s",
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1";    e.currentTarget.style.transform = "translateY(0)"; }}
          >
            Actualizar
          </button>
        )}

        {/* Spinner label while installing */}
        {isInstalling && (
          <div style={{
            fontFamily: "'Inter', sans-serif", fontSize: 13,
            color: "rgba(237,237,239,0.35)", textAlign: "center",
          }}>
            Reiniciando en unos segundos…
          </div>
        )}
      </div>
    </div>
  );
}

// ── Version badge ─────────────────────────────────────────────────────────────
function VersionBadge() {
  const { useState, useEffect } = React;
  const [version, setVersion] = useState("");

  useEffect(() => {
    window.electronAPI?.updateVersion?.().then(v => setVersion(v)).catch(() => {});
  }, []);

  if (!version) return null;

  return (
    <div style={{
      position: "fixed", bottom: 12, right: 16,
      zIndex: 9990, pointerEvents: "none",
      fontFamily: "'Inter', sans-serif",
      fontSize: 11, fontWeight: 400,
      color: "rgba(237,237,239,0.18)",
      letterSpacing: "0.03em",
      userSelect: "none",
    }}>
      v{version}
    </div>
  );
}

// ── App entry ─────────────────────────────────────────────────────────────────
function App() {
  const { useState, useEffect } = React;

  const Hero              = window.Hero;
  const SettingsButton    = window.SettingsButton;
  const GroqWarningBanner = window.GroqWarningBanner;
  const Activation        = window.Activation;

  // null = checking, false = not activated, true = activated
  const [activated, setActivated] = useState(null);

  useEffect(() => {
    // If not running in Electron, skip activation gate
    if (!window.electronAPI?.activationCheck) {
      setActivated(true);
      return;
    }
    window.electronAPI.activationCheck().then(res => {
      setActivated(res?.activated === true);
    }).catch(() => {
      // On error, allow access so a server error doesn't brick the app
      setActivated(true);
    });
  }, []);

  // Still checking — render nothing (avoids flash of activation screen)
  if (activated === null) return null;

  // Not yet activated — show activation gate
  if (!activated) {
    return <Activation onActivated={() => setActivated(true)} />;
  }

  // Activated — normal app
  return (
    <main>
      <Hero />
      <SettingsButton />
      <GroqWarningBanner />
      <UpdateModal />
      <VersionBadge />
    </main>
  );
}

const rootEl = document.getElementById("root");
ReactDOM.createRoot(rootEl).render(<App />);
