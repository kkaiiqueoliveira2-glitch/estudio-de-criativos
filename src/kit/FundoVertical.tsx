import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { type Camera, PERSPECTIVA } from "../camera";
import type { Tema } from "./paleta";
import { FUNDOS } from "./fundos";

// Fundo preso na tela pra uma sequência de cenas empilhadas na vertical (a câmera desce
// de uma pra outra). Na descida, a fronteira entre o fundo de cima e o de baixo passa
// pela tela como uma cortina, no ritmo da câmera.
export type Andar = { y: number; tema: Tema };

export const FundoVertical: React.FC<{ camera: Camera; andares: Andar[] }> = ({ camera, andares }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const t = frame / fps;
  const escala = PERSPECTIVA / camera.dist;
  const dx = -camera.yaw * 0.8;
  const dy = camera.pitch * 0.8;
  return (
    <>
      {andares.map((a, i) => {
        const cima = i === 0 ? -Infinity : (andares[i - 1].y + a.y) / 2;
        const baixo = i === andares.length - 1 ? Infinity : (a.y + andares[i + 1].y) / 2;
        const topo = Math.max(0, height / 2 + (cima - camera.ty) * escala);
        const fim = Math.min(height, height / 2 + (baixo - camera.ty) * escala);
        if (fim <= 0 || topo >= height) return null;
        return (
          <AbsoluteFill
            key={a.y}
            style={{
              background: FUNDOS[a.tema](t, i, dx, dy),
              clipPath: `inset(${topo}px 0 ${height - fim}px 0)`,
            }}
          />
        );
      })}
    </>
  );
};
