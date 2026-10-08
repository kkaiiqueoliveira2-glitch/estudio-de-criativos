import { useCurrentFrame, useVideoConfig } from "remotion";
import { Letras } from "../componentes/Cinetico";
import { TextoRGB } from "./efeitos/TextosEfeito";
import { Plano } from "../componentes/Mundo";
import type { Tema } from "./paleta";
import { PALETA } from "./paleta";
import { entre, molaEm, progresso } from "../movimento";
import { comAlfa, cores, FONTE, peso } from "../tema";

// Palavras batendo na batida (kit, 08/10/2026): uma palavra por tempo forte,
// enorme no centro, com o número da etapa em cima. A anterior sai pra cima borrando.
// O flash e o corte de ângulo de câmera ficam com quem usa (na batida certa).

export const PalavrasNaBatida: React.FC<{
  estacao: { x: number; y: number; z: number };
  tema: Tema;
  palavras: string[];
  batidas: number[]; // instante de cada palavra (na grade da música)
  numerar?: boolean;
  rgb?: boolean; // cores separadas em RGB, com tranco em cada batida
  sai: number;
}> = ({ estacao, tema, palavras, batidas, numerar = true, rgb, sai }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const C = PALETA[tema];
  const atual = batidas.reduce((acc, b, i) => (t >= b - 0.02 ? i : acc), -1);
  const saindo = progresso(t, sai, sai + 0.3, "partida");

  return (
    <Plano {...estacao} largura={1080} altura={1920} style={{ opacity: 1 - saindo }}>
      {palavras.map((p, i) => {
        if (i < atual - 1 || i > atual) return null;
        const entra = molaEm(frame, fps, batidas[i], "mola");
        const vai = i < atual ? progresso(t, batidas[i + 1] - 0.02, batidas[i + 1] + 0.22, "partida") : 0;
        if (vai >= 1) return null;
        return (
          <div
            key={p}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              translate: `0 ${-260 * vai}px`,
              opacity: 1 - vai,
              filter: vai > 0.01 ? `blur(${(14 * vai).toFixed(1)}px)` : undefined,
            }}
          >
            {numerar ? (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 640,
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    padding: "10px 30px",
                    borderRadius: 999,
                    backgroundColor: tema === "claro" ? cores.azul800 : "rgba(255, 255, 255, .16)",
                    border: `2px solid ${C.linha}`,
                    fontFamily: FONTE,
                    fontWeight: peso.extra,
                    fontSize: 46,
                    color: cores.neutro50,
                    scale: String(entre(entra, 0, 1, 0.6, 1, "chegada")),
                  }}
                >
                  0{i + 1}
                </div>
              </div>
            ) : null}
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 760,
                display: "flex",
                justifyContent: "center",
                fontFamily: FONTE,
                fontWeight: peso.extra,
                fontSize: 168,
                letterSpacing: "-0.05em",
                lineHeight: 1,
                color: C.texto,
                scale: String(entre(entra, 0, 1, 1.5, 1, "chegada")),
                textShadow: tema === "claro" ? `0 24px 50px ${comAlfa(cores.azul950, 0.18)}` : "0 0 60px rgba(255, 255, 255, .35)",
              }}
            >
              {rgb ? (
                <TextoRGB texto={p} batidas={[batidas[i], batidas[i] + 0.24]} />
              ) : (
                <Letras texto={p} entra={batidas[i]} passo={0.02} />
              )}
            </div>
          </div>
        );
      })}
    </Plano>
  );
};
