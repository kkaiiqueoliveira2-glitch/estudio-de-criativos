import { useCurrentFrame, useVideoConfig } from "remotion";
import { Destaque, Mascara } from "../componentes/Cinetico";
import { Plano } from "../componentes/Mundo";
import type { Tema } from "./paleta";
import { PALETA } from "./paleta";
import { entre, molaEm, progresso } from "../movimento";
import { comAlfa, cores, FONTE, FONTE_DESTAQUE, peso } from "../tema";
import { TextoParticulas } from "./efeitos/TextoParticulas";
import { MarcaTexto } from "./efeitos/TextosEfeito";

// Pergunta com pausa estratégica (kit, 08/10/2026).
// 1. o contexto entra linha a linha;  2. PAUSA: o contexto apaga e a câmera aproxima
// (a música abafa no áudio);  3. a palavra-chave da pergunta BATE grande no drop;
// 4. o resto da pergunta entra embaixo. Tudo dentro da área segura (y 300 a 1240).

export type TemposPergunta = {
  linhas: number[]; // quando cada linha do contexto entra
  pausa: number; // começo da pausa (contexto apaga)
  bate: number; // a palavra-chave bate (drop)
  resto: number; // o resto da pergunta entra
  sai: number; // a cena sai
};

export const CenaPergunta: React.FC<{
  estacao: { x: number; y: number; z: number };
  tema: Tema;
  contexto: { texto: string; forte?: boolean; marca?: boolean }[];
  particulas?: boolean; // a palavra-chave se forma de partículas durante a pausa
  chave: string; // ex.: "Quem"
  resto: string[]; // ex.: ["ele vai", "encontrar?"]
  tempos: TemposPergunta;
}> = ({ estacao, tema, contexto, chave, resto, tempos, particulas }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const C = PALETA[tema];
  const apaga = progresso(t, tempos.pausa, tempos.pausa + 0.5, "travessia");
  const bate = molaEm(frame, fps, tempos.bate, "mola");
  const sai = progresso(t, tempos.sai, tempos.sai + 0.3, "partida");

  const linha = (y: number, tamanho: number, forte?: boolean): React.CSSProperties => ({
    position: "absolute",
    left: 96,
    right: 96,
    top: y,
    display: "flex",
    flexWrap: "wrap",
    columnGap: "0.26em",
    fontFamily: FONTE,
    fontWeight: forte ? peso.extra : peso.fino,
    fontSize: tamanho,
    letterSpacing: forte ? "-0.04em" : "-0.01em",
    lineHeight: 1.05,
    color: C.texto,
  });

  return (
    <Plano {...estacao} largura={1080} altura={1920} style={{ opacity: 1 - sai }}>
      {/* contexto: apaga e sobe na pausa */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 1 - 0.72 * apaga,
          translate: `0 ${-40 * apaga}px`,
          filter: apaga > 0.01 ? `blur(${(2.5 * apaga).toFixed(2)}px)` : undefined,
        }}
      >
        {contexto.map((l, i) => (
          <div key={i} style={linha(330 + i * 102, l.forte ? 98 : 78, l.forte)}>
            {l.marca ? (
              <Mascara entra={tempos.linhas[i]}>
                <MarcaTexto entra={tempos.linhas[i] + 0.3} cor={cores.gelo} corTexto={cores.azul950}>
                  {l.texto}
                </MarcaTexto>
              </Mascara>
            ) : (
              l.texto.split(" ").map((p, k) => (
                <Mascara key={k} entra={tempos.linhas[i] + k * 0.06}>
                  {p}
                </Mascara>
              ))
            )}
          </div>
        ))}
      </div>

      {/* partículas juntando a palavra-chave durante a pausa */}
      {particulas && t >= tempos.pausa - 0.1 && t < tempos.bate + 0.6 ? (
        <TextoParticulas
          texto={chave}
          fonte={`italic 400 300px "${FONTE_DESTAQUE}"`}
          largura={1080}
          altura={1920}
          centroY={790}
          de={tempos.pausa}
          junta={Math.max(0.3, tempos.bate - tempos.pausa - 0.3)}
          espalha={0.3}
          some={tempos.bate + 0.05}
          cores={[cores.ceu, cores.neutro50]}
          passo={5}
          style={{ left: 0, top: 0 }}
        />
      ) : null}

      {/* a palavra-chave bate no drop */}
      {t >= tempos.bate - 0.05 ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 640,
            textAlign: "center",
            fontSize: 300,
            lineHeight: 1,
            scale: String(entre(bate, 0, 1, particulas ? 1.18 : 2.2, 1, "chegada")),
            opacity: Math.min(1, bate * 3),
            filter: `drop-shadow(0 0 ${60 * bate}px ${comAlfa(cores.ceu, 0.55)})`,
          }}
        >
          <Destaque brilhaEm={tempos.bate + 0.15} cor={C.destaque}>
            {chave}
          </Destaque>
        </div>
      ) : null}

      {/* o resto da pergunta */}
      {resto.map((r, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 1000 + i * 118,
            display: "flex",
            justifyContent: "center",
            fontFamily: FONTE,
            fontWeight: peso.extra,
            fontSize: i === resto.length - 1 ? 124 : 104,
            letterSpacing: "-0.045em",
            lineHeight: 1,
            color: C.texto,
          }}
        >
          <Mascara entra={tempos.resto + i * 0.16}>{r}</Mascara>
        </div>
      ))}
    </Plano>
  );
};
