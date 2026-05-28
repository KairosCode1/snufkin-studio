// ── Update banner ─────────────────────────────────────────────────────────────
function UpdateBanner() {
  const { useState, useEffect } = React;
  // states: null | 'available' | 'downloading' | 'ready'
  const [updateState, setUpdateState] = useState(null);
  const [newVersion,  setNewVersion]  = useState("");
  const [progress,    setProgress]    = useState(0);
  const [dismissed,   setDismissed]   = useState(false);

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
      setUpdateState('ready');
    });
  }, []);

  if (!updateState || dismissed) return null;

  const isReady       = updateState === 'ready';
  const isDownloading = updateState === 'downloading';

  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24,
      zIndex: 99998,
      background: "linear-gradient(135deg, rgba(30,31,48,0.97) 0%, rgba(20,21,35,0.97) 100%)",
      border: "1px solid rgba(94,106,210,0.35)",
      borderRadius: "0.875rem",
      boxShadow: "0 8px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(94,106,210,0.10)",
      padding: "16px 20px",
      minWidth: 280, maxWidth: 340,
      display: "flex", flexDirection: "column", gap: 10,
      backdropFilter: "blur(20px)",
    }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: isReady ? "#4ade80" : "#5E6AD2",
            boxShadow: isReady ? "0 0 8px #4ade8088" : "0 0 8px #5E6AD288",
            flexShrink: 0,
          }} />
          <span style={{
            fontFamily: "'Outfit', sans-serif", fontWeight: 600,
            fontSize: 13, color: "#EDEDEF", letterSpacing: "-0.1px",
          }}>
            {isReady       ? `v${newVersion} listo para instalar`
             : isDownloading ? `Descargando v${newVersion}…`
             :                 `Nueva versión disponible v${newVersion}`}
          </span>
        </div>
        <button onClick={() => setDismissed(true)} style={{
          background: "none", border: "none", cursor: "pointer",
          color: "rgba(237,237,239,0.35)", fontSize: 16, lineHeight: 1,
          padding: "0 2px", flexShrink: 0,
        }}>×</button>
      </div>

      {/* Progress bar */}
      {isDownloading && (
        <div style={{
          height: 3, borderRadius: 9999,
          background: "rgba(255,255,255,0.08)",
          overflow: "hidden",
        }}>
          <div style={{
            height: "100%", borderRadius: 9999,
            background: "linear-gradient(90deg, #5E6AD2, #6872D9)",
            width: `${progress}%`,
            transition: "width 0.4s ease",
          }} />
        </div>
      )}

      {/* Action */}
      {isReady && (
        <button
          onClick={() => window.electronAPI?.updateInstall()}
          style={{
            background: "linear-gradient(135deg, #5E6AD2 0%, #6872D9 100%)",
            border: "none", borderRadius: "0.5rem",
            color: "#fff", cursor: "pointer",
            fontFamily: "'Outfit', sans-serif", fontWeight: 700,
            fontSize: 13, padding: "9px 0",
            boxShadow: "0 4px 14px rgba(94,106,210,0.35)",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={e => e.target.style.opacity = "0.85"}
          onMouseLeave={e => e.target.style.opacity = "1"}
        >
          Reiniciar e instalar ahora
        </button>
      )}

      {!isReady && !isDownloading && (
        <p style={{
          margin: 0, fontFamily: "'Inter', sans-serif",
          fontSize: 12, color: "rgba(237,237,239,0.40)", lineHeight: 1.5,
        }}>
          Descargando en segundo plano…
        </p>
      )}
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
      <UpdateBanner />
    </main>
  );
}

const rootEl = document.getElementById("root");
ReactDOM.createRoot(rootEl).render(<App />);
