// Uploader — Selección de modo + flujo de subtítulos y auto clips
const { useState: useStateU, useRef: useRefU, useCallback: useCallbackU, useEffect: useEffectU } = React;
const { motion: motionU } = window.Motion;

// ── Icons ──
const CaptionIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="3"/>
    <path d="M7 15h3M14 15h3M7 12h2M12 12h2M17 12h1"/>
  </svg>
);

const ClipIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/>
    <path d="M8.5 6h8a3 3 0 010 6H11M8.5 18h3"/>
    <line x1="14" y1="14" x2="20" y2="20"/>
  </svg>
);

const UploadIcon = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);

const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const ArrowLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7"/>
  </svg>
);

const PortraitIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <rect x="7" y="2" width="10" height="20" rx="2.5"/>
    <line x1="10" y1="19.2" x2="14" y2="19.2" strokeWidth="1.6"/>
  </svg>
);

const LandscapeIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="10" rx="2.5"/>
    <line x1="4.8" y1="10" x2="4.8" y2="14" strokeWidth="1.6"/>
  </svg>
);

const BoltIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);

const DiamondIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.7 10.3a2.41 2.41 0 000 3.41l7.59 7.59a2.41 2.41 0 003.41 0l7.59-7.59a2.41 2.41 0 000-3.41l-7.59-7.59a2.41 2.41 0 00-3.41 0Z"/>
  </svg>
);

// ── Colores de énfasis disponibles ──
const HIGHLIGHT_COLORS = [
  { id:"#FFE033", label:"Amarillo", glow:"rgba(255,224,51,0.60)"  },
  { id:"#00E5FF", label:"Cian",     glow:"rgba(0,229,255,0.60)"   },
  { id:"#FF3D9A", label:"Rosa",     glow:"rgba(255,61,154,0.60)"  },
  { id:"#4ADE80", label:"Verde",    glow:"rgba(74,222,128,0.60)"  },
  { id:"#FF3333", label:"Rojo",     glow:"rgba(255,51,51,0.60)"   },
  { id:"#FF8C00", label:"Naranja",  glow:"rgba(255,140,0,0.60)"   },
];

// ── Selector de color de énfasis (desplegable) ──
function ColorPicker({ value, onChange }) {
  const [open, setOpen] = useStateU(false);
  const sel = HIGHLIGHT_COLORS.find(c => c.id === value) || HIGHLIGHT_COLORS[0];

  return (
    <div style={{marginBottom:14,position:"relative"}}>
      <button
        onClick={()=>setOpen(o=>!o)}
        style={{
          display:"flex",alignItems:"center",justifyContent:"space-between",
          width:"100%",
          background: open ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.025)",
          border: open ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(255,255,255,0.07)",
          borderBottom: open ? "1px solid transparent" : undefined,
          borderRadius: open ? "0.7rem 0.7rem 0 0" : "0.7rem",
          padding:"9px 13px",cursor:"pointer",
          transition:"all 0.15s",
        }}
      >
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <span style={{
            width:14,height:14,borderRadius:4,flexShrink:0,
            background:sel.id,
            boxShadow:`0 0 8px ${sel.glow}`,
            display:"inline-block",border:"1px solid rgba(255,255,255,0.18)",
          }} />
          <span style={{fontSize:10,letterSpacing:"0.14em",textTransform:"uppercase",fontFamily:"'Outfit',sans-serif",fontWeight:600,color:"rgba(255,255,255,0.42)"}}>
            Color de énfasis
          </span>
          <span style={{fontSize:12,fontFamily:"'Inter',sans-serif",fontWeight:500,color:"rgba(255,255,255,0.72)"}}>
            {sel.label}
          </span>
        </div>
        <span style={{fontSize:8,color:"rgba(255,255,255,0.35)",transform:open?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.15s",display:"inline-block"}}>▼</span>
      </button>
      {open && (
        <div style={{
          display:"flex",gap:9,flexWrap:"wrap",alignItems:"center",
          background:"rgba(255,255,255,0.03)",
          border:"1px solid rgba(255,255,255,0.07)",borderTop:"none",
          borderRadius:"0 0 0.7rem 0.7rem",
          padding:"12px 13px 13px",
        }}>
          {HIGHLIGHT_COLORS.map(c=>(
            <button key={c.id} title={c.label} onClick={()=>onChange(c.id)} style={{
              width:32,height:32,borderRadius:7,cursor:"pointer",border:"none",
              background:c.id,flexShrink:0,
              boxShadow: value===c.id
                ? `0 0 0 2px rgba(255,255,255,0.85), 0 0 14px ${c.glow}, 0 0 28px ${c.glow}`
                : `0 0 0 1px rgba(255,255,255,0.10), 0 0 8px ${c.glow}`,
              transform: value===c.id ? "scale(1.12)" : "scale(1)",
              transition:"all 0.15s",
            }} />
          ))}
          <span style={{fontSize:11,color:"rgba(255,255,255,0.32)",fontFamily:"'Inter',sans-serif",marginLeft:4}}>{sel.label}</span>
        </div>
      )}
    </div>
  );
}

// ── Subtítulos: pasos ──
const SUB_STEPS   = ["Video recibido","Transcribiendo audio","Analizando palabras clave","Generando captions","Renderizando video"];
const SUB_STEP_MAP= {"STEP:1":0,"STEP:2":1,"STEP:3":2,"STEP:4":3,"STEP:5":4};
const SUB_BAR_MAP = {0:5, 1:10, 2:44, 3:47, 4:50};
const CLIP_STEPS  = ["Video recibido","Transcribiendo video completo","Detectando mejores momentos","Clips detectados","Editando clips"];

function PulseDot() {
  return <span style={{width:5,height:5,borderRadius:"50%",background:"#5E6AD2",display:"inline-block",animation:"aelios-pulse 1.1s ease-in-out infinite"}} />;
}

function StepRow({ label, state }) {
  const color = state==="active"?"rgba(255,255,255,0.85)":state==="done"?"rgba(255,255,255,0.28)":state==="error"?"#f87171":"rgba(255,255,255,0.18)";
  return (
    <div style={{display:"flex",alignItems:"center",gap:11,fontSize:"0.78rem",fontFamily:"'Inter',sans-serif",color,transition:"color 0.3s"}}>
      <div style={{
        width:18,height:18,borderRadius:"50%",flexShrink:0,
        display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,
        border: state==="active" ? "1px solid rgba(94,106,210,0.60)" : "1px solid rgba(255,255,255,0.10)",
        background: state==="active" ? "rgba(94,106,210,0.10)" : state==="done" ? "rgba(255,255,255,0.03)" : "transparent",
        boxShadow: state==="active" ? "0 0 8px rgba(94,106,210,0.25)" : "none",
        transition:"all 0.3s",
      }}>
        {state==="active"?<PulseDot/>:state==="done"?"✓":state==="error"?"✕":""}
      </div>
      <span>{label}</span>
    </div>
  );
}

function ProgressBar({ width, showPct }) {
  return (
    <div style={{marginTop:20}}>
      {showPct && (
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:5}}>
          <span style={{fontSize:10,color:"rgba(94,106,210,0.65)",fontFamily:"'Inter',sans-serif",fontVariantNumeric:"tabular-nums"}}>
            {Math.round(width)}%
          </span>
        </div>
      )}
      <div style={{height:1.5,background:"rgba(255,255,255,0.06)",borderRadius:99,overflow:"hidden"}}>
        <div style={{
          height:"100%",
          width:width+"%",
          background:"linear-gradient(90deg, rgba(74,84,193,0.9), #5E6AD2, #6872D9)",
          borderRadius:99,
          transition:"width 0.7s cubic-bezier(.4,0,.2,1)",
          boxShadow:"0 0 10px rgba(94,106,210,0.55)",
        }} />
      </div>
    </div>
  );
}

// ── Tarjeta de selección de modo principal ── tag es opcional
function ModeCard({ icon, tag, title, desc, onClick }) {
  const [hover, setHover] = useStateU(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={()=>setHover(true)}
      onMouseLeave={()=>setHover(false)}
      style={{
        flex:1, cursor:"pointer", borderRadius:"1.4rem", padding:"24px 20px 22px",
        background: hover ? "rgba(94,106,210,0.07)" : "rgba(255,255,255,0.03)",
        border: hover ? "1px solid rgba(94,106,210,0.28)" : "1px solid rgba(255,255,255,0.07)",
        backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
        transition:"all 0.22s ease",
        boxShadow: hover
          ? "0 0 0 1px rgba(255,255,255,0.10), 0 8px 40px rgba(0,0,0,0.50), 0 0 80px rgba(94,106,210,0.10)"
          : "0 0 0 1px rgba(255,255,255,0.05), 0 2px 20px rgba(0,0,0,0.40)",
        display:"flex", flexDirection:"column", gap:14,
        position:"relative", overflow:"hidden",
      }}
    >
      {/* Top-edge highlight */}
      <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.10),transparent)",pointerEvents:"none"}} />
      <div style={{display:"flex",alignItems:"flex-start",justifyContent: tag ? "space-between" : "center"}}>
        <div style={{
          width:52,height:52,borderRadius:"0.9rem",
          background: hover ? "rgba(94,106,210,0.12)" : "rgba(255,255,255,0.05)",
          border:"1px solid rgba(255,255,255,0.08)",
          display:"flex",alignItems:"center",justifyContent:"center",
          color: hover ? "#5E6AD2" : "rgba(255,255,255,0.65)",
          transition:"all 0.22s",
        }}>
          {icon}
        </div>
        {tag && (
          <span style={{
            fontSize:9,letterSpacing:2,
            color:"rgba(94,106,210,0.70)",
            fontFamily:"'Outfit',sans-serif",fontWeight:600,
            padding:"4px 8px",
            background:"rgba(94,106,210,0.07)",
            borderRadius:99,
            border:"1px solid rgba(94,106,210,0.18)",
            textTransform:"uppercase",
          }}>
            {tag}
          </span>
        )}
      </div>
      <div>
        <div style={{fontSize:"1rem",fontWeight:600,color:hover?"#EDEDEF":"rgba(255,255,255,0.82)",fontFamily:"'Inter',sans-serif",marginBottom:6,transition:"color 0.22s"}}>
          {title}
        </div>
        <div style={{fontSize:"0.75rem",color:"rgba(255,255,255,0.38)",fontFamily:"'Inter',sans-serif",lineHeight:1.55}}>
          {desc}
        </div>
      </div>
      <div style={{fontSize:11,color:"rgba(94,106,210,0.75)",fontFamily:"'Inter',sans-serif",opacity:hover?1:0,transform:hover?"translateX(0)":"translateX(-6px)",transition:"all 0.22s",marginTop:2}}>
        Empezar →
      </div>
    </div>
  );
}

// ── Tarjeta de tipo de video (para clips) ──
function VideoTypeCard({ icon, tag, title, desc, onClick, disabled, soon }) {
  const [hover, setHover] = useStateU(false);
  return (
    <div
      onClick={disabled ? undefined : onClick}
      onMouseEnter={()=>!disabled&&setHover(true)}
      onMouseLeave={()=>setHover(false)}
      style={{
        flex:1, cursor:disabled?"default":"pointer", borderRadius:"1.1rem", padding:"18px 16px",
        background: hover ? "rgba(94,106,210,0.07)" : "rgba(255,255,255,0.03)",
        border: hover ? "1px solid rgba(94,106,210,0.28)" : "1px solid rgba(255,255,255,0.07)",
        backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
        transition:"all 0.22s", display:"flex", flexDirection:"column", gap:10,
        opacity: disabled ? 0.38 : 1, position:"relative",
        boxShadow: hover ? "0 0 0 1px rgba(255,255,255,0.10), 0 8px 40px rgba(0,0,0,0.50)" : "0 0 0 1px rgba(255,255,255,0.05), 0 2px 20px rgba(0,0,0,0.35)",
      }}
    >
      <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.10),transparent)",pointerEvents:"none"}} />
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize:"1.35rem"}}>{icon}</span>
        <span style={{
          fontSize:8.5,letterSpacing:1.8,
          color:"rgba(94,106,210,0.70)",
          fontFamily:"'Outfit',sans-serif",fontWeight:600,
          padding:"3px 7px",
          background:"rgba(94,106,210,0.07)",
          borderRadius:99,
          border:"1px solid rgba(94,106,210,0.18)",
          textTransform:"uppercase",
        }}>
          {soon ? "PRÓXIMAMENTE" : tag}
        </span>
      </div>
      <div style={{fontSize:"0.88rem",fontWeight:600,color:hover?"#EDEDEF":"rgba(255,255,255,0.82)",fontFamily:"'Inter',sans-serif",transition:"color 0.22s"}}>
        {title}
      </div>
      {desc && (
        <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,0.35)",fontFamily:"'Inter',sans-serif",lineHeight:1.5}}>
          {desc}
        </div>
      )}
      {!disabled && (
        <div style={{fontSize:10,color:"rgba(94,106,210,0.70)",fontFamily:"'Inter',sans-serif",opacity:hover?1:0,transform:hover?"translateX(0)":"translateX(-5px)",transition:"all 0.2s"}}>
          Seleccionar →
        </div>
      )}
    </div>
  );
}

// ── Selector posición del pip ──
const PIP_OPTS = [
  { key:'top-left',     label:'Arriba izquierda', arrow:'↖' },
  { key:'top-right',    label:'Arriba derecha',   arrow:'↗' },
  { key:'bottom-left',  label:'Abajo izquierda',  arrow:'↙' },
  { key:'bottom-right', label:'Abajo derecha',    arrow:'↘' },
];

function PipSelector({ value, onChange }) {
  return (
    <div style={{marginBottom:14}}>
      <div style={{fontSize:9.5,letterSpacing:"0.18em",color:"rgba(94,106,210,0.72)",fontFamily:"'Outfit',sans-serif",marginBottom:10,fontWeight:600,textTransform:"uppercase"}}>
        ✦ ¿Dónde está tu cámara en el video?
      </div>
      <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"1rem",padding:"12px",marginBottom:6}}>
        <div style={{fontSize:10,color:"rgba(255,255,255,0.22)",fontFamily:"'Inter',sans-serif",marginBottom:8,textAlign:"center"}}>
          Posición del pip en tu video original
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          {PIP_OPTS.map(opt=>(
            <button key={opt.key} onClick={()=>onChange(opt.key)}
              style={{
                padding:"9px 10px", borderRadius:9, fontSize:11,
                fontFamily:"'Inter',sans-serif", cursor:"pointer", textAlign:"left",
                background: value===opt.key ? "rgba(94,106,210,0.10)" : "rgba(255,255,255,0.03)",
                border: value===opt.key ? "1px solid rgba(94,106,210,0.45)" : "1px solid rgba(255,255,255,0.07)",
                color: value===opt.key ? "#5E6AD2" : "rgba(255,255,255,0.50)",
                transition:"all 0.18s",
              }}
            >
              {opt.arrow} {opt.label}
            </button>
          ))}
        </div>
      </div>
      <button onClick={()=>onChange('none')}
        style={{
          width:"100%", padding:"9px 12px", borderRadius:9, fontSize:11,
          fontFamily:"'Inter',sans-serif", cursor:"pointer", textAlign:"left",
          background: value==="none" ? "rgba(94,106,210,0.10)" : "rgba(255,255,255,0.03)",
          border: value==="none" ? "1px solid rgba(94,106,210,0.45)" : "1px solid rgba(255,255,255,0.07)",
          color: value==="none" ? "#5E6AD2" : "rgba(255,255,255,0.50)",
          transition:"all 0.18s",
        }}
      >
        📺 Solo pantalla, sin cámara
      </button>
    </div>
  );
}

// ── Selector de duración de clips ──
const DUR_OPTS = [
  { key:'short',  label:'Corto',  range:'0:20 → 1:00', desc:'Ideal para Reels / TikTok rápidos' },
  { key:'medium', label:'Medio',  range:'1:00 → 2:00', desc:'Formato estándar de YouTube Shorts' },
  { key:'long',   label:'Largo',  range:'2:00 → 5:00', desc:'Clips de profundidad o explicaciones' },
];

function DurationSelector({ value, onChange }) {
  return (
    <div style={{marginBottom:14}}>
      <div style={{fontSize:9.5,letterSpacing:"0.18em",color:"rgba(94,106,210,0.72)",fontFamily:"'Outfit',sans-serif",marginBottom:10,fontWeight:600,textTransform:"uppercase"}}>
        ✦ Duración de los clips
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {DUR_OPTS.map(opt=>(
          <button key={opt.key} onClick={()=>onChange(opt.key)}
            style={{
              display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"11px 14px", borderRadius:10, fontSize:12,
              fontFamily:"'Inter',sans-serif", cursor:"pointer", textAlign:"left",
              background: value===opt.key ? "rgba(94,106,210,0.09)" : "rgba(255,255,255,0.03)",
              border: value===opt.key ? "1px solid rgba(94,106,210,0.45)" : "1px solid rgba(255,255,255,0.07)",
              transition:"all 0.18s",
            }}
          >
            <div>
              <span style={{fontWeight:600,color:value===opt.key?"#5E6AD2":"rgba(255,255,255,0.75)",marginRight:8}}>
                {opt.label}
              </span>
              <span style={{fontSize:10.5,color:value===opt.key?"rgba(94,106,210,0.65)":"rgba(255,255,255,0.30)",fontFamily:"'Inter',sans-serif"}}>
                {opt.desc}
              </span>
            </div>
            <span style={{
              fontSize:11,fontWeight:600,letterSpacing:0.5,flexShrink:0,marginLeft:8,
              color:value===opt.key?"#5E6AD2":"rgba(255,255,255,0.28)",
              fontFamily:"'Outfit',sans-serif",
            }}>
              {opt.range}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Drop zone ──
function DropZone({ onFiles, dragOver, setDragOver, inputRef, hint, inputId }) {
  const id = inputId || "aelios-file-input";
  const onDrop     = (e)=>{ e.preventDefault(); setDragOver(false); if(e.dataTransfer.files.length) onFiles(e.dataTransfer.files); };
  const onDragOver = (e)=>{ e.preventDefault(); setDragOver(true); };
  const onDragLeave= (e)=>{ e.preventDefault(); setDragOver(false); };
  const onChange   = (e)=>{ if(e.target.files.length) onFiles(e.target.files); };
  const openPicker = ()=>{ inputRef?.current?.click(); };
  return (
    <div
      onClick={openPicker}
      onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
      style={{
        display:"block", cursor:"pointer", textAlign:"center",
        padding:"36px 24px", borderRadius:"1.4rem",
        border: dragOver ? "1px dashed rgba(94,106,210,0.55)" : "1px dashed rgba(255,255,255,0.12)",
        background: dragOver ? "rgba(94,106,210,0.05)" : "rgba(255,255,255,0.02)",
        transition:"all 0.2s", transform: dragOver ? "scale(1.012)" : "scale(1)",
        position:"relative",
        boxShadow: dragOver ? "0 0 0 1px rgba(94,106,210,0.20), inset 0 0 40px rgba(94,106,210,0.04)" : "none",
      }}
    >
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
        <div style={{
          width:56,height:56,borderRadius:"0.9rem",
          background:"rgba(255,255,255,0.04)",
          border:"1px solid rgba(255,255,255,0.08)",
          display:"flex",alignItems:"center",justifyContent:"center",
          color:dragOver?"#5E6AD2":"rgba(255,255,255,0.55)",
          transition:"color 0.2s",
        }}>
          <UploadIcon />
        </div>
        <div style={{fontSize:"0.92rem",fontWeight:600,color:"#EDEDEF",fontFamily:"'Inter',sans-serif"}}>
          Suelta el video aquí
        </div>
        <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,0.32)",fontFamily:"'Inter',sans-serif"}}>
          {hint} &nbsp;·&nbsp; <span style={{color:"#5E6AD2"}}>MP4 · MOV · MKV</span>
        </div>
      </div>
      {/* Input oculto sin pointer-events para que no intercepte clicks fuera de la zona */}
      <input ref={inputRef} id={id} type="file" accept="video/mp4,video/quicktime,video/x-matroska,.mp4,.mov,.mkv" onChange={onChange} style={{display:"none"}} />
    </div>
  );
}

// ── Estilos compartidos ──
const backBtnStyle = {
  display:"inline-flex", alignItems:"center", gap:7, marginBottom:18,
  fontSize:13, color:"rgba(255,255,255,0.35)", background:"none", border:"none",
  cursor:"pointer", fontFamily:"'Inter',sans-serif", letterSpacing:0.5, transition:"color 0.15s",
};

const sectionLabel = (text) => (
  <div style={{
    fontSize:"clamp(26px, 4.5vw, 66px)",
    letterSpacing:"-0.02em",
    color:"rgba(148,155,236,0.95)",
    fontFamily:"'Outfit',sans-serif", fontWeight:800,
    marginBottom:48, textTransform:"uppercase",
    lineHeight:1.05, textAlign:"center",
    textShadow:"0 0 60px rgba(124,133,224,0.35)",
  }}>
    {text}
  </div>
);

// ── Preview del video renderizado ──────────────────────────────────────────────
function VideoPreview({ jobId, orientation }) {
  const vidRef    = useRefU(null);
  const scrubRef  = useRefU(null);
  const rafRef    = useRefU(null);
  const [playing,     setPlaying]     = useStateU(false);
  const [muted,       setMuted]       = useStateU(true);
  const [currentTime, setCurrentTime] = useStateU(0);
  const [duration,    setDuration]    = useStateU(0);
  const [scrubbing,   setScrubbing]   = useStateU(false);

  const fmtTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // RAF loop para currentTime
  useEffectU(() => {
    const loop = () => {
      if (vidRef.current) setCurrentTime(vidRef.current.currentTime);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  // Metadata + registro de pausa global
  useEffectU(() => {
    const v = vidRef.current;
    if (!v) return;

    window.__aeliosPreviewPause = () => { v.pause(); setPlaying(false); };

    const onMeta = () => {
      const dur = v.duration || 0;
      setDuration(dur);
      if (dur < 60) {
        v.currentTime = 0;
      } else {
        const start = Math.max(1, Math.min(dur * 0.15, dur - 7));
        const end   = Math.min(start + 7, dur - 0.1);
        v.currentTime = start;
        const check = () => {
          if (!v.paused && v.currentTime >= end) v.currentTime = start;
        };
        v.addEventListener('timeupdate', check);
        return () => v.removeEventListener('timeupdate', check);
      }
    };
    v.addEventListener('loadedmetadata', onMeta);
    v.play().catch(() => {});
    return () => {
      v.removeEventListener('loadedmetadata', onMeta);
      delete window.__aeliosPreviewPause;
    };
  }, [jobId]);

  // Scrub drag
  useEffectU(() => {
    if (!scrubbing) return;
    const onMove = (e) => {
      if (!scrubRef.current || !vidRef.current || !duration) return;
      const rect = scrubRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const t = Math.max(0, Math.min(1, x)) * duration;
      vidRef.current.currentTime = t;
      setCurrentTime(t);
    };
    const onUp = () => setScrubbing(false);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [scrubbing, duration]);

  const isVertical = orientation !== "horizontal";
  const W = isVertical ? 320 : 520;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div style={{
      display:"flex", flexDirection:"column", alignItems:"center",
      gap:0, marginBottom:18,
    }}>
      {/* etiqueta */}
      <div style={{
        fontSize:10, color:"rgba(255,255,255,0.30)", letterSpacing:".06em",
        textTransform:"uppercase", fontFamily:"'Outfit',sans-serif",
        marginBottom:8,
      }}>
        Vista previa
      </div>
      {/* vídeo */}
      <div style={{
        position:"relative",
        borderRadius:12,
        overflow:"hidden",
        boxShadow:"0 0 0 1px rgba(255,255,255,0.09), 0 6px 28px rgba(0,0,0,0.75)",
        width: W,
        background:"#000",
      }}>
        <video
          ref={vidRef}
          src={`/download/${jobId}`}
          muted={muted}
          playsInline
          loop
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          style={{ display:"block", width:"100%", height:"auto" }}
        />
        {/* Botón play/pause */}
        <button
          onClick={() => {
            const v = vidRef.current;
            if (!v) return;
            if (v.paused) { v.play().catch(()=>{}); } else { v.pause(); }
          }}
          style={{
            position:"absolute", bottom:36, right:8,
            width:32, height:32, borderRadius:"50%",
            background:"rgba(0,0,0,0.55)", backdropFilter:"blur(6px)",
            border:"1px solid rgba(255,255,255,0.14)",
            color:"rgba(255,255,255,0.85)", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:12, transition:"all 0.15s",
            boxShadow:"0 2px 8px rgba(0,0,0,0.55)",
          }}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(94,106,210,0.45)"}
          onMouseLeave={e=>e.currentTarget.style.background="rgba(0,0,0,0.55)"}
        >
          {playing ? "⏸" : "▶"}
        </button>
        {/* Botón mute/unmute */}
        <button
          onClick={() => setMuted(m => !m)}
          title={muted ? "Activar sonido" : "Silenciar"}
          style={{
            position:"absolute", bottom:36, right:46,
            width:32, height:32, borderRadius:"50%",
            background:"rgba(0,0,0,0.55)", backdropFilter:"blur(6px)",
            border:"1px solid rgba(255,255,255,0.14)",
            color:"rgba(255,255,255,0.85)", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:14, transition:"all 0.15s",
            boxShadow:"0 2px 8px rgba(0,0,0,0.55)",
          }}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(94,106,210,0.45)"}
          onMouseLeave={e=>e.currentTarget.style.background="rgba(0,0,0,0.55)"}
        >
          {muted ? "🔇" : "🔊"}
        </button>
        {/* Scrub bar */}
        <div style={{
          position:"absolute", bottom:0, left:0, right:0,
          padding:"18px 8px 8px",
          background:"linear-gradient(transparent, rgba(0,0,0,0.65))",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:9, color:"rgba(255,255,255,0.55)", fontFamily:"'Inter',sans-serif", fontVariantNumeric:"tabular-nums", flexShrink:0 }}>
              {fmtTime(currentTime)}
            </span>
            <div
              ref={scrubRef}
              onMouseDown={(e) => {
                e.preventDefault();
                setScrubbing(true);
                const rect = e.currentTarget.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                if (vidRef.current && duration) {
                  const t = Math.max(0, Math.min(1, x)) * duration;
                  vidRef.current.currentTime = t;
                  setCurrentTime(t);
                }
              }}
              style={{ flex:1, height:3, background:"rgba(255,255,255,0.22)", borderRadius:99, cursor:"pointer", position:"relative" }}
            >
              <div style={{ height:"100%", width:`${progress}%`, background:"linear-gradient(90deg,#5E6AD2,#818cf8)", borderRadius:99 }} />
              <div style={{
                position:"absolute", top:"50%", left:`${progress}%`,
                transform:"translate(-50%,-50%)",
                width:10, height:10, borderRadius:"50%",
                background:"#fff", boxShadow:"0 0 4px rgba(0,0,0,0.5)",
                pointerEvents:"none",
              }} />
            </div>
            <span style={{ fontSize:9, color:"rgba(255,255,255,0.55)", fontFamily:"'Inter',sans-serif", fontVariantNumeric:"tabular-nums", flexShrink:0 }}>
              {fmtTime(duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Preview de estilo 1: BIG + small ──
function StylePreview1({ color = "#FFE033", font = "outfit" }) {
  const c = HIGHLIGHT_COLORS.find(x => x.id === color) || HIGHLIGHT_COLORS[0];
  const _ffMap = { outfit:"'Outfit',sans-serif", inter:"'Inter',sans-serif", raleway:"'Raleway',sans-serif", playfair:"'Playfair Display',serif" };
  const ff = _ffMap[font] || _ffMap.outfit;
  return (
    <div style={{
      background:"#0a0a0a", borderRadius:"0.85rem",
      height:130, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      overflow:"hidden", position:"relative",
    }}>
      <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom, #111 0%, #0a0a0a 100%)"}} />
      <div style={{position:"relative",display:"flex",flexDirection:"column",alignItems:"center",gap:0}}>
        <span style={{
          fontFamily:ff, fontWeight:300, fontStyle:"italic",
          fontSize:13, color:"rgba(255,255,255,0.88)", letterSpacing:0.3,
          textShadow:"0 1px 4px rgba(0,0,0,0.9)",
        }}>esto es</span>
        <span style={{
          fontFamily:ff, fontWeight:900,
          fontSize:32, color:c.id, letterSpacing:-1.5,
          textTransform:"uppercase", lineHeight:1.0,
          textShadow:`0 0 18px ${c.glow}, 0 0 36px ${c.glow}, 0 2px 6px rgba(0,0,0,0.99)`,
          transition:"color 0.25s, text-shadow 0.25s",
        }}>VIRAL</span>
        <span style={{
          fontFamily:ff, fontWeight:300, fontStyle:"italic",
          fontSize:13, color:"rgba(255,255,255,0.88)", letterSpacing:0.3,
          textShadow:"0 1px 4px rgba(0,0,0,0.9)",
        }}>de verdad</span>
      </div>
    </div>
  );
}

// ── Preview de estilo 2: italic + glow de color ──
function StylePreview2({ color = "#FFE033", font = "outfit" }) {
  const c = HIGHLIGHT_COLORS.find(x => x.id === color) || HIGHLIGHT_COLORS[0];
  const _ffMap = { outfit:"'Outfit',sans-serif", inter:"'Inter',sans-serif", raleway:"'Raleway',sans-serif", playfair:"'Playfair Display',serif" };
  const ff = _ffMap[font] || _ffMap.outfit;
  return (
    <div style={{
      background:"#0a0a0a", borderRadius:"0.85rem",
      height:130, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      overflow:"hidden", position:"relative",
    }}>
      <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom, #111 0%, #0a0a0a 100%)"}} />
      <div style={{position:"relative",display:"flex",flexDirection:"row",alignItems:"center",gap:6,flexWrap:"wrap",justifyContent:"center",padding:"0 10px"}}>
        <span style={{
          fontFamily:ff, fontWeight:400, fontStyle:"italic",
          fontSize:15, color:"rgba(255,255,255,0.94)",
          textShadow:"0 1px 6px rgba(0,0,0,0.85)",
        }}>esto es</span>
        <span style={{
          fontFamily:ff, fontWeight:400, fontStyle:"italic",
          fontSize:15, color:c.id,
          textShadow:`0 0 5px ${c.id}, 0 0 14px ${c.glow}, 0 0 30px ${c.glow}, 0 0 50px ${c.glow}`,
          transition:"color 0.25s, text-shadow 0.25s",
        }}>increíble</span>
        <span style={{
          fontFamily:ff, fontWeight:400, fontStyle:"italic",
          fontSize:15, color:"rgba(255,255,255,0.94)",
          textShadow:"0 1px 6px rgba(0,0,0,0.85)",
        }}>de verdad</span>
      </div>
    </div>
  );
}

// ── Preview estilo Documental (horizontal) ──
function StylePreviewDoc({ font="raleway", color="#ffffff" }) {
  const _ffMap = { outfit:"'Outfit',sans-serif", inter:"'Inter',sans-serif", raleway:"'Raleway',sans-serif", playfair:"'Playfair Display',serif" };
  const ff = _ffMap[font] || _ffMap.raleway;
  return (
    <div style={{
      background:"#0a0a0a", borderRadius:"0.85rem",
      height:300, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      overflow:"hidden", position:"relative",
    }}>
      <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,#1a1a2e 0%,#0a0a0a 60%)"}} />
      <div style={{position:"relative",display:"flex",flexDirection:"column",alignItems:"center",gap:4,justifyContent:"center",padding:"0 12px",textAlign:"center"}}>
        {["así hablan","los documentales"].map((w,i)=>(
          <span key={i} style={{
            fontFamily:ff, fontWeight:300,
            fontSize:13, color:color, letterSpacing:"2px",
            textShadow:"1px 1px 0 #000,-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000",
            whiteSpace:"nowrap",
          }}>{w}</span>
        ))}
      </div>
    </div>
  );
}

// ── Preview estilo Cinematic (amarillo sobre barra negra) ──
function StylePreviewCinematic() {
  return (
    <div style={{
      background:"#0a0a0a", borderRadius:"0.85rem",
      height:200, display:"flex", flexDirection:"column",
      alignItems:"stretch", justifyContent:"flex-end",
      overflow:"hidden", position:"relative",
    }}>
      <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,#1a1208 0%,#0a0a0a 60%)"}} />
      <div style={{
        position:"relative",
        background:"rgba(0,0,0,0.92)",
        padding:"10px 0",
        display:"flex", alignItems:"center", justifyContent:"center",
        gap:6,
      }}>
        {["whatever","comes","next"].map((w,i)=>(
          <span key={i} style={{
            fontFamily:"'Inter',sans-serif", fontWeight:400,
            fontSize:14, color:"#F5C518", letterSpacing:"0.8px",
          }}>{w}</span>
        ))}
      </div>
    </div>
  );
}

// ── Preview estilo Netflix Sub (blanco sobre barra oscura) ──
function StylePreviewSub({ font="inter", color="#ffffff" }) {
  const _ffMap = { outfit:"'Outfit',sans-serif", inter:"'Inter',sans-serif", raleway:"'Raleway',sans-serif", playfair:"'Playfair Display',serif" };
  const ff = _ffMap[font] || _ffMap.inter;
  return (
    <div style={{
      background:"#0a0a0a", borderRadius:"0.85rem",
      height:300, display:"flex", flexDirection:"column",
      alignItems:"stretch", justifyContent:"center",
      overflow:"hidden", position:"relative",
    }}>
      <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,#0d1117 0%,#0a0a0a 60%)"}} />
      <div style={{
        position:"relative",
        background:"rgba(0,0,0,0.72)",
        padding:"12px 0",
        display:"flex", alignItems:"center", justifyContent:"center",
        gap:5, flexWrap:"wrap",
      }}>
        {["El Estado Mayor","de la OTAN"].map((w,i)=>(
          <span key={i} style={{
            fontFamily:ff, fontWeight:400,
            fontSize:12.5, color:color, letterSpacing:"0.3px",
            whiteSpace:"nowrap",
          }}>{w}</span>
        ))}
      </div>
    </div>
  );
}

// ── Preview estilo Bold (blanco bold sin barra) ──
function StylePreviewBold({ font="outfit", color="#ffffff" }) {
  const _ffMap = { outfit:"'Outfit',sans-serif", inter:"'Inter',sans-serif", raleway:"'Raleway',sans-serif", playfair:"'Playfair Display',serif" };
  const ff = _ffMap[font] || _ffMap.outfit;
  return (
    <div style={{
      background:"#0a0a0a", borderRadius:"0.85rem",
      height:300, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      overflow:"hidden", position:"relative",
    }}>
      <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,#111 0%,#0a0a0a 60%)"}} />
      <div style={{position:"relative",display:"flex",flexDirection:"row",alignItems:"center",gap:5,justifyContent:"center",padding:"0 14px"}}>
        {["BOLD","STYLE"].map((w,i)=>(
          <span key={i} style={{
            fontFamily:ff, fontWeight:900,
            fontSize:22, color:color, letterSpacing:"2px",
            textShadow:"-2px -2px 0 #000,2px -2px 0 #000,-2px 2px 0 #000,2px 2px 0 #000,0 3px 10px rgba(0,0,0,0.99)",
          }}>{w}</span>
        ))}
      </div>
    </div>
  );
}

// ── Preview estilo Solo Blanco ──
function StylePreviewWhite() {
  return (
    <div style={{
      background:"#0a0a0a", borderRadius:"0.85rem",
      height:130, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      overflow:"hidden", position:"relative",
    }}>
      <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom, #111 0%, #0a0a0a 100%)"}} />
      <div style={{position:"relative",display:"flex",flexDirection:"row",alignItems:"center",gap:7,flexWrap:"wrap",justifyContent:"center",padding:"0 8px"}}>
        {["texto","limpio","y","blanco"].map((w,i)=>(
          <span key={i} style={{
            fontFamily:"'Outfit',sans-serif", fontWeight:700,
            fontSize:12.5, color:"#ffffff",
            textShadow:"0 2px 8px rgba(0,0,0,0.99), 0 4px 16px rgba(0,0,0,0.75)",
          }}>{w}</span>
        ))}
      </div>
    </div>
  );
}

// ── Selector de estilo — vertical (Big Glow / Normal Glow / Solo Blanco) ──
const FONT_OPTIONS = [
  { id:"outfit",   label:"Outfit",   sample:"Outfit",   style:{fontFamily:"'Outfit',sans-serif",   fontWeight:700} },
  { id:"inter",    label:"Inter",    sample:"Inter",    style:{fontFamily:"'Inter',sans-serif",    fontWeight:700} },
  { id:"raleway",  label:"Raleway",  sample:"Raleway",  style:{fontFamily:"'Raleway',sans-serif",  fontWeight:300} },
  { id:"playfair", label:"Playfair", sample:"Playfair", style:{fontFamily:"'Playfair Display',serif", fontStyle:"italic", fontWeight:700} },
];
const ANIM_OPTIONS = [
  { id:"default",    label:"Fade Pop",    icon:"✦" },
  { id:"slide",      label:"Slide Up",    icon:"↑" },
  { id:"scale",      label:"Scale In",    icon:"⊕" },
  { id:"bounce",     label:"Rebote",      icon:"◎" },
];

// ── Mapa de fuentes para el mockup ───────────────────────────────────────────
const PHONE_FONT_MAP = {
  outfit:   { ff:"'Outfit',sans-serif",           fw700:900, fw300:300, fsi:"normal" },
  inter:    { ff:"'Inter',sans-serif",             fw700:700, fw300:400, fsi:"normal" },
  raleway:  { ff:"'Raleway',sans-serif",           fw700:600, fw300:300, fsi:"normal" },
  playfair: { ff:"'Playfair Display',serif",       fw700:800, fw300:700, fsi:"italic" },
};

// ── Phone mockup con caption arrastrable ─────────────────────────────────────
function PhoneMockup({ style, color, subPos, onPosChange, captFont, captAnim, videoURL }) {
  const phoneRef  = useRefU(null);
  const [dragging, setDragging] = useStateU(false);
  const [animKey,  setAnimKey]  = useStateU(0);

  const PHONE_H = 555;
  const PHONE_W = 255;

  // Replay animation whenever font or animation type changes
  useEffectU(() => { setAnimKey(k => k + 1); }, [captFont, captAnim, style, color]);

  useEffectU(() => {
    if (!dragging) return;
    const handleMove = (e) => {
      if (!phoneRef.current) return;
      const rect = phoneRef.current.getBoundingClientRect();
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const y = clientY - rect.top;
      const pct = Math.round((1 - y / rect.height) * 100);
      onPosChange(Math.max(5, Math.min(65, pct)));
    };
    const handleUp = () => setDragging(false);
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup",   handleUp);
    document.addEventListener("touchmove", handleMove, { passive: true });
    document.addEventListener("touchend",  handleUp);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup",   handleUp);
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend",  handleUp);
    };
  }, [dragging, onPosChange]);

  const captionBottomPx = (subPos / 100) * PHONE_H;
  const hl = (HIGHLIGHT_COLORS.find(x => x.id === color) || HIGHLIGHT_COLORS[0]);
  const fm = PHONE_FONT_MAP[captFont] || PHONE_FONT_MAP.outfit;

  // Animation definitions (injected once via <style>)
  const ANIM_CSS = `
    @keyframes pcapt-fadepop { from{opacity:0;transform:scale(0.65)} to{opacity:1;transform:scale(1)} }
    @keyframes pcapt-slide   { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
    @keyframes pcapt-scale   { from{opacity:0;transform:scale(0.3)} to{opacity:1;transform:scale(1)} }
    @keyframes pcapt-bounce  { 0%{opacity:0;transform:scale(0.5) translateY(10px)} 65%{transform:scale(1.1) translateY(-4px)} 100%{opacity:1;transform:scale(1) translateY(0)} }
  `;
  const ANIM_NAME = { default:"pcapt-fadepop", slide:"pcapt-slide", scale:"pcapt-scale", bounce:"pcapt-bounce" };
  const animCSS = `${ANIM_NAME[captAnim] || "pcapt-fadepop"} 0.45s cubic-bezier(.17,.67,.32,1.28) both`;

  const renderCaption = () => {
    if (!style) return (
      <div style={{
        display:"flex", flexDirection:"column", alignItems:"center", gap:6, pointerEvents:"none",
        background:"rgba(0,0,0,0.45)", backdropFilter:"blur(8px)",
        padding:"10px 18px", borderRadius:10,
        border:"1px solid rgba(255,255,255,0.10)",
      }}>
        <span style={{ fontFamily:"'Outfit',sans-serif", fontSize:11, color:"rgba(255,255,255,0.45)", textAlign:"center" }}>
          Elige un estilo →
        </span>
      </div>
    );
    if (style === "style1") return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:0, pointerEvents:"none" }}>
        <span style={{ fontFamily:fm.ff, fontWeight:fm.fw300, fontStyle:fm.fsi, fontSize:17, color:"rgba(255,255,255,0.92)", textShadow:"0 1px 6px rgba(0,0,0,0.99)" }}>esto es</span>
        <span style={{ fontFamily:fm.ff, fontWeight:fm.fw700, fontStyle:fm.fsi === "italic" ? "italic" : "normal", fontSize:40, color:hl.id, letterSpacing:-1.5, textTransform:"uppercase", textShadow:`0 0 18px ${hl.glow}, 0 0 36px ${hl.glow}`, lineHeight:1 }}>VIRAL</span>
        <span style={{ fontFamily:fm.ff, fontWeight:fm.fw300, fontStyle:fm.fsi, fontSize:17, color:"rgba(255,255,255,0.92)", textShadow:"0 1px 6px rgba(0,0,0,0.99)" }}>content</span>
      </div>
    );
    if (style === "style2") return (
      <span style={{ fontFamily:fm.ff, fontWeight:fm.fw300, fontStyle:fm.fsi, fontSize:21, color:hl.id, textShadow:`0 0 8px ${hl.id}, 0 0 20px ${hl.glow}, 0 0 40px ${hl.glow}`, letterSpacing:0.3, pointerEvents:"none" }}>esto es viral</span>
    );
    return (
      <span style={{ fontFamily:fm.ff, fontWeight:fm.fw700, fontStyle:fm.fsi, fontSize:21, color:"#fff", textShadow:"0 2px 12px rgba(0,0,0,0.99)", pointerEvents:"none" }}>esto es viral</span>
    );
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", userSelect:"none" }}>
      <div style={{ fontSize:9, color:"rgba(255,255,255,0.28)", marginBottom:8, fontFamily:"'Inter',sans-serif", letterSpacing:".1em", textTransform:"uppercase" }}>
        ↕ Arrastra para posicionar
      </div>
      <div
        ref={phoneRef}
        onMouseDown={(e) => { e.preventDefault(); setDragging(true); }}
        onTouchStart={() => setDragging(true)}
        style={{
          position:"relative", width:PHONE_W, height:PHONE_H,
          borderRadius:30, background:"#0c0c0f",
          border:`2px solid ${dragging ? "rgba(94,106,210,0.7)" : "rgba(255,255,255,0.18)"}`,
          overflow:"hidden", cursor:"ns-resize",
          boxShadow: dragging
            ? "0 0 0 3px rgba(94,106,210,0.25), 0 8px 40px rgba(0,0,0,0.80)"
            : "0 8px 40px rgba(0,0,0,0.80), 0 0 0 1px rgba(255,255,255,0.06)",
          transition:"border-color 0.15s, box-shadow 0.15s",
        }}
      >
        {/* Keyframe animations */}
        <style>{ANIM_CSS}</style>
        {/* Notch */}
        <div style={{ position:"absolute", top:10, left:"50%", transform:"translateX(-50%)", width:38, height:5, borderRadius:3, background:"rgba(255,255,255,0.20)", zIndex:5 }} />
        {/* Background: real video or dark gradient fallback */}
        {videoURL ? (
          <video
            src={videoURL}
            autoPlay muted playsInline loop
            style={{
              position:"absolute", inset:0, width:"100%", height:"100%",
              objectFit:"cover", pointerEvents:"none",
            }}
          />
        ) : (
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(165deg, #181820 0%, #0c0c0f 100%)" }} />
        )}
        {/* Subtle scan lines */}
        <div style={{ position:"absolute", inset:0, backgroundImage:"repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.009) 3px, rgba(255,255,255,0.009) 4px)", pointerEvents:"none", zIndex:1 }} />
        {/* Caption */}
        <div
          key={animKey}
          style={{
            position:"absolute", bottom:captionBottomPx, left:0, right:0,
            display:"flex", justifyContent:"center",
            padding:"3px 10px",
            transition: dragging ? "none" : "bottom 0.12s",
            zIndex:3,
            animation: animCSS,
          }}
        >
          {renderCaption()}
        </div>
        {/* Drag guide line */}
        {dragging && (
          <div style={{ position:"absolute", left:10, right:10, bottom:captionBottomPx, height:1.5, background:"rgba(94,106,210,0.80)", boxShadow:"0 0 6px rgba(94,106,210,0.6)", zIndex:4 }} />
        )}
      </div>
      <div style={{ fontSize:10, color:"rgba(94,106,210,0.85)", marginTop:9, fontFamily:"'Outfit',sans-serif", fontWeight:700, letterSpacing:0.5 }}>
        {subPos}% desde abajo
      </div>
    </div>
  );
}

// ── Pantalla intermedia tras subir video ─────────────────────────────────────
function VideoReadyScreen({ file, videoURL, onGenerate, onCustomize, onBack }) {
  const [muted, setMuted] = useStateU(true);
  const vidRef = useRefU(null);

  useEffectU(() => {
    const v = vidRef.current;
    if (!v || !videoURL) return;
    v.play().catch(() => {});
  }, [videoURL]);

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:0 }}>
      {sectionLabel("Video listo")}

      {/* Video preview */}
      <div style={{
        position:"relative", borderRadius:14, overflow:"hidden",
        boxShadow:"0 0 0 1px rgba(255,255,255,0.09), 0 8px 40px rgba(0,0,0,0.75)",
        background:"#000", marginBottom:22, maxWidth:340, width:"100%",
      }}>
        <video
          ref={vidRef}
          src={videoURL}
          muted={muted}
          playsInline
          loop
          style={{ display:"block", width:"100%", height:"auto", maxHeight:"55vh" }}
        />
        <button
          onClick={() => setMuted(m => !m)}
          title={muted ? "Activar sonido" : "Silenciar"}
          style={{
            position:"absolute", bottom:10, right:10,
            width:32, height:32, borderRadius:"50%",
            background:"rgba(0,0,0,0.55)", backdropFilter:"blur(6px)",
            border:"1px solid rgba(255,255,255,0.14)",
            color:"rgba(255,255,255,0.85)", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:14, transition:"all 0.15s",
            boxShadow:"0 2px 8px rgba(0,0,0,0.55)",
          }}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(94,106,210,0.45)"}
          onMouseLeave={e=>e.currentTarget.style.background="rgba(0,0,0,0.55)"}
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </div>

      {/* File name */}
      <div style={{fontSize:11,color:"rgba(255,255,255,0.32)",fontFamily:"'Inter',sans-serif",marginBottom:26,textAlign:"center",maxWidth:320,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
        {file?.name}
      </div>

      {/* Action buttons */}
      <div style={{ display:"flex", gap:12, width:"100%", maxWidth:400 }}>
        <button
          onClick={onGenerate}
          style={{
            flex:1, padding:"16px 18px", borderRadius:"0.9rem",
            fontFamily:"'Outfit',sans-serif", fontWeight:700, fontSize:13,
            letterSpacing:"0.08em", cursor:"pointer", textTransform:"uppercase",
            background:"linear-gradient(135deg, #4a54c1, #5E6AD2)",
            color:"#fff", border:"none",
            boxShadow:"0 0 0 1px rgba(94,106,210,0.50), 0 4px 24px rgba(94,106,210,0.40), inset 0 1px 0 rgba(255,255,255,0.12)",
            transition:"all 0.22s",
          }}
          onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow="0 0 0 1px rgba(94,106,210,0.65), 0 8px 32px rgba(94,106,210,0.55), inset 0 1px 0 rgba(255,255,255,0.18)"; }}
          onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 0 0 1px rgba(94,106,210,0.50), 0 4px 24px rgba(94,106,210,0.40), inset 0 1px 0 rgba(255,255,255,0.12)"; }}
        >
          ⚡ Generar captions
        </button>
        <button
          onClick={onCustomize}
          style={{
            flex:1, padding:"16px 18px", borderRadius:"0.9rem",
            fontFamily:"'Outfit',sans-serif", fontWeight:700, fontSize:13,
            letterSpacing:"0.08em", cursor:"pointer", textTransform:"uppercase",
            background:"rgba(255,255,255,0.05)",
            color:"rgba(255,255,255,0.72)",
            border:"1px solid rgba(255,255,255,0.12)",
            transition:"all 0.22s",
          }}
          onMouseEnter={e=>{ e.currentTarget.style.background="rgba(255,255,255,0.09)"; e.currentTarget.style.color="#fff"; e.currentTarget.style.borderColor="rgba(255,255,255,0.22)"; }}
          onMouseLeave={e=>{ e.currentTarget.style.background="rgba(255,255,255,0.05)"; e.currentTarget.style.color="rgba(255,255,255,0.72)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.12)"; }}
        >
          🎨 Personalizar captions
        </button>
      </div>

      <div style={{textAlign:"center", marginTop:32}}>
        <button onClick={onBack} style={{...backBtnStyle,display:"inline-flex",marginBottom:0}}
          onMouseEnter={e=>e.currentTarget.style.color="rgba(255,255,255,0.65)"}
          onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.35)"}
        >
          <ArrowLeft /> Cambiar video
        </button>
      </div>
    </div>
  );
}

function StylePicker({ onSelect, onBack, videoURL }) {
  const [selected,      setSelected]      = useStateU(null);
  const [selectedColor, setSelectedColor] = useStateU("#FFE033");
  const [enableZoom,    setEnableZoom]    = useStateU(true);
  const [subPos,        setSubPos]        = useStateU(15);
  const [captFont,      setCaptFont]      = useStateU("outfit");
  const [captAnim,      setCaptAnim]      = useStateU("default");

  const cardStyle = (id) => ({
    flex:1, borderRadius:"1.1rem", overflow:"hidden", cursor:"pointer",
    border: selected===id ? "1.5px solid rgba(94,106,210,0.55)" : "1px solid rgba(255,255,255,0.07)",
    background: selected===id ? "rgba(94,106,210,0.05)" : "rgba(255,255,255,0.02)",
    boxShadow: selected===id
      ? "0 0 0 1px rgba(94,106,210,0.20), 0 0 28px rgba(94,106,210,0.12)"
      : "0 0 0 1px rgba(255,255,255,0.04), 0 2px 16px rgba(0,0,0,0.35)",
    transition:"all 0.2s",
    position:"relative",
  });

  const labelStyle = (id) => ({
    padding:"10px 14px 12px",
    display:"flex", alignItems:"center", justifyContent:"space-between",
  });

  const radioStyle = (id) => ({
    width:18,height:18,borderRadius:"50%",flexShrink:0,
    border: selected===id ? "1.5px solid #5E6AD2" : "1px solid rgba(255,255,255,0.15)",
    background: selected===id ? "rgba(94,106,210,0.15)" : "transparent",
    display:"flex",alignItems:"center",justifyContent:"center",
    transition:"all 0.18s",
  });

  return (
    <div style={{ display:"flex", gap:0, alignItems:"flex-start" }}>

      {/* ── Columna izquierda: phone mockup SIEMPRE visible ── */}
      <div style={{
        flexShrink:0, paddingRight:24, marginRight:24,
        borderRight:"1px solid rgba(255,255,255,0.07)",
      }}>
        <PhoneMockup
          style={selected}
          color={selectedColor}
          subPos={subPos}
          onPosChange={setSubPos}
          captFont={captFont}
          captAnim={captAnim}
          videoURL={videoURL}
        />
      </div>

      {/* ── Columna derecha: todos los controles ── */}
      <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", gap:0 }}>

        {/* Heading compacto para la columna */}
        <div style={{
          fontSize:"clamp(18px, 2.8vw, 36px)",
          letterSpacing:"-0.02em",
          color:"rgba(148,155,236,0.95)",
          fontFamily:"'Outfit',sans-serif", fontWeight:800,
          marginBottom:20, textTransform:"uppercase",
          lineHeight:1.05, textAlign:"center",
          textShadow:"0 0 60px rgba(124,133,224,0.35)",
        }}>
          Elige el estilo
        </div>

        {/* 3 tarjetas de estilo */}
        <div style={{display:"flex",gap:8,marginBottom:16}}>

          {/* Big Glow */}
          <div style={cardStyle("style1")} onClick={()=>setSelected("style1")}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.10),transparent)",pointerEvents:"none"}} />
            <StylePreview1 color={selectedColor} font={captFont} />
            <div style={labelStyle("style1")}>
              <div>
                <div style={{fontSize:"0.82rem",fontWeight:600,color:"rgba(255,255,255,0.85)",fontFamily:"'Inter',sans-serif"}}>Big Glow</div>
                <div style={{fontSize:"0.68rem",color:"rgba(255,255,255,0.32)",fontFamily:"'Inter',sans-serif",marginTop:2}}>Bold · Énfasis grande</div>
              </div>
              <div style={radioStyle("style1")}>
                {selected==="style1" && <span style={{width:7,height:7,borderRadius:"50%",background:"#5E6AD2",display:"block"}} />}
              </div>
            </div>
          </div>

          {/* Normal Glow */}
          <div style={cardStyle("style2")} onClick={()=>setSelected("style2")}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.10),transparent)",pointerEvents:"none"}} />
            <StylePreview2 color={selectedColor} font={captFont} />
            <div style={labelStyle("style2")}>
              <div>
                <div style={{fontSize:"0.82rem",fontWeight:600,color:"rgba(255,255,255,0.85)",fontFamily:"'Inter',sans-serif"}}>Normal Glow</div>
                <div style={{fontSize:"0.68rem",color:"rgba(255,255,255,0.32)",fontFamily:"'Inter',sans-serif",marginTop:2}}>Itálica · Glow color</div>
              </div>
              <div style={radioStyle("style2")}>
                {selected==="style2" && <span style={{width:7,height:7,borderRadius:"50%",background:"#5E6AD2",display:"block"}} />}
              </div>
            </div>
          </div>

          {/* Solo Blanco */}
          <div style={cardStyle("style3")} onClick={()=>setSelected("style3")}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.10),transparent)",pointerEvents:"none"}} />
            <StylePreviewWhite />
            <div style={labelStyle("style3")}>
              <div>
                <div style={{fontSize:"0.82rem",fontWeight:600,color:"rgba(255,255,255,0.85)",fontFamily:"'Inter',sans-serif"}}>Solo Blanco</div>
                <div style={{fontSize:"0.68rem",color:"rgba(255,255,255,0.32)",fontFamily:"'Inter',sans-serif",marginTop:2}}>Limpio · Sin colores</div>
              </div>
              <div style={radioStyle("style3")}>
                {selected==="style3" && <span style={{width:7,height:7,borderRadius:"50%",background:"#5E6AD2",display:"block"}} />}
              </div>
            </div>
          </div>

        </div>

        {selected && selected !== "style3" && <ColorPicker value={selectedColor} onChange={setSelectedColor} />}

        {/* Controles avanzados — condicionales a selección */}
        {selected && (
          <div style={{ display:"flex", flexDirection:"column", gap:0, paddingTop:4 }}>

            {/* Toggle Zoom */}
            <div style={{
              display:"flex", alignItems:"center", justifyContent:"space-between",
              background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.07)",
              borderRadius:"0.7rem", padding:"8px 12px", marginBottom:10,
            }}>
              <div>
                <div style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,0.72)",fontFamily:"'Inter',sans-serif"}}>Zoom clave</div>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.32)",fontFamily:"'Inter',sans-serif",marginTop:1}}>Zoom en palabras importantes</div>
              </div>
              <button onClick={()=>setEnableZoom(z=>!z)} style={{
                flexShrink:0, marginLeft:10,
                width:38, height:21, borderRadius:99, border:"none", cursor:"pointer",
                background: enableZoom ? "linear-gradient(135deg,#4a54c1,#5E6AD2)" : "rgba(255,255,255,0.10)",
                position:"relative", transition:"background 0.2s",
                boxShadow: enableZoom ? "0 0 0 1px rgba(94,106,210,0.50), 0 2px 8px rgba(94,106,210,0.30)" : "none",
              }}>
                <span style={{
                  position:"absolute", top:2.5, left: enableZoom ? 18 : 2.5,
                  width:16, height:16, borderRadius:"50%", background:"#fff",
                  transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.35)",
                }} />
              </button>
            </div>

            {/* Tipografía */}
            <div style={{
              background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.07)",
              borderRadius:"0.7rem", padding:"8px 12px", marginBottom:10,
            }}>
              <div style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,0.72)",fontFamily:"'Inter',sans-serif",marginBottom:6}}>Tipografía</div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {FONT_OPTIONS.map(f=>(
                  <button key={f.id} onClick={()=>setCaptFont(f.id)} style={{
                    padding:"4px 9px", borderRadius:6, border:"none", cursor:"pointer",
                    background: captFont===f.id ? "rgba(94,106,210,0.30)" : "rgba(255,255,255,0.06)",
                    color: captFont===f.id ? "#fff" : "rgba(255,255,255,0.50)",
                    fontSize:11, ...f.style,
                    outline: captFont===f.id ? "1px solid rgba(94,106,210,0.55)" : "1px solid transparent",
                    transition:"all 0.15s",
                  }}>{f.sample}</button>
                ))}
              </div>
            </div>

            {/* Animación */}
            <div style={{
              background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.07)",
              borderRadius:"0.7rem", padding:"8px 12px", marginBottom:0,
            }}>
              <div style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,0.72)",fontFamily:"'Inter',sans-serif",marginBottom:6}}>Animación</div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {ANIM_OPTIONS.map(a=>(
                  <button key={a.id} onClick={()=>setCaptAnim(a.id)} style={{
                    padding:"4px 9px", borderRadius:6, border:"none", cursor:"pointer",
                    background: captAnim===a.id ? "rgba(94,106,210,0.30)" : "rgba(255,255,255,0.06)",
                    color: captAnim===a.id ? "#fff" : "rgba(255,255,255,0.50)",
                    fontFamily:"'Inter',sans-serif", fontSize:11,
                    outline: captAnim===a.id ? "1px solid rgba(94,106,210,0.55)" : "1px solid transparent",
                    transition:"all 0.15s",
                  }}>{a.icon} {a.label}</button>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* Spacer */}
        {selected && <div style={{ height:14 }} />}

        <button
          onClick={()=>{ if(selected) onSelect(selected, selected === "style3" ? "#FFFFFF" : selectedColor, enableZoom, subPos, captFont, captAnim); }}
          disabled={!selected}
          style={{
            width:"100%", padding:"14px", borderRadius:"0.9rem",
            fontFamily:"'Outfit',sans-serif", fontWeight:700, fontSize:14,
            letterSpacing:1.5, cursor: selected ? "pointer" : "not-allowed",
            background: selected ? "linear-gradient(135deg, #4a54c1, #5E6AD2)" : "rgba(255,255,255,0.04)",
            color: selected ? "#fff" : "rgba(255,255,255,0.22)",
            border: selected ? "none" : "1px solid rgba(255,255,255,0.07)",
            boxShadow: selected
              ? "0 0 0 1px rgba(94,106,210,0.50), 0 4px 24px rgba(94,106,210,0.40), inset 0 1px 0 rgba(255,255,255,0.12)"
              : "none",
            transition:"all 0.22s",
            position:"relative", overflow:"hidden",
          }}
        >
          EMPEZAR →
        </button>
        <div style={{textAlign:"center", marginTop:44}}>
          <button onClick={onBack} style={{...backBtnStyle,display:"inline-flex",marginBottom:0}}
            onMouseEnter={e=>e.currentTarget.style.color="rgba(255,255,255,0.65)"}
            onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.35)"}
          >
            <ArrowLeft /> Volver
          </button>
        </div>

      </div>
    </div>
  );
}

const SFX_OPTIONS = [
  { id:"none",       label:"Sin sonido",  icon:"○" },
  { id:"whoosh",     label:"Whoosh",      icon:"↑" },
  { id:"pop",        label:"Pop",         icon:"✦" },
  { id:"cinematic",  label:"Cinemático",  icon:"♬" },
];

// ── Selector de estilo — horizontal (4 estilos + mockup widescreen) ──
function StylePickerHorizontal({ onSelect, onBack, videoURL }) {
  const [selected,    setSelected]    = useStateU(null);
  const [sfxPack,     setSfxPack]     = useStateU("none");
  const [captFont,    setCaptFont]    = useStateU("outfit");
  const [captCase,    setCaptCase]    = useStateU("lower");
  const [captSize,    setCaptSize]    = useStateU(100);
  const [captColor,   setCaptColor]   = useStateU("#FFFFFF");
  const [captStroke,  setCaptStroke]  = useStateU(false);
  const [subPos,    setSubPos]    = useStateU(7);
  const [dragging,  setDragging]  = useStateU(false);
  const [hovering,  setHovering]  = useStateU(false);
  const mockupRef = useRefU(null);

  // Drag pos on widescreen mockup
  const { useEffect: useEffSPH2 } = React;
  useEffSPH2(()=>{
    if (!dragging) return;
    const MOCK_H = 259;
    const move = (e) => {
      if (!mockupRef.current) return;
      const rect = mockupRef.current.getBoundingClientRect();
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const y = clientY - rect.top;
      const pct = Math.round((1 - y / rect.height) * 100);
      setSubPos(Math.max(2, Math.min(50, pct)));
    };
    const up = () => setDragging(false);
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
  }, [dragging]);

  const STYLES = [
    { id:"style_doc",  Preview: StylePreviewDoc,  label:"Documental",  sub:"Raleway · Elegante" },
    { id:"style_sub",  Preview: StylePreviewSub,  label:"Netflix Sub", sub:"Limpio · Minimalista" },
    { id:"style_bold", Preview: StylePreviewBold, label:"Bold",        sub:"Outfit · Contundente" },
  ];

  const cardSt = (id) => ({
    flex:1, borderRadius:"1.1rem", overflow:"hidden", cursor:"pointer", position:"relative",
    border: selected===id ? "1.5px solid rgba(94,106,210,0.55)" : "1px solid rgba(255,255,255,0.07)",
    background: selected===id ? "rgba(94,106,210,0.05)" : "rgba(255,255,255,0.02)",
    boxShadow: selected===id ? "0 0 0 1px rgba(94,106,210,0.20),0 0 28px rgba(94,106,210,0.12)" : "0 0 0 1px rgba(255,255,255,0.04),0 2px 16px rgba(0,0,0,0.35)",
    transition:"all 0.2s",
  });

  const FONT_OPTS = [
    { id:"outfit",   label:"Outfit" },
    { id:"inter",    label:"Inter" },
    { id:"raleway",  label:"Raleway" },
    { id:"playfair", label:"Playfair" },
  ];
  const SIZE_OPTS = [
    { id:80,  label:"S" },
    { id:90,  label:"M" },
    { id:100, label:"L" },
    { id:115, label:"XL" },
  ];
  const CASE_OPTS = [
    { id:"upper",  label:"AA", title:"Todo mayúsculas" },
    { id:"normal", label:"Aa", title:"Normal (original)" },
    { id:"lower",  label:"aa", title:"Todo minúsculas" },
  ];

  // Mockup caption rendering
  const renderMockupCaption = () => {
    const sc = captSize / 100;
    const fontMap = { outfit:"'Outfit',sans-serif", inter:"'Inter',sans-serif", raleway:"'Raleway',sans-serif", playfair:"'Playfair Display',serif" };
    const ff = fontMap[captFont] || fontMap.outfit;
    const applyCase = (t) => captCase === "upper" ? t.toUpperCase() : captCase === "normal" ? t : t.toLowerCase();
    const words = ["este","es","el","preview"];

    // Tamaños calibrados: CSS real halved (22/29/26px) × escala mockup
    // style_sub=22px → 11px  |  style_bold=29px → 14px  |  style_doc=26px → 13px
    const strokeSt = captStroke ? { WebkitTextStroke:"1px rgba(0,0,0,0.9)", paintOrder:"stroke fill" } : {};
    if (selected === "style_sub") return (
      <div style={{ position:"absolute", left:0, right:0, bottom:`${subPos}%`,
        background:"rgba(0,0,0,0.72)", padding:"3px 0",
        display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
        {words.map((w,i) => <span key={i} style={{ fontFamily:ff, fontWeight:400, fontSize:Math.round(11*sc), color:captColor, letterSpacing:"0.3px", ...strokeSt }}>{applyCase(w)}</span>)}
      </div>
    );
    if (selected === "style_bold") return (
      <div style={{ position:"absolute", left:0, right:0, bottom:`${subPos}%`,
        display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
        {words.map((w,i) => <span key={i} style={{ fontFamily:ff, fontWeight:900, fontSize:Math.round(14*sc), color:captColor, letterSpacing:"1.5px", textShadow:"-1px -1px 0 #000,1px 1px 0 #000", ...strokeSt }}>{applyCase(w.toUpperCase())}</span>)}
      </div>
    );
    if (selected === "style_doc") return (
      <div style={{ position:"absolute", left:0, right:0, bottom:`${subPos}%`,
        display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
        {words.map((w,i) => <span key={i} style={{ fontFamily:ff, fontWeight:300, fontSize:Math.round(13*sc), color:captColor, letterSpacing:"2px", textShadow:"0 0 4px #000", ...strokeSt }}>{applyCase(w)}</span>)}
      </div>
    );
    return <div style={{position:"absolute",left:0,right:0,bottom:`${subPos}%`,display:"flex",justifyContent:"center"}}>
      <span style={{fontSize:9,color:"rgba(255,255,255,0.35)",fontFamily:"'Outfit',sans-serif"}}>← elige un estilo</span>
    </div>;
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

      {/* Heading */}
      <div style={{ fontSize:"clamp(16px,2.5vw,32px)", letterSpacing:"-0.02em", color:"rgba(148,155,236,0.95)",
        fontFamily:"'Outfit',sans-serif", fontWeight:800, textTransform:"uppercase",
        lineHeight:1.05, textAlign:"center", textShadow:"0 0 60px rgba(124,133,224,0.35)" }}>
        Elige el estilo de captions
      </div>

      {/* Widescreen mockup */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", userSelect:"none" }}>
        <div style={{ fontSize:9, color:"rgba(255,255,255,0.28)", marginBottom:6,
          fontFamily:"'Inter',sans-serif", letterSpacing:".1em", textTransform:"uppercase" }}>
          ↕ Arrastra para posicionar · hover para tamaño
        </div>
        <div
          ref={mockupRef}
          onMouseDown={e=>{ e.preventDefault(); setDragging(true); }}
          onTouchStart={()=>setDragging(true)}
          onMouseEnter={()=>setHovering(true)}
          onMouseLeave={()=>setHovering(false)}
          style={{
            position:"relative", width:"100%", maxWidth:520, height:Math.round(520*9/16),
            borderRadius:12, background:"#0c0c0f", overflow:"hidden", cursor:"ns-resize",
            border: `2px solid ${dragging ? "rgba(94,106,210,0.7)" : "rgba(255,255,255,0.12)"}`,
            boxShadow: "0 8px 40px rgba(0,0,0,0.70), 0 0 0 1px rgba(255,255,255,0.04)",
            transition:"border-color 0.15s",
          }}
        >
          {/* Background: video o gradiente */}
          {videoURL ? (
            <video src={videoURL} autoPlay muted playsInline loop
              style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",pointerEvents:"none"}} />
          ) : (
            <div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,#0d1117 0%,#1a1a2e 50%,#0d1117 100%)"}} />
          )}
          {/* Horizontal filmstrip guide lines */}
          <div style={{position:"absolute",inset:0,
            backgroundImage:"linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)",
            backgroundSize:"auto 30px" }} />
          {/* Caption */}
          {renderMockupCaption()}
          {/* Drag handle line */}
          {selected && (
            <div style={{
              position:"absolute", left:0, right:0, bottom:`${subPos}%`,
              height:2, background:"rgba(94,106,210,0.60)",
              pointerEvents:"none",
            }}>
              <span style={{
                position:"absolute", right:6, top:-9, fontSize:9,
                background:"rgba(94,106,210,0.85)", color:"#fff",
                padding:"1px 5px", borderRadius:3,
                fontFamily:"'Inter',sans-serif", fontWeight:700,
              }}>↕ {subPos}%</span>
            </div>
          )}
          {/* Size hover popup */}
          {hovering && selected && (
            <div style={{
              position:"absolute", top:8, right:8, zIndex:10,
              background:"rgba(12,12,15,0.92)", border:"1px solid rgba(94,106,210,0.40)",
              borderRadius:8, padding:"6px 8px",
              display:"flex", flexDirection:"column", gap:4,
            }}>
              <div style={{fontSize:8,color:"rgba(255,255,255,0.45)",fontFamily:"'Inter',sans-serif",letterSpacing:".08em",textTransform:"uppercase",marginBottom:2}}>Tamaño</div>
              <div style={{display:"flex",gap:4}}>
                {SIZE_OPTS.map(s=>(
                  <button key={s.id} onClick={e=>{e.stopPropagation();setCaptSize(s.id);}} style={{
                    width:26, height:22, borderRadius:5, border:"none", cursor:"pointer",
                    background: captSize===s.id ? "rgba(94,106,210,0.50)" : "rgba(255,255,255,0.08)",
                    color: captSize===s.id ? "#fff" : "rgba(255,255,255,0.55)",
                    fontFamily:"'Inter',sans-serif", fontSize:10, fontWeight:700,
                    outline: captSize===s.id ? "1px solid rgba(94,106,210,0.75)" : "1px solid transparent",
                    transition:"all 0.12s",
                  }}>{s.label}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4 style cards */}
      <div style={{display:"flex",gap:8}}>
        {STYLES.map(({id, Preview, label, sub})=>(
          <div key={id} style={cardSt(id)} onClick={()=>setSelected(id)}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.10),transparent)",pointerEvents:"none"}} />
            <Preview font={captFont} color={captColor} />
            <div style={{padding:"8px 10px 10px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:"0.76rem",fontWeight:600,color:"rgba(255,255,255,0.85)",fontFamily:"'Inter',sans-serif"}}>{label}</div>
                <div style={{fontSize:"0.62rem",color:"rgba(255,255,255,0.30)",fontFamily:"'Inter',sans-serif",marginTop:1}}>{sub}</div>
              </div>
              <div style={{
                width:16,height:16,borderRadius:"50%",flexShrink:0,
                border: selected===id ? "1.5px solid #5E6AD2" : "1px solid rgba(255,255,255,0.15)",
                background: selected===id ? "rgba(94,106,210,0.15)" : "transparent",
                display:"flex",alignItems:"center",justifyContent:"center", transition:"all 0.18s",
              }}>
                {selected===id && <span style={{width:6,height:6,borderRadius:"50%",background:"#5E6AD2",display:"block"}} />}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Controls row */}
      <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)",
        borderRadius:"0.8rem", padding:"12px 14px", display:"flex", flexDirection:"column", gap:10 }}>

        {/* Tipografía */}
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <span style={{fontSize:10,color:"rgba(255,255,255,0.45)",fontFamily:"'Inter',sans-serif",letterSpacing:".08em",textTransform:"uppercase",minWidth:70}}>Tipografía</span>
          <div style={{display:"flex",gap:5}}>
            {FONT_OPTS.map(f=>(
              <button key={f.id} onClick={()=>setCaptFont(f.id)} style={{
                padding:"4px 10px", borderRadius:5, border:"none", cursor:"pointer",
                background: captFont===f.id ? "rgba(94,106,210,0.30)" : "rgba(255,255,255,0.06)",
                color: captFont===f.id ? "#fff" : "rgba(255,255,255,0.50)",
                fontFamily:"'Inter',sans-serif", fontSize:11,
                outline: captFont===f.id ? "1px solid rgba(94,106,210,0.55)" : "1px solid transparent",
                transition:"all 0.15s",
              }}>{f.label}</button>
            ))}
          </div>
        </div>

        {/* Color */}
        {selected && (
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:10,color:"rgba(255,255,255,0.45)",fontFamily:"'Inter',sans-serif",letterSpacing:".08em",textTransform:"uppercase",minWidth:70}}>Color</span>
            <div style={{display:"flex",gap:6}}>
              {[{hex:"#FFFFFF",label:"Blanco"},{hex:"#F5C518",label:"Amarillo"}].map(opt=>(
                <button key={opt.hex} onClick={()=>setCaptColor(opt.hex)} style={{
                  display:"flex", alignItems:"center", gap:5,
                  padding:"4px 10px", borderRadius:5, border:"none", cursor:"pointer",
                  background: captColor===opt.hex ? "rgba(94,106,210,0.25)" : "rgba(255,255,255,0.06)",
                  color: captColor===opt.hex ? "#fff" : "rgba(255,255,255,0.50)",
                  fontFamily:"'Inter',sans-serif", fontSize:11,
                  outline: captColor===opt.hex ? "1px solid rgba(94,106,210,0.55)" : "1px solid transparent",
                  transition:"all 0.15s",
                }}>
                  <span style={{width:10,height:10,borderRadius:"50%",background:opt.hex,border:"1px solid rgba(255,255,255,0.2)",flexShrink:0}} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Texto (case) */}
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:10,color:"rgba(255,255,255,0.45)",fontFamily:"'Inter',sans-serif",letterSpacing:".08em",textTransform:"uppercase",minWidth:70}}>Texto</span>
          <div style={{display:"flex",gap:5}}>
            {CASE_OPTS.map(c=>(
              <button key={c.id} onClick={()=>setCaptCase(c.id)} title={c.title} style={{
                width:34, height:26, borderRadius:5, border:"none", cursor:"pointer",
                background: captCase===c.id ? "rgba(94,106,210,0.30)" : "rgba(255,255,255,0.06)",
                color: captCase===c.id ? "#fff" : "rgba(255,255,255,0.45)",
                fontFamily:"'Outfit',sans-serif",
                fontSize: c.id==="upper" ? 11 : c.id==="normal" ? 12 : 10,
                fontWeight: c.id==="upper" ? 800 : c.id==="normal" ? 600 : 400,
                outline: captCase===c.id ? "1px solid rgba(94,106,210,0.55)" : "1px solid transparent",
                transition:"all 0.15s", letterSpacing: c.id==="upper" ? "0.5px" : 0,
              }}>{c.label}</button>
            ))}
          </div>
        </div>

        {/* Tamaño (también accesible fuera del hover) */}
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:10,color:"rgba(255,255,255,0.45)",fontFamily:"'Inter',sans-serif",letterSpacing:".08em",textTransform:"uppercase",minWidth:70}}>Tamaño</span>
          <div style={{display:"flex",gap:5}}>
            {SIZE_OPTS.map(s=>(
              <button key={s.id} onClick={()=>setCaptSize(s.id)} style={{
                width:30, height:26, borderRadius:5, border:"none", cursor:"pointer",
                background: captSize===s.id ? "rgba(94,106,210,0.30)" : "rgba(255,255,255,0.06)",
                color: captSize===s.id ? "#fff" : "rgba(255,255,255,0.50)",
                fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:700,
                outline: captSize===s.id ? "1px solid rgba(94,106,210,0.55)" : "1px solid transparent",
                transition:"all 0.15s",
              }}>{s.label}</button>
            ))}
          </div>
        </div>

        {/* Stroke (contorno de texto) */}
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:10,color:"rgba(255,255,255,0.45)",fontFamily:"'Inter',sans-serif",letterSpacing:".08em",textTransform:"uppercase",minWidth:70}}>Stroke</span>
          <button onClick={()=>setCaptStroke(s=>!s)} style={{
            padding:"4px 12px", borderRadius:5, border:"none", cursor:"pointer",
            background: captStroke ? "rgba(94,106,210,0.30)" : "rgba(255,255,255,0.06)",
            color: captStroke ? "#fff" : "rgba(255,255,255,0.45)",
            fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:600,
            outline: captStroke ? "1px solid rgba(94,106,210,0.55)" : "1px solid transparent",
            transition:"all 0.15s",
          }}>{captStroke ? "ON" : "OFF"}</button>
        </div>

      </div>

      {/* Sonido */}
      {selected && (
        <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)",
          borderRadius:"0.7rem", padding:"10px 14px" }}>
          <div style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,0.60)",fontFamily:"'Inter',sans-serif",marginBottom:7,letterSpacing:".08em",textTransform:"uppercase"}}>Sonido</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {SFX_OPTIONS.map(s=>(
              <button key={s.id} onClick={()=>setSfxPack(s.id)} style={{
                padding:"4px 11px", borderRadius:6, border:"none", cursor:"pointer",
                background: sfxPack===s.id ? "rgba(94,106,210,0.30)" : "rgba(255,255,255,0.06)",
                color: sfxPack===s.id ? "#fff" : "rgba(255,255,255,0.50)",
                fontFamily:"'Inter',sans-serif", fontSize:12,
                outline: sfxPack===s.id ? "1px solid rgba(94,106,210,0.55)" : "1px solid transparent",
                transition:"all 0.15s",
              }}>{s.icon} {s.label}</button>
            ))}
          </div>
        </div>
      )}

      {/* Empezar */}
      <button
        onClick={()=>{ if(selected) onSelect(selected, captColor, true, subPos, captFont, "default", sfxPack, captCase, captSize, captStroke); }}
        disabled={!selected}
        style={{
          width:"100%", padding:"14px", borderRadius:"0.9rem",
          fontFamily:"'Outfit',sans-serif", fontWeight:700, fontSize:14,
          letterSpacing:1.5, cursor: selected ? "pointer" : "not-allowed",
          background: selected ? "linear-gradient(135deg, #4a54c1, #5E6AD2)" : "rgba(255,255,255,0.04)",
          color: selected ? "#fff" : "rgba(255,255,255,0.22)",
          border: selected ? "none" : "1px solid rgba(255,255,255,0.07)",
          boxShadow: selected ? "0 0 0 1px rgba(94,106,210,0.50),0 4px 24px rgba(94,106,210,0.40)" : "none",
          transition:"all 0.22s",
        }}
      >
        EMPEZAR →
      </button>
      <div style={{textAlign:"center", marginTop:16}}>
        <button onClick={onBack} style={{...backBtnStyle,display:"inline-flex",marginBottom:0}}
          onMouseEnter={e=>e.currentTarget.style.color="rgba(255,255,255,0.65)"}
          onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.35)"}
        >
          <ArrowLeft /> Volver
        </button>
      </div>
    </div>
  );
}

// ── Barra de métrica (velocidad / calidad) ──
function ModelBar({ label, value, type }) {
  const barColor = type === "speed"
    ? "linear-gradient(90deg,#34d399,#4ade80)"
    : "linear-gradient(90deg,#5E6AD2,#818cf8)";
  return (
    <div style={{marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
        <span style={{fontSize:"0.63rem",color:"rgba(255,255,255,0.38)",fontFamily:"'Inter',sans-serif",letterSpacing:.3,textTransform:"uppercase"}}>{label}</span>
      </div>
      <div style={{height:3,borderRadius:99,background:"rgba(255,255,255,0.07)"}}>
        <div style={{height:"100%",width:`${value}%`,borderRadius:99,background:barColor,opacity:value<50?0.55:1}} />
      </div>
    </div>
  );
}

// ── Selector de modelo Whisper ──
function WhisperModelPicker({ onSelect, onBack }) {
  const [selected, setSelected] = useStateU(null);

  const cardStyle = (id) => ({
    flex:1, borderRadius:"1.1rem", overflow:"hidden", cursor:"pointer",
    border: selected===id ? "1.5px solid rgba(94,106,210,0.55)" : "1px solid rgba(255,255,255,0.07)",
    background: selected===id ? "rgba(94,106,210,0.05)" : "rgba(255,255,255,0.02)",
    boxShadow: selected===id
      ? "0 0 0 1px rgba(94,106,210,0.20), 0 0 28px rgba(94,106,210,0.12)"
      : "0 0 0 1px rgba(255,255,255,0.04), 0 2px 16px rgba(0,0,0,0.35)",
    transition:"all 0.2s",
    padding:"16px 16px 14px",
    position:"relative",
  });

  const radioStyle = (id) => ({
    width:18, height:18, borderRadius:"50%", flexShrink:0,
    border: selected===id ? "1.5px solid #5E6AD2" : "1px solid rgba(255,255,255,0.15)",
    background: selected===id ? "rgba(94,106,210,0.15)" : "transparent",
    display:"flex", alignItems:"center", justifyContent:"center",
    transition:"all 0.18s",
  });

  return (
    <div>
      {sectionLabel("¿Qué modelo quieres utilizar?")}
      <div style={{display:"flex",gap:10,marginBottom:16}}>

        {/* Whisper Medium */}
        <div style={cardStyle("medium")} onClick={()=>setSelected("medium")}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.10),transparent)",pointerEvents:"none"}} />
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div style={{
              width:38,height:38,borderRadius:"0.65rem",
              background:"rgba(52,211,153,0.10)",border:"1px solid rgba(52,211,153,0.20)",
              display:"flex",alignItems:"center",justifyContent:"center",
              color:"rgba(74,222,128,0.85)",
            }}>
              <BoltIcon />
            </div>
            <div style={radioStyle("medium")}>
              {selected==="medium" && <span style={{width:7,height:7,borderRadius:"50%",background:"#5E6AD2",display:"block"}} />}
            </div>
          </div>
          <div style={{fontSize:"0.82rem",fontWeight:600,color:"rgba(255,255,255,0.85)",fontFamily:"'Inter',sans-serif",marginBottom:2}}>Whisper Medium</div>
          <div style={{fontSize:"0.67rem",color:"rgba(255,255,255,0.32)",fontFamily:"'Inter',sans-serif",marginBottom:14,lineHeight:1.4}}>
            Velocidad rápida · Calidad buena
          </div>
          <ModelBar label="Velocidad" value={88} type="speed" />
          <ModelBar label="Calidad"   value={68} type="quality" />
        </div>

        {/* Whisper Large V3 */}
        <div style={cardStyle("large-v3")} onClick={()=>setSelected("large-v3")}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.10),transparent)",pointerEvents:"none"}} />
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div style={{
              width:38,height:38,borderRadius:"0.65rem",
              background:"rgba(94,106,210,0.12)",border:"1px solid rgba(94,106,210,0.22)",
              display:"flex",alignItems:"center",justifyContent:"center",
              color:"rgba(148,155,236,0.90)",
            }}>
              <DiamondIcon />
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{
                fontSize:"0.54rem",fontFamily:"'Outfit',sans-serif",fontWeight:700,
                letterSpacing:"0.10em",textTransform:"uppercase",
                color:"rgba(148,155,236,0.85)",
                background:"rgba(94,106,210,0.12)",border:"1px solid rgba(94,106,210,0.25)",
                borderRadius:99,padding:"2px 7px",
              }}>TOP</span>
              <div style={radioStyle("large-v3")}>
                {selected==="large-v3" && <span style={{width:7,height:7,borderRadius:"50%",background:"#5E6AD2",display:"block"}} />}
              </div>
            </div>
          </div>
          <div style={{fontSize:"0.82rem",fontWeight:600,color:"rgba(255,255,255,0.85)",fontFamily:"'Inter',sans-serif",marginBottom:2}}>Whisper Large V3</div>
          <div style={{fontSize:"0.67rem",color:"rgba(255,255,255,0.32)",fontFamily:"'Inter',sans-serif",marginBottom:14,lineHeight:1.4}}>
            Velocidad media · Calidad extrema
          </div>
          <ModelBar label="Velocidad" value={42} type="speed" />
          <ModelBar label="Calidad"   value={100} type="quality" />
        </div>

      </div>
      <button
        onClick={()=>{ if(selected) onSelect(selected); }}
        disabled={!selected}
        style={{
          width:"100%", padding:"14px", borderRadius:"0.9rem",
          fontFamily:"'Outfit',sans-serif", fontWeight:700, fontSize:14,
          letterSpacing:1.5, cursor: selected ? "pointer" : "not-allowed",
          background: selected ? "linear-gradient(135deg, #4a54c1, #5E6AD2)" : "rgba(255,255,255,0.04)",
          color: selected ? "#fff" : "rgba(255,255,255,0.22)",
          border: selected ? "none" : "1px solid rgba(255,255,255,0.07)",
          boxShadow: selected
            ? "0 0 0 1px rgba(94,106,210,0.50), 0 4px 24px rgba(94,106,210,0.40), inset 0 1px 0 rgba(255,255,255,0.12)"
            : "none",
          transition:"all 0.22s",
        }}
      >
        EMPEZAR →
      </button>
      <div style={{textAlign:"center", marginTop:44}}>
        <button onClick={onBack} style={{...backBtnStyle,display:"inline-flex",marginBottom:0}}
          onMouseEnter={e=>e.currentTarget.style.color="rgba(255,255,255,0.65)"}
          onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.35)"}
        >
          <ArrowLeft /> Volver
        </button>
      </div>
    </div>
  );
}

// ── Selector de tipo de contenido ──
function ContentTypeSelector({ onSelect, onBack }) {
  return (
    <div>
      {sectionLabel("¿Qué tipo de contenido?")}
      <div style={{display:"flex",gap:12}}>
        <ModeCard
          icon={<PortraitIcon/>}
          title="Contenido Vertical"
          desc="Shorts, Reels, TikTok — formato 9:16 con subtítulos y auto clips"
          onClick={()=>onSelect('vertical')}
        />
        <ModeCard
          icon={<LandscapeIcon/>}
          title="Contenido Horizontal"
          desc="YouTube, Documental, Podcast — formato 16:9 con subtítulos"
          onClick={()=>onSelect('horizontal')}
        />
      </div>
      <div style={{textAlign:"center", marginTop:44}}>
        <button onClick={onBack} style={{...backBtnStyle,display:"inline-flex",marginBottom:0}}
          onMouseEnter={e=>e.currentTarget.style.color="rgba(255,255,255,0.65)"}
          onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.35)"}
        >
          <ArrowLeft /> Volver
        </button>
      </div>
    </div>
  );
}

// ── Tarjeta de sector (disponible o bloqueada) ── diseño horizontal
function SectorCard({ icon, number, title, desc, available, onClick }) {
  const [hover, setHover] = useStateU(false);
  const active = available && hover;
  return (
    <div
      onClick={available ? onClick : undefined}
      onMouseEnter={()=>setHover(true)}
      onMouseLeave={()=>setHover(false)}
      style={{
        borderRadius:"1.3rem", padding:"26px 32px",
        cursor: available ? "pointer" : "default",
        background: active ? "rgba(94,106,210,0.08)" : available ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.015)",
        border: active ? "1px solid rgba(94,106,210,0.35)" : available ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.04)",
        backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
        transition:"all 0.22s ease",
        boxShadow: active
          ? "0 0 0 1px rgba(255,255,255,0.10), 0 12px 50px rgba(0,0,0,0.55), 0 0 80px rgba(94,106,210,0.12)"
          : "0 0 0 1px rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.35)",
        display:"flex", flexDirection:"row", alignItems:"center", gap:26,
        opacity: available ? 1 : 0.42,
        position:"relative", overflow:"hidden",
      }}
    >
      {/* top edge highlight */}
      <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.09),transparent)",pointerEvents:"none"}} />

      {/* Icono */}
      <div style={{
        width:66, height:66, borderRadius:"1.1rem", flexShrink:0,
        background: active ? "rgba(94,106,210,0.15)" : "rgba(255,255,255,0.05)",
        border:"1px solid rgba(255,255,255,0.08)",
        display:"flex", alignItems:"center", justifyContent:"center",
        color: active ? "#7C85E0" : "rgba(255,255,255,0.55)",
        transition:"all 0.22s", fontSize:26,
        boxShadow: active ? "0 0 20px rgba(94,106,210,0.20)" : "none",
      }}>
        {icon}
      </div>

      {/* Texto */}
      <div style={{flex:1, minWidth:0, textAlign:"center"}}>
        <div style={{fontSize:"0.68rem",color:"rgba(255,255,255,0.25)",fontFamily:"'Outfit',sans-serif",fontWeight:500,letterSpacing:"0.18em",textTransform:"uppercase",marginBottom:5}}>
          {String(number).padStart(2,"0")}
        </div>
        <div style={{fontSize:"1.1rem",fontWeight:600,color:active?"#EDEDEF":"rgba(255,255,255,0.80)",fontFamily:"'Inter',sans-serif",marginBottom:5,transition:"color 0.22s"}}>
          {title}
        </div>
        <div style={{fontSize:"0.80rem",color:"rgba(255,255,255,0.35)",fontFamily:"'Inter',sans-serif",lineHeight:1.5}}>
          {desc}
        </div>
      </div>

      {/* Derecha */}
      <div style={{flexShrink:0, width:110, display:"flex", justifyContent:"flex-end", alignItems:"center"}}>
        {!available ? (
          <span style={{
            fontSize:9, letterSpacing:1.6,
            color:"rgba(255,255,255,0.28)",
            fontFamily:"'Outfit',sans-serif", fontWeight:600,
            padding:"5px 11px",
            background:"rgba(255,255,255,0.04)",
            borderRadius:99,
            border:"1px solid rgba(255,255,255,0.08)",
            textTransform:"uppercase", whiteSpace:"nowrap",
          }}>Próximamente</span>
        ) : (
          <span style={{
            fontSize:22,
            color: active ? "rgba(124,133,224,0.90)" : "rgba(255,255,255,0.18)",
            transition:"all 0.22s",
            display:"inline-block",
            transform: active ? "translateX(5px)" : "translateX(0)",
          }}>→</span>
        )}
      </div>
    </div>
  );
}

// ── Panel de Transcripción de Audio/Vídeo ───────────────────────────────────
const TRANS_STEPS = ["Archivo recibido", "Cargando modelo Whisper", "Transcribiendo audio", "Generando SRT y TXT"];

function TranscribePanel({ onBack }) {
  const [phase,    setPhase]    = useStateU("idle");   // idle | processing | done | error
  const [step,     setStep]     = useStateU(-1);
  const [bar,      setBar]      = useStateU(0);
  const [fileName, setFileName] = useStateU(null);
  const [jobId,    setJobId]    = useStateU(null);
  const [error,    setError]    = useStateU("");
  const [model,    setModel]    = useStateU("medium");
  const [result,   setResult]   = useStateU(null);
  const [copied,   setCopied]   = useStateU(false);
  const [dragOver, setDragOver] = useStateU(false);
  const esRef        = useRefU(null);
  const inputRef     = useRefU(null);
  const timerRef     = useRefU(null);  // fake-progress timer durante transcripción

  const clearTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const reset = () => {
    clearTimer();
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    setPhase("idle"); setStep(-1); setBar(0); setFileName(null);
    setJobId(null); setError(""); setResult(null); setCopied(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const start = useCallbackU(async (file) => {
    setFileName(file.name); setPhase("processing"); setStep(0); setBar(4);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("whisper_model", model);
    let jId;
    try {
      const r = await fetch("/upload-transcribe", { method:"POST", body:fd });
      const d = await r.json(); jId = d.job_id; setJobId(jId);
    } catch(e) { setPhase("error"); setError("No se pudo conectar con el servidor."); return; }

    const es = new EventSource(`/progress-transcribe/${jId}`);
    esRef.current = es;
    es.onmessage = (e) => {
      const msg = e.data; if (msg === "KEEPALIVE") return;
      if (msg === "CANCELLED") { clearTimer(); es.close(); esRef.current=null; reset(); return; }

      if (msg.startsWith("TSTEP:1")) {
        // Cargando modelo — rápido, sube a ~12%
        setStep(1); setBar(12);
        return;
      }
      if (msg.startsWith("TSTEP:2")) {
        // Transcribiendo — aquí está el trabajo gordo, arranca el timer
        setStep(2); setBar(18);
        clearTimer();
        timerRef.current = setInterval(() => {
          setBar(prev => {
            if (prev >= 88) return prev;
            // Sube rápido al principio, cada vez más lento conforme se acerca a 88%
            const inc = prev < 45 ? 1.8 : prev < 65 ? 0.9 : prev < 80 ? 0.4 : 0.15;
            return Math.min(88, +(prev + inc).toFixed(2));
          });
        }, 3000); // cada 3 segundos
        return;
      }
      if (msg.startsWith("TSTEP:3")) {
        // Generando ficheros — transcripción ya terminó, sube a 93%
        clearTimer();
        setStep(3); setBar(93);
        return;
      }
      if (msg.startsWith("TDONE")) {
        clearTimer();
        es.close(); esRef.current=null; setBar(100); setStep(99);
        fetch(`/transcribe-result/${jId}`).then(r=>r.json()).then(d=>{
          setResult(d); setPhase("done");
        }).catch(()=>{ setPhase("error"); setError("No se pudo leer el resultado."); });
        return;
      }
      if (msg.startsWith("ERROR:")) { clearTimer(); es.close(); esRef.current=null; setPhase("error"); setError(msg.replace("ERROR:","")); }
    };
    es.onerror = () => { clearTimer(); es.close(); esRef.current=null; setPhase("error"); setError("Conexión cortada — revisa que el servidor siga corriendo."); };
  }, [model]);

  const onFiles = (files) => {
    const f = files[0]; if (!f) return;
    const ok = f.type.startsWith("video/") || f.type.startsWith("audio/")
            || /\.(mp4|mov|mkv|avi|webm|mp3|wav|m4a|aac|ogg|flac)$/i.test(f.name);
    if (!ok) return;
    start(f);
  };

  const fmtDur = (s) => { const m=Math.floor(s/60), sec=Math.round(s%60); return `${m}:${String(sec).padStart(2,"0")}`; };

  // ── IDLE: dropzone ──
  if (phase === "idle") {
    const id = "transcribe-file-input";
    return (
      <div>
        {sectionLabel("Transcripción de Audio/Vídeo")}
        <div style={{maxWidth:560, margin:"0 auto"}}>
          <p style={{textAlign:"center", color:"rgba(255,255,255,0.42)", fontFamily:"'Inter',sans-serif", fontSize:13, marginBottom:22, lineHeight:1.6}}>
            Sube un vídeo o audio y obtén la transcripción en <b style={{color:"rgba(255,255,255,0.7)"}}>SRT</b> (subtítulos con tiempos) y <b style={{color:"rgba(255,255,255,0.7)"}}>TXT</b> (texto plano).
          </p>

          {/* Selector de modelo */}
          <div style={{display:"flex", gap:8, justifyContent:"center", marginBottom:18}}>
            {[{id:"medium",label:"Whisper Medium",sub:"Rápido"},{id:"large-v3",label:"Whisper Large V3",sub:"Máxima calidad"}].map(m=>(
              <button key={m.id} onClick={()=>setModel(m.id)} style={{
                flex:1, padding:"12px 14px", borderRadius:12, cursor:"pointer", textAlign:"left",
                background: model===m.id ? "rgba(94,106,210,0.18)" : "rgba(255,255,255,0.04)",
                border: model===m.id ? "1.5px solid rgba(94,106,210,0.70)" : "1px solid rgba(255,255,255,0.10)",
                transition:"all 0.18s",
                boxShadow: model===m.id ? "0 0 0 1px rgba(94,106,210,0.25), 0 2px 12px rgba(94,106,210,0.20)" : "none",
              }}>
                <div style={{display:"flex", alignItems:"center", gap:6, marginBottom:3}}>
                  {model===m.id && <span style={{width:7,height:7,borderRadius:"50%",background:"#5E6AD2",display:"inline-block",flexShrink:0}} />}
                  <div style={{fontSize:13, fontWeight:700, color: model===m.id ? "#fff" : "rgba(255,255,255,0.60)", fontFamily:"'Inter',sans-serif"}}>{m.label}</div>
                </div>
                <div style={{fontSize:11, color: model===m.id ? "rgba(148,155,236,0.80)" : "rgba(255,255,255,0.28)", fontFamily:"'Inter',sans-serif"}}>{m.sub}</div>
              </button>
            ))}
          </div>

          {/* Dropzone (acepta audio + vídeo) */}
          <input ref={inputRef} id={id} type="file" accept="video/*,audio/*,.mp4,.mov,.mkv,.mp3,.wav,.m4a,.aac,.ogg,.flac" onChange={(e)=>{if(e.target.files.length)onFiles(e.target.files);}} style={{display:"none"}} />
          <div
            onClick={()=>inputRef.current?.click()}
            onDrop={(e)=>{e.preventDefault();setDragOver(false);if(e.dataTransfer.files.length)onFiles(e.dataTransfer.files);}}
            onDragOver={(e)=>{e.preventDefault();setDragOver(true);}}
            onDragLeave={(e)=>{e.preventDefault();setDragOver(false);}}
            style={{
              display:"block", cursor:"pointer", textAlign:"center", padding:"40px 24px", borderRadius:"1.4rem",
              border: dragOver ? "1px dashed rgba(94,106,210,0.55)" : "1px dashed rgba(255,255,255,0.12)",
              background: dragOver ? "rgba(94,106,210,0.05)" : "rgba(255,255,255,0.02)", transition:"all 0.2s",
            }}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
              <div style={{width:56,height:56,borderRadius:"0.9rem",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center",color:dragOver?"#5E6AD2":"rgba(255,255,255,0.55)"}}>
                <UploadIcon />
              </div>
              <div style={{fontSize:"0.92rem",fontWeight:600,color:"#EDEDEF",fontFamily:"'Inter',sans-serif"}}>Suelta el archivo aquí</div>
              <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,0.32)",fontFamily:"'Inter',sans-serif"}}>
                Vídeo o audio &nbsp;·&nbsp; <span style={{color:"#5E6AD2"}}>MP4 · MOV · MP3 · WAV · M4A</span>
              </div>
            </div>
          </div>
        </div>
        <div style={{textAlign:"center", marginTop:40}}>
          <button onClick={onBack} style={{...backBtnStyle,display:"inline-flex",marginBottom:0}}
            onMouseEnter={e=>e.currentTarget.style.color="rgba(255,255,255,0.65)"}
            onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.35)"}>
            <ArrowLeft /> Volver
          </button>
        </div>
      </div>
    );
  }

  // ── PROCESSING ──
  if (phase === "processing") {
    return (
      <div style={{maxWidth:480, width:"100%", margin:"0 auto", textAlign:"center"}}>
        <div style={{
          fontSize:"clamp(22px, 3vw, 48px)",
          letterSpacing:"-0.02em",
          color:"rgba(148,155,236,0.95)",
          fontFamily:"'Outfit',sans-serif", fontWeight:800,
          marginBottom:32, textTransform:"uppercase",
          lineHeight:1.05, textAlign:"center",
          textShadow:"0 0 60px rgba(124,133,224,0.35)",
          width:"100%",
        }}>Transcribiendo</div>
        <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",fontFamily:"'Inter',sans-serif",textAlign:"center",marginBottom:24,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{fileName}</div>
        <div style={{display:"flex",flexDirection:"column",gap:13,padding:"0 20px"}}>
          {TRANS_STEPS.map((label,i)=>(
            <StepRow key={i} label={label} state={ step>=99 ? "done" : i<step?"done":i===step?"active":"pending" } />
          ))}
        </div>
        <ProgressBar width={bar} showPct={true} />
        <div style={{textAlign:"center", marginTop:30}}>
          <button onClick={()=>{ if(jobId) fetch(`/api/cancel/${jobId}`,{method:"POST"}); reset(); }} style={{...backBtnStyle,display:"inline-flex",marginBottom:0}}>Cancelar</button>
        </div>
      </div>
    );
  }

  // ── ERROR ──
  if (phase === "error") {
    return (
      <div style={{maxWidth:460, margin:"0 auto", textAlign:"center"}}>
        {sectionLabel("Error")}
        <div style={{padding:"18px 20px", background:"rgba(255,93,108,0.08)", border:"1px solid rgba(255,93,108,0.25)", borderRadius:14, color:"rgba(255,180,185,0.9)", fontFamily:"'Inter',sans-serif", fontSize:13, lineHeight:1.6}}>{error}</div>
        <button onClick={reset} style={{...backBtnStyle,display:"inline-flex",marginTop:26}}><ArrowLeft /> Reintentar</button>
      </div>
    );
  }

  // ── DONE ──
  return (
    <div style={{maxWidth:640, margin:"0 auto"}}>
      {sectionLabel("Transcripción lista")}

      {/* Preview del texto — solo si hay contenido */}
      {result?.preview && (
        <div style={{
          position:"relative", maxHeight:260, overflow:"auto", padding:"18px 20px", borderRadius:14,
          background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)",
          fontFamily:"'Inter',sans-serif", fontSize:13.5, lineHeight:1.7, color:"rgba(255,255,255,0.78)", marginBottom:18,
        }}>
          {result.preview}
        </div>
      )}

      {/* Botones de descarga */}
      <div style={{display:"flex", gap:10, justifyContent:"center"}}>
        <a href={`/download-transcribe/${jobId}/srt`} download style={{
          display:"inline-flex",alignItems:"center",gap:8, padding:"13px 22px", borderRadius:12, textDecoration:"none",
          background:"linear-gradient(135deg,#4a54c1,#5E6AD2)", color:"#fff", fontFamily:"'Outfit',sans-serif", fontWeight:700, fontSize:13,
          boxShadow:"0 4px 20px rgba(94,106,210,0.35)",
        }}><DownloadIcon /> Descargar SRT</a>
        <a href={`/download-transcribe/${jobId}/txt`} download style={{
          display:"inline-flex",alignItems:"center",gap:8, padding:"13px 22px", borderRadius:12, textDecoration:"none",
          background:"rgba(255,255,255,0.05)", color:"rgba(255,255,255,0.8)", border:"1px solid rgba(255,255,255,0.12)", fontFamily:"'Outfit',sans-serif", fontWeight:700, fontSize:13,
        }}><DownloadIcon /> Descargar TXT</a>
        <button onClick={()=>{ navigator.clipboard?.writeText(result?.full_text||"").then(()=>{setCopied(true);setTimeout(()=>setCopied(false),1600);}); }} style={{
          display:"inline-flex",alignItems:"center",gap:8, padding:"13px 18px", borderRadius:12, cursor:"pointer",
          background:"rgba(255,255,255,0.05)", color: copied?"#4ade80":"rgba(255,255,255,0.8)", border:"1px solid rgba(255,255,255,0.12)", fontFamily:"'Outfit',sans-serif", fontWeight:700, fontSize:13,
        }}>{copied ? "✓ Copiado" : "Copiar texto"}</button>
      </div>

      <div style={{textAlign:"center", marginTop:34}}>
        <button onClick={reset} style={{...backBtnStyle,display:"inline-flex",marginBottom:0}}><ArrowLeft /> Transcribir otro archivo</button>
      </div>
    </div>
  );
}

// ── Selector de sector ──
function SectorSelector({ onSelect, onBack }) {
  return (
    <div>
      {sectionLabel("¿En qué quieres trabajar?")}
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <SectorCard
          number={1}
          icon="✂"
          title="Shorts & Subtítulos"
          desc="Añade captions automáticos y genera clips virales con IA"
          available={true}
          onClick={()=>onSelect('shorts')}
        />
        <SectorCard
          number={2}
          icon="✎"
          title="Transcripción de Audio/Vídeo"
          desc="Transcribe cualquier vídeo o audio y descárgalo en SRT y TXT"
          available={true}
          onClick={()=>onSelect('transcribe')}
        />
        <SectorCard
          number={3}
          icon="⇌"
          title="Sincronizar Audio"
          desc="Alinea automáticamente el audio de OBS con el video de tu cámara"
          available={true}
          onClick={()=>onSelect('sync')}
        />
        <SectorCard
          number={4}
          icon="◫"
          title="Gestión de Proyectos"
          desc="Organiza tus vídeos, assets y exportaciones en un solo lugar"
          available={false}
        />
        <SectorCard
          number={5}
          icon="⬡"
          title="Motion Graphic Animations"
          desc="Crea motion graphics y animaciones para tus vídeos con HyperFrames"
          available={false}
        />
      </div>
      {/* Volver — debajo de las tarjetas */}
      <div style={{textAlign:"center", marginTop:44}}>
        <button onClick={onBack} style={{...backBtnStyle,display:"inline-flex",marginBottom:0}}
          onMouseEnter={e=>e.currentTarget.style.color="rgba(255,255,255,0.65)"}
          onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.35)"}
        >
          <ArrowLeft /> Volver
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
function Uploader({ delay = 0, onDone, onBack }) {
  const ShinyButton = window.ShinyButton;
  const AudioSync   = window.AudioSync;
  const [sector,      setSector]      = useStateU(null); // null | 'picking' | 'shorts'
  const [contentType, setContentType] = useStateU(null); // null | 'vertical' | 'horizontal'
  const [mode, setMode] = useStateU(null);               // null | 'subtitles' | 'clips'

  // Subtítulos
  const [subPhase,  setSubPhase]  = useStateU("idle");
  const [subStep,   setSubStep]   = useStateU(-1);
  const [subBar,    setSubBar]    = useStateU(0);
  const [subFile,   setSubFile]   = useStateU(null);
  const [subJobId,  setSubJobId]  = useStateU(null);
  const [subError,  setSubError]  = useStateU("");

  // Clips
  const [clipPhase,    setClipPhase]    = useStateU("idle");
  const [clipStep,     setClipStep]     = useStateU(-1);
  const [clipBar,      setClipBar]      = useStateU(0);
  const [clipFile,     setClipFile]     = useStateU(null);
  const [clipJobId,    setClipJobId]    = useStateU(null);
  const [clipError,    setClipError]    = useStateU("");
  const [totalClips,   setTotalClips]   = useStateU(0);
  const [curClipIdx,   setCurClipIdx]   = useStateU(0);
  const [curClipTitle, setCurClipTitle] = useStateU("");
  const [doneClips,    setDoneClips]    = useStateU([]);

  // Clips: sub-selección
  const [clipVideoType, setClipVideoType] = useStateU(null);
  const [clipPipPos,    setClipPipPos]    = useStateU('bottom-right');
  const [clipDurRange,  setClipDurRange]  = useStateU('medium');

  // Style picker + color picker + model picker
  const [pendingFile,   setPendingFile]   = useStateU(null);
  const [pendingMode,   setPendingMode]   = useStateU(null);
  const [pendingStyle,  setPendingStyle]  = useStateU(null); // set after style, before model
  const [pendingColor,  setPendingColor]  = useStateU("#FFE033");
  const pendingColorRef = useRefU("#FFE033"); // ref síncrono — evita stale closure al leer color
  const [pendingZoom,   setPendingZoom]   = useStateU(true);
  const pendingZoomRef  = useRefU(true);
  const [pendingPos,    setPendingPos]    = useStateU(15);
  const pendingPosRef   = useRefU(15);
  const [pendingFont,   setPendingFont]   = useStateU("outfit");
  const pendingFontRef  = useRefU("outfit");
  const [pendingAnim,   setPendingAnim]   = useStateU("default");
  const pendingAnimRef  = useRefU("default");
  const [pendingSfx,    setPendingSfx]    = useStateU("none");
  const pendingSfxRef   = useRefU("none");
  const [pendingCase,   setPendingCase]   = useStateU("lower");
  const pendingCaseRef  = useRefU("lower");
  const [pendingSize,   setPendingSize]   = useStateU(100);
  const pendingSizeRef  = useRefU(100);
  const [pendingStroke, setPendingStroke] = useStateU(false);
  const pendingStrokeRef = useRefU(false);
  const [captionStyle,  setCaptionStyle]  = useStateU(null);
  const [whisperModel,  setWhisperModel]  = useStateU(null);
  const [pendingVideoURL, setPendingVideoURL] = useStateU(null);
  const pendingVideoURLRef = useRefU(null);
  const [videoReadyPhase,  setVideoReadyPhase]  = useStateU(null); // null | "preview"

  // Re-render state (tras APLICAR CAMBIOS en VideoEditor)
  const [rerendering,      setRerendering]      = useStateU(false);
  const [rerenderProgress, setRerenderProgress] = useStateU(0);
  const rrEsRef = useRefU(null);

  const [dragOver, setDragOver] = useStateU(false);
  const inputRef  = useRefU(null);
  const subEsRef        = useRefU(null); // EventSource activo para subtítulos
  const clipEsRef       = useRefU(null); // EventSource activo para clips
  const renderTimerRef  = useRefU(null); // Timer de animación para el paso de render
  const subTimerRef     = useRefU(null); // Fake-progress timer durante transcripción de subtítulos
  const clipTimerRef    = useRefU(null); // Fake-progress timer durante transcripción de clips

  // ── Animación client-side para el paso de render (step 4) ──
  // Si el backend no envía RENDER_PCT, el bar sube igualmente de forma gradual
  useEffectU(() => {
    if (subStep === 4 && subPhase === "processing") {
      // Limpiar timer previo si existe
      if (renderTimerRef.current) clearInterval(renderTimerRef.current);
      renderTimerRef.current = setInterval(() => {
        setSubBar(prev => {
          if (prev >= 96) { clearInterval(renderTimerRef.current); return 96; }
          return prev + 0.1; // ~115s de 50 a 96 — fallback si no llegan RENDER_PCT
        });
      }, 250);
    } else {
      if (renderTimerRef.current) { clearInterval(renderTimerRef.current); renderTimerRef.current = null; }
    }
    return () => { if (renderTimerRef.current) clearInterval(renderTimerRef.current); };
  }, [subStep, subPhase]);

  // ── Reset completo → vuelve a ContentTypeSelector ──
  const resetAll = () => {
    if (rrEsRef.current) { rrEsRef.current.close(); rrEsRef.current = null; }
    setRerendering(false); setRerenderProgress(0);
    setSector(null);
    onBack && onBack();
    setContentType(null);
    setMode(null);
    if(subTimerRef.current)  { clearInterval(subTimerRef.current);  subTimerRef.current  = null; }
    if(clipTimerRef.current) { clearInterval(clipTimerRef.current); clipTimerRef.current = null; }
    setSubPhase("idle"); setSubStep(-1); setSubBar(0); setSubFile(null); setSubJobId(null); setSubError("");
    setClipPhase("idle"); setClipStep(-1); setClipBar(0); setClipFile(null); setClipJobId(null); setClipError("");
    setTotalClips(0); setCurClipIdx(0); setCurClipTitle(""); setDoneClips([]);
    setClipVideoType(null); setClipPipPos('bottom-right'); setClipDurRange('medium');
    setPendingFile(null); setPendingMode(null); setPendingStyle(null); setPendingColor("#FFE033"); setPendingZoom(true); pendingZoomRef.current=true; setPendingPos(15); pendingPosRef.current=15; setPendingFont("outfit"); pendingFontRef.current="outfit"; setPendingAnim("default"); pendingAnimRef.current="default"; setPendingSfx("none"); pendingSfxRef.current="none"; setPendingCase("lower"); pendingCaseRef.current="lower"; setPendingSize(100); pendingSizeRef.current=100; setCaptionStyle(null); setWhisperModel(null);
    if(pendingVideoURLRef.current) { URL.revokeObjectURL(pendingVideoURLRef.current); pendingVideoURLRef.current = null; }
    setPendingVideoURL(null); setVideoReadyPhase(null);
    setDragOver(false);
    if(inputRef.current) inputRef.current.value="";
  };

  // ── Vuelve a la selección de modo (permanece en vertical) ──
  const backToModeSelect = () => {
    setMode(null);
    setPendingFile(null); setPendingMode(null);
    if(pendingVideoURLRef.current) { URL.revokeObjectURL(pendingVideoURLRef.current); pendingVideoURLRef.current = null; }
    setPendingVideoURL(null); setVideoReadyPhase(null);
    setDragOver(false);
    if(inputRef.current) inputRef.current.value="";
  };

  // ── Upload subtítulos ──
  const startSub = useCallbackU(async (file, style, orientation = "vertical", wModel = "medium", highlightColor = "#FFE033", enableZoom = true, captionPos = 15, font = "outfit", anim = "default", captCase = "lower", captSize = 100, captStroke = false) => {
    setSubFile(file.name); setSubPhase("processing"); setSubStep(0); setSubBar(5);
    const fd=new FormData();
    fd.append("file", file);
    fd.append("caption_style", style || "style1");
    fd.append("orientation", orientation);
    fd.append("whisper_model", wModel);
    fd.append("highlight_color", highlightColor);
    fd.append("enable_zoom", enableZoom ? "true" : "false");
    fd.append("caption_pos", String(captionPos));
    fd.append("caption_font", font);
    fd.append("caption_anim", anim);
    fd.append("caption_case", captCase);
    fd.append("caption_size", String(captSize));
    fd.append("caption_stroke", captStroke ? "true" : "false");
    let jId;
    try { const r=await fetch("/upload",{method:"POST",body:fd}); const d=await r.json(); jId=d.job_id; setSubJobId(jId); }
    catch(e){ setSubPhase("error"); setSubError("No se pudo conectar."); return; }
    const es=new EventSource(`/progress/${jId}`);
    subEsRef.current = es;
    es.onmessage=(e)=>{
      const msg=e.data; if(msg==="KEEPALIVE") return;
      if(msg==="CANCELLED"){
        if(subTimerRef.current){ clearInterval(subTimerRef.current); subTimerRef.current=null; }
        es.close(); subEsRef.current=null; setSubPhase("idle"); setSubStep(-1); setSubBar(0); setSubFile(null); setSubJobId(null); return;
      }
      if(msg.startsWith("RENDER_PCT:")){
        const rawPct=parseInt(msg.replace("RENDER_PCT:",""),10);
        if(!isNaN(rawPct)){
          // Remap 92-99 → 50-96 para dar al render más espacio visual
          const displayPct = Math.round(50 + (rawPct - 92) / (99 - 92) * (96 - 50));
          setSubBar(Math.max(50, Math.min(96, displayPct)));
        }
        return;
      }
      // STEP:2 = Transcribiendo — la parte pesada, arranca el timer
      if(msg.startsWith("STEP:2")){
        if(subTimerRef.current) clearInterval(subTimerRef.current);
        setSubStep(1); setSubBar(10);
        subTimerRef.current = setInterval(()=>{
          setSubBar(prev=>{
            if(prev>=40) return prev;
            const inc = prev<22 ? 0.7 : prev<32 ? 0.3 : 0.1;
            return Math.min(40, +(prev+inc).toFixed(2));
          });
        }, 3000);
        return;
      }
      // Cualquier step posterior para el timer de transcripción
      if(msg.startsWith("STEP:3")||msg.startsWith("STEP:4")||msg.startsWith("STEP:5")){
        if(subTimerRef.current){ clearInterval(subTimerRef.current); subTimerRef.current=null; }
      }
      for(const [k,i] of Object.entries(SUB_STEP_MAP)) if(msg.startsWith(k)){ setSubStep(i); setSubBar(SUB_BAR_MAP[i]||10); return; }
      if(msg.startsWith("DONE")){
        if(subTimerRef.current){ clearInterval(subTimerRef.current); subTimerRef.current=null; }
        es.close(); subEsRef.current=null; setSubStep(99); setSubBar(100); setTimeout(()=>{ setSubPhase("done"); onDone && onDone(); },500); return;
      }
      if(msg.startsWith("ERROR:")){
        if(subTimerRef.current){ clearInterval(subTimerRef.current); subTimerRef.current=null; }
        es.close(); subEsRef.current=null; setSubPhase("error"); setSubError(msg.replace("ERROR:",""));
      }
    };
    es.onerror=()=>{
      if(subTimerRef.current){ clearInterval(subTimerRef.current); subTimerRef.current=null; }
      es.close(); subEsRef.current=null; setSubPhase("error"); setSubError("Conexión cortada — revisa que el servidor siga corriendo.");
    };
  },[]);

  // ── Upload clips ──
  const startClips = useCallbackU(async (file, style, wModel = "medium", highlightColor = "#FFE033", sfxPack = "none") => {
    setClipFile(file.name); setClipPhase("processing"); setClipStep(0); setClipBar(5);
    const fd=new FormData();
    fd.append("file", file);
    fd.append("video_type",      clipVideoType || "generic");
    fd.append("pip_position",    clipPipPos);
    fd.append("caption_style",   style || "style1");
    fd.append("clip_dur_range",  clipDurRange);
    fd.append("whisper_model",   wModel);
    fd.append("highlight_color", highlightColor);
    fd.append("sfx_pack",        sfxPack);
    let jId;
    try { const r=await fetch("/upload-clips",{method:"POST",body:fd}); const d=await r.json(); jId=d.job_id; setClipJobId(jId); }
    catch(e){ setClipPhase("error"); setClipError("No se pudo conectar."); return; }
    const es=new EventSource(`/progress-clips/${jId}`);
    clipEsRef.current = es;
    es.onmessage=(e)=>{
      const msg=e.data; if(msg==="KEEPALIVE") return;
      if(msg==="CANCELLED"){
        if(clipTimerRef.current){ clearInterval(clipTimerRef.current); clipTimerRef.current=null; }
        es.close(); clipEsRef.current=null; setClipPhase("idle"); setClipStep(-1); setClipBar(0); setClipFile(null); setClipJobId(null); setTotalClips(0); setCurClipIdx(0); setCurClipTitle(""); return;
      }
      if(msg.startsWith("CSTEP:1")){ setClipStep(0); setClipBar(6); return; }
      if(msg.startsWith("CSTEP:2")){
        // Transcribiendo vídeo completo — parte lenta, arranca timer
        if(clipTimerRef.current) clearInterval(clipTimerRef.current);
        setClipStep(1); setClipBar(12);
        clipTimerRef.current = setInterval(()=>{
          setClipBar(prev=>{
            if(prev>=28) return prev;
            const inc = prev<20 ? 1.0 : 0.4;
            return Math.min(28, +(prev+inc).toFixed(2));
          });
        }, 3000);
        return;
      }
      if(msg.startsWith("CSTEP:3")){
        if(clipTimerRef.current){ clearInterval(clipTimerRef.current); clipTimerRef.current=null; }
        setClipStep(2); setClipBar(32); return;
      }
      if(msg.startsWith("CSTEP:4:")){ const n=parseInt(msg.split(":")[2])||0; setTotalClips(n); setClipStep(3); setClipBar(36); return; }
      if(msg.startsWith("CCLIP:")){
        const p=msg.split(":"); const ci=parseInt(p[1])||1; const cn=parseInt(p[2])||1; const t=p.slice(3).join(":");
        setCurClipIdx(ci); setTotalClips(cn); setCurClipTitle(t);
        setClipStep(4);
        setClipBar(36+Math.round(((ci-1)/cn)*58)); return;
      }
      if(msg.startsWith("CCLIP_DONE:")){ const p=msg.split(":"); setClipBar(36+Math.round((parseInt(p[1])||1)/(parseInt(p[2])||1)*58)); return; }
      if(msg.startsWith("CDONE:")){
        if(clipTimerRef.current){ clearInterval(clipTimerRef.current); clipTimerRef.current=null; }
        es.close(); clipEsRef.current=null; setClipBar(100);
        try{ setDoneClips(JSON.parse(msg.replace("CDONE:","")));} catch(_){}
        setTimeout(()=>setClipPhase("done"),500); return;
      }
      if(msg.startsWith("ERROR:")){
        if(clipTimerRef.current){ clearInterval(clipTimerRef.current); clipTimerRef.current=null; }
        es.close(); clipEsRef.current=null; setClipPhase("error"); setClipError(msg.replace("ERROR:",""));
      }
    };
    es.onerror=async ()=>{
      es.close(); clipEsRef.current=null;
      setClipPhase("error");
      setClipError("Conexión cortada — revisa la consola del servidor para ver el error exacto.");
    };
  },[clipVideoType, clipPipPos, clipDurRange]);

  const onFiles = (files) => {
    const f=files[0];
    if(!f.type.startsWith("video/")&&!/\.(mp4|mov|mkv)$/i.test(f.name)) return;
    // Revoke previous object URL if any
    if(pendingVideoURLRef.current) { URL.revokeObjectURL(pendingVideoURLRef.current); }
    const url = URL.createObjectURL(f);
    pendingVideoURLRef.current = url;
    setPendingVideoURL(url);
    setPendingFile(f);
    // Para horizontal siempre es "horizontal-subtitles"; para vertical, usa el modo actual
    setPendingMode(contentType === 'horizontal' ? "horizontal-subtitles" : mode);
    setVideoReadyPhase("preview");
    if(inputRef.current) inputRef.current.value="";
  };

  const onStyleSelected = (style, color = "#FFE033", zoom = true, pos = 15, font = "outfit", anim = "default", sfx = "none", captCase = "lower", captSize = 100, captStroke = false) => {
    setCaptionStyle(style);
    setPendingStyle(style);
    pendingColorRef.current = color;
    setPendingColor(color);
    pendingZoomRef.current = zoom;
    setPendingZoom(zoom);
    pendingPosRef.current = pos;
    setPendingPos(pos);
    pendingFontRef.current = font;
    setPendingFont(font);
    pendingAnimRef.current = anim;
    setPendingAnim(anim);
    pendingSfxRef.current = sfx;
    setPendingSfx(sfx);
    pendingCaseRef.current = captCase;
    setPendingCase(captCase);
    pendingSizeRef.current = captSize;
    setPendingSize(captSize);
    pendingStrokeRef.current = captStroke;
    setPendingStroke(captStroke);
  };

  const onStyleBack = () => {
    // Return to the video-ready preview screen (keep file + mode, just reset style choices)
    setVideoReadyPhase("preview");
    setPendingStyle(null);
    setPendingColor("#FFE033");
    setPendingZoom(true);
    pendingZoomRef.current = true;
    setPendingPos(15);
    pendingPosRef.current = 15;
    setPendingFont("outfit");
    pendingFontRef.current = "outfit";
    setPendingAnim("default");
    pendingAnimRef.current = "default";
    setPendingSfx("none");
    pendingSfxRef.current = "none";
    setPendingCase("lower");
    pendingCaseRef.current = "lower";
    setPendingSize(100);
    pendingSizeRef.current = 100;
    setPendingStroke(false);
    pendingStrokeRef.current = false;
  };

  const onModelSelected = (model) => {
    setWhisperModel(model);
    const f = pendingFile;
    const m = pendingMode;
    const s = pendingStyle;
    const c = pendingColorRef.current;
    const z = pendingZoomRef.current;
    const p = pendingPosRef.current;
    const fn  = pendingFontRef.current;
    const an  = pendingAnimRef.current;
    const sfx = pendingSfxRef.current;
    const cc  = pendingCaseRef.current;
    const csz = pendingSizeRef.current;
    const csk = pendingStrokeRef.current;
    setPendingFile(null);
    setPendingMode(null);
    setPendingStyle(null);
    setPendingColor("#FFE033");
    pendingColorRef.current = "#FFE033";
    pendingZoomRef.current = true;
    pendingPosRef.current = 15;
    pendingFontRef.current = "outfit";
    pendingAnimRef.current = "default";
    pendingSfxRef.current  = "none";
    pendingCaseRef.current = "lower";
    pendingSizeRef.current = 100;
    pendingStrokeRef.current = false;
    if(pendingVideoURLRef.current) { URL.revokeObjectURL(pendingVideoURLRef.current); pendingVideoURLRef.current = null; }
    setPendingVideoURL(null); setVideoReadyPhase(null);
    if(m === "horizontal-subtitles") startSub(f, s, "horizontal", model, c, true, p, fn, an, cc, csz, csk);
    else if(m === "subtitles")       startSub(f, s, "vertical",   model, c, z, p, fn, an, cc, csz, false);
    else                             startClips(f, s, model, c, sfx);
  };

  const onModelBack = () => {
    setPendingStyle(null); // pendingFile/pendingMode still set → style picker reappears
  };

  // ── Cancelar job en curso ──
  const cancelJob = useCallbackU(async () => {
    const jId = subJobId || clipJobId;
    // Cerrar EventSource inmediatamente para parar la UI
    if (subTimerRef.current)  { clearInterval(subTimerRef.current);  subTimerRef.current  = null; }
    if (clipTimerRef.current) { clearInterval(clipTimerRef.current); clipTimerRef.current = null; }
    if (subEsRef.current)  { subEsRef.current.close();  subEsRef.current  = null; }
    if (clipEsRef.current) { clipEsRef.current.close(); clipEsRef.current = null; }
    // Notificar al servidor para que marque el job como cancelado
    if (jId) {
      try { await fetch(`/api/cancel/${jId}`, { method: "POST" }); } catch(_) {}
    }
    // Resetear estado de vuelta al inicio del flujo
    setSubPhase("idle");  setSubStep(-1);  setSubBar(0);  setSubFile(null);  setSubJobId(null);  setSubError("");
    setClipPhase("idle"); setClipStep(-1); setClipBar(0); setClipFile(null); setClipJobId(null); setClipError("");
    setTotalClips(0); setCurClipIdx(0); setCurClipTitle("");
  }, [subJobId, clipJobId]);

  // ── Callback: VideoEditor terminó de re-renderizar ──
  const onApplyChanges = useCallbackU((rrJobId) => {
    setRerendering(true);
    setRerenderProgress(0);
    if (rrEsRef.current) { rrEsRef.current.close(); rrEsRef.current = null; }
    const es = new EventSource(`/progress-rerender/${rrJobId}`);
    rrEsRef.current = es;
    es.onmessage = (e) => {
      const msg = e.data;
      if (msg === "KEEPALIVE") return;
      if (msg.startsWith("RENDER_PCT:")) {
        const rawPct = parseInt(msg.replace("RENDER_PCT:", ""), 10);
        if (!isNaN(rawPct)) {
          // Remap 92-99 → 5-96 para que el progreso de re-render sea uniforme
          const displayPct = Math.round(5 + (rawPct - 92) / (99 - 92) * (96 - 5));
          setRerenderProgress(Math.max(5, Math.min(96, displayPct)));
        }
        return;
      }
      if (msg.startsWith("DONE")) {
        es.close(); rrEsRef.current = null;
        setRerendering(false); setRerenderProgress(100);
        return;
      }
      if (msg.startsWith("ERROR:")) {
        es.close(); rrEsRef.current = null;
        setRerendering(false);
        return;
      }
    };
    es.onerror = () => {
      es.close(); rrEsRef.current = null;
      setRerendering(false);
    };
  }, []);

  // Detectar si estamos en un flujo de subtítulos activo (vertical o horizontal)
  const isSubFlow = mode === "subtitles" || contentType === "horizontal";
  const isProcessing = (isSubFlow && subPhase === "processing") || (mode === "clips" && clipPhase === "processing");
  const isDone       = (isSubFlow && subPhase === "done")       || (mode === "clips" && clipPhase === "done");
  const isError      = (isSubFlow && subPhase === "error")      || (mode === "clips" && clipPhase === "error");

  return (
    <motionU.div
      initial={{filter:"blur(10px)",opacity:0,y:20}}
      animate={{filter:"blur(0px)",opacity:1,y:0}}
      transition={{duration:0.8,ease:[0.16,1,0.3,1],delay}}
      style={{
        width:"100%",
        maxWidth: (sector === 'picking' || pendingFile) ? "min(960px, 92vw)" : (sector === 'transcribe' ? "min(720px, 92vw)" : "36rem"),
        marginTop: sector === 'picking' ? "0" : "2.5rem",
        transition: "max-width 0.4s ease",
      }}
    >

      {/* ══ PANTALLA INICIAL: EMPEZAR ══ */}
      {sector === null && (
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:0,paddingTop:130}}>
          <ShinyButton onClick={()=>{ setSector('picking'); onDone && onDone(); }}>
            Empezar
          </ShinyButton>
        </div>
      )}

      {/* ══ SELECTOR DE SECTOR ══ */}
      {sector === 'picking' && contentType === null && (
        <SectorSelector
          onSelect={s => setSector(s)}
          onBack={()=>{ setSector(null); onBack && onBack(); }}
        />
      )}

      {/* ══ SELECTOR TIPO DE CONTENIDO ══ */}
      {sector === 'shorts' && contentType === null && (
        <ContentTypeSelector
          onSelect={setContentType}
          onBack={()=>{ setSector('picking'); }}
        />
      )}

      {/* ══ SINCRONIZAR AUDIO ══ */}
      {sector === 'sync' && (
        <AudioSync onBack={()=>setSector('picking')} />
      )}

      {/* ══ TRANSCRIPCIÓN DE AUDIO/VÍDEO ══ */}
      {sector === 'transcribe' && (
        <TranscribePanel onBack={()=>setSector('picking')} />
      )}

      {/* ══ INTROS CON IA ══ */}
      {sector === 'intros' && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
          {sectionLabel("Intros con IA")}
          <div style={{
            width:"100%", maxWidth:480,
            background:"rgba(255,255,255,0.03)",
            border:"1px solid rgba(94,106,210,0.22)",
            borderRadius:"1.5rem", padding:"40px 36px",
            display:"flex", flexDirection:"column", alignItems:"center", gap:18,
            boxShadow:"0 0 60px rgba(94,106,210,0.10)",
          }}>
            <div style={{
              width:64, height:64, borderRadius:"1.1rem",
              background:"rgba(94,106,210,0.12)",
              border:"1px solid rgba(94,106,210,0.28)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:28,
              boxShadow:"0 0 30px rgba(94,106,210,0.20)",
            }}>⬡</div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontFamily:"'Outfit',sans-serif", fontWeight:700, fontSize:18, color:"#EDEDEF", marginBottom:8 }}>
                En construcción
              </div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:"rgba(255,255,255,0.40)", lineHeight:1.6, maxWidth:320 }}>
                El editor de intros animadas con HyperFrames estará disponible muy pronto.
                Podrás crear intros tipo Statement y Stats Card para tus vídeos de YouTube.
              </div>
            </div>
            <div style={{
              display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center",
              marginTop:4,
            }}>
              {["Statement", "Stats Card"].map(t => (
                <span key={t} style={{
                  fontSize:10, letterSpacing:"0.12em", textTransform:"uppercase",
                  fontFamily:"'Outfit',sans-serif", fontWeight:600,
                  color:"rgba(94,106,210,0.70)",
                  background:"rgba(94,106,210,0.08)",
                  border:"1px solid rgba(94,106,210,0.20)",
                  borderRadius:99, padding:"4px 12px",
                }}>{t}</span>
              ))}
            </div>
          </div>
          <div style={{ marginTop:40 }}>
            <button onClick={()=>setSector('picking')} style={{...backBtnStyle, display:"inline-flex", marginBottom:0}}
              onMouseEnter={e=>e.currentTarget.style.color="rgba(255,255,255,0.65)"}
              onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.35)"}
            >
              <ArrowLeft /> Volver
            </button>
          </div>
        </div>
      )}

      {/* ══ VERTICAL: SELECCIÓN DE MODO ══ */}
      {contentType === 'vertical' && mode === null && !pendingFile && (
        <div>
          {sectionLabel("¿Qué quieres hacer?")}
          <div style={{display:"flex",gap:12}}>
            <ModeCard
              icon={<CaptionIcon/>}
              title="Añadir subtítulos"
              desc="Sube tu clip ya cortado y le añadimos captions automáticos con IA"
              onClick={()=>setMode("subtitles")}
            />
            <ModeCard
              icon={<ClipIcon/>}
              title="Auto Clips"
              desc="Sube un video largo y detectamos los mejores momentos, los cortamos y añadimos captions"
              onClick={()=>setMode("clips")}
            />
          </div>
          <div style={{textAlign:"center", marginTop:44}}>
            <button onClick={()=>setContentType(null)} style={{...backBtnStyle,display:"inline-flex",marginBottom:0}}
              onMouseEnter={e=>e.currentTarget.style.color="rgba(255,255,255,0.65)"}
              onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.35)"}
            >
              <ArrowLeft /> Volver
            </button>
          </div>
        </div>
      )}

      {/* ══ VIDEO LISTO — PANTALLA INTERMEDIA ══ */}
      {pendingFile && videoReadyPhase === "preview" && !pendingStyle && !isProcessing && !isDone && !isError && (
        <VideoReadyScreen
          file={pendingFile}
          videoURL={pendingVideoURL}
          onGenerate={() => {
            onStyleSelected("style1", "#FFE033", true, 15, "outfit", "default");
            setVideoReadyPhase(null);
          }}
          onCustomize={() => setVideoReadyPhase(null)}
          onBack={() => {
            if(pendingVideoURLRef.current) { URL.revokeObjectURL(pendingVideoURLRef.current); pendingVideoURLRef.current = null; }
            setPendingVideoURL(null);
            setPendingFile(null);
            setPendingMode(null);
            setVideoReadyPhase(null);
            if(inputRef.current) inputRef.current.value="";
          }}
        />
      )}

      {/* ══ STYLE PICKER — VERTICAL ══ */}
      {pendingFile && !pendingStyle && videoReadyPhase !== "preview" && pendingMode !== "horizontal-subtitles" && !isProcessing && !isDone && !isError && (
        <StylePicker onSelect={onStyleSelected} onBack={onStyleBack} videoURL={pendingVideoURL} />
      )}

      {/* ══ STYLE PICKER — HORIZONTAL ══ */}
      {pendingFile && !pendingStyle && videoReadyPhase !== "preview" && pendingMode === "horizontal-subtitles" && !isProcessing && !isDone && !isError && (
        <StylePickerHorizontal onSelect={onStyleSelected} onBack={onStyleBack} videoURL={pendingVideoURL} />
      )}

      {/* ══ WHISPER MODEL PICKER ══ */}
      {pendingFile && pendingStyle && !isProcessing && !isDone && !isError && (
        <WhisperModelPicker onSelect={onModelSelected} onBack={onModelBack} />
      )}

      {/* ══ SUBTÍTULOS VERTICAL: UPLOAD ══ */}
      {contentType === 'vertical' && mode === "subtitles" && subPhase === "idle" && !pendingFile && (
        <div>
          {sectionLabel("Añadir subtítulos")}
          <DropZone onFiles={onFiles} dragOver={dragOver} setDragOver={setDragOver} inputRef={inputRef} hint="Clip corto, máx ~2 min" inputId="aelios-file-sub" />
          <div style={{textAlign:"center", marginTop:44}}>
            <button onClick={backToModeSelect} style={{...backBtnStyle,display:"inline-flex",marginBottom:0}}
              onMouseEnter={e=>e.currentTarget.style.color="rgba(255,255,255,0.65)"}
              onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.35)"}
            >
              <ArrowLeft /> Volver
            </button>
          </div>
        </div>
      )}

      {/* ══ HORIZONTAL: UPLOAD ══ */}
      {contentType === 'horizontal' && subPhase === "idle" && !pendingFile && (
        <div>
          {sectionLabel("Añadir subtítulos")}
          <DropZone onFiles={onFiles} dragOver={dragOver} setDragOver={setDragOver} inputRef={inputRef} hint="Video horizontal, máx ~30 min" inputId="aelios-file-h" />
          <div style={{textAlign:"center", marginTop:44}}>
            <button onClick={resetAll} style={{...backBtnStyle,display:"inline-flex",marginBottom:0}}
              onMouseEnter={e=>e.currentTarget.style.color="rgba(255,255,255,0.65)"}
              onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.35)"}
            >
              <ArrowLeft /> Volver
            </button>
          </div>
        </div>
      )}

      {/* ══ CLIPS: SELECCIÓN DE TIPO ══ */}
      {contentType === 'vertical' && mode === "clips" && clipPhase === "idle" && !isDone && !isError && !clipVideoType && !pendingFile && (
        <div>
          {sectionLabel("✂ Auto Clips")}
          <div style={{fontSize:"0.75rem",color:"rgba(255,255,255,0.32)",fontFamily:"'Inter',sans-serif",marginBottom:14}}>
            ¿Qué tipo de video vas a subir?
          </div>
          <div style={{display:"flex",gap:10}}>
            <VideoTypeCard
              icon="🎥" tag="YOUTUBE" title="Vídeo de YouTube"
              desc="Video con cámara + pantalla (pip)"
              onClick={()=>setClipVideoType('youtube')}
            />
            <VideoTypeCard
              icon="🎙" tag="PODCAST" title="Podcast"
              desc="Conversación en cámara, sin pantalla"
              disabled soon
            />
          </div>
          <div style={{textAlign:"center", marginTop:44}}>
            <button onClick={backToModeSelect} style={{...backBtnStyle,display:"inline-flex",marginBottom:0}}
              onMouseEnter={e=>e.currentTarget.style.color="rgba(255,255,255,0.65)"}
              onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.35)"}
            >
              <ArrowLeft /> Volver
            </button>
          </div>
        </div>
      )}

      {/* ══ CLIPS: CONFIG YOUTUBE ══ */}
      {contentType === 'vertical' && mode === "clips" && clipPhase === "idle" && !isDone && !isError && clipVideoType === "youtube" && !pendingFile && (
        <div>
          {sectionLabel("✂ Auto Clips — YouTube")}
          <PipSelector value={clipPipPos} onChange={setClipPipPos} />
          <DurationSelector value={clipDurRange} onChange={setClipDurRange} />
          <DropZone
            onFiles={onFiles} dragOver={dragOver} setDragOver={setDragOver} inputRef={inputRef}
            hint="Video horizontal de YouTube con cámara y pantalla"
            inputId="aelios-file-clips"
          />
          <div style={{textAlign:"center", marginTop:44}}>
            <button onClick={()=>setClipVideoType(null)} style={{...backBtnStyle,display:"inline-flex",marginBottom:0}}
              onMouseEnter={e=>e.currentTarget.style.color="rgba(255,255,255,0.65)"}
              onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.35)"}
            >
              <ArrowLeft /> Volver
            </button>
          </div>
        </div>
      )}

      {/* ══ SUBTÍTULOS: PROCESANDO ══ */}
      {isSubFlow && subPhase === "processing" && (
        <div className="liquid-glass-strong px-8 py-8" style={{borderRadius:"1.4rem"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
            <div style={{fontSize:10,letterSpacing:"0.18em",color:"rgba(94,106,210,0.65)",fontFamily:"'Outfit',sans-serif",textTransform:"uppercase"}}>✦ Subtítulos</div>
            <button onClick={cancelJob} style={{
              fontSize:11,color:"rgba(255,80,80,0.70)",background:"rgba(255,60,60,0.08)",
              border:"1px solid rgba(255,60,60,0.18)",borderRadius:7,
              padding:"3px 10px",cursor:"pointer",fontFamily:"'Outfit',sans-serif",fontWeight:600,
              transition:"all .15s",
            }}
            onMouseEnter={e=>{e.target.style.background="rgba(255,60,60,0.16)";e.target.style.color="rgba(255,80,80,1)";}}
            onMouseLeave={e=>{e.target.style.background="rgba(255,60,60,0.08)";e.target.style.color="rgba(255,80,80,0.70)";}}>
              ✕ Cancelar
            </button>
          </div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",marginBottom:20,fontFamily:"'Inter',sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            Procesando <span style={{color:"rgba(255,255,255,0.65)",fontWeight:500}}>{subFile}</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {SUB_STEPS.map((label,i)=><StepRow key={i} label={label} state={subStep>i?"done":subStep===i?"active":"idle"} />)}
          </div>
          <ProgressBar width={subBar} showPct />
        </div>
      )}

      {/* ══ SUBTÍTULOS: LISTO ══ */}
      {isSubFlow && subPhase === "done" && (
        <div className="liquid-glass-strong" style={{borderRadius:"1.4rem", padding:"32px 36px", textAlign:"center", width:"100%", boxSizing:"border-box"}}>

          {rerendering ? (
            /* ── Estado: aplicando cambios ── */
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:22, minHeight:260 }}>
              <style>{`@keyframes aeReSpin { to { transform: rotate(360deg); } }`}</style>
              {/* Spinner */}
              <div style={{
                width:54, height:54,
                border:"3px solid rgba(94,106,210,0.18)",
                borderTopColor:"#5E6AD2",
                borderRadius:"50%",
                animation:"aeReSpin 0.85s linear infinite",
                flexShrink:0,
              }} />
              {/* Texto */}
              <div>
                <div style={{ fontSize:15, fontFamily:"'Outfit',sans-serif", fontWeight:700, color:"rgba(255,255,255,0.88)", letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:7 }}>
                  Aplicando cambios
                </div>
                <div style={{ fontSize:11, fontFamily:"'Inter',sans-serif", color:"rgba(255,255,255,0.35)" }}>
                  Regenerando el vídeo con tus ediciones...
                </div>
              </div>
              {/* Barra de progreso */}
              {rerenderProgress > 0 && (
                <div style={{ width:"100%", maxWidth:260 }}>
                  <ProgressBar width={rerenderProgress} showPct />
                </div>
              )}
            </div>
          ) : (
            /* ── Estado: listo ── */
            <>
              <div style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:11,color:"#4ade80",marginBottom:18,letterSpacing:".5px"}}>
                <span style={{width:5,height:5,borderRadius:"50%",background:"#4ade80",boxShadow:"0 0 6px #4ade80",display:"inline-block"}} /> Video listo
              </div>

              {/* Vista previa */}
              <div style={{ display:"flex", justifyContent:"center", marginBottom:20 }}>
                <VideoPreview
                  jobId={subJobId}
                  orientation={contentType === 'horizontal' ? "horizontal" : "vertical"}
                />
              </div>

              {/* Botón descargar */}
              <div style={{ marginBottom:0 }}>
                <a href={`/download/${subJobId}`} download style={{
                  display:"inline-flex",alignItems:"center",gap:8,
                  background:"linear-gradient(135deg, #4a54c1, #5E6AD2)",
                  color:"#fff",
                  fontFamily:"'Outfit',sans-serif",fontWeight:700,fontSize:14,
                  padding:"13px 28px",borderRadius:10,textDecoration:"none",
                  boxShadow:"0 0 0 1px rgba(94,106,210,0.50), 0 4px 20px rgba(94,106,210,0.40), inset 0 1px 0 rgba(255,255,255,0.12)",
                }}>
                  <DownloadIcon /> GUARDAR
                </a>
              </div>

              {/* Editor de vídeo */}
              {(()=>{ const VE = window.VideoEditor; return VE ? <VE jobId={subJobId} onReset={resetAll} onApplyChanges={onApplyChanges} /> : null; })()}

              <button onClick={resetAll} style={{display:"block",margin:"12px auto 0",fontSize:11,color:"rgba(255,255,255,0.32)",background:"none",border:"none",cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>
                Procesar otro video
              </button>
            </>
          )}

        </div>
      )}

      {/* ══ CLIPS: PROCESANDO ══ */}
      {mode === "clips" && clipPhase === "processing" && (
        <div className="liquid-glass-strong px-8 py-8" style={{borderRadius:"1.4rem"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
            <div style={{fontSize:10,letterSpacing:"0.18em",color:"rgba(94,106,210,0.65)",fontFamily:"'Outfit',sans-serif",textTransform:"uppercase"}}>✂ Auto Clips</div>
            <button onClick={cancelJob} style={{
              fontSize:11,color:"rgba(255,80,80,0.70)",background:"rgba(255,60,60,0.08)",
              border:"1px solid rgba(255,60,60,0.18)",borderRadius:7,
              padding:"3px 10px",cursor:"pointer",fontFamily:"'Outfit',sans-serif",fontWeight:600,
              transition:"all .15s",
            }}
            onMouseEnter={e=>{e.target.style.background="rgba(255,60,60,0.16)";e.target.style.color="rgba(255,80,80,1)";}}
            onMouseLeave={e=>{e.target.style.background="rgba(255,60,60,0.08)";e.target.style.color="rgba(255,80,80,0.70)";}}>
              ✕ Cancelar
            </button>
          </div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",marginBottom:20,fontFamily:"'Inter',sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            Analizando <span style={{color:"rgba(255,255,255,0.65)",fontWeight:500}}>{clipFile}</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:14}}>
            {CLIP_STEPS.map((label,i)=>{
              const lbl = i===3&&totalClips>0 ? `${totalClips} clips detectados` : label;
              return <StepRow key={i} label={lbl} state={clipStep>i?"done":clipStep===i?"active":"idle"} />;
            })}
          </div>
          {curClipTitle && (
            <div style={{
              background:"rgba(94,106,210,0.06)",
              border:"1px solid rgba(94,106,210,0.16)",
              borderRadius:10,padding:"10px 14px",marginTop:4,
            }}>
              <div style={{fontSize:9,color:"rgba(94,106,210,0.65)",fontFamily:"'Outfit',sans-serif",marginBottom:3,letterSpacing:"0.15em",textTransform:"uppercase"}}>
                Procesando clip {curClipIdx}/{totalClips}
              </div>
              <div style={{fontSize:13,color:"rgba(255,255,255,0.80)",fontFamily:"'Inter',sans-serif",fontWeight:500}}>{curClipTitle}</div>
            </div>
          )}
          <ProgressBar width={clipBar} showPct />
        </div>
      )}

      {/* ══ CLIPS: LISTOS ══ */}
      {mode === "clips" && clipPhase === "done" && (
        <div className="liquid-glass-strong px-6 py-7" style={{borderRadius:"1.4rem"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#4ade80",marginBottom:18,letterSpacing:".5px"}}>
            <span style={{width:5,height:5,borderRadius:"50%",background:"#4ade80",boxShadow:"0 0 6px #4ade80",display:"inline-block"}} />
            {doneClips.length} clip{doneClips.length!==1?"s":""} listos
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            {doneClips.map((clip,i)=>(
              <div key={i} style={{
                display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,
                background:"rgba(255,255,255,0.03)",
                borderRadius:11,padding:"12px 14px",
                border:"1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,color:"rgba(255,255,255,0.85)",fontFamily:"'Inter',sans-serif",fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{clip.title}</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.28)",fontFamily:"'Inter',sans-serif",marginTop:2}}>{clip.duration}s</div>
                </div>
                <a href={`/download-clip/${clipJobId}/${clip.idx}`} download
                  style={{
                    flexShrink:0,display:"inline-flex",alignItems:"center",gap:5,
                    background:"linear-gradient(135deg, #4a54c1, #5E6AD2)",
                    color:"#fff",
                    fontFamily:"'Outfit',sans-serif",fontWeight:700,fontSize:11.5,
                    padding:"7px 13px",borderRadius:8,textDecoration:"none",
                    boxShadow:"0 2px 10px rgba(94,106,210,0.35), inset 0 1px 0 rgba(255,255,255,0.12)",
                  }}>
                  <DownloadIcon /> Descargar
                </a>
              </div>
            ))}
          </div>
          <button onClick={resetAll} style={{display:"block",margin:"14px auto 0",fontSize:11,color:"rgba(255,255,255,0.32)",background:"none",border:"none",cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>
            Procesar otro video
          </button>
        </div>
      )}

      {/* ══ ERROR ══ */}
      {isError && (
        <div>
          <div style={{background:"rgba(248,113,113,0.06)",border:"1px solid rgba(248,113,113,0.14)",borderRadius:"1rem",padding:"14px 18px",fontSize:12.5,color:"#f87171",marginBottom:10,fontFamily:"'Inter',sans-serif"}}>
            <strong>Error — </strong>{isSubFlow ? subError : clipError}
          </div>
          <button onClick={resetAll} style={{fontSize:12,color:"rgba(255,255,255,0.38)",background:"none",border:"none",cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>
            Volver al inicio
          </button>
        </div>
      )}

    </motionU.div>
  );
}

window.Uploader = Uploader;
