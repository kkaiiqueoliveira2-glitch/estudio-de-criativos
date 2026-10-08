import { useCurrentFrame, useVideoConfig } from "remotion";
import { Destaque, Mascara } from "../componentes/Cinetico";
import { PALETA } from "../kit/paleta";
import { MarcaTexto } from "../kit/efeitos/TextosEfeito";
import { progresso } from "../movimento";
import { comAlfa, cores, FONTE, FONTE_DESTAQUE, peso } from "../tema";
import type { Linha, Tema } from "./plano.mjs";

// Linhas de texto do montador: cada palavra sobe da fenda quando é dita. Linha que começa
// com ">" é fina (contexto); as outras são fortes, com o tamanho pelo comprimento.
// Centradas na área segura (y 300 a 1240) quando não se passa o topo.

const FINO = 74;
const MAX_FORTE = 14; // caracteres por linha forte antes de quebrar em duas
const MAX_FINO = 26;

// Linha longa vira duas (ou mais), quebrando onde as metades ficam mais parecidas:
// a letra fica grande em vez de encolher pra caber
const quebrar = (l: Linha): Linha[] => {
  const fina = l[0]?.texto === ">";
  const tokens = fina ? l.slice(1) : l;
  const chars = tokens.reduce((n, tk) => n + tk.texto.length + 1, 0);
  if (tokens.length < 2 || chars <= (fina ? MAX_FINO : MAX_FORTE)) return [l];
  let melhor = 1;
  let dif = Infinity;
  for (let k = 1; k < tokens.length; k++) {
    const a = tokens.slice(0, k).reduce((n, tk) => n + tk.texto.length + 1, 0);
    if (Math.abs(chars - 2 * a) < dif) {
      dif = Math.abs(chars - 2 * a);
      melhor = k;
    }
  }
  const pre = fina ? [l[0]] : [];
  return [...quebrar([...pre, ...tokens.slice(0, melhor)]), ...quebrar([...pre, ...tokens.slice(melhor)])];
};
const AREA = { topo: 300, base: 1240 };

const medir = (l: Linha) => {
  const fina = l[0]?.texto === ">";
  const tokens = fina ? l.slice(1) : l;
  const chars = tokens.reduce((n, tk) => n + tk.texto.length + 1, 0);
  // linha só de destaque (serifada) curta pode crescer mais: é a palavra que tem que bater
  const soDestaque = !fina && tokens.every((tk) => tk.destaque);
  const tamanho = fina ? FINO : Math.round(Math.min(soDestaque ? 210 : 190, Math.max(96, (soDestaque ? 1900 : 1700) / Math.max(chars, 1))));
  return { fina, tokens, tamanho, altura: tamanho * 1.12 + 14 };
};

export const alturaDasLinhas = (linhas: Linha[]) => linhas.flatMap(quebrar).reduce((h, l) => h + medir(l).altura, 0);

export const Linhas: React.FC<{
  linhas: Linha[];
  tema: Tema;
  topo?: number;
  alinhar?: "centro" | "esquerda";
  sai?: number;
}> = ({ linhas, tema, topo, alinhar = "centro", sai }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const C = PALETA[tema];
  const medidas = linhas.flatMap(quebrar).map(medir);
  const total = medidas.reduce((h, m) => h + m.altura, 0);
  let y = topo ?? AREA.topo + Math.max(0, (AREA.base - AREA.topo - total) / 2);
  const saindo = sai === undefined ? 0 : progresso(t, sai, sai + 0.25, "partida");
  const marcaCor = tema === "claro" ? cores.azul800 : cores.gelo;
  const marcaTexto = tema === "claro" ? cores.neutro50 : cores.azul950;

  return (
    <div style={{ position: "absolute", inset: 0, translate: `0 ${-70 * saindo}px`, opacity: 1 - saindo }}>
      {medidas.map((m, i) => {
        const top = y;
        y += m.altura;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 96,
              right: 96,
              top,
              display: "flex",
              justifyContent: alinhar === "centro" ? "center" : "flex-start",
              alignItems: "baseline",
              gap: "0.26em",
              fontFamily: FONTE,
              fontWeight: m.fina ? peso.fino : peso.extra,
              fontSize: m.tamanho,
              letterSpacing: m.fina ? "-0.01em" : "-0.045em",
              lineHeight: 1.05,
              color: C.texto,
              whiteSpace: "nowrap",
            }}
          >
            {m.tokens.map((tk, k) => {
              const tf = tk.tf ?? tk.t; // quando a palavra é dita
              let conteudo: React.ReactNode = tk.texto;
              if (tk.destaque) {
                conteudo = (
                  <span style={{ fontFamily: FONTE_DESTAQUE, fontStyle: "italic", fontWeight: 400, fontSize: "1.18em", letterSpacing: "-0.01em" }}>
                    <Destaque brilhaEm={tf + 0.3} cor={C.destaque}>
                      {tk.texto}
                    </Destaque>
                  </span>
                );
              }
              if (tk.marca) {
                conteudo = (
                  <MarcaTexto entra={tf + 0.25} cor={marcaCor} corTexto={marcaTexto}>
                    {conteudo}
                  </MarcaTexto>
                );
              }
              if (tk.forte) conteudo = <span style={{ fontWeight: peso.extra }}>{conteudo}</span>;
              if (tk.risca) {
                const r = progresso(t, tf + 0.25, tf + 0.5, "chegada");
                conteudo = (
                  <span style={{ position: "relative", display: "inline-block" }}>
                    <span style={{ opacity: 1 - 0.5 * r }}>{conteudo}</span>
                    <span
                      style={{
                        position: "absolute",
                        left: "-4%",
                        top: "54%",
                        width: "108%",
                        height: "0.11em",
                        borderRadius: 99,
                        backgroundColor: cores.azul800,
                        boxShadow: `0 0 30px ${comAlfa(cores.azul800, 0.8)}`,
                        transformOrigin: "left center",
                        scale: `${r} 1`,
                        rotate: "-6deg",
                      }}
                    />
                  </span>
                );
              }
              return (
                <Mascara key={k} entra={tk.t}>
                  {conteudo}
                </Mascara>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
