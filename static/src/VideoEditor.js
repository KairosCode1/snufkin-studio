// VideoEditor — Full modal editor
// Changes: merged captions+trim tabs, bigger left panel, caption overlay fix,
// caption position drag, auto-pause on open, APLICAR CAMBIOS → re-render flow
function VideoEditor({ jobId, onReset, onApplyChanges }) {
  const {
    useState: useStateVE,
    useEffect: useEffectVE,
    useRef: useRefVE,
  } = React;

  const [open,           setOpen]           = useStateVE(false);
  const [duration,       setDuration]       = useStateVE(0);
  const [currentTime,    setCurrentTime]    = useStateVE(0);
  const [playing,        setPlaying]        = useStateVE(false);
  const [muted,          setMuted]          = useStateVE(false);
  const [captions,       setCaptions]       = useStateVE([]);
  const [editingId,      setEditingId]      = useStateVE(null);
  const [editText,       setEditText]       = useStateVE("");
  const [hasChanges,     setHasChanges]     = useStateVE(false);
  const [saving,         setSaving]         = useStateVE(false);
  const [saveMsg,        setSaveMsg]        = useStateVE(""); // "" | "ok" | "err"
  const [trimStart,      setTrimStart]      = useStateVE(0);
  const [trimEnd,        setTrimEnd]        = useStateVE(0);
  const [trimming,       setTrimming]       = useStateVE(false);
  const [trimDone,       setTrimDone]       = useStateVE(false);
  const [trimError,      setTrimError]      = useStateVE("");
  const [captionPosEdit, setCaptionPosEdit] = useStateVE(15);  // % from bottom (draggable)
  const [draggingCapPos, setDraggingCapPos] = useStateVE(false);
  const [applying,       setApplying]       = useStateVE(false);
  // Style metadata loaded from job-info (needed to render accurate caption overlay)
  const [capStyle,      setCapStyle]      = useStateVE("style1");
  const [hlColor,       setHlColor]       = useStateVE("#FFE033");
  const [capFont,       setCapFont]       = useStateVE("outfit");
  const [capOrient,     setCapOrient]     = useStateVE("vertical");
  const [vidScale,      setVidScale]      = useStateVE(0.21); // clientHeight / original_height

  const vidRef               = useRefVE(null);
  const rafRef               = useRefVE(null);
  const videoContainerRef    = useRefVE(null);
  const videoOverlayInputRef = useRefVE(null);  // ref for the inline video edit input
  const editFromVideoRef     = useRefVE(false);  // true when editing was triggered by video dbl-click

  // ── Load job data ────────────────────────────────────────────────────────────
  useEffectVE(() => {
    if (!open || !jobId) return;
    fetch(`/job-info/${jobId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        if (d.duration) { setDuration(d.duration); setTrimEnd(d.duration); }
        if (typeof d.caption_pos    === "number") setCaptionPosEdit(d.caption_pos);
        if (d.caption_style)  setCapStyle(d.caption_style);
        if (d.highlight_color) setHlColor(d.highlight_color);
        if (d.caption_font)   setCapFont(d.caption_font);
        if (d.orientation)    setCapOrient(d.orientation);
        if (Array.isArray(d.captions)) setCaptions(d.captions.map(c => ({ ...c })));
      })
      .catch(() => {});
  }, [open, jobId]);

  // ── RAF loop for currentTime ─────────────────────────────────────────────────
  useEffectVE(() => {
    if (!open) return;
    const tick = () => {
      if (vidRef.current) setCurrentTime(vidRef.current.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [open]);

  // ── Track video element rendered height for caption scale factor ─────────────
  useEffectVE(() => {
    if (!open || !vidRef.current) return;
    const origH = capOrient === "horizontal" ? 1080 : 1920;
    const update = () => {
      if (vidRef.current) setVidScale(vidRef.current.clientHeight / origH);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(vidRef.current);
    return () => ro.disconnect();
  }, [open, capOrient]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────────
  useEffectVE(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.code === "Space") { e.preventDefault(); togglePlay(); }
      if (e.code === "Escape") { setOpen(false); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, playing]);

  // ── Focus video overlay input when edit is triggered from video dbl-click ─────
  useEffectVE(() => {
    if (editingId !== null && editFromVideoRef.current && videoOverlayInputRef.current) {
      // Use rAF to let React finish rendering the input before focusing
      const id = requestAnimationFrame(() => {
        if (videoOverlayInputRef.current) {
          videoOverlayInputRef.current.focus();
          videoOverlayInputRef.current.select();
        }
      });
      return () => cancelAnimationFrame(id);
    }
  }, [editingId]);

  // ── Caption position drag ────────────────────────────────────────────────────
  useEffectVE(() => {
    if (!draggingCapPos) return;
    const move = (e) => {
      if (!videoContainerRef.current) return;
      const rect = videoContainerRef.current.getBoundingClientRect();
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const pct = Math.round((1 - (clientY - rect.top) / rect.height) * 100);
      setCaptionPosEdit(Math.max(5, Math.min(75, pct)));
    };
    const up = () => setDraggingCapPos(false);
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
    document.addEventListener("touchmove", move, { passive: true });
    document.addEventListener("touchend", up);
    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", up);
    };
  }, [draggingCapPos]);

  // ── Helpers ───────────────────────────────────────────────────────────────────
  function togglePlay() {
    const v = vidRef.current;
    if (!v) return;
    if (v.paused) { v.play().catch(() => {}); setPlaying(true); }
    else          { v.pause(); setPlaying(false); }
  }

  function seekTo(t) {
    const v = vidRef.current;
    const clamped = Math.max(0, Math.min(duration, t));
    if (v) { v.currentTime = clamped; setCurrentTime(clamped); }
  }

  function fmtTime(s) {
    if (isNaN(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const sec = (s % 60).toFixed(1).padStart(4, "0");
    return `${m}:${sec}`;
  }

  // ── Caption editing ───────────────────────────────────────────────────────────
  function startEdit(cap) { setEditingId(cap.id); setEditText(cap.text); }

  function startEditFromList(cap) { editFromVideoRef.current = false; startEdit(cap); }

  function saveEdit(id) {
    setCaptions(prev => prev.map(c => {
      if (c.id !== id) return c;
      const newText  = editText.trim();
      const newWords = newText.split(/\s+/).filter(Boolean);
      const oldWords = c.words || [];
      let updatedWords;
      if (newWords.length === oldWords.length) {
        // Same word count — keep timing, just update the word text
        updatedWords = oldWords.map((w, i) => ({ ...w, word: newWords[i] }));
      } else {
        // Different word count — redistribute timing evenly across new words
        const tStart = oldWords.length > 0 ? oldWords[0].start : c.start;
        const tEnd   = oldWords.length > 0 ? oldWords[oldWords.length - 1].end : c.end;
        const step   = (tEnd - tStart) / Math.max(1, newWords.length);
        updatedWords = newWords.map((w, i) => ({
          word:  w,
          start: Math.round((tStart + i * step) * 1000) / 1000,
          end:   Math.round((tStart + (i + 1) * step) * 1000) / 1000,
          style: null,
        }));
      }
      return { ...c, text: newText, words: updatedWords };
    }));
    setHasChanges(true);
    setEditingId(null);
    setSaveMsg("");
  }

  // ── Save captions to server ───────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    setSaveMsg("");
    try {
      const resp = await fetch(`/save-captions/${jobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captions }),
      });
      if (!resp.ok) throw new Error();
      setHasChanges(false);
      setSaveMsg("ok");
      setTimeout(() => setSaveMsg(""), 3000);
    } catch {
      setSaveMsg("err");
    } finally {
      setSaving(false);
    }
  }

  // ── APLICAR CAMBIOS: save captions → trigger re-render → close ───────────────
  async function handleApplyChanges() {
    setApplying(true);
    // 1. Save captions first
    try {
      const r = await fetch(`/save-captions/${jobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captions }),
      });
      if (!r.ok) throw new Error("Error al guardar captions");
    } catch (e) {
      setApplying(false);
      return;
    }
    // 2. Trigger re-render
    try {
      const r = await fetch(`/re-render/${jobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption_pos: captionPosEdit }),
      });
      if (!r.ok) throw new Error("Error al iniciar re-render");
      const d = await r.json();
      // 3. Close editor + hand off rrJobId to parent
      setOpen(false);
      setHasChanges(false);
      setSaveMsg("");
      setApplying(false);
      if (onApplyChanges) onApplyChanges(d.rr_job_id);
    } catch (e) {
      setApplying(false);
    }
  }

  // ── Trim ──────────────────────────────────────────────────────────────────────
  async function handleTrim() {
    setTrimming(true); setTrimError(""); setTrimDone(false);
    try {
      const resp = await fetch(`/trim/${jobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start: trimStart, end: trimEnd }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || "Error desconocido");
      }
      const blob = await resp.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = "video-recortado.mp4"; a.click();
      URL.revokeObjectURL(url);
      setTrimDone(true);
    } catch (e) {
      setTrimError(e.message || "Error al recortar");
    } finally {
      setTrimming(false);
    }
  }

  const activeCap = captions.find(c => currentTime >= c.start && currentTime < c.end);

  // ── Caption word style helper (mirrors build_html CSS at preview scale) ───────
  const FONT_FAM = {
    outfit:   "'Outfit', sans-serif",
    inter:    "'Inter', sans-serif",
    raleway:  "'Raleway', sans-serif",
    playfair: "'Playfair Display', serif",
  };
  function wordProps(word, wi, cap) {
    const fam    = FONT_FAM[capFont] || FONT_FAM.outfit;
    const sc     = vidScale;
    const isEmph = cap.emphasis;
    const kwidx  = cap.key_word_index != null ? cap.key_word_index : 1;
    const wclass = isEmph ? (wi === kwidx ? "big" : "small") : (word.style || "");
    const raw    = (word.word || "").replace(/[.,]/g, "");

    if (capStyle === "style1") {
      if (wclass === "big") return {
        css: { display:"inline-block", fontFamily:fam, fontWeight:900, fontStyle:"normal",
               fontSize:124*sc+"px", color:hlColor, textTransform:"uppercase",
               letterSpacing:-4*sc+"px", lineHeight:1.0,
               // Outline via multi-shadow instead of WebkitTextStroke (avoids character-box artifacts at small scale)
               textShadow:[
                 `-${4*sc}px -${4*sc}px 0 rgba(0,0,0,0.65)`,
                 `${4*sc}px -${4*sc}px 0 rgba(0,0,0,0.65)`,
                 `-${4*sc}px ${4*sc}px 0 rgba(0,0,0,0.65)`,
                 `${4*sc}px ${4*sc}px 0 rgba(0,0,0,0.65)`,
                 `0 0 ${50*sc}px ${hlColor}bb`,
                 `0 ${4*sc}px ${12*sc}px rgba(0,0,0,0.99)`,
               ].join(", ") },
        text: raw.toUpperCase(),
      };
      if (wclass === "small") return {
        css: { display:"inline-block", fontFamily:fam, fontWeight:300, fontStyle:"italic",
               fontSize:66*sc+"px", color:"rgba(255,255,255,0.92)", textTransform:"lowercase",
               letterSpacing:0.5*sc+"px", lineHeight:1.2,
               textShadow:[
                 `-${2*sc}px -${2*sc}px 0 rgba(0,0,0,0.55)`,
                 `${2*sc}px -${2*sc}px 0 rgba(0,0,0,0.55)`,
                 `-${2*sc}px ${2*sc}px 0 rgba(0,0,0,0.55)`,
                 `${2*sc}px ${2*sc}px 0 rgba(0,0,0,0.55)`,
                 `0 ${2*sc}px ${8*sc}px rgba(0,0,0,0.95)`,
               ].join(", ") },
        text: raw.toLowerCase(),
      };
      const underline = wclass === "style-underline";
      return {
        css: { display:"inline-block", fontFamily:fam, fontWeight:700, fontStyle:"normal",
               fontSize:56*sc+"px", color:"#fff", textTransform:"lowercase",
               letterSpacing:-0.5*sc+"px", lineHeight:1.15,
               textShadow:[
                 `-${2*sc}px -${2*sc}px 0 rgba(0,0,0,0.45)`,
                 `${2*sc}px -${2*sc}px 0 rgba(0,0,0,0.45)`,
                 `-${2*sc}px ${2*sc}px 0 rgba(0,0,0,0.45)`,
                 `${2*sc}px ${2*sc}px 0 rgba(0,0,0,0.45)`,
                 `0 ${2*sc}px ${8*sc}px rgba(0,0,0,0.99)`,
                 `0 ${4*sc}px ${24*sc}px rgba(0,0,0,0.80)`,
               ].join(", "),
               ...(underline ? { textDecoration:`underline solid ${hlColor}`, textUnderlineOffset:6*sc+"px", textDecorationThickness:3*sc+"px" } : {}),
             },
        text: raw.toLowerCase(),
      };
    }
    if (capStyle === "style2") {
      const isBig = isEmph && wi === kwidx;
      return {
        css: { display:"inline-block", fontFamily:fam, fontWeight:400, fontStyle:"italic",
               fontSize:58*sc+"px", color:isBig ? hlColor : "rgba(255,255,255,0.94)",
               textTransform:"none", letterSpacing:-0.2*sc+"px", lineHeight:1.2,
               textShadow:`0 ${2*sc}px ${10*sc}px rgba(0,0,0,0.90)` },
        text: raw,
      };
    }
    if (capStyle === "style3") return {
      css: { display:"inline-block", fontFamily:fam, fontWeight:700, fontSize:62*sc+"px",
             color:"#fff", textTransform:"lowercase", letterSpacing:-0.5*sc+"px", lineHeight:1.2,
             textShadow:`0 ${2*sc}px ${8*sc}px rgba(0,0,0,0.99)` },
      text: raw.toLowerCase(),
    };
    if (capStyle === "style_doc") return {
      css: { display:"inline-block", fontFamily:"'Raleway', sans-serif", fontWeight:300,
             fontSize:58*sc+"px", color:"#fff", letterSpacing:2.5*sc+"px", lineHeight:1.4,
             textShadow:`${2*sc}px ${2*sc}px 0 rgba(0,0,0,0.98),${-2*sc}px ${-2*sc}px 0 rgba(0,0,0,0.98),${2*sc}px ${-2*sc}px 0 rgba(0,0,0,0.98),${-2*sc}px ${2*sc}px 0 rgba(0,0,0,0.98)` },
      text: raw,
    };
    if (capStyle === "style_retro") return {
      css: { display:"inline-block", fontFamily:"'Times New Roman', Times, serif",
             fontWeight:"bold", fontStyle:"italic", fontSize:52*sc+"px", color:"#FFD21A",
             letterSpacing:-0.5*sc+"px", lineHeight:1.2,
             textShadow:`${-3*sc}px ${-3*sc}px 0 #1E2D73,${3*sc}px ${-3*sc}px 0 #1E2D73,${-3*sc}px ${3*sc}px 0 #1E2D73,${3*sc}px ${3*sc}px 0 #1E2D73` },
      text: raw,
    };
    // fallback
    return { css: { display:"inline-block", fontFamily:fam, fontWeight:700, fontSize:56*sc+"px", color:"#fff",
                    textShadow:`0 ${2*sc}px ${8*sc}px rgba(0,0,0,0.99)` }, text: raw };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ marginTop: 12, width: "100%" }}>
      {/* ── Open button ── */}
      <button
        onClick={() => {
          // Pause the done-state preview before opening editor
          if (window.__aeliosPreviewPause) window.__aeliosPreviewPause();
          setOpen(true);
        }}
        style={{
          width: "100%", padding: "10px 16px", borderRadius: "0.75rem",
          border: "1px solid rgba(94,106,210,0.30)",
          background: "rgba(94,106,210,0.07)",
          color: "rgba(255,255,255,0.65)",
          fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 12,
          letterSpacing: "0.08em", textTransform: "uppercase",
          cursor: "pointer", transition: "all 0.18s",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = "rgba(94,106,210,0.16)";
          e.currentTarget.style.borderColor = "rgba(94,106,210,0.55)";
          e.currentTarget.style.color = "#fff";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "rgba(94,106,210,0.07)";
          e.currentTarget.style.borderColor = "rgba(94,106,210,0.30)";
          e.currentTarget.style.color = "rgba(255,255,255,0.65)";
        }}
      >
        <span style={{ fontSize: 15 }}>✂</span> Editor de vídeo
      </button>

      {/* ── Full-screen modal — rendered via portal to escape backdrop-filter stacking contexts ── */}
      {open && ReactDOM.createPortal(
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(4,4,7,0.97)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          paddingTop: 32,  // clear Electron titlebar / win-controls (height 32px)
        }}>
          {/* Top bar */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "11px 18px",
            borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)", fontFamily: "'Outfit',sans-serif", letterSpacing: ".05em" }}>✂ Editor de vídeo</span>
              {captions.length > 0 && (
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", fontFamily: "'Inter',sans-serif" }}>
                  {captions.length} segmentos
                </span>
              )}
              {hasChanges && (
                <span style={{
                  fontSize: 9, fontWeight: 600, letterSpacing: ".08em",
                  color: "rgba(255,200,60,0.90)", fontFamily: "'Outfit',sans-serif",
                  background: "rgba(255,200,60,0.08)", border: "1px solid rgba(255,200,60,0.25)",
                  borderRadius: 99, padding: "2px 8px",
                }}>● CAMBIOS SIN GUARDAR</span>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: "0.5rem", color: "rgba(255,255,255,0.55)",
                fontSize: 18, width: 32, height: 32,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,60,60,0.18)"; e.currentTarget.style.color = "#ff6060"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
            >×</button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

            {/* ── Left: video preview + playback controls ── */}
            <div style={{
              flex: "0 0 auto", width: "min(500px, 50%)",
              display: "flex", flexDirection: "column",
              padding: "14px 14px 10px",
              borderRight: "1px solid rgba(255,255,255,0.06)",
              gap: 8,
            }}>
              {/* Video container */}
              <div
                ref={videoContainerRef}
                onDoubleClick={() => {
                  if (activeCap && editingId === null) {
                    editFromVideoRef.current = true;
                    startEdit(activeCap);
                  }
                }}
                title={activeCap ? "Doble clic para editar el caption activo" : ""}
                style={{
                  borderRadius: 10, overflow: "hidden", background: "#000",
                  boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 4px 20px rgba(0,0,0,0.7)",
                  flexShrink: 0, position: "relative",
                  cursor: draggingCapPos ? "ns-resize" : (activeCap && editingId === null ? "text" : "default"),
                }}
              >
                <video
                  ref={vidRef}
                  src={`/source-video/${jobId}`}
                  muted={muted}
                  playsInline
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onEnded={() => setPlaying(false)}
                  style={{ display: "block", width: "100%", height: "auto", maxHeight: "55vh" }}
                />

                {/* Caption drag zone — 16px transparent hit area, above caption overlay so always clickable */}
                <div
                  onMouseDown={e => { e.preventDefault(); setDraggingCapPos(true); }}
                  title="Arrastra para mover la posición de los captions"
                  style={{
                    position: "absolute",
                    bottom: `calc(${captionPosEdit}% - 7px)`,
                    left: 0, right: 0,
                    height: 16,
                    cursor: "ns-resize",
                    zIndex: 7,
                    display: "flex", alignItems: "center",
                  }}
                >
                  {/* Visual line — only shown when dragging or when no caption is active (avoids cutting through text) */}
                  <div style={{
                    width: "100%",
                    height: draggingCapPos ? 3 : 2,
                    background: draggingCapPos ? "rgba(94,106,210,0.95)" : "rgba(94,106,210,0.45)",
                    opacity: (draggingCapPos || !activeCap) ? 1 : 0,
                    transition: "opacity 0.15s",
                    pointerEvents: "none",
                  }} />
                </div>
                {/* Grip handle — always visible, above drag zone */}
                <div
                  onMouseDown={e => { e.preventDefault(); setDraggingCapPos(true); }}
                  style={{
                    position: "absolute",
                    bottom: `calc(${captionPosEdit}% - 8px)`,
                    right: 6, zIndex: 8,
                    background: "rgba(94,106,210,0.85)",
                    borderRadius: 4, padding: "2px 5px",
                    cursor: "ns-resize",
                    fontSize: 8, color: "#fff",
                    fontFamily: "'Inter',sans-serif", fontWeight: 700,
                    letterSpacing: ".04em",
                    boxShadow: "0 1px 6px rgba(0,0,0,0.55)",
                    display: "flex", alignItems: "center", gap: 3,
                  }}
                >
                  ↕ {captionPosEdit}%
                </div>

                {/* Styled caption overlay — mirrors build_html CSS so preview exactly matches final video */}
                {activeCap && editingId !== activeCap.id && (() => {
                  const words  = activeCap.words || [];
                  const kwidx  = activeCap.emphasis && activeCap.key_word_index != null
                    ? activeCap.key_word_index : 1;
                  const sc     = vidScale;

                  if (activeCap.emphasis && words.length > 0) {
                    const wordsBefore = words.slice(0, kwidx);
                    const bigWord     = words[kwidx];
                    const wordsAfter  = words.slice(kwidx + 1);
                    return (
                      <div style={{
                        position: "absolute",
                        bottom: `${captionPosEdit}%`,
                        left: 0, right: 0,
                        display: "flex", justifyContent: "center",
                        padding: `0 ${Math.round(60 * sc)}px`,
                        pointerEvents: "none",
                        zIndex: 6,
                      }}>
                        <div style={{ position: "relative", display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
                          {/* Words before — rendered above the big word */}
                          {wordsBefore.length > 0 && (
                            <div style={{
                              position: "absolute", bottom: "100%",
                              left: "50%", transform: "translateX(-50%)",
                              display: "flex", flexDirection: "row", alignItems: "flex-end",
                              gap: `0 ${Math.round(8 * sc)}px`,
                              paddingBottom: Math.round(6 * sc) + "px",
                              whiteSpace: "nowrap",
                            }}>
                              {wordsBefore.map((w, i) => {
                                const { css, text } = wordProps(w, i, activeCap);
                                return <span key={i} style={css}>{text}</span>;
                              })}
                            </div>
                          )}
                          {/* Big word — stays at the normal caption line */}
                          {bigWord && (() => { const { css, text } = wordProps(bigWord, kwidx, activeCap); return <span style={css}>{text}</span>; })()}
                          {/* Words after — rendered below the big word */}
                          {wordsAfter.length > 0 && (
                            <div style={{
                              position: "absolute", top: "100%",
                              left: "50%", transform: "translateX(-50%)",
                              display: "flex", flexDirection: "row", alignItems: "flex-start",
                              gap: `0 ${Math.round(8 * sc)}px`,
                              paddingTop: Math.round(6 * sc) + "px",
                              whiteSpace: "nowrap",
                            }}>
                              {wordsAfter.map((w, i) => {
                                const { css, text } = wordProps(w, kwidx + 1 + i, activeCap);
                                return <span key={i} style={css}>{text}</span>;
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // Non-emphasis: horizontal row
                  return (
                    <div style={{
                      position: "absolute",
                      bottom: `${captionPosEdit}%`,
                      left: 0, right: 0,
                      display: "flex", justifyContent: "center",
                      padding: `0 ${Math.round(60 * sc)}px`,
                      pointerEvents: "none",
                      zIndex: 6,
                    }}>
                      <div style={{
                        display: "flex", flexDirection: "row", alignItems: "center",
                        flexWrap: "wrap", gap: `0 ${Math.round(16 * sc)}px`, justifyContent: "center",
                      }}>
                        {words.map((w, wi) => {
                          const { css, text } = wordProps(w, wi, activeCap);
                          return <span key={wi} style={css}>{text}</span>;
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Inline caption editor — shown when editing a caption (list ✎ or dbl-click on video) */}
                {editingId !== null && activeCap && editingId === activeCap.id && (
                  <div style={{
                    position: "absolute",
                    bottom: `${captionPosEdit}%`,
                    left: 0, right: 0,
                    display: "flex", justifyContent: "center",
                    padding: "0 8px",
                    zIndex: 4,
                  }}>
                    <input
                      ref={videoOverlayInputRef}
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") { editFromVideoRef.current = false; saveEdit(activeCap.id); }
                        if (e.key === "Escape") { editFromVideoRef.current = false; setEditingId(null); }
                      }}
                      onBlur={() => { editFromVideoRef.current = false; if (editText.trim()) saveEdit(activeCap.id); else setEditingId(null); }}
                      style={{
                        width: "90%",
                        background: "rgba(0,0,0,0.88)",
                        color: "#fff",
                        fontSize: 13,
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 700,
                        padding: "5px 12px",
                        borderRadius: 6,
                        textAlign: "center",
                        border: "1.5px solid rgba(94,106,210,0.90)",
                        outline: "none",
                        letterSpacing: 0.3,
                        boxShadow: "0 0 0 3px rgba(94,106,210,0.18), 0 2px 12px rgba(0,0,0,0.70)",
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Playback controls row */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <button onClick={togglePlay} style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: "rgba(94,106,210,0.25)", border: "1px solid rgba(94,106,210,0.45)",
                  color: "#fff", fontSize: 14, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  {playing ? "⏸" : "▶"}
                </button>
                <button onClick={() => setMuted(m => !m)} style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)",
                  color: "rgba(255,255,255,0.65)", fontSize: 12, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  {muted ? "🔇" : "🔊"}
                </button>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontFamily: "'Outfit',monospace", flex: 1, textAlign: "right" }}>
                  {fmtTime(currentTime)} / {fmtTime(duration)}
                </span>
              </div>

              {/* Scrubber */}
              <ScrubBar
                currentTime={currentTime}
                duration={duration}
                onSeek={seekTo}
                captions={captions}
                activeCap={activeCap}
              />
            </div>

            {/* ── Right: captions (top) + divider + trim (bottom) ── */}
            <div style={{
              flex: 1, display: "flex", flexDirection: "column",
              overflow: "hidden", minHeight: 0,
            }}>

              {/* ── Captions section (top ~58%) ── */}
              <div style={{
                flex: "0 0 58%", display: "flex", flexDirection: "column",
                overflow: "hidden", padding: "14px 14px 6px",
              }}>
                <div style={{
                  fontSize: 9, letterSpacing: ".14em", color: "rgba(94,106,210,0.75)",
                  fontFamily: "'Outfit',sans-serif", fontWeight: 700, textTransform: "uppercase",
                  marginBottom: 8, flexShrink: 0,
                }}>✎ Captions</div>

                {/* Scrollable captions list */}
                <div style={{ flex: 1, overflow: "auto", marginBottom: 8, minHeight: 0 }}>
                  {captions.length === 0 ? (
                    <div style={{ textAlign: "center", paddingTop: 40, color: "rgba(255,255,255,0.28)", fontFamily: "'Inter',sans-serif", fontSize: 12 }}>
                      No hay datos de captions.<br />
                      <span style={{ fontSize: 10 }}>Procesa un vídeo primero.</span>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      {captions.map(c => {
                        const isActive  = activeCap && activeCap.id === c.id;
                        const isEditing = editingId === c.id;
                        return (
                          <div
                            key={c.id}
                            onClick={() => { if (!isEditing) seekTo(c.start); }}
                            style={{
                              borderRadius: "0.55rem", padding: "6px 9px",
                              background: isActive ? "rgba(94,106,210,0.14)" : "rgba(255,255,255,0.025)",
                              border: isActive ? "1px solid rgba(94,106,210,0.35)" : "1px solid rgba(255,255,255,0.06)",
                              cursor: isEditing ? "default" : "pointer", transition: "all 0.10s",
                              display: "flex", alignItems: "flex-start", gap: 7,
                            }}
                          >
                            <div style={{
                              flexShrink: 0, fontSize: 9, paddingTop: 2,
                              color: isActive ? "rgba(94,106,210,0.90)" : "rgba(255,255,255,0.28)",
                              fontFamily: "'Outfit',monospace", minWidth: 40,
                            }}>
                              {fmtTime(c.start)}
                            </div>
                            {isEditing ? (
                              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }} onClick={e => e.stopPropagation()}>
                                <input
                                  autoFocus
                                  value={editText}
                                  onChange={e => setEditText(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === "Enter") saveEdit(c.id);
                                    if (e.key === "Escape") setEditingId(null);
                                  }}
                                  style={{
                                    width: "100%", padding: "3px 6px",
                                    borderRadius: "0.35rem",
                                    background: "rgba(255,255,255,0.08)",
                                    border: "1px solid rgba(94,106,210,0.55)",
                                    color: "#fff", fontFamily: "'Inter',sans-serif", fontSize: 12, outline: "none",
                                  }}
                                />
                                <div style={{ display: "flex", gap: 4 }}>
                                  <button onClick={() => saveEdit(c.id)} style={{
                                    padding: "2px 8px", borderRadius: "0.35rem",
                                    background: "rgba(94,106,210,0.30)", border: "1px solid rgba(94,106,210,0.55)",
                                    color: "#fff", fontSize: 10, cursor: "pointer", fontFamily: "'Inter',sans-serif", fontWeight: 600,
                                  }}>✓ OK</button>
                                  <button onClick={() => setEditingId(null)} style={{
                                    padding: "2px 8px", borderRadius: "0.35rem",
                                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)",
                                    color: "rgba(255,255,255,0.55)", fontSize: 10, cursor: "pointer", fontFamily: "'Inter',sans-serif",
                                  }}>✕</button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ flex: 1, fontSize: 11, color: isActive ? "#fff" : "rgba(255,255,255,0.65)", fontFamily: "'Inter',sans-serif", lineHeight: 1.4 }}>
                                {c.text}
                              </div>
                            )}
                            {!isEditing && (
                              <button
                                onClick={e => { e.stopPropagation(); startEditFromList(c); }}
                                style={{ flexShrink: 0, background: "none", border: "none", color: "rgba(255,255,255,0.20)", fontSize: 12, cursor: "pointer", paddingTop: 1, transition: "color 0.12s" }}
                                onMouseEnter={e => e.currentTarget.style.color = "rgba(94,106,210,0.90)"}
                                onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.20)"}
                              >✎</button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div style={{ flexShrink: 0, display: "flex", gap: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                  {/* GUARDAR */}
                  <button
                    onClick={handleSave}
                    disabled={saving || !hasChanges}
                    style={{
                      flex: 1, padding: "10px 0", borderRadius: "0.65rem",
                      border: hasChanges ? "1px solid rgba(94,106,210,0.40)" : "1px solid rgba(255,255,255,0.08)",
                      background: hasChanges ? "rgba(94,106,210,0.12)" : "rgba(255,255,255,0.04)",
                      color: hasChanges ? "rgba(255,255,255,0.80)" : "rgba(255,255,255,0.25)",
                      fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 11,
                      letterSpacing: "0.07em", cursor: hasChanges ? "pointer" : "not-allowed",
                      transition: "all 0.18s", display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                    }}
                  >
                    {saving ? "Guardando..." : saveMsg === "ok" ? "✓ Guardado" : saveMsg === "err" ? "⚠ Error" : "💾 GUARDAR"}
                  </button>

                  {/* APLICAR CAMBIOS → triggers re-render */}
                  <button
                    onClick={handleApplyChanges}
                    disabled={applying || captions.length === 0}
                    style={{
                      flex: 1, padding: "10px 0", borderRadius: "0.65rem",
                      border: "none",
                      background: applying
                        ? "rgba(255,255,255,0.06)"
                        : captions.length > 0
                          ? "linear-gradient(135deg, #4a54c1, #5E6AD2)"
                          : "rgba(255,255,255,0.06)",
                      color: (applying || captions.length === 0) ? "rgba(255,255,255,0.25)" : "#fff",
                      fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 11,
                      letterSpacing: "0.07em",
                      cursor: (applying || captions.length === 0) ? "not-allowed" : "pointer",
                      boxShadow: (!applying && captions.length > 0)
                        ? "0 0 0 1px rgba(94,106,210,0.40), 0 3px 14px rgba(94,106,210,0.35)"
                        : "none",
                      transition: "all 0.18s",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                    }}
                  >
                    {applying ? "⏳ Aplicando..." : "✓ APLICAR CAMBIOS"}
                  </button>
                </div>
              </div>

              {/* ── Divider ── */}
              <div style={{
                height: 1, background: "rgba(255,255,255,0.08)",
                flexShrink: 0, margin: "0 14px",
              }} />

              {/* ── Trim section (bottom ~42%) ── */}
              <div style={{
                flex: 1, display: "flex", flexDirection: "column",
                overflow: "hidden", padding: "8px 14px 10px", minHeight: 0,
              }}>
                <div style={{
                  fontSize: 9, letterSpacing: ".14em", color: "rgba(94,106,210,0.75)",
                  fontFamily: "'Outfit',sans-serif", fontWeight: 700, textTransform: "uppercase",
                  marginBottom: 6, flexShrink: 0,
                }}>✂ Recortar</div>
                <TrimEditor
                  jobId={jobId}
                  duration={duration}
                  currentTime={currentTime}
                  trimStart={trimStart}
                  trimEnd={trimEnd}
                  onTrimChange={(s, e) => { setTrimStart(s); setTrimEnd(e); }}
                  onSeek={seekTo}
                  fmtTime={fmtTime}
                  trimming={trimming}
                  trimDone={trimDone}
                  trimError={trimError}
                  onApply={handleTrim}
                />
              </div>

            </div>
          </div>

          {/* Bottom bar */}
          <div style={{
            borderTop: "1px solid rgba(255,255,255,0.07)", padding: "9px 18px",
            display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
          }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.20)", fontFamily: "'Inter',sans-serif" }}>
              Espacio: play/pausa · Esc: cerrar · Arrastra la línea azul para mover captions
            </span>
            <button
              onClick={onReset}
              style={{
                padding: "6px 14px", borderRadius: "0.5rem",
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.40)",
                fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 600,
                cursor: "pointer", transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.75)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.40)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"; }}
            >↩ Procesar otro vídeo</button>
          </div>
        </div>
      , document.body)}
    </div>
  );
}

// ── ScrubBar — progress + segment markers ─────────────────────────────────────
function ScrubBar({ currentTime, duration, onSeek, captions, activeCap }) {
  const { useRef: useRefSB } = React;
  const ref = useRefSB(null);

  function onClick(e) {
    if (!ref.current || duration === 0) return;
    const rect = ref.current.getBoundingClientRect();
    onSeek(((e.clientX - rect.left) / rect.width) * duration);
  }

  return (
    <div style={{ flexShrink: 0 }}>
      {/* Progress scrubber */}
      <div
        ref={ref}
        onClick={onClick}
        style={{
          position: "relative", height: 5, borderRadius: 99,
          background: "rgba(255,255,255,0.09)", cursor: "pointer", marginBottom: 8,
        }}
      >
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
          background: "linear-gradient(90deg, #4a54c1, #5E6AD2)", borderRadius: 99,
        }} />
        <div style={{
          position: "absolute", top: "50%", transform: "translate(-50%, -50%)",
          left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
          width: 11, height: 11, borderRadius: "50%", background: "#fff",
          boxShadow: "0 0 0 2px rgba(94,106,210,0.65)", pointerEvents: "none",
        }} />
      </div>

      {/* Caption segment track */}
      {captions.length > 0 && duration > 0 && (
        <div style={{ position: "relative", height: 22, background: "rgba(255,255,255,0.04)", borderRadius: 5, overflow: "hidden" }}>
          {captions.map(c => {
            const l = (c.start / duration) * 100;
            const w = Math.max(0.3, ((c.end - c.start) / duration) * 100);
            const isActive = activeCap && activeCap.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => onSeek(c.start)}
                title={c.text}
                style={{
                  position: "absolute", top: 3, bottom: 3,
                  left: `${l}%`, width: `${w}%`, minWidth: 2,
                  background: isActive ? "rgba(94,106,210,0.80)" : "rgba(94,106,210,0.28)",
                  borderRadius: 2, cursor: "pointer",
                  border: isActive ? "1px solid rgba(94,106,210,1)" : "1px solid rgba(94,106,210,0.40)",
                }}
              />
            );
          })}
          <div style={{
            position: "absolute", top: 0, bottom: 0, width: 1, pointerEvents: "none",
            left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
            background: "rgba(255,255,255,0.75)",
          }} />
        </div>
      )}
    </div>
  );
}

// ── TrimEditor — real timeline with thumbnails + drag handles ─────────────────
function TrimEditor({ jobId, duration, currentTime, trimStart, trimEnd, onTrimChange, onSeek, fmtTime, trimming, trimDone, trimError, onApply }) {
  const { useState: useStateTrim, useEffect: useEffectTrim, useRef: useRefTrim } = React;
  const [thumbs,    setThumbs]    = useStateTrim([]);
  const [loadMsg,   setLoadMsg]   = useStateTrim("Cargando miniaturas...");
  const [dragging,  setDragging]  = useStateTrim(null); // "start" | "end"
  const timelineRef = useRefTrim(null);

  const THUMB_COUNT = 18;

  // ── Generate thumbnails ──────────────────────────────────────────────────────
  useEffectTrim(() => {
    if (!jobId || duration === 0) return;
    setLoadMsg("Cargando miniaturas...");
    const vid = document.createElement("video");
    vid.src = `/download/${jobId}`;
    vid.muted = true;
    vid.crossOrigin = "anonymous";

    const canvas = document.createElement("canvas");
    canvas.width = 54;
    canvas.height = 96;
    const ctx = canvas.getContext("2d");

    const times  = Array.from({ length: THUMB_COUNT }, (_, i) => (i / (THUMB_COUNT - 1)) * duration);
    const result = [];
    let idx      = 0;

    const captureFrame = () => {
      ctx.drawImage(vid, 0, 0, 54, 96);
      result.push(canvas.toDataURL("image/jpeg", 0.55));
      if (idx < times.length) {
        vid.currentTime = times[idx++];
      } else {
        setThumbs(result);
        setLoadMsg("");
        vid.src = "";
      }
    };

    vid.addEventListener("loadedmetadata", () => { vid.currentTime = times[idx++]; });
    vid.addEventListener("seeked", captureFrame);
    vid.load();

    return () => { try { vid.src = ""; } catch {} };
  }, [jobId, duration]);

  // ── Drag logic ───────────────────────────────────────────────────────────────
  useEffectTrim(() => {
    if (!dragging) return;
    const move = (e) => {
      if (!timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const t    = pct * duration;
      if (dragging === "start") {
        onTrimChange(Math.min(t, trimEnd - 0.5), trimEnd);
        onSeek(t);
      } else {
        onTrimChange(trimStart, Math.max(t, trimStart + 0.5));
        onSeek(t);
      }
    };
    const up = () => setDragging(null);
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup",   up);
    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup",   up);
    };
  }, [dragging, trimStart, trimEnd, duration]);

  const startPct = duration > 0 ? (trimStart / duration) * 100 : 0;
  const endPct   = duration > 0 ? (trimEnd   / duration) * 100 : 100;
  const playPct  = duration > 0 ? (currentTime / duration) * 100 : 0;

  // ── Ruler ticks ──────────────────────────────────────────────────────────────
  const tickInterval = duration <= 30 ? 5 : duration <= 90 ? 10 : duration <= 300 ? 30 : 60;
  const ticks = [];
  for (let t = 0; t <= duration; t += tickInterval) {
    ticks.push(t);
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* ── Time info strip ── */}
      <div style={{
        display: "flex", gap: 16, marginBottom: 8, flexShrink: 0,
        background: "rgba(255,255,255,0.03)", borderRadius: "0.65rem", padding: "6px 10px",
        border: "1px solid rgba(255,255,255,0.07)",
      }}>
        {[
          { label: "Inicio",   val: fmtTime(trimStart),         col: "#fff" },
          { label: "Fin",      val: fmtTime(trimEnd),           col: "#fff" },
          { label: "Duración", val: fmtTime(trimEnd-trimStart), col: "#4ade80" },
        ].map(i => (
          <div key={i.label}>
            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.32)", fontFamily: "'Inter',sans-serif", marginBottom: 1 }}>{i.label}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: i.col, fontFamily: "'Outfit',monospace" }}>{i.val}</div>
          </div>
        ))}
      </div>

      {/* ── Timeline area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
        {/* Ruler */}
        <div style={{
          position: "relative", height: 18, flexShrink: 0,
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}>
          {ticks.map(t => {
            const pct = duration > 0 ? (t / duration) * 100 : 0;
            return (
              <div key={t} style={{ position: "absolute", top: 0, left: `${pct}%`, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <div style={{ width: 1, height: 7, background: "rgba(255,255,255,0.20)" }} />
                <span style={{ fontSize: 7, color: "rgba(255,255,255,0.30)", fontFamily: "'Outfit',monospace", marginLeft: 2, whiteSpace: "nowrap" }}>
                  {fmtTime(t)}
                </span>
              </div>
            );
          })}
          <div style={{
            position: "absolute", top: 0, left: `${playPct}%`, transform: "translateX(-50%)",
            width: 0, height: 0,
            borderLeft: "4px solid transparent", borderRight: "4px solid transparent",
            borderTop: "7px solid rgba(255,255,255,0.80)", pointerEvents: "none",
          }} />
        </div>

        {/* Thumbnail strip + handles */}
        <div
          ref={timelineRef}
          onClick={(e) => {
            if (dragging) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const pct  = (e.clientX - rect.left) / rect.width;
            onSeek(pct * duration);
          }}
          style={{
            position: "relative", flex: 1, minHeight: 50, maxHeight: 90,
            overflow: "hidden", borderRadius: "0 0 8px 8px",
            background: "#0a0a0c", cursor: "pointer", userSelect: "none",
          }}
        >
          {/* Thumbnails */}
          <div style={{ position: "absolute", inset: 0, display: "flex" }}>
            {thumbs.length > 0 ? (
              thumbs.map((src, i) => (
                <img key={i} src={src} draggable={false}
                  style={{ flex: "1 1 0", minWidth: 0, height: "100%", objectFit: "cover", display: "block" }}
                />
              ))
            ) : (
              <div style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                color: "rgba(255,255,255,0.22)", fontSize: 10, fontFamily: "'Inter',sans-serif",
                background: "repeating-linear-gradient(90deg, #111114 0px, #111114 54px, #131316 54px, #131316 55px)",
              }}>
                {loadMsg}
              </div>
            )}
          </div>

          {/* Dark overlay — outside selection */}
          <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: `${startPct}%`, background: "rgba(0,0,0,0.68)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: `${100 - endPct}%`, background: "rgba(0,0,0,0.68)", pointerEvents: "none" }} />

          {/* Selection highlight border */}
          <div style={{
            position: "absolute", top: 0, bottom: 0,
            left: `${startPct}%`, width: `${endPct - startPct}%`,
            border: "2px solid rgba(94,106,210,0.75)", borderRadius: 3,
            boxSizing: "border-box", pointerEvents: "none",
          }} />

          {/* Left trim handle */}
          <div onMouseDown={e => { e.stopPropagation(); setDragging("start"); }}
            style={{ position: "absolute", top: 0, bottom: 0, left: `${startPct}%`, transform: "translateX(-50%)", width: 14, zIndex: 10, cursor: "ew-resize", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 10, height: "100%", background: "rgba(94,106,210,0.95)", borderRadius: "4px 0 0 4px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 8px rgba(94,106,210,0.55)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>{[0,1,2].map(i => <div key={i} style={{ width: 1.5, height: 8, background: "rgba(255,255,255,0.60)", borderRadius: 1 }} />)}</div>
            </div>
          </div>

          {/* Right trim handle */}
          <div onMouseDown={e => { e.stopPropagation(); setDragging("end"); }}
            style={{ position: "absolute", top: 0, bottom: 0, left: `${endPct}%`, transform: "translateX(-50%)", width: 14, zIndex: 10, cursor: "ew-resize", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 10, height: "100%", background: "rgba(94,106,210,0.95)", borderRadius: "0 4px 4px 0", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 8px rgba(94,106,210,0.55)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>{[0,1,2].map(i => <div key={i} style={{ width: 1.5, height: 8, background: "rgba(255,255,255,0.60)", borderRadius: 1 }} />)}</div>
            </div>
          </div>

          {/* Playhead */}
          <div style={{ position: "absolute", top: 0, bottom: 0, width: 2, left: `${playPct}%`, transform: "translateX(-50%)", background: "#fff", boxShadow: "0 0 6px rgba(255,255,255,0.80)", pointerEvents: "none", zIndex: 20 }}>
            <div style={{ position: "absolute", top: -1, left: "50%", transform: "translateX(-50%)", width: 8, height: 8, borderRadius: "50%", background: "#fff", boxShadow: "0 0 4px rgba(255,255,255,0.80)" }} />
          </div>
        </div>
      </div>

      {/* ── Apply button ── */}
      <div style={{ flexShrink: 0, marginTop: 8 }}>
        {trimError && <div style={{ fontSize: 10, color: "rgba(220,80,80,0.85)", marginBottom: 6, fontFamily: "'Inter',sans-serif" }}>⚠ {trimError}</div>}
        {trimDone  && <div style={{ fontSize: 10, color: "#4ade80", marginBottom: 6, fontFamily: "'Inter',sans-serif" }}>✓ Descarga iniciada</div>}
        <button onClick={onApply} disabled={trimming} style={{
          width: "100%", padding: "10px",
          borderRadius: "0.65rem", border: "none",
          cursor: trimming ? "not-allowed" : "pointer",
          background: trimming ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg,#4a54c1,#5E6AD2)",
          color: trimming ? "rgba(255,255,255,0.35)" : "#fff",
          fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 12,
          letterSpacing: "1px", transition: "all 0.2s",
          boxShadow: trimming ? "none" : "0 0 0 1px rgba(94,106,210,0.45), 0 3px 16px rgba(94,106,210,0.40)",
        }}>
          {trimming ? "Recortando..." : "✂ Aplicar recorte y descargar"}
        </button>
      </div>
    </div>
  );
}

window.VideoEditor = VideoEditor;
