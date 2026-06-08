// AudioSync — sincroniza audio OBS con video de cámara
// Usa cross-correlación FFT en el backend para detectar el desfase automáticamente.
(function () {
  const STYLE_ID = "__audio-sync-styles__";
  if (!document.getElementById(STYLE_ID)) {
    const el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = `
      .sync-dropzone {
        border: 1.5px dashed rgba(255,255,255,0.13);
        border-radius: 1.1rem;
        padding: 28px 24px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        cursor: pointer;
        transition: border-color 0.2s, background 0.2s;
        background: rgba(255,255,255,0.025);
        text-align: center;
        min-height: 130px;
        position: relative;
      }
      .sync-dropzone:hover, .sync-dropzone.drag-over {
        border-color: rgba(94,106,210,0.55);
        background: rgba(94,106,210,0.06);
      }
      .sync-dropzone.has-file {
        border-color: rgba(94,106,210,0.40);
        background: rgba(94,106,210,0.05);
      }
      .sync-dropzone input[type=file] {
        position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%;
      }
    `;
    document.head.appendChild(el);
  }
})();

function AudioSync({ onBack }) {
  const { useState, useRef, useCallback, useEffect } = React;

  const [camFile,      setCamFile]      = useState(null);
  const [obsFile,      setObsFile]      = useState(null);
  const [phase,        setPhase]        = useState("idle");   // idle | processing | done | error
  const [stepLabel,    setStepLabel]    = useState("");
  const [bar,          setBar]          = useState(0);
  const [offset,       setOffset]       = useState(null);     // segundos
  const [confidence,   setConf]         = useState(null);
  const [jobId,        setJobId]        = useState(null);
  const [error,        setError]        = useState("");
  const [camDrag,      setCamDrag]      = useState(false);
  const [obsDrag,      setObsDrag]      = useState(false);
  const [hasObsVideo,  setHasObsVideo]  = useState(false);    // OBS tenía pista de vídeo

  const esRef = useRef(null);

  // Cleanup EventSource on unmount
  useEffect(() => () => { if (esRef.current) esRef.current.close(); }, []);

  const startSync = useCallback(async () => {
    if (!camFile || !obsFile) return;
    setPhase("processing"); setBar(5); setStepLabel("Subiendo archivos...");

    const fd = new FormData();
    fd.append("video", camFile);
    fd.append("audio", obsFile);

    let jId;
    try {
      const r = await fetch("/upload-sync", { method: "POST", body: fd });
      const d = await r.json();
      jId = d.job_id;
      setJobId(jId);
    } catch (e) {
      setPhase("error"); setError("No se pudo conectar con el servidor."); return;
    }

    const es = new EventSource(`/progress-sync/${jId}`);
    esRef.current = es;

    es.onmessage = (e) => {
      const msg = e.data;
      if (msg === "KEEPALIVE") return;

      if (msg.startsWith("SYNC_STEP:")) {
        const parts = msg.replace("SYNC_STEP:", "").split(":");
        const step  = parseInt(parts[0], 10);
        const label = parts.slice(1).join(":");
        setStepLabel(label);
        // step 1 → 20%, step 2 → 55%, step 3 → 90%
        setBar([0, 20, 55, 90][step] || 0);
        return;
      }

      if (msg.startsWith("SYNC_OFFSET:")) {
        const [, rawOffset, rawConf] = msg.split(":");
        setOffset(parseFloat(rawOffset));
        setConf(parseFloat(rawConf));
        return;
      }

      if (msg.startsWith("SYNC_HAS_OBS_VIDEO:")) {
        setHasObsVideo(msg.endsWith(":1"));
        return;
      }

      if (msg.startsWith("DONE")) {
        es.close(); esRef.current = null;
        setBar(100);
        setTimeout(() => setPhase("done"), 400);
        return;
      }

      if (msg.startsWith("ERROR:")) {
        es.close(); esRef.current = null;
        setPhase("error");
        setError(msg.replace("ERROR:", ""));
      }
    };

    es.onerror = () => {
      es.close(); esRef.current = null;
      setPhase("error");
      setError("Conexión cortada — revisa que el servidor siga corriendo.");
    };
  }, [camFile, obsFile]);

  const reset = () => {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    setCamFile(null); setObsFile(null); setPhase("idle");
    setBar(0); setStepLabel(""); setOffset(null); setConf(null);
    setJobId(null); setError(""); setHasObsVideo(false);
  };

  // ── helpers ──
  const formatOffset = (s) => {
    if (s === null) return "—";
    const ms = Math.round(Math.abs(s) * 1000);
    const dir = s >= 0 ? "OBS empieza más tarde" : "OBS empieza antes";
    return `${ms} ms (${dir})`;
  };

  const confLabel = (c) => {
    if (c === null) return "";
    if (c > 0.6) return "Alta";
    if (c > 0.25) return "Media";
    return "Baja";
  };

  const confColor = (c) => {
    if (c === null) return "rgba(255,255,255,0.3)";
    if (c > 0.6) return "#4ade80";
    if (c > 0.25) return "#FFE033";
    return "#FF5050";
  };

  // ── Dropzone helper ──
  function Dropzone({ file, onFile, drag, onDrag, accept, label, icon }) {
    return (
      <div
        className={`sync-dropzone${drag ? " drag-over" : ""}${file ? " has-file" : ""}`}
        onDragOver={e => { e.preventDefault(); onDrag(true); }}
        onDragLeave={() => onDrag(false)}
        onDrop={e => {
          e.preventDefault(); onDrag(false);
          const f = e.dataTransfer.files[0];
          if (f) onFile(f);
        }}
      >
        <input type="file" accept={accept} onChange={e => { if(e.target.files[0]) onFile(e.target.files[0]); }} />
        <div style={{ fontSize: 28, marginBottom: 2 }}>{icon}</div>
        <div style={{ fontSize: 11, fontFamily: "'Outfit',sans-serif", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: file ? "rgba(94,106,210,0.9)" : "rgba(255,255,255,0.45)" }}>
          {label}
        </div>
        {file ? (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", fontFamily: "'Inter',sans-serif", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {file.name}
          </div>
        ) : (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", fontFamily: "'Inter',sans-serif" }}>
            Arrastra o haz clic
          </div>
        )}
      </div>
    );
  }

  // ── Render ──
  const cardStyle = {
    borderRadius: "1.4rem", padding: "32px 36px",
    background: "linear-gradient(to bottom,rgba(255,255,255,0.06),rgba(255,255,255,0.02))",
    backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.07)",
    boxShadow: "0 0 0 1px rgba(255,255,255,0.04),0 4px 30px rgba(0,0,0,0.5)",
    position: "relative", overflow: "hidden",
  };

  return (
    <div style={{ width: "100%", maxWidth: "36rem", margin: "2.5rem auto 0" }}>

      {/* ── IDLE / PICKING ── */}
      {phase === "idle" && (
        <div style={cardStyle}>
          {/* top edge */}
          <div style={{ position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.10),transparent)",pointerEvents:"none" }} />

          {/* Título */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.18em", color: "rgba(94,106,210,0.65)", fontFamily: "'Outfit',sans-serif", textTransform: "uppercase", marginBottom: 6 }}>
              ✦ Sincronizar Audio
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#EDEDEF", fontFamily: "'Outfit',sans-serif", marginBottom: 6 }}>
              Cámara + OBS
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.40)", fontFamily: "'Inter',sans-serif", lineHeight: 1.6 }}>
              Detecta automáticamente el desfase entre el audio de tu cámara y el audio grabado con OBS y los sincroniza con precisión de milisegundos.
            </div>
          </div>

          {/* Dropzones */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <Dropzone
              file={camFile} onFile={setCamFile}
              drag={camDrag} onDrag={setCamDrag}
              accept="video/*"
              label="Video cámara"
              icon="🎥"
            />
            <Dropzone
              file={obsFile} onFile={setObsFile}
              drag={obsDrag} onDrag={setObsDrag}
              accept="video/*,audio/*"
              label="Grabación OBS"
              icon="🖥️"
            />
          </div>

          {/* Info pill */}
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", fontFamily: "'Inter',sans-serif", textAlign: "center", marginBottom: 20, lineHeight: 1.5 }}>
            Si la grabación OBS es un vídeo, podrás descargar ambas versiones con el audio bueno.
          </div>

          {/* Botón */}
          <button
            onClick={startSync}
            disabled={!camFile || !obsFile}
            style={{
              width: "100%", padding: "14px 0", borderRadius: "0.75rem",
              border: "none", cursor: (!camFile || !obsFile) ? "not-allowed" : "pointer",
              background: (!camFile || !obsFile)
                ? "rgba(94,106,210,0.2)"
                : "linear-gradient(135deg,#5E6AD2 0%,#6872D9 100%)",
              color: (!camFile || !obsFile) ? "rgba(255,255,255,0.3)" : "#fff",
              fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 14,
              letterSpacing: "0.06em", textTransform: "uppercase",
              transition: "all 0.18s",
              boxShadow: (!camFile || !obsFile) ? "none" : "0 4px 20px rgba(94,106,210,0.35)",
            }}
            onMouseEnter={e => { if (camFile && obsFile) e.currentTarget.style.opacity = "0.88"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
          >
            Sincronizar
          </button>

          {/* Volver */}
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <button onClick={onBack} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.30)", fontSize: 12, cursor: "pointer", fontFamily: "'Inter',sans-serif", display: "inline-flex", alignItems: "center", gap: 4 }}
              onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.60)"}
              onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.30)"}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Volver
            </button>
          </div>
        </div>
      )}

      {/* ── PROCESANDO ── */}
      {phase === "processing" && (
        <div style={cardStyle}>
          <div style={{ position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.10),transparent)",pointerEvents:"none" }} />

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.18em", color: "rgba(94,106,210,0.65)", fontFamily: "'Outfit',sans-serif", textTransform: "uppercase", marginBottom: 6 }}>
              ✦ Sincronizar Audio
            </div>
          </div>

          {/* Steps */}
          {[
            "Analizando audio...",
            "Aplicando sincronización...",
            "Listo",
          ].map((label, i) => {
            const stepBar = [20, 55, 90][i];
            const done = bar > stepBar;
            const active = !done && bar >= (i === 0 ? 5 : [20, 55][i - 1]);
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: done ? "rgba(74,222,128,0.15)" : active ? "rgba(94,106,210,0.2)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${done ? "rgba(74,222,128,0.4)" : active ? "rgba(94,106,210,0.5)" : "rgba(255,255,255,0.10)"}`,
                  fontSize: 10,
                }}>
                  {done ? "✓" : active ? "·" : ""}
                </div>
                <div style={{ fontSize: 13, fontFamily: "'Inter',sans-serif", color: done ? "rgba(74,222,128,0.8)" : active ? "rgba(255,255,255,0.80)" : "rgba(255,255,255,0.28)" }}>
                  {label}
                </div>
              </div>
            );
          })}

          {/* Offset detectado (si ya llegó) */}
          {offset !== null && (
            <div style={{ margin: "16px 0 0", padding: "12px 16px", borderRadius: "0.75rem", background: "rgba(94,106,210,0.08)", border: "1px solid rgba(94,106,210,0.20)" }}>
              <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "rgba(94,106,210,0.70)", fontFamily: "'Outfit',sans-serif", textTransform: "uppercase", marginBottom: 4 }}>
                Desfase detectado
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#EDEDEF", fontFamily: "'Outfit',sans-serif" }}>
                {formatOffset(offset)}
              </div>
              {confidence !== null && (
                <div style={{ fontSize: 11, color: confColor(confidence), fontFamily: "'Inter',sans-serif", marginTop: 2 }}>
                  Confianza: {confLabel(confidence)}
                </div>
              )}
            </div>
          )}

          {/* Barra */}
          <div style={{ marginTop: 20, height: 4, borderRadius: 9999, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 9999, background: "linear-gradient(90deg,#5E6AD2,#818cf8)", width: `${bar}%`, transition: "width 0.6s ease" }} />
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: "rgba(255,255,255,0.30)", fontFamily: "'Inter',sans-serif", textAlign: "right" }}>
            {stepLabel}
          </div>
        </div>
      )}

      {/* ── LISTO ── */}
      {phase === "done" && (
        <div style={cardStyle}>
          <div style={{ position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.10),transparent)",pointerEvents:"none" }} />

          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#EDEDEF", fontFamily: "'Outfit',sans-serif", marginBottom: 6 }}>
              Audio sincronizado
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.40)", fontFamily: "'Inter',sans-serif" }}>
              {hasObsVideo
                ? "Elige qué vídeo quieres — ambos llevan el audio de OBS sincronizado."
                : "El vídeo incluye el audio de OBS sincronizado con la cámara."}
            </div>
          </div>

          {/* Offset info */}
          {offset !== null && (
            <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: "0.75rem", background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.20)", textAlign: "center" }}>
              <div style={{ fontSize: 11, letterSpacing: "0.12em", color: "rgba(74,222,128,0.65)", fontFamily: "'Outfit',sans-serif", textTransform: "uppercase", marginBottom: 4 }}>
                Desfase corregido
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#4ade80", fontFamily: "'Outfit',sans-serif" }}>
                {formatOffset(offset)}
              </div>
              {confidence !== null && (
                <div style={{ fontSize: 11, color: confColor(confidence), fontFamily: "'Inter',sans-serif", marginTop: 2 }}>
                  Confianza: {confLabel(confidence)}
                </div>
              )}
            </div>
          )}

          {/* ── Botones de descarga ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>

            {/* Opción A: Cámara + audio OBS */}
            <div>
              <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "rgba(255,255,255,0.30)", fontFamily: "'Outfit',sans-serif", textTransform: "uppercase", marginBottom: 5, paddingLeft: 2 }}>
                {hasObsVideo ? "Opción A — Cámara" : "Descargar"}
              </div>
              <a
                href={`/download-sync/${jobId}?variant=cam`}
                download
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  width: "100%", padding: "13px 0", borderRadius: "0.75rem",
                  background: "linear-gradient(135deg,#5E6AD2,#6872D9)",
                  color: "#fff", textDecoration: "none",
                  fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 13,
                  letterSpacing: "0.05em", textTransform: "uppercase",
                  boxShadow: "0 4px 20px rgba(94,106,210,0.30)",
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M4 7l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 13h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                🎥 {hasObsVideo ? "Cámara + audio OBS" : "Descargar video"}
              </a>
            </div>

            {/* Opción B: Pantalla OBS + audio OBS (solo si OBS tenía vídeo) */}
            {hasObsVideo && (
              <div>
                <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "rgba(255,255,255,0.30)", fontFamily: "'Outfit',sans-serif", textTransform: "uppercase", marginBottom: 5, paddingLeft: 2 }}>
                  Opción B — Pantalla
                </div>
                <a
                  href={`/download-sync/${jobId}?variant=obs`}
                  download
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    width: "100%", padding: "13px 0", borderRadius: "0.75rem",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.85)", textDecoration: "none",
                    fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 13,
                    letterSpacing: "0.05em", textTransform: "uppercase",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.10)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.20)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
                >
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M4 7l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 13h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                  🖥️ Pantalla OBS + audio OBS
                </a>
              </div>
            )}
          </div>

          <button
            onClick={reset}
            style={{
              width: "100%", padding: "11px 0", borderRadius: "0.75rem",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.50)", fontFamily: "'Outfit',sans-serif",
              fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "rgba(255,255,255,0.75)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "rgba(255,255,255,0.50)"; }}
          >
            Sincronizar otro video
          </button>
        </div>
      )}

      {/* ── ERROR ── */}
      {phase === "error" && (
        <div style={cardStyle}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#FF5050", fontFamily: "'Outfit',sans-serif", marginBottom: 8 }}>
              Error al sincronizar
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.40)", fontFamily: "'Inter',sans-serif", lineHeight: 1.6 }}>
              {error}
            </div>
          </div>
          <button
            onClick={reset}
            style={{
              width: "100%", padding: "13px 0", borderRadius: "0.75rem", border: "none",
              background: "rgba(255,80,80,0.12)", color: "rgba(255,100,100,0.85)",
              fontFamily: "'Outfit',sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer",
            }}
          >
            Intentar de nuevo
          </button>
        </div>
      )}
    </div>
  );
}

window.AudioSync = AudioSync;
