// Hero section
const { motion: motionHero } = window.Motion;

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

        {/* ── Logo ── */}
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

        {/* ── Título (-10%) ── */}
        <motionHero.div {...heroEnter(0.55)} className="w-full flex justify-center">
          <BlurText
            text="Crea tus subtítulos en segundos"
            wordClassName="bg-gradient-to-b from-[#EDEDEF] via-white/95 to-white/70 bg-clip-text text-transparent"
            className="text-[2.4rem] md:text-[3.6rem] lg:text-[4.95rem] font-heading font-semibold leading-[1.06] max-w-4xl justify-center tracking-[-0.03em]"
          />
        </motionHero.div>

        <motionHero.p
          {...heroEnter(0.85)}
          className="mt-5 text-sm md:text-base max-w-xs font-light leading-relaxed"
          style={{ color: "#8A8F98", fontFamily: "'Inter', sans-serif" }}
        >
          Herramienta gratuita. Sin registro.
        </motionHero.p>

        <Uploader delay={1.05} />
      </div>
    </section>
  );
}

window.Hero = Hero;
