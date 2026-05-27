// Uploader — Selección de modo + flujo de subtítulos y auto clips
const { useState: useStateU, useRef: useRefU, useCallback: useCallbackU } = React;
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
const SUB_BAR_MAP = {0:10,1:32,2:58,3:78,4:92};
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
  return (
    <label
      htmlFor={id}
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
      <input ref={inputRef} id={id} type="file" accept="video/mp4,video/quicktime,video/x-matroska,.mp4,.mov,.mkv" onChange={onChange} style={{position:"absolute",inset:0,opacity:0,cursor:"pointer",width:"100%",height:"100%"}} />
    </label>
  );
}

// ── Estilos compartidos ──
const backBtnStyle = {
  display:"inline-flex", alignItems:"center", gap:6, marginBottom:14,
  fontSize:11, color:"rgba(255,255,255,0.35)", background:"none", border:"none",
  cursor:"pointer", fontFamily:"'Inter',sans-serif", letterSpacing:0.5, transition:"color 0.15s",
};

const sectionLabel = (text) => (
  <div style={{
    fontSize:13, letterSpacing:"0.16em",
    color:"rgba(148,155,236,0.95)",
    fontFamily:"'Outfit',sans-serif", fontWeight:700,
    marginBottom:14, textTransform:"uppercase",
  }}>
    {text}
  </div>
);

// ── Preview de estilo 1: BIG + small ──
function StylePreview1({ color = "#FFE033" }) {
  const c = HIGHLIGHT_COLORS.find(x => x.id === color) || HIGHLIGHT_COLORS[0];
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
          fontFamily:"'Outfit',sans-serif", fontWeight:300, fontStyle:"italic",
          fontSize:13, color:"rgba(255,255,255,0.88)", letterSpacing:0.3,
          textShadow:"0 1px 4px rgba(0,0,0,0.9)",
        }}>esto es</span>
        <span style={{
          fontFamily:"'Outfit',sans-serif", fontWeight:900,
          fontSize:32, color:c.id, letterSpacing:-1.5,
          textTransform:"uppercase", lineHeight:1.0,
          textShadow:`0 0 18px ${c.glow}, 0 0 36px ${c.glow}, 0 2px 6px rgba(0,0,0,0.99)`,
          transition:"color 0.25s, text-shadow 0.25s",
        }}>VIRAL</span>
        <span style={{
          fontFamily:"'Outfit',sans-serif", fontWeight:300, fontStyle:"italic",
          fontSize:13, color:"rgba(255,255,255,0.88)", letterSpacing:0.3,
          textShadow:"0 1px 4px rgba(0,0,0,0.9)",
        }}>de verdad</span>
      </div>
    </div>
  );
}

// ── Preview de estilo 2: italic + glow de color ──
function StylePreview2({ color = "#FFE033" }) {
  const c = HIGHLIGHT_COLORS.find(x => x.id === color) || HIGHLIGHT_COLORS[0];
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
          fontFamily:"'Outfit',sans-serif", fontWeight:400, fontStyle:"italic",
          fontSize:15, color:"rgba(255,255,255,0.94)",
          textShadow:"0 1px 6px rgba(0,0,0,0.85)",
        }}>esto es</span>
        <span style={{
          fontFamily:"'Outfit',sans-serif", fontWeight:400, fontStyle:"italic",
          fontSize:15, color:c.id,
          textShadow:`0 0 5px ${c.id}, 0 0 14px ${c.glow}, 0 0 30px ${c.glow}, 0 0 50px ${c.glow}`,
          transition:"color 0.25s, text-shadow 0.25s",
        }}>increíble</span>
        <span style={{
          fontFamily:"'Outfit',sans-serif", fontWeight:400, fontStyle:"italic",
          fontSize:15, color:"rgba(255,255,255,0.94)",
          textShadow:"0 1px 6px rgba(0,0,0,0.85)",
        }}>de verdad</span>
      </div>
    </div>
  );
}

// ── Preview estilo Documental ──
function StylePreviewDoc() {
  return (
    <div style={{
      background:"#0a0a0a", borderRadius:"0.85rem",
      height:130, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"flex-end",
      paddingBottom:26, overflow:"hidden", position:"relative",
    }}>
      <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom, #111 0%, #0a0a0a 100%)"}} />
      <div style={{position:"relative",display:"flex",flexDirection:"row",alignItems:"center",gap:6,flexWrap:"wrap",justifyContent:"center",padding:"0 14px"}}>
        {["así","hablan","los","documentales"].map((w,i)=>(
          <span key={i} style={{
            fontFamily:"'Raleway', sans-serif", fontWeight:300,
            fontSize:13.5, color:"#ffffff", letterSpacing:"1.8px",
            textShadow:"1px 1px 0 #000,-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000",
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
function StylePicker({ onSelect, onBack }) {
  const [selected,      setSelected]      = useStateU(null);
  const [selectedColor, setSelectedColor] = useStateU("#FFE033");

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
    <div>
      <button onClick={onBack} style={backBtnStyle}
        onMouseEnter={e=>e.currentTarget.style.color="rgba(255,255,255,0.65)"}
        onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.35)"}
      >
        <ArrowLeft /> Volver
      </button>
      {sectionLabel("✦ Elige el estilo de captions")}
      <div style={{display:"flex",gap:8,marginBottom:16}}>

        {/* Big Glow */}
        <div style={cardStyle("style1")} onClick={()=>setSelected("style1")}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.10),transparent)",pointerEvents:"none"}} />
          <StylePreview1 color={selectedColor} />
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
          <StylePreview2 color={selectedColor} />
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
      <button
        onClick={()=>{ if(selected) onSelect(selected, selected === "style3" ? "#FFFFFF" : selectedColor); }}
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
    </div>
  );
}

// ── Selector de estilo — horizontal (Documental Style / Fancy Creative) ──
function StylePickerHorizontal({ onSelect, onBack }) {
  const [selected, setSelected] = useStateU(null);

  const cardStyle = (id, disabled) => ({
    flex:1, borderRadius:"1.1rem", overflow:"hidden",
    cursor: disabled ? "not-allowed" : "pointer",
    border: selected===id ? "1.5px solid rgba(94,106,210,0.55)" : "1px solid rgba(255,255,255,0.07)",
    background: selected===id ? "rgba(94,106,210,0.05)" : "rgba(255,255,255,0.02)",
    boxShadow: selected===id
      ? "0 0 0 1px rgba(94,106,210,0.20), 0 0 28px rgba(94,106,210,0.12)"
      : "0 0 0 1px rgba(255,255,255,0.04), 0 2px 16px rgba(0,0,0,0.35)",
    transition:"all 0.2s",
    position:"relative",
    opacity: disabled ? 0.45 : 1,
  });

  return (
    <div>
      <button onClick={onBack} style={backBtnStyle}
        onMouseEnter={e=>e.currentTarget.style.color="rgba(255,255,255,0.65)"}
        onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.35)"}
      >
        <ArrowLeft /> Volver
      </button>
      {sectionLabel("✦ Elige el estilo de captions")}
      <div style={{display:"flex",gap:10,marginBottom:16}}>

        {/* Documental Style */}
        <div style={cardStyle("style_doc", false)} onClick={()=>setSelected("style_doc")}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.10),transparent)",pointerEvents:"none"}} />
          <StylePreviewDoc />
          <div style={{padding:"10px 14px 12px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontSize:"0.82rem",fontWeight:600,color:"rgba(255,255,255,0.85)",fontFamily:"'Inter',sans-serif"}}>Documental Style</div>
              <div style={{fontSize:"0.68rem",color:"rgba(255,255,255,0.32)",fontFamily:"'Inter',sans-serif",marginTop:2}}>Sans-serif fina · Legible · Cinematográfico</div>
            </div>
            <div style={{
              width:18,height:18,borderRadius:"50%",flexShrink:0,
              border: selected==="style_doc" ? "1.5px solid #5E6AD2" : "1px solid rgba(255,255,255,0.15)",
              background: selected==="style_doc" ? "rgba(94,106,210,0.15)" : "transparent",
              display:"flex",alignItems:"center",justifyContent:"center",
              transition:"all 0.18s",
            }}>
              {selected==="style_doc" && <span style={{width:7,height:7,borderRadius:"50%",background:"#5E6AD2",display:"block"}} />}
            </div>
          </div>
        </div>

        {/* Fancy Creative — próximamente */}
        <div style={cardStyle("fancy_creative", true)}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.10),transparent)",pointerEvents:"none"}} />
          <div style={{
            background:"#0a0a0a", borderRadius:"0.85rem",
            height:130, display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center",
            overflow:"hidden", position:"relative",
          }}>
            <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom, #111 0%, #0a0a0a 100%)"}} />
            <span style={{position:"relative",fontSize:28,opacity:0.18}}>✦</span>
          </div>
          <div style={{padding:"10px 14px 12px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontSize:"0.82rem",fontWeight:600,color:"rgba(255,255,255,0.85)",fontFamily:"'Inter',sans-serif"}}>Fancy Creative</div>
              <div style={{fontSize:"0.68rem",color:"rgba(255,255,255,0.32)",fontFamily:"'Inter',sans-serif",marginTop:2}}>Próximamente</div>
            </div>
            <span style={{
              fontSize:"0.55rem",fontFamily:"'Outfit',sans-serif",fontWeight:700,
              letterSpacing:"0.10em",textTransform:"uppercase",
              color:"rgba(148,155,236,0.70)",
              background:"rgba(94,106,210,0.10)",border:"1px solid rgba(94,106,210,0.18)",
              borderRadius:99,padding:"2px 8px",
            }}>SOON</span>
          </div>
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
          position:"relative", overflow:"hidden",
        }}
      >
        EMPEZAR →
      </button>
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
      <button onClick={onBack} style={backBtnStyle}
        onMouseEnter={e=>e.currentTarget.style.color="rgba(255,255,255,0.65)"}
        onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.35)"}
      >
        <ArrowLeft /> Volver
      </button>
      {sectionLabel("✦ ¿Qué modelo quieres utilizar?")}
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
    </div>
  );
}

// ── Selector de tipo de contenido ──
function ContentTypeSelector({ onSelect }) {
  return (
    <div>
      {sectionLabel("✦ ¿Qué tipo de contenido?")}
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
    </div>
  );
}

// ══════════════════════════════════════════════════════
function Uploader({ delay = 0 }) {
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
  const [captionStyle,  setCaptionStyle]  = useStateU(null);
  const [whisperModel,  setWhisperModel]  = useStateU(null);

  const [dragOver, setDragOver] = useStateU(false);
  const inputRef = useRefU(null);

  // ── Reset completo → vuelve a ContentTypeSelector ──
  const resetAll = () => {
    setContentType(null);
    setMode(null);
    setSubPhase("idle"); setSubStep(-1); setSubBar(0); setSubFile(null); setSubJobId(null); setSubError("");
    setClipPhase("idle"); setClipStep(-1); setClipBar(0); setClipFile(null); setClipJobId(null); setClipError("");
    setTotalClips(0); setCurClipIdx(0); setCurClipTitle(""); setDoneClips([]);
    setClipVideoType(null); setClipPipPos('bottom-right'); setClipDurRange('medium');
    setPendingFile(null); setPendingMode(null); setPendingStyle(null); setPendingColor("#FFE033"); setCaptionStyle(null); setWhisperModel(null);
    setDragOver(false);
    if(inputRef.current) inputRef.current.value="";
  };

  // ── Vuelve a la selección de modo (permanece en vertical) ──
  const backToModeSelect = () => {
    setMode(null);
    setPendingFile(null); setPendingMode(null);
    setDragOver(false);
    if(inputRef.current) inputRef.current.value="";
  };

  // ── Upload subtítulos ──
  const startSub = useCallbackU(async (file, style, orientation = "vertical", wModel = "medium", highlightColor = "#FFE033") => {
    setSubFile(file.name); setSubPhase("processing"); setSubStep(0); setSubBar(5);
    const fd=new FormData();
    fd.append("file", file);
    fd.append("caption_style", style || "style1");
    fd.append("orientation", orientation);
    fd.append("whisper_model", wModel);
    fd.append("highlight_color", highlightColor);
    let jId;
    try { const r=await fetch("/upload",{method:"POST",body:fd}); const d=await r.json(); jId=d.job_id; setSubJobId(jId); }
    catch(e){ setSubPhase("error"); setSubError("No se pudo conectar."); return; }
    const es=new EventSource(`/progress/${jId}`);
    es.onmessage=(e)=>{
      const msg=e.data; if(msg==="KEEPALIVE") return;
      for(const [k,i] of Object.entries(SUB_STEP_MAP)) if(msg.startsWith(k)){ setSubStep(i); setSubBar(SUB_BAR_MAP[i]||10); return; }
      if(msg.startsWith("DONE")){ es.close(); setSubStep(99); setSubBar(100); setTimeout(()=>setSubPhase("done"),500); return; }
      if(msg.startsWith("ERROR:")){ es.close(); setSubPhase("error"); setSubError(msg.replace("ERROR:","")); }
    };
    es.onerror=()=>{ es.close(); setSubPhase("error"); setSubError("Conexión cortada — revisa que el servidor siga corriendo."); };
  },[]);

  // ── Upload clips ──
  const startClips = useCallbackU(async (file, style, wModel = "medium", highlightColor = "#FFE033") => {
    setClipFile(file.name); setClipPhase("processing"); setClipStep(0); setClipBar(5);
    const fd=new FormData();
    fd.append("file", file);
    fd.append("video_type",      clipVideoType || "generic");
    fd.append("pip_position",    clipPipPos);
    fd.append("caption_style",   style || "style1");
    fd.append("clip_dur_range",  clipDurRange);
    fd.append("whisper_model",   wModel);
    fd.append("highlight_color", highlightColor);
    let jId;
    try { const r=await fetch("/upload-clips",{method:"POST",body:fd}); const d=await r.json(); jId=d.job_id; setClipJobId(jId); }
    catch(e){ setClipPhase("error"); setClipError("No se pudo conectar."); return; }
    const es=new EventSource(`/progress-clips/${jId}`);
    es.onmessage=(e)=>{
      const msg=e.data; if(msg==="KEEPALIVE") return;
      if(msg.startsWith("CSTEP:1")){ setClipStep(0); setClipBar(8);  return; }
      if(msg.startsWith("CSTEP:2")){ setClipStep(1); setClipBar(18); return; }
      if(msg.startsWith("CSTEP:3")){ setClipStep(2); setClipBar(28); return; }
      if(msg.startsWith("CSTEP:4:")){ const n=parseInt(msg.split(":")[2])||0; setTotalClips(n); setClipStep(3); setClipBar(32); return; }
      if(msg.startsWith("CCLIP:")){
        const p=msg.split(":"); const ci=parseInt(p[1])||1; const cn=parseInt(p[2])||1; const t=p.slice(3).join(":");
        setCurClipIdx(ci); setTotalClips(cn); setCurClipTitle(t);
        setClipStep(4);
        setClipBar(32+Math.round(((ci-1)/cn)*62)); return;
      }
      if(msg.startsWith("CCLIP_DONE:")){ const p=msg.split(":"); setClipBar(32+Math.round((parseInt(p[1])||1)/(parseInt(p[2])||1)*62)); return; }
      if(msg.startsWith("CDONE:")){
        es.close(); setClipBar(100);
        try{ setDoneClips(JSON.parse(msg.replace("CDONE:","")));} catch(_){}
        setTimeout(()=>setClipPhase("done"),500); return;
      }
      if(msg.startsWith("ERROR:")){ es.close(); setClipPhase("error"); setClipError(msg.replace("ERROR:","")); }
    };
    es.onerror=async ()=>{
      es.close();
      setClipPhase("error");
      setClipError("Conexión cortada — revisa la consola del servidor para ver el error exacto.");
    };
  },[clipVideoType, clipPipPos, clipDurRange]);

  const onFiles = (files) => {
    const f=files[0];
    if(!f.type.startsWith("video/")&&!/\.(mp4|mov|mkv)$/i.test(f.name)) return;
    setPendingFile(f);
    // Para horizontal siempre es "horizontal-subtitles"; para vertical, usa el modo actual
    setPendingMode(contentType === 'horizontal' ? "horizontal-subtitles" : mode);
    if(inputRef.current) inputRef.current.value="";
  };

  const onStyleSelected = (style, color = "#FFE033") => {
    setCaptionStyle(style);
    setPendingStyle(style);
    pendingColorRef.current = color; // actualización síncrona — sin stale closure
    setPendingColor(color);
  };

  const onStyleBack = () => {
    setPendingFile(null);
    setPendingMode(null);
    setPendingStyle(null);
    setPendingColor("#FFE033");
    if(inputRef.current) inputRef.current.value="";
  };

  const onModelSelected = (model) => {
    setWhisperModel(model);
    const f = pendingFile;
    const m = pendingMode;
    const s = pendingStyle;
    const c = pendingColorRef.current; // leer del ref síncrono, no del estado que puede estar desactualizado
    setPendingFile(null);
    setPendingMode(null);
    setPendingStyle(null);
    setPendingColor("#FFE033");
    pendingColorRef.current = "#FFE033";
    if(m === "horizontal-subtitles") startSub(f, s, "horizontal", model, c);
    else if(m === "subtitles")       startSub(f, s, "vertical",   model, c);
    else                             startClips(f, s, model, c);
  };

  const onModelBack = () => {
    setPendingStyle(null); // pendingFile/pendingMode still set → style picker reappears
  };

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
      className="w-full max-w-xl mt-10"
    >

      {/* ══ SELECTOR TIPO DE CONTENIDO ══ */}
      {contentType === null && (
        <ContentTypeSelector onSelect={setContentType} />
      )}

      {/* ══ VERTICAL: SELECCIÓN DE MODO ══ */}
      {contentType === 'vertical' && mode === null && !pendingFile && (
        <div>
          <button onClick={resetAll} style={backBtnStyle}
            onMouseEnter={e=>e.currentTarget.style.color="rgba(255,255,255,0.65)"}
            onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.35)"}
          >
            <ArrowLeft /> Volver
          </button>
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
        </div>
      )}

      {/* ══ STYLE PICKER — VERTICAL ══ */}
      {pendingFile && !pendingStyle && pendingMode !== "horizontal-subtitles" && !isProcessing && !isDone && !isError && (
        <StylePicker onSelect={onStyleSelected} onBack={onStyleBack} />
      )}

      {/* ══ STYLE PICKER — HORIZONTAL ══ */}
      {pendingFile && !pendingStyle && pendingMode === "horizontal-subtitles" && !isProcessing && !isDone && !isError && (
        <StylePickerHorizontal onSelect={onStyleSelected} onBack={onStyleBack} />
      )}

      {/* ══ WHISPER MODEL PICKER ══ */}
      {pendingFile && pendingStyle && !isProcessing && !isDone && !isError && (
        <WhisperModelPicker onSelect={onModelSelected} onBack={onModelBack} />
      )}

      {/* ══ SUBTÍTULOS VERTICAL: UPLOAD ══ */}
      {contentType === 'vertical' && mode === "subtitles" && subPhase === "idle" && !pendingFile && (
        <div>
          <button onClick={backToModeSelect} style={backBtnStyle}
            onMouseEnter={e=>e.currentTarget.style.color="rgba(255,255,255,0.65)"}
            onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.35)"}
          >
            <ArrowLeft /> Volver
          </button>
          {sectionLabel("✦ Añadir subtítulos")}
          <DropZone onFiles={onFiles} dragOver={dragOver} setDragOver={setDragOver} inputRef={inputRef} hint="Clip corto, máx ~2 min" inputId="aelios-file-sub" />
        </div>
      )}

      {/* ══ HORIZONTAL: UPLOAD ══ */}
      {contentType === 'horizontal' && subPhase === "idle" && !pendingFile && (
        <div>
          <button onClick={resetAll} style={backBtnStyle}
            onMouseEnter={e=>e.currentTarget.style.color="rgba(255,255,255,0.65)"}
            onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.35)"}
          >
            <ArrowLeft /> Volver
          </button>
          {sectionLabel("✦ Añadir subtítulos")}
          <DropZone onFiles={onFiles} dragOver={dragOver} setDragOver={setDragOver} inputRef={inputRef} hint="Video horizontal, máx ~30 min" inputId="aelios-file-h" />
        </div>
      )}

      {/* ══ CLIPS: SELECCIÓN DE TIPO ══ */}
      {contentType === 'vertical' && mode === "clips" && clipPhase === "idle" && !isDone && !isError && !clipVideoType && !pendingFile && (
        <div>
          <button onClick={backToModeSelect} style={backBtnStyle}
            onMouseEnter={e=>e.currentTarget.style.color="rgba(255,255,255,0.65)"}
            onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.35)"}
          >
            <ArrowLeft /> Volver
          </button>
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
        </div>
      )}

      {/* ══ CLIPS: CONFIG YOUTUBE ══ */}
      {contentType === 'vertical' && mode === "clips" && clipPhase === "idle" && !isDone && !isError && clipVideoType === "youtube" && !pendingFile && (
        <div>
          <button
            onClick={()=>setClipVideoType(null)} style={backBtnStyle}
            onMouseEnter={e=>e.currentTarget.style.color="rgba(255,255,255,0.65)"}
            onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.35)"}
          >
            <ArrowLeft /> Tipo de video
          </button>
          {sectionLabel("✂ Auto Clips — YouTube")}
          <PipSelector value={clipPipPos} onChange={setClipPipPos} />
          <DurationSelector value={clipDurRange} onChange={setClipDurRange} />
          <DropZone
            onFiles={onFiles} dragOver={dragOver} setDragOver={setDragOver} inputRef={inputRef}
            hint="Video horizontal de YouTube con cámara y pantalla"
            inputId="aelios-file-clips"
          />
        </div>
      )}

      {/* ══ SUBTÍTULOS: PROCESANDO ══ */}
      {isSubFlow && subPhase === "processing" && (
        <div className="liquid-glass-strong px-8 py-8" style={{borderRadius:"1.4rem"}}>
          <div style={{fontSize:10,letterSpacing:"0.18em",color:"rgba(94,106,210,0.65)",fontFamily:"'Outfit',sans-serif",marginBottom:4,textTransform:"uppercase"}}>✦ Subtítulos</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",marginBottom:20,fontFamily:"'Inter',sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            Procesando <span style={{color:"rgba(255,255,255,0.65)",fontWeight:500}}>{subFile}</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {SUB_STEPS.map((label,i)=><StepRow key={i} label={label} state={subStep>i?"done":subStep===i?"active":"idle"} />)}
          </div>
          <ProgressBar width={subBar} />
        </div>
      )}

      {/* ══ SUBTÍTULOS: LISTO ══ */}
      {isSubFlow && subPhase === "done" && (
        <div className="liquid-glass-strong px-8 py-8 text-center" style={{borderRadius:"1.4rem"}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:11,color:"#4ade80",marginBottom:16,letterSpacing:".5px"}}>
            <span style={{width:5,height:5,borderRadius:"50%",background:"#4ade80",boxShadow:"0 0 6px #4ade80",display:"inline-block"}} /> Video listo
          </div>
          <div>
            <a href={`/download/${subJobId}`} download style={{
              display:"inline-flex",alignItems:"center",gap:8,
              background:"linear-gradient(135deg, #4a54c1, #5E6AD2)",
              color:"#fff",
              fontFamily:"'Outfit',sans-serif",fontWeight:700,fontSize:14,
              padding:"13px 28px",borderRadius:10,textDecoration:"none",
              boxShadow:"0 0 0 1px rgba(94,106,210,0.50), 0 4px 20px rgba(94,106,210,0.40), inset 0 1px 0 rgba(255,255,255,0.12)",
            }}>
              <DownloadIcon /> Descargar con captions
            </a>
          </div>
          <button onClick={resetAll} style={{display:"block",margin:"12px auto 0",fontSize:11,color:"rgba(255,255,255,0.32)",background:"none",border:"none",cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>
            Procesar otro video
          </button>
        </div>
      )}

      {/* ══ CLIPS: PROCESANDO ══ */}
      {mode === "clips" && clipPhase === "processing" && (
        <div className="liquid-glass-strong px-8 py-8" style={{borderRadius:"1.4rem"}}>
          <div style={{fontSize:10,letterSpacing:"0.18em",color:"rgba(94,106,210,0.65)",fontFamily:"'Outfit',sans-serif",marginBottom:4,textTransform:"uppercase"}}>✂ Auto Clips</div>
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
