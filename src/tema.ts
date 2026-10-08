import type { CSSProperties } from "react";
import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";
import marca from "../public/marca/marca.json";

/**
 * Tema dos vídeos. Tudo que é da marca (nome, logo, cores, fontes) vem de
 * public/marca/marca.json: trocar a marca é trocar aquele arquivo, não este.
 *
 * Os nomes internos vêm da primeira marca do estúdio (azul e branco):
 * azul800 = cor principal, azul950 = escuro, neutro50 = claro, ceu = suave.
 */

export const MARCA = {
  nome: marca.nome,
  site: marca.site,
  logo: marca.logo,
  botao: marca.botao,
};

// ── Fonte ────────────────────────────────────────────────────────────────────
// Fonte do texto: um arquivo por peso (o vídeo usa 300 e 800; os outros são opcionais).
// Fonte de destaque: a palavra que bate, em itálico de verdade (o itálico sintético foi
// vetado em 07/10/2026).

export const FONTE = marca.fontes.texto.familia;

const carregandoTexto = Object.entries(marca.fontes.texto.pesos as Record<string, string>).map(([p, url]) =>
  loadFont({
    family: FONTE,
    url: staticFile(url),
    weight: p,
  }),
);

export const FONTE_DESTAQUE = marca.fontes.destaque.familia;

const carregandoDestaque = loadFont({
  family: FONTE_DESTAQUE,
  url: staticFile(marca.fontes.destaque.arquivo),
  style: "italic",
  weight: "400",
});

// Resolve quando todas as fontes estão no documento: medir texto só depois disso
export const fontesProntas = Promise.all([
  ...carregandoTexto,
  carregandoDestaque,
]);

export const peso = {
  fino: 300,
  regular: 400,
  medio: 500,
  semi: 600,
  negrito: 700,
  extra: 800,
} as const;

// ── Cores ────────────────────────────────────────────────────────────────────
// O marca.json precisa só de principal, escuro e claro (suave é opcional); as outras
// saem misturadas dessas, e a marca pode fixar qualquer uma delas no arquivo.

const rgb = (hex: string) => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

// mistura a cor `a` com `b` (p = 0 é `a`, 1 é `b`)
export const misturar = (a: string, b: string, p: number) => {
  const x = rgb(a);
  const y = rgb(b);
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * p).toString(16).padStart(2, "0")).join("")}`;
};

export const comAlfa = (hex: string, a: number) => `rgba(${rgb(hex).join(", ")}, ${a})`;

const M = marca.cores as Record<string, string | undefined> & { principal: string; escuro: string; claro: string };
const suave = M.suave ?? misturar(M.principal, "#FFFFFF", 0.45);
const gelo = M.gelo ?? misturar(suave, "#FFFFFF", 0.75);

export const cores = {
  azul800: M.principal, // destaque / CTA: botão, selo, card em destaque
  azul900: M.principal2 ?? misturar(M.principal, "#000000", 0.18), // segundo tom de degradê
  azul950: M.escuro, // fundo escuro e texto principal sobre fundo claro
  neutro50: M.claro, // fundo claro e texto sobre fundo escuro
  neutro100: "#F5F5F5", // fundo de bloco/card claro
  neutro200: "#E6E6E6", // linhas, bordas e destaque escrito sobre fundo escuro
  branco: "#FFFFFF",
  ceu: suave, // luz suave dos fundos e brilho das palavras
  gelo, // destaque escrito sobre a cor principal
  vivo: M.principalVivo ?? misturar(M.principal, "#FFFFFF", 0.06), // topo do degradê vivo
  brilho: M.brilho ?? misturar(M.principal, "#FFFFFF", 0.25), // aura de logo e botão
  escuroProfundo: M.escuroProfundo ?? misturar(M.escuro, "#000000", 0.4), // base do degradê escuro
  claroFundo: M.claroFundo ?? misturar(gelo, "#FFFFFF", 0.8), // topo do degradê claro
  claroFundo2: M.claroFundo2 ?? misturar(gelo, "#FFFFFF", 0.45), // meio do degradê claro
  sombra: misturar(M.escuro, "#000000", 0.55), // sombra com o tom da marca

  // Paleta natureza (jun/2026), usada só no criativo v2
  petroleo: "#4E8A9E",
  navyProfundo: "#0B1A33",
};

// Regra de contraste do guia: o 800 é cor de preenchimento. Sobre o 950 ele some,
// então ali o destaque escrito sai em neutro. Sobre fundo claro o 800 vira texto.
export const temas = {
  escuro: {
    fundo: cores.azul950,
    texto: cores.neutro50,
    destaque: cores.neutro200,
    preenchimento: cores.azul800,
  },
  claro: {
    fundo: cores.neutro50,
    texto: cores.azul950,
    destaque: cores.azul800,
    preenchimento: cores.azul800,
  },
} as const;

// ── Tipografia ───────────────────────────────────────────────────────────────

export const tipo = {
  // Título: Outfit 800, letter-spacing apertado
  titulo: {
    fontFamily: FONTE,
    fontWeight: peso.extra,
    letterSpacing: "-0.04em",
    lineHeight: 1.02,
  },
  // Palavra de destaque dentro do título: 300 itálico
  destaque: {
    fontFamily: FONTE,
    fontWeight: peso.fino,
    fontStyle: "italic",
  },
  // Texto corrido: 300, com 700 nas palavras-chave (tipo.forte)
  corpo: {
    fontFamily: FONTE,
    fontWeight: peso.fino,
    lineHeight: 1.3,
  },
  forte: {
    fontWeight: peso.negrito,
  },
} satisfies Record<string, CSSProperties>;

// Tamanhos no quadro de 1080 de largura (títulos 100-118, corpo 36-46, a faixa dos stories)
export const tamanho = {
  display: 112,
  titulo: 88,
  subtitulo: 56,
  corpo: 44,
  legenda: 36,
  mini: 28,
} as const;

// ── Espaçamento e forma ──────────────────────────────────────────────────────
// O design-guide não define escala de espaçamento: base 8 no quadro de 1080.

export const espaco = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 40,
  xl: 64,
  xxl: 96,
} as const;

export const raio = {
  card: 8, // guia: cards com raio suave de 6-8px
  pilula: 999, // botões em pílula (identidade/web)
} as const;

export const logo = {
  larguraMin: 120,
  larguraMax: 200,
} as const;

// ── Reels (1080x1920) ────────────────────────────────────────────────────────

export const REEL = {
  largura: 1080,
  altura: 1920,
  fps: 30,
} as const;

// Área segura de anúncio da Meta pra Reels/Stories: topo 14%, base 35%, laterais 6%.
// É a mais conservadora e cobre o orgânico também (nome e áudio no topo, legenda e
// botões na base, coluna de curtir/comentar/compartilhar na direita).
// Nada de texto, logo ou CTA fora dela; imagem e fundo podem ocupar o quadro todo.
export const areaSegura = {
  topo: 270, // 14% de 1920
  base: 672, // 35% de 1920
  lateral: 65, // 6% de 1080
} as const;

export const caixaSegura = {
  x: areaSegura.lateral,
  y: areaSegura.topo,
  largura: REEL.largura - areaSegura.lateral * 2, // 950
  altura: REEL.altura - areaSegura.topo - areaSegura.base, // 978
} as const;

// Margem lateral do conteúdo (a mesma dos stories), folgada dentro da área segura
export const margemConteudo = 96;

// A grade do perfil corta a capa do Reel em 3:4 (1080x1440):
// somem 240px em cima e 240px embaixo. Título da capa fica entre y=240 e y=1680.
export const recorteGrade = {
  topo: 240,
  base: 240,
} as const;
