import type { Caption } from "@remotion/captions";
import { Audio } from "@remotion/media";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { ThreeCanvas } from "@remotion/three";
import { useMemo } from "react";
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { type Chave, comDeriva, PERSPECTIVA, trilhaDeCamera } from "../camera";
import { Acabamento } from "../componentes/Acabamento";
import { GuiaAreaSegura } from "../componentes/GuiaAreaSegura";
import { CameraNoThree, Mundo } from "../componentes/Mundo";
import { useMedidas } from "../kit/espera";
import { type Icone, Icones3D } from "../kit/Icones3D";
import { LegendaPilula } from "../kit/LegendaPilula";
import { iconesExplosao } from "../kit/ExplosaoDeLogos";
import { FundoHorizontal } from "../kit/FundoHorizontal";
import { progresso } from "../movimento";
import { cores, misturar } from "../tema";
import { CenaCelular, CenaCTA, CenaFrase, CenaLogos, CenaPalavras, CenaPergunta } from "./Cenas";
import { type Cena, type ConfigCriativo, planejar, type DaMarca, type Plano, type TemposAudio } from "./plano.mjs";

// Montador de criativos (08/10/2026): o vídeo inteiro sai de public/criativos/<nome>/
// (criativo.json + áudio montado pelo scripts/criativo.mjs). Nenhum código por vídeo:
// câmera, ângulos, fundo, tempos de cada palavra e efeitos saem do plano.

export type CriativoProps = {
  nome: string;
  rascunho: boolean;
  config: ConfigCriativo | null;
  legendas: Caption[];
  tempos: TemposAudio | null;
  marca: DaMarca; // telas padrão, gestos de rolagem delas e texto do botão (Root.tsx)
};

const P = PERSPECTIVA;
const CENAS: Record<Cena["tipo"], React.FC<{ c: Cena }>> = {
  frase: CenaFrase,
  pergunta: CenaPergunta,
  palavras: CenaPalavras,
  logos: CenaLogos,
  celular: CenaCelular,
  cta: CenaCTA,
};

export const Criativo: React.FC<CriativoProps> = ({ nome, rascunho, config, legendas, tempos, marca }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const plano = useMemo(() => (config && tempos ? planejar(config, legendas, tempos, marca) : null), [config, legendas, tempos, marca]);
  const extra = useMemo(() => (plano && tempos ? montar(plano, tempos) : null), [plano, tempos]);
  const prontas = useMedidas(() => true);
  if (!plano || !extra || !tempos || !prontas) return <AbsoluteFill style={{ backgroundColor: cores.azul950 }} />;

  const rapido = !rascunho && extra.rapidas.some((j) => t >= j.de && t < j.ate);
  const flash = extra.flashes.reduce((m, f) => Math.max(m, t >= f ? 1 - progresso(t, f, f + 0.16, "chegada") : 0), 0);
  const atual = plano.cenas.find((c) => t >= c.inicio && t < c.fim) ?? plano.cenas[0];
  const pasta = `criativos/${nome}`;

  return (
    <AbsoluteFill style={{ backgroundColor: cores.azul950 }}>
      <CameraMotionBlur samples={rapido ? 8 : 1} shutterAngle={rapido ? 180 : 360}>
        <Visual plano={plano} camera={extra.camera} icones={extra.icones} />
      </CameraMotionBlur>
      {[300, 468].map((topo) => (
        <LegendaPilula key={topo} legendas={legendas} janelas={plano.legenda.filter((j) => j.topo === topo)} topo={topo} />
      ))}
      {flash > 0 ? <AbsoluteFill style={{ backgroundColor: misturar(cores.gelo, "#FFFFFF", 0.4), opacity: 0.55 * flash, mixBlendMode: "screen" }} /> : null}
      <Acabamento vinheta={atual.tema === "claro" ? 0.16 : 0.45} />
      {/* som pro preview no Studio; o render final mixa fora (scripts/criativo.mjs) */}
      <Audio src={staticFile(`${pasta}/narracao.mp3`)} />
      <Audio src={staticFile(`${pasta}/trilha.mp3`)} />
      {plano.sons.map((s, i) => (
        <Sequence key={i} from={Math.max(0, Math.round(s.t * fps))} layout="none">
          <Audio src={staticFile(`som/sfx-n/${s.som}.wav`)} volume={s.volume} />
        </Sequence>
      ))}
      <GuiaAreaSegura />
    </AbsoluteFill>
  );
};

const Visual: React.FC<{ plano: Plano; camera: (t: number) => ReturnType<ReturnType<typeof trilhaDeCamera>>; icones: Icone[] }> = ({
  plano,
  camera,
  icones,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const cam = comDeriva(camera(t), t);
  const visiveis = icones.filter((ic) => t >= ic.entra - 0.1 && (ic.sai === undefined || t < ic.sai + 0.5));
  return (
    <AbsoluteFill>
      <FundoHorizontal camera={cam} estacoes={plano.cenas.map((c) => ({ x: c.estacao.x, tema: c.tema }))} />
      {visiveis.length ? (
        <ThreeCanvas width={width} height={height} flat>
          <CameraNoThree camera={cam} />
          <Icones3D icones={visiveis} todos={icones} />
        </ThreeCanvas>
      ) : null}
      <Mundo camera={cam}>
        {plano.cenas.map((c) => {
          const Comp = CENAS[c.tipo];
          return t >= c.inicio - 0.5 && t < c.fim + 0.6 ? <Comp key={c.i} c={c} /> : null;
        })}
      </Mundo>
    </AbsoluteFill>
  );
};

// Câmera, ícones e flashes a partir do plano
const montar = (plano: Plano, tempos: TemposAudio) => {
  const corte = (t: number, c: Chave["c"]): Chave[] => [
    { t: t - 0.001, c: {} },
    { t, c },
  ];
  const chaves: Chave[] = [];
  const rapidas: { de: number; ate: number }[] = [{ de: tempos.drop, ate: tempos.drop + 0.35 }];
  const flashes: number[] = [tempos.drop];
  const icones: Icone[] = [];

  plano.cenas.forEach((c, i) => {
    const E = c.estacao;
    if (i === 0) {
      chaves.push({ t: 0, c: { tx: E.x, ty: E.y - 50, tz: E.z, yaw: 5, pitch: -2, roll: -3, dist: 1.08 * P } });
      chaves.push({ t: 0.9, curva: "chegada", c: { ty: E.y, yaw: 1.5, pitch: -1, roll: -0.8, dist: P } });
    } else {
      const A = plano.cenas[i - 1].estacao;
      if (c.cfg.transicao === "corte") {
        chaves.push({ t: c.inicio - 0.001, c: {} });
        chaves.push({ t: c.inicio, c: { tx: E.x, ty: E.y, tz: E.z, yaw: 6, roll: -4, dist: 1.4 * P } });
        chaves.push({ t: c.inicio + 0.55, curva: "chegada", c: { yaw: 0, roll: 0, dist: P } });
      } else {
        const dur = 0.34;
        chaves.push({ t: c.inicio - dur, c: { tx: A.x, ty: A.y, tz: A.z } });
        chaves.push({ t: c.inicio - dur / 2, curva: "partida", c: { tx: (A.x + E.x) / 2, yaw: -7, roll: -2 } });
        chaves.push({ t: c.inicio, curva: "chegada", c: { tx: E.x, ty: E.y, tz: E.z, yaw: 0, pitch: 0, roll: 0, dist: P } });
        rapidas.push({ de: c.inicio - 0.38, ate: c.inicio + 0.06 });
      }
    }
    const d = c.dados;
    const estilo = c.cfg.camera ?? { palavras: "batida", pergunta: "pausa", logos: "orbita", celular: "baixa", cta: "parada", frase: "cortes" }[c.tipo];

    if (estilo === "batida" && c.tipo === "palavras") {
      d.palavras.forEach((p: { t: number }, k: number) => {
        const ultimo = k === d.palavras.length - 1;
        chaves.push(...corte(p.t, ultimo ? { yaw: 0, pitch: -6, roll: 0, dist: 0.9 * P } : { yaw: k % 2 ? -9 : 9, roll: k % 2 ? 2 : -2, dist: (0.96 - 0.02 * k) * P }));
        flashes.push(p.t);
      });
    } else if (estilo === "pausa" && c.tipo === "pergunta") {
      chaves.push({ t: d.pausa, c: {} });
      chaves.push({ t: d.chave.t - 0.02, curva: "travessia", c: { dist: 0.9 * P } });
      chaves.push({ t: d.chave.t, c: { dist: 1.12 * P, roll: 3 } });
      chaves.push({ t: d.chave.t + 0.5, curva: "chegada", c: { dist: 0.97 * P, roll: 0 } });
      flashes.push(d.chave.t);
    } else if (estilo === "orbita") {
      chaves.push(...corte(c.inicio + 0.35, { yaw: 9, pitch: -3, dist: 0.98 * P }));
      chaves.push({ t: c.fim - 0.4, curva: "travessia", c: { yaw: -10, pitch: -5, dist: 0.95 * P } });
    } else if (estilo === "baixa") {
      chaves.push(...corte(c.inicio + 0.3, { pitch: -11, yaw: 8, dist: 1.04 * P, ty: E.y + 120 }));
      chaves.push({ t: Math.min(c.fim - 0.4, (d.rola ?? c.inicio + 1) + 0.6), curva: "chegada", c: { pitch: -4, yaw: -6, dist: 0.92 * P, ty: E.y + 70 } });
    } else if (estilo === "cima") {
      chaves.push(...corte(c.inicio + 0.3, { pitch: 15, dist: 1.06 * P }));
      chaves.push({ t: c.inicio + 0.9, curva: "chegada", c: { pitch: 2, dist: 0.94 * P } });
    } else if (estilo === "cortes") {
      c.iniciosFrases.slice(1).forEach((f, k) => {
        chaves.push(...corte(f, { yaw: k % 2 ? 8 : -8, roll: k % 2 ? -1.5 : 1.5, dist: (0.97 - 0.02 * k) * P }));
      });
      chaves.push({ t: c.fim - 0.36, curva: "travessia", c: { dist: 0.95 * P } });
    } else if (estilo === "parada" && c.tipo === "cta") {
      chaves.push({ t: d.logo - 0.001, curva: "travessia", c: { dist: 0.96 * P } });
      chaves.push({ t: d.logo, c: { dist: 1.08 * P } });
      chaves.push({ t: tempos.duracao, curva: "travessia", c: { dist: 0.95 * P } });
    }

    if (c.tipo === "logos") {
      icones.push(
        ...iconesExplosao(
          E,
          d.logos.map((l: { logo: string }) => l.logo),
          d.logos.map((l: { t: number }) => l.t),
          c.fim - 0.3,
        ),
      );
    }
  });

  chaves.sort((a, b) => a.t - b.t);
  return { camera: trilhaDeCamera(chaves), rapidas, flashes, icones };
};
