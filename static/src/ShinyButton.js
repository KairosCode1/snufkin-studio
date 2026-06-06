// ShinyButton — animated conic-gradient border button
// CSS injected once into <head> so it works without styled-jsx / CSS modules.
(function () {
  const STYLE_ID = "__shiny-btn-styles__";
  if (!document.getElementById(STYLE_ID)) {
    const el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = `
      @property --gradient-angle {
        syntax: "<angle>";
        initial-value: 0deg;
        inherits: false;
      }
      @property --gradient-angle-offset {
        syntax: "<angle>";
        initial-value: 0deg;
        inherits: false;
      }
      @property --gradient-percent {
        syntax: "<percentage>";
        initial-value: 5%;
        inherits: false;
      }
      @property --gradient-shine {
        syntax: "<color>";
        initial-value: white;
        inherits: false;
      }

      .shiny-cta {
        --shiny-cta-bg: #050506;
        --shiny-cta-bg-subtle: #16163a;
        --shiny-cta-fg: #ffffff;
        --shiny-cta-highlight: #5E6AD2;
        --shiny-cta-highlight-subtle: #818cf8;
        --animation: gradient-angle linear infinite;
        --duration: 3s;
        --shadow-size: 2px;
        --transition: 800ms cubic-bezier(0.25, 1, 0.5, 1);

        isolation: isolate;
        position: relative;
        overflow: hidden;
        cursor: pointer;
        outline-offset: 4px;
        padding: 22px 63px;
        font-family: "Outfit", "Inter", sans-serif;
        font-size: 22px;
        line-height: 1.2;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        border: 1px solid transparent;
        border-radius: 360px;
        color: var(--shiny-cta-fg);
        background:
          linear-gradient(var(--shiny-cta-bg), var(--shiny-cta-bg)) padding-box,
          conic-gradient(
            from calc(var(--gradient-angle) - var(--gradient-angle-offset)),
            transparent,
            var(--shiny-cta-highlight) var(--gradient-percent),
            var(--gradient-shine) calc(var(--gradient-percent) * 2),
            var(--shiny-cta-highlight) calc(var(--gradient-percent) * 3),
            transparent calc(var(--gradient-percent) * 4)
          ) border-box;
        box-shadow:
          inset 0 0 0 1px var(--shiny-cta-bg-subtle),
          0 0 0 1px rgba(94,106,210,0.35),
          0 4px 28px rgba(94,106,210,0.30);
        transition: var(--transition);
        transition-property: --gradient-angle-offset, --gradient-percent, --gradient-shine, box-shadow, transform;
      }

      /* Shared base for button pseudo-elements only (NOT span::before) */
      .shiny-cta::before,
      .shiny-cta::after {
        content: "";
        pointer-events: none;
        position: absolute;
        inset-inline-start: 50%;
        inset-block-start: 50%;
        translate: -50% -50%;
        z-index: -1;
      }

      .shiny-cta:active {
        translate: 0 1px;
      }

      /* Dots pattern */
      .shiny-cta::before {
        --size: calc(100% - var(--shadow-size) * 3);
        --position: 2px;
        --space: calc(var(--position) * 2);
        width: var(--size);
        height: var(--size);
        background: radial-gradient(
          circle at var(--position) var(--position),
          rgba(255,255,255,0.55) calc(var(--position) / 4),
          transparent 0
        ) padding-box;
        background-size: var(--space) var(--space);
        background-repeat: space;
        mask-image: conic-gradient(
          from calc(var(--gradient-angle) + 45deg),
          black,
          transparent 10% 90%,
          black
        );
        border-radius: inherit;
        opacity: 0.4;
        z-index: -1;
      }

      /* Inner shimmer */
      .shiny-cta::after {
        --animation: shimmer-shiny linear infinite;
        width: 100%;
        aspect-ratio: 1;
        background: linear-gradient(
          -50deg,
          transparent,
          var(--shiny-cta-highlight),
          transparent
        );
        mask-image: radial-gradient(circle at bottom, transparent 40%, black);
        opacity: 0.6;
      }

      .shiny-cta span {
        position: relative;
        z-index: 1;
        pointer-events: none;
      }

      /* Animate */
      .shiny-cta,
      .shiny-cta::before,
      .shiny-cta::after {
        animation:
          var(--animation) var(--duration),
          var(--animation) calc(var(--duration) / 0.4) reverse paused;
        animation-composition: add;
      }

      .shiny-cta:is(:hover, :focus-visible) {
        --gradient-percent: 20%;
        --gradient-angle-offset: 95deg;
        --gradient-shine: var(--shiny-cta-highlight-subtle);
        box-shadow:
          inset 0 0 0 1px var(--shiny-cta-bg-subtle),
          0 0 0 1px rgba(94,106,210,0.65),
          0 8px 36px rgba(94,106,210,0.55),
          inset 0 1px 0 rgba(255,255,255,0.10);
        transform: translateY(-2px);
      }

      .shiny-cta:is(:hover, :focus-visible),
      .shiny-cta:is(:hover, :focus-visible)::before,
      .shiny-cta:is(:hover, :focus-visible)::after {
        animation-play-state: running;
      }

      @keyframes gradient-angle {
        to { --gradient-angle: 360deg; }
      }

      @keyframes shimmer-shiny {
        to { rotate: 360deg; }
      }
    `;
    document.head.appendChild(el);
  }
})();

function ShinyButton({ children, onClick, className = "" }) {
  return (
    <button className={`shiny-cta ${className}`} onClick={onClick}>
      <span>{children}</span>
    </button>
  );
}

window.ShinyButton = ShinyButton;
