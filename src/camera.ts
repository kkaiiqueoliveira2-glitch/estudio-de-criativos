import { noise2D } from "@remotion/noise";
import { Matrix4 } from "three";
import { curva, type Curva } from "./movimento";
import { REEL } from "./tema";

/**
 * Câmera virtual única do criativo v2.
 *
 * Mundo em px, eixo y pra baixo (o do CSS). A câmera olha pro `alvo` de uma
 * distância `dist`; com dist = PERSPECTIVA, o que está no plano do alvo aparece
 * em 1:1 na tela. yaw/pitch/roll giram em volta do alvo (órbita).
 *
 * As camadas DOM (CSS 3D) e o three.js usam a MESMA matriz, tirada do próprio
 * navegador (DOMMatrix da string de transform): o 3D nunca desalinha do 2D.
 */

export const PERSPECTIVA = 2400;

export type Camera = {
  tx: number;
  ty: number;
  tz: number;
  yaw: number; // graus, positivo = câmera vai pra direita em volta do alvo
  pitch: number; // graus, positivo = câmera sobe e olha pra baixo
  roll: number; // graus
  dist: number; // px até o alvo
};

export const CAMERA_PADRAO: Camera = {
  tx: 0,
  ty: 0,
  tz: 0,
  yaw: 0,
  pitch: 0,
  roll: 0,
  dist: PERSPECTIVA,
};

// Chave da trilha: instante (s), valores que mudam e a curva do trecho que chega nela
export type Chave = { t: number; c: Partial<Camera>; curva?: Curva };

export const trilhaDeCamera = (chaves: Chave[]) => {
  const completas: { t: number; c: Camera; curva: Curva }[] = [];
  let atual = CAMERA_PADRAO;
  for (const k of [...chaves].sort((a, b) => a.t - b.t)) {
    atual = { ...atual, ...k.c };
    completas.push({ t: k.t, c: atual, curva: k.curva ?? "travessia" });
  }
  return (t: number): Camera => {
    if (t <= completas[0].t) return completas[0].c;
    const ultima = completas[completas.length - 1];
    if (t >= ultima.t) return ultima.c;
    const i = completas.findIndex((k, n) => t >= k.t && t < completas[n + 1].t);
    const a = completas[i];
    const b = completas[i + 1];
    const p = curva[b.curva]((t - a.t) / (b.t - a.t));
    const mix = (k: keyof Camera) => a.c[k] + (b.c[k] - a.c[k]) * p;
    return {
      tx: mix("tx"),
      ty: mix("ty"),
      tz: mix("tz"),
      yaw: mix("yaw"),
      pitch: mix("pitch"),
      roll: mix("roll"),
      dist: mix("dist"),
    };
  };
};

// A câmera nunca fica 100% parada: deriva mínima por ruído com semente fixa
export const comDeriva = (c: Camera, t: number, forca = 1): Camera => ({
  ...c,
  tx: c.tx + noise2D("camera-x", t * 0.25, 0) * 7 * forca,
  ty: c.ty + noise2D("camera-y", t * 0.22, 3) * 7 * forca,
  yaw: c.yaw + noise2D("camera-yaw", t * 0.2, 11) * 0.35 * forca,
  roll: c.roll + noise2D("camera-roll", t * 0.18, 7) * 0.3 * forca,
});

export const transformDoMundo = (c: Camera) =>
  `translateZ(${PERSPECTIVA - c.dist}px) rotateZ(${c.roll}deg) rotateX(${-c.pitch}deg) rotateY(${-c.yaw}deg) translate3d(${-c.tx}px, ${-c.ty}px, ${-c.tz}px)`;

const matrizDaVista = (c: Camera) => new DOMMatrix(transformDoMundo(c));

// Ponto do mundo -> tela (px da composição) e profundidade na vista
export const projetar = (c: Camera, x: number, y: number, z: number) => {
  const v = matrizDaVista(c).transformPoint(new DOMPoint(x, y, z, 1));
  const escala = PERSPECTIVA / (PERSPECTIVA - v.z);
  return {
    x: REEL.largura / 2 + v.x * escala,
    y: REEL.altura / 2 + v.y * escala,
    z: v.z,
    escala,
  };
};

// Profundidade de campo: desfoque (px) de um ponto pela distância ao plano de foco
// (o plano do alvo, deslocado por `focoZ` quando o foco salta pra outra coisa)
export const desfoque = (
  c: Camera,
  x: number,
  y: number,
  z: number,
  focoZ = 0,
  forca = 1,
) => {
  const { z: profundidade } = projetar(c, x, y, z);
  const planoDeFoco = PERSPECTIVA - c.dist + focoZ;
  return Math.min(10, Math.abs(profundidade - planoDeFoco) * 0.006 * forca);
};

// Mesma vista no three.js (eixo y pra cima, câmera na origem olhando pra -z)
export const fovThree =
  (2 * Math.atan(REEL.altura / 2 / PERSPECTIVA) * 180) / Math.PI;

export const matrizCameraThree = (c: Camera) => {
  const vista = new Matrix4().fromArray(matrizDaVista(c).toFloat64Array());
  const inverteY = new Matrix4().makeScale(1, -1, 1);
  return new Matrix4()
    .makeTranslation(0, 0, -PERSPECTIVA)
    .multiply(inverteY)
    .multiply(vista)
    .multiply(inverteY);
};
