// Activation screen — shown on first launch until a valid code is entered
function Activation({ onActivated }) {
  const { useState, useRef } = React;
  const { motion } = window.Motion || window.FramerMotion || {};

  const [code, setCode]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [shake, setShake]       = useState(false);
  const inputRef                = useRef(null);

  // Format input as XXXX-XXXX-XXXX-XXXX
  function handleInput(e) {
    let raw = e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (raw.length > 16) raw = raw.slice(0, 16);
    const parts = [];
    for (let i = 0; i < raw.length; i += 4) parts.push(raw.slice(i, i + 4));
    setCode(parts.join("-"));
    setError("");
  }

  async function handleSubmit(e) {
    e && e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    try {
      const res = await window.electronAPI?.activationValidate(trimmed);
      if (res?.ok) {
        onActivated();
      } else {
        setError(res?.error || "Código incorrecto. Contacta con soporte.");
        setShake(true);
        setTimeout(() => setShake(false), 600);
      }
    } catch (err) {
      setError("Error de conexión. Reinicia la aplicación.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleSubmit();
  }

  const isComplete = code.replace(/-/g, "").length === 16;

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "#050506",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      overflow: "hidden",
      zIndex: 9999,
    }}>
      {/* Ambient blobs */}
      <div className="blob-1" />
      <div className="blob-2" />
      <div className="blob-3" />
      <div className="noise-layer" />
      <div className="grid-layer" />

      {/* Card */}
      <div
        className="liquid-glass-strong"
        style={{
          borderRadius: "1.5rem",
          padding: "52px 56px 48px",
          width: "100%",
          maxWidth: 480,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0,
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* Logo / icon */}
        <div style={{
          width: 64, height: 64,
          borderRadius: "1.1rem",
          background: "linear-gradient(135deg, rgba(94,106,210,0.30) 0%, rgba(94,106,210,0.10) 100%)",
          border: "1px solid rgba(94,106,210,0.35)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 28,
          boxShadow: "0 0 32px rgba(94,106,210,0.18)",
        }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect x="4" y="4" width="24" height="24" rx="6" stroke="#5E6AD2" strokeWidth="2" fill="none"/>
            <path d="M11 16.5 L14.5 20 L21 13" stroke="#5E6AD2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Heading */}
        <div style={{
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 700,
          fontSize: 26,
          color: "#EDEDEF",
          letterSpacing: "-0.3px",
          marginBottom: 8,
          textAlign: "center",
        }}>
          Activar Aelios
        </div>

        {/* Subtitle */}
        <div style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 14,
          color: "rgba(237,237,239,0.45)",
          fontWeight: 400,
          textAlign: "center",
          lineHeight: 1.55,
          marginBottom: 40,
          maxWidth: 300,
        }}>
          Introduce tu código de licencia para desbloquear la aplicación.
        </div>

        {/* Code input */}
        <div
          style={{
            width: "100%",
            marginBottom: 16,
            transform: shake ? "translateX(0)" : undefined,
            animation: shake ? "activation-shake 0.55s ease" : undefined,
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={code}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "rgba(255,255,255,0.045)",
              border: error
                ? "1px solid rgba(220,80,80,0.60)"
                : isComplete
                  ? "1px solid rgba(94,106,210,0.50)"
                  : "1px solid rgba(255,255,255,0.10)",
              borderRadius: "0.75rem",
              color: "#EDEDEF",
              fontSize: 18,
              fontFamily: "'Outfit', 'Courier New', monospace",
              fontWeight: 600,
              letterSpacing: "0.25em",
              padding: "14px 20px",
              outline: "none",
              textAlign: "center",
              transition: "border-color 0.2s",
              caretColor: "#5E6AD2",
            }}
          />
        </div>

        {/* Error message */}
        <div style={{
          minHeight: 20,
          marginBottom: 24,
          textAlign: "center",
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          color: "rgba(220,80,80,0.90)",
          fontWeight: 500,
          opacity: error ? 1 : 0,
          transition: "opacity 0.2s",
        }}>
          {error || " "}
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!isComplete || loading}
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: "0.75rem",
            border: "none",
            background: (isComplete && !loading)
              ? "linear-gradient(135deg, #5E6AD2 0%, #6872D9 100%)"
              : "rgba(255,255,255,0.08)",
            color: (isComplete && !loading) ? "#fff" : "rgba(237,237,239,0.30)",
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: "0.02em",
            cursor: (isComplete && !loading) ? "pointer" : "default",
            transition: "background 0.2s, color 0.2s, box-shadow 0.2s",
            boxShadow: (isComplete && !loading)
              ? "0 4px 20px rgba(94,106,210,0.35)"
              : "none",
          }}
        >
          {loading ? "Verificando..." : "Activar ahora"}
        </button>

        {/* Footer note */}
        <div style={{
          marginTop: 28,
          fontFamily: "'Inter', sans-serif",
          fontSize: 12,
          color: "rgba(237,237,239,0.25)",
          textAlign: "center",
          lineHeight: 1.5,
        }}>
          ¿No tienes un código? Contacta en{" "}
          <span style={{ color: "rgba(94,106,210,0.70)" }}>snufkinstudio.com</span>
        </div>
      </div>

      <style>{`
        @keyframes activation-shake {
          0%,100% { transform: translateX(0); }
          15%      { transform: translateX(-8px); }
          30%      { transform: translateX(8px); }
          45%      { transform: translateX(-6px); }
          60%      { transform: translateX(6px); }
          75%      { transform: translateX(-3px); }
          90%      { transform: translateX(3px); }
        }
        input::placeholder { color: rgba(237,237,239,0.20); letter-spacing: 0.15em; }
        input:focus { border-color: rgba(94,106,210,0.55) !important; }
      `}</style>
    </div>
  );
}

window.Activation = Activation;
