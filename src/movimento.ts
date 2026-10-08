import { Easing, interpolate, spring, type SpringConfig } from "remotion";

/**
 * Vocabulário de movimento do criativo v2. Tudo que se mexe usa uma destas
 * curvas, e nenhuma outra: consistência de curva é o que dá cara de produto.
 *
 *   chegada    entra rápido e assenta longo (expo-out): tudo que chega
 *   partida    arranca devagar e sai rápido (expo-in): tudo que sai, whip pan
 *   travessia  suave nas duas pontas: câmera e morph de forma
 *   mola       spring com leve overshoot: só palavra-chave e o que precisa de peso
 *   assentar   spring sem overshoot: interface e câmera parando
 *
 * Tempo sempre em segundos; frame só aparece na conversão (segundos * fps).
 */

export const curva = {
  chegada: Easing.bezier(0.16, 1, 0.3, 1),
  partida: Easing.bezier(0.7, 0, 0.84, 0),
  travessia: Easing.bezier(0.65, 0, 0.35, 1),
} as const;

export type Curva = keyof typeof curva;

export const molas = {
  mola: { damping: 13, stiffness: 170, mass: 0.7 }, // ~9% de overshoot (com 11 passava de 16%)
  assentar: { damping: 200, stiffness: 140, mass: 1 },
} satisfies Record<string, Partial<SpringConfig>>;

export type Mola = keyof typeof molas;

// Progresso 0..1 entre dois instantes (s), com a curva escolhida
export const progresso = (t: number, de: number, ate: number, qual: Curva) =>
  interpolate(t, [de, ate], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: curva[qual],
  });

// Spring que começa no instante `inicio` (s). Física em segundos, então vale
// igual em 30 e 60 fps.
export const molaEm = (
  frame: number,
  fps: number,
  inicio: number,
  qual: Mola,
) => spring({ frame: frame - inicio * fps, fps, config: molas[qual] });

// Interpola um valor entre dois instantes com uma curva
export const entre = (
  t: number,
  de: number,
  ate: number,
  a: number,
  b: number,
  qual: Curva,
) => a + (b - a) * progresso(t, de, ate, qual);
