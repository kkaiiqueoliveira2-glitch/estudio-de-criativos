import { AbsoluteFill, useCurrentFrame } from "remotion";

// Vinheta leve e grão de filme sutil. O grão muda a cada quadro pela semente
// (o próprio número do quadro): determinístico, sai igual em todo render.
// `vinheta`: força da borda escura (0..1). Em cena clara ela suja o branco: o v3 baixa.
export const Acabamento: React.FC<{ vinheta?: number }> = ({ vinheta = 0.5 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          background:
            `radial-gradient(ellipse 80% 62% at 50% 46%, transparent 58%, rgba(0, 3, 18, ${vinheta}) 100%)`,
        }}
      />
      <AbsoluteFill style={{ opacity: 0.075, mixBlendMode: "overlay" }}>
        <svg width="100%" height="100%">
          <filter id="grao">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.85"
              numOctaves={2}
              seed={frame}
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grao)" />
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
