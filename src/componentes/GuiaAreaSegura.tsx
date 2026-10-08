import { AbsoluteFill, getRemotionEnvironment } from "remotion";
import { areaSegura, recorteGrade, REEL } from "../tema";

// Só no Studio: hachura onde a interface do Instagram cobre o vídeo
// e linha tracejada onde a grade do perfil corta a capa. Nunca sai no render.
export const GuiaAreaSegura: React.FC = () => {
  if (!getRemotionEnvironment().isStudio) return null;

  const faixa: React.CSSProperties = {
    position: "absolute",
    background:
      "repeating-linear-gradient(45deg, rgba(255,255,255,.10) 0 12px, transparent 12px 24px)",
  };
  const corte: React.CSSProperties = {
    position: "absolute",
    left: 0,
    right: 0,
    borderTop: "3px dashed rgba(255,255,255,.45)",
  };

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{ ...faixa, top: 0, left: 0, right: 0, height: areaSegura.topo }}
      />
      <div
        style={{
          ...faixa,
          bottom: 0,
          left: 0,
          right: 0,
          height: areaSegura.base,
        }}
      />
      <div
        style={{
          ...faixa,
          top: areaSegura.topo,
          bottom: areaSegura.base,
          left: 0,
          width: areaSegura.lateral,
        }}
      />
      <div
        style={{
          ...faixa,
          top: areaSegura.topo,
          bottom: areaSegura.base,
          right: 0,
          width: areaSegura.lateral,
        }}
      />
      <div style={{ ...corte, top: recorteGrade.topo }} />
      <div style={{ ...corte, top: REEL.altura - recorteGrade.base }} />
    </AbsoluteFill>
  );
};
