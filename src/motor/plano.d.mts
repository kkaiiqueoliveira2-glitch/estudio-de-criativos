// Tipos do plano.mjs (o planejador é JS puro pra rodar igual no Remotion e no Node)
import type { Caption } from "@remotion/captions";

export type Tema = "escuro" | "claro" | "vivo";
export type Token = { texto: string; t: number; tf?: number; destaque: boolean; marca: boolean; risca: boolean; forte: boolean };
export type Linha = Token[];
export type Som = { t: number; som: string; volume: number };

export type CenaCfg = {
  tipo: "frase" | "pergunta" | "palavras" | "logos" | "celular" | "cta";
  frases?: number[];
  quantas?: number;
  tema?: Tema;
  transicao?: "whip" | "corte";
  camera?: "cortes" | "baixa" | "cima" | "orbita" | "parada";
  legenda?: boolean;
  capitulo?: { n: number; nome: string };
  alinhar?: "centro" | "esquerda";
  [k: string]: unknown;
};

export type ConfigCriativo = { cenas: CenaCfg[]; sons?: { t: number; som: string; volume?: number }[]; [k: string]: unknown };
export type TemposAudio = { duracao: number; fimVoz: number; drop: number; abafa: number; periodo: number; primeiraBatida: number };

export type Cena = {
  i: number;
  tipo: CenaCfg["tipo"];
  cfg: CenaCfg;
  tema: Tema;
  frasesIdx: number[];
  iniciosFrases: number[];
  inicio: number;
  fim: number;
  estacao: { x: number; y: number; z: number };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dados: any;
};

export type Plano = {
  duracao: number;
  cenas: Cena[];
  sons: Som[];
  legenda: { de: number; ate: number; tema: Tema; topo: number }[];
  batida: number;
};

export const ANTECIPA: number;
export const DISTANCIA: number;
export const DESDE: number;
export function normalizar(s: string): string;
export function tokenizar(linha: string): Omit<Token, "t">[];
export type DaMarca = { telas?: string[]; gestos?: Record<string, number[]>; botao?: string };
export function nomesDasTelas(config: ConfigCriativo, padrao?: string[]): string[];
export function planejar(config: ConfigCriativo, legendas: Caption[], tempos: TemposAudio, marca?: DaMarca): Plano;
