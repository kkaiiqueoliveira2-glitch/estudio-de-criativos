import { useCurrentFrame, useVideoConfig } from "remotion";
import { Destaque, Mascara } from "../componentes/Cinetico";
import { TextoGradiente } from "./efeitos/TextosEfeito";
import { Plano } from "../componentes/Mundo";
import type { Tema } from "./paleta";
import type { Icone } from "./Icones3D";
import { PALETA } from "./paleta";
import { progresso } from "../movimento";
import { FONTE, peso } from "../tema";

// Explosão de logos (kit, 08/10/2026): os ícones 3D (Icones3D, logo oficial na
// face) saem do centro e abrem num anel em volta da frase; a frase troca no meio.
// O anel fica dentro da área segura (logos também não podem sair dela).

const CENTRO = { x: 540, y: 880 };
const RAIO = { x: 400, y: 330 };

// Ângulos que evitam a linha da frase (nada em 0° nem 180°)
const ANGULOS = [-150, -110, -70, -30, 30, 70, 110, 150];

export const iconesExplosao = (
  estacao: { x: number; y: number; z: number },
  logos: string[],
  entradas: number[],
  sai: number,
): Icone[] => {
  const noMundo = (x: number, y: number, z = 0) => ({
    x: estacao.x + x - 540,
    y: estacao.y + y - 960,
    z: estacao.z + z,
  });
  return logos.map((logo, i) => {
    const a = (ANGULOS[i % ANGULOS.length] * Math.PI) / 180;
    return {
      logo,
      ...noMundo(CENTRO.x + Math.cos(a) * RAIO.x, CENTRO.y + Math.sin(a) * RAIO.y, 60),
      de: noMundo(CENTRO.x, CENTRO.y, -200),
      entra: entradas[i],
      sai: sai + i * 0.02,
      lado: 150,
      semente: i * 5 + 2,
    };
  });
};

export const ExplosaoDeLogos: React.FC<{
  estacao: { x: number; y: number; z: number };
  tema: Tema;
  frase1: [string, string]; // [linha fina, palavra destaque]
  frase2: [string, string];
  entra: number;
  troca: number;
  sai: number;
  gradiente?: string[]; // degradê animado na palavra de destaque da segunda frase
}> = ({ estacao, tema, frase1, frase2, entra, troca, sai, gradiente }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const C = PALETA[tema];
  const saindo = progresso(t, sai, sai + 0.3, "partida");
  const bloco = (frase: [string, string], de: number, ate: number, cores?: string[]) => (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: CENTRO.y - 110,
        textAlign: "center",
        color: C.texto,
        opacity: 1 - progresso(t, ate, ate + 0.2, "partida"),
      }}
    >
      <div style={{ fontFamily: FONTE, fontWeight: peso.fino, fontSize: 66, display: "flex", justifyContent: "center", gap: "0.26em" }}>
        {frase[0].split(" ").map((p, k) => (
          <Mascara key={k} entra={de + k * 0.06} sai={ate}>
            {p}
          </Mascara>
        ))}
      </div>
      <div style={{ fontSize: 132, lineHeight: 1.05 }}>
        <Mascara entra={de + 0.25} sai={ate}>
          {cores ? (
            <TextoGradiente cores={cores} style={{ fontFamily: "Instrument Serif", fontStyle: "italic" }}>
              {frase[1]}
            </TextoGradiente>
          ) : (
            <Destaque brilhaEm={de + 0.5} cor={C.destaque}>
              {frase[1]}
            </Destaque>
          )}
        </Mascara>
      </div>
    </div>
  );
  return (
    <Plano {...estacao} largura={1080} altura={1920} style={{ opacity: 1 - saindo }}>
      {bloco(frase1, entra, troca - 0.2)}
      {t >= troca - 0.1 ? bloco(frase2, troca, sai + 10, gradiente) : null}
    </Plano>
  );
};
