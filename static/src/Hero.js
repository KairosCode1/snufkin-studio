// Hero section
const { motion: motionHero, AnimatePresence: AnimatePresenceHero } = window.Motion;
const { useState: useStateHero, useEffect: useEffectHero } = React;

// ── Carrusel de palabras ─────────────────────────────────────────────────────
const CAROUSEL_WORDS = ["Subtítulos", "Sincronización", "Gestión", "Edición"];

function WordCarousel() {
  const [idx, setIdx] = useStateHero(0);

  useEffectHero(() => {
    const id = setInterval(() => setIdx(i => (i + 1) % CAROUSEL_WORDS.length), 950);
    return () => clearInterval(id);
  }, []);

  // La palabra más larga ("Sincronización") actúa de placeholder invisible
  // para reservar el ancho exacto — la palabra animada va por encima en absolute.
  // Sin overflow:hidden → el glow se expande libremente, sin caja visible.
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      {/* placeholder — reserva espacio con la palabra más larga */}
      <span style={{ visibility: "hidden", pointerEvents: "none", whiteSpace: "nowrap" }}>
        Sincronización
      </span>
      {/* palabra animada encima, centrada */}
      <AnimatePresenceHero mode="wait">
        <motionHero.span
          key={CAROUSEL_WORDS[idx]}
          initial={{ opacity: 0, y: 14,  filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0,   filter: "blur(0px)" }}
          exit={{    opacity: 0, y: -10, filter: "blur(6px)" }}
          transition={{ duration: 0.17, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            whiteSpace: "nowrap",
            color: "#7C85E0",
            textShadow:
              "0 0 30px rgba(124,133,224,0.60), 0 0 70px rgba(94,106,210,0.25)",
          }}
        >
          {CAROUSEL_WORDS[idx]}
        </motionHero.span>
      </AnimatePresenceHero>
    </span>
  );
}

const HERO_VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_080021_d598092b-c4c2-4e53-8e46-94cf9064cd50.mp4";

const heroEnter = (delay) => ({
  initial: { filter: "blur(10px)", opacity: 0, y: 20 },
  animate: { filter: "blur(0px)", opacity: 1, y: 0 },
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1], delay },
});

function Hero() {
  const FV       = window.FadingVideo;
  const BlurText = window.BlurText;
  const Uploader = window.Uploader;

  const [videoDone, setVideoDone] = useStateHero(false);

  return (
    <section
      className="relative min-h-screen w-full overflow-hidden"
      style={{ background: "#050506" }}
    >
      {/* ── L0: Atmospheric video background ─────────────────────────── */}
      <div className="absolute inset-0 z-0" style={{ opacity: 0.50 }}>
        <FV
          src={HERO_VIDEO_SRC}
          className="absolute left-1/2 top-0 -translate-x-1/2 object-cover object-top"
          style={{ width: "120%", height: "120%" }}
        />
      </div>

      {/* ── L1: Dark depth gradient ───────────────────────────────────── */}
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(to bottom, rgba(5,5,6,0.70) 0%, rgba(5,5,6,0.48) 35%, rgba(5,5,6,0.65) 75%, rgba(5,5,6,0.90) 100%)",
        }}
      />

      {/* ── L2: Ambient indigo blobs ──────────────────────────────────── */}
      <div className="blob-1 z-[2]" />
      <div className="blob-2 z-[2]" />
      <div className="blob-3 z-[2]" />
      <div className="blob-4 z-[2]" />

      {/* ── L3: Technical grid overlay ───────────────────────────────── */}
      <div className="grid-layer z-[3]" />

      {/* ── L4: Noise texture ────────────────────────────────────────── */}
      <div className="noise-layer z-[4]" />

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-4 pb-16">

        {/* ── Logo + título + tagline: desaparecen cuando el vídeo está listo ── */}
        <AnimatePresenceHero>
          {!videoDone && (
            <motionHero.div
              key="hero-text"
              initial={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24, filter: "blur(8px)", transition: { duration: 0.55, ease: [0.4,0,0.2,1] } }}
              style={{ display:"flex", flexDirection:"column", alignItems:"center", width:"100%" }}
            >
              {/* Logo */}
              <motionHero.div {...heroEnter(0.15)} style={{ marginBottom: "2.1em" }}>
                <span style={{
                  fontFamily: "'Cormorant Garamond', 'Cormorant', Georgia, serif",
                  fontStyle: "italic",
                  fontWeight: 600,
                  fontSize: "clamp(9rem, 18vw, 14rem)",
                  letterSpacing: "-2px",
                  lineHeight: 0.9,
                  userSelect: "none",
                  whiteSpace: "nowrap",
                  display: "block",
                }}>
                  <span style={{
                    color: "#EDEDEF",
                    textShadow: "0 0 60px rgba(255,255,255,0.20), 0 0 120px rgba(255,255,255,0.08)",
                  }}>Snufkin</span>
                  <span style={{
                    color: "#7C85E0",
                    textShadow: "0 0 60px rgba(124,133,224,0.60), 0 0 120px rgba(94,106,210,0.30)",
                  }}>Studio</span>
                </span>
              </motionHero.div>

              {/* Título con carrusel */}
              <motionHero.div {...heroEnter(0.55)} className="w-full flex justify-center">
                <div style={{
                  fontFamily: "'Inter', 'Outfit', sans-serif",
                  fontWeight: 700,
                  fontSize: "clamp(1.65rem, 4.5vw, 3.45rem)",
                  lineHeight: 1.1,
                  letterSpacing: "-0.03em",
                  textAlign: "center",
                  color: "#EDEDEF",
                  margin: 0,
                  userSelect: "none",
                  whiteSpace: "nowrap",
                }}>
                  <span>Tu estudio de </span><WordCarousel />
                </div>
              </motionHero.div>

            </motionHero.div>
          )}
        </AnimatePresenceHero>

        <Uploader delay={1.05} onDone={() => setVideoDone(true)} onBack={() => setVideoDone(false)} />
      </div>

      {/* ── Small brand — aparece cuando el hero está oculto ───────── */}
      <AnimatePresenceHero>
        {videoDone && (
          <motionHero.div
            key="small-brand"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "fixed", top: 16, left: 18, zIndex: 50,
              fontFamily: "'Cormorant Garamond', 'Cormorant', Georgia, serif",
              fontStyle: "italic", fontWeight: 600,
              fontSize: "1.5rem", letterSpacing: "-0.5px",
              lineHeight: 1, userSelect: "none", pointerEvents: "none",
            }}
          >
            <img
              src="/static/icon.png"
              style={{ width: 32, height: 32, borderRadius: 8, display: "block" }}
              alt="SnufkinStudio"
            />
          </motionHero.div>
        )}
      </AnimatePresenceHero>
    </section>
  );
}

window.Hero = Hero;
