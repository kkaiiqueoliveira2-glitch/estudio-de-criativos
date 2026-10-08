import type { Caption } from "@remotion/captions";
import { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { paginar } from "../legendas";
import { molaEm, progresso } from "../movimento";
import { comAlfa, cores, FONTE, peso } from "../tema";
import type { Tema } from "./paleta";

// Legenda em pílula: 2-3 palavras (branca na cena escura, escura na
// clara), a palavra dita ganha a cor de destaque. Troca de cara com a do v2
// (texto solto com retângulo azul), pedido de 08/10/2026.

const SEGURA = 0.4;
const ANTECIPA = 0.1; // o texto entra um pouco antes da palavra (o mesmo do plano.mjs)

export type JanelaLegenda = { de: number; ate: number; tema: Tema };

export const LegendaPilula: React.FC<{
  legendas: Caption[];
  janelas: JanelaLegenda[];
  topo: number;
  tamanho?: number;
}> = ({ legendas, janelas, topo, tamanho = 54 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const paginas = useMemo(
    () =>
      paginar(legendas)
        .map((p) => ({ ...p, de: p.inicioMs / 1000 - ANTECIPA, ate: p.fimMs / 1000 }))
        .map((p) => ({ ...p, janela: janelas.find((j) => p.de >= j.de && p.de < j.ate) }))
        .filter((p) => p.janela !== undefined),
    [legendas, janelas],
  );

  const fimVisivel = (i: number) =>
    Math.min(paginas[i + 1]?.de ?? Infinity, paginas[i].ate + SEGURA, paginas[i].janela!.ate);
  const i = paginas.findIndex((p, n) => t >= p.de && t < fimVisivel(n));
  if (i === -1) return null;

  const pagina = paginas[i];
  const tema = pagina.janela!.tema;
  const clara = tema === "claro";
  const emendada = i > 0 && fimVisivel(i - 1) === pagina.de;
  const entra = molaEm(frame, fps, pagina.de, "mola");
  const sai = paginas[i + 1]?.de === fimVisivel(i) ? 0 : progresso(t, fimVisivel(i) - 0.14, fimVisivel(i), "partida");
  const atual = pagina.palavras.reduce((acc, p, n) => (t + ANTECIPA >= p.startMs / 1000 ? n : acc), -1);

  return (
    <div style={{ position: "absolute", top: topo, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          padding: "14px 34px 16px",
          borderRadius: 999,
          backgroundColor: clara ? cores.azul950 : cores.neutro50,
          boxShadow: clara ? `0 14px 34px ${comAlfa(cores.azul950, 0.28)}` : `0 14px 34px ${comAlfa(cores.sombra, 0.45)}`,
          fontFamily: FONTE,
          fontWeight: peso.extra,
          fontSize: tamanho,
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
          color: clara ? cores.neutro50 : cores.azul950,
          whiteSpace: "nowrap",
          scale: String(emendada ? 0.96 + 0.04 * entra : 0.7 + 0.3 * entra),
          opacity: (emendada ? 1 : Math.min(1, entra * 2)) * (1 - sai),
        }}
      >
        {pagina.palavras.map((p, n) => (
          <span key={p.startMs} style={{ color: n === atual ? (clara ? cores.ceu : cores.azul800) : undefined }}>
            {n > 0 ? " " : null}
            {p.text.trim()}
          </span>
        ))}
      </div>
    </div>
  );
};
