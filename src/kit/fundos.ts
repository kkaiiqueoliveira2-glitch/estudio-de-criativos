import { comAlfa, cores } from "../tema";
import type { Tema } from "./paleta";

// Fundos de tela do estúdio (criativo v3 em diante): degradê do tema, duas luzes andando
// devagar e um facho de luz atravessando. dx/dy = deslocamento das luzes (paralaxe falsa).
export const FUNDOS: Record<Tema, (t: number, k: number, dx: number, dy: number) => string> = {
  claro: (t, k, dx, dy) =>
    [
      facho(t, k, "rgba(255, 255, 255, .6)"),
      luz(comAlfa(cores.azul800, 0.14), 50 + 16 * Math.sin(t * 0.35 + k) + dx, 34 + 8 * Math.cos(t * 0.28 + k) + dy, 46, 22),
      luz(comAlfa(cores.ceu, 0.3), 50 - 18 * Math.sin(t * 0.3 + k * 2) + dx, 72 + 6 * Math.sin(t * 0.4 + k) + dy, 52, 24),
      `linear-gradient(180deg, ${cores.claroFundo} 0%, ${cores.claroFundo2} 50%, ${cores.gelo} 100%)`,
    ].join(", "),
  vivo: (t, k, dx, dy) =>
    [
      facho(t, k, "rgba(255, 255, 255, .1)"),
      luz(comAlfa(cores.ceu, 0.55), 50 + 16 * Math.sin(t * 0.35 + k) + dx, 34 + 8 * Math.cos(t * 0.28 + k) + dy, 46, 22),
      luz(comAlfa(cores.azul950, 0.5), 50 - 18 * Math.sin(t * 0.3 + k * 2) + dx, 74 + 6 * Math.sin(t * 0.4 + k) + dy, 56, 26),
      `linear-gradient(170deg, ${cores.vivo} 0%, ${cores.azul800} 45%, ${cores.azul900} 100%)`,
    ].join(", "),
  escuro: (t, k, dx, dy) =>
    [
      facho(t, k, "rgba(255, 255, 255, .045)"),
      luz(comAlfa(cores.azul800, 0.6), 50 + 16 * Math.sin(t * 0.35 + k) + dx, 34 + 8 * Math.cos(t * 0.28 + k) + dy, 46, 22),
      luz(comAlfa(cores.azul900, 0.35), 50 - 18 * Math.sin(t * 0.3 + k * 2) + dx, 74 + 6 * Math.sin(t * 0.4 + k) + dy, 52, 24),
      `linear-gradient(180deg, ${cores.azul950} 0%, ${cores.escuroProfundo} 100%)`,
    ].join(", "),
};

const luz = (cor: string, x: number, y: number, w: number, h: number) =>
  `radial-gradient(${w}% ${h}% at ${x}% ${y}%, ${cor}, transparent 70%)`;

const facho = (t: number, k: number, cor: string) => {
  const p = ((t * 9 + k * 37) % 140) - 20;
  return `linear-gradient(115deg, transparent ${p - 5}%, ${cor} ${p}%, transparent ${p + 5}%)`;
};
