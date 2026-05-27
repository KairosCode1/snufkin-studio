// BlurText — IntersectionObserver word-by-word blur-in
const { useEffect: useEffectBT, useRef: useRefBT, useState: useStateBT } = React;
const { motion: motionBT } = window.Motion;

function BlurText({ text, className = "", wordClassName = "" }) {
  const ref = useRefBT(null);
  const [inView, setInView] = useStateBT(false);

  useEffectBT(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => { entries.forEach((e) => { if (e.isIntersecting) { setInView(true); obs.unobserve(el); } }); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const words = text.split(" ");

  return (
    <p ref={ref} className={className} style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", rowGap: "0.1em" }}>
      {words.map((word, i) => (
        <motionBT.span
          key={i}
          className={wordClassName}
          initial={{ filter: "blur(10px)", opacity: 0, y: 50 }}
          animate={inView
            ? { filter: ["blur(10px)", "blur(5px)", "blur(0px)"], opacity: [0, 0.5, 1], y: [50, -5, 0] }
            : { filter: "blur(10px)", opacity: 0, y: 50 }
          }
          transition={{ duration: 0.7, times: [0, 0.5, 1], ease: "easeOut", delay: (i * 100) / 1000 }}
          style={{ display: "inline-block", marginRight: "0.28em", paddingBottom: "0.14em" }}
        >
          {word}
        </motionBT.span>
      ))}
    </p>
  );
}

window.BlurText = BlurText;
