import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { type Camera, PERSPECTIVA } from "../camera";
import type { Tema } from "./paleta";
import { FUNDOS } from "./fundos";

// Fundo preso na tela pra cenas lado a lado (a câmera anda pra direita de uma pra outra).
// No whip, a fronteira entre o fundo de uma cena e o da próxima passa como uma cortina.
export type Estacao = { x: number; tema: Tema };

export const FundoHorizontal: React.FC<{ camera: Camera; estacoes: Estacao[] }> = ({ camera, estacoes }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const t = frame / fps;
  const escala = PERSPECTIVA / camera.dist;
  const dx = -camera.yaw * 0.8;
  const dy = camera.pitch * 0.8;
  return (
    <>
      {estacoes.map((e, i) => {
        const esq = i === 0 ? -Infinity : (estacoes[i - 1].x + e.x) / 2;
        const dir = i === estacoes.length - 1 ? Infinity : (e.x + estacoes[i + 1].x) / 2;
        const a = Math.max(0, width / 2 + (esq - camera.tx) * escala);
        const b = Math.min(width, width / 2 + (dir - camera.tx) * escala);
        if (b <= 0 || a >= width) return null;
        return (
          <AbsoluteFill
            key={e.x}
            style={{ background: FUNDOS[e.tema](t, i, dx, dy), clipPath: `inset(0 ${width - b}px 0 ${a}px)` }}
          />
        );
      })}
    </>
  );
};
