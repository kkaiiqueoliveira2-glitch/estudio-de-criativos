import { comAlfa, cores } from "../tema";

// Os três temas de cena: escuro (fundo escuro da marca), claro e vivo (cor principal).
export type Tema = "escuro" | "claro" | "vivo";

// Cores de texto e apoio por tema. Sobre fundo claro a cor principal vira texto
// (destaque); sobre escuro ou vivo, o destaque escrito sai em neutro.
export const PALETA: Record<
  Tema,
  { texto: string; apoio: string; destaque: string; linha: string; vidro: string; dedo: string }
> = {
  escuro: {
    texto: cores.neutro50,
    apoio: comAlfa(cores.neutro50, 0.68),
    destaque: cores.neutro200,
    linha: "rgba(255, 255, 255, .2)",
    vidro: "rgba(255, 255, 255, .08)",
    dedo: "rgba(255, 255, 255, .92)",
  },
  claro: {
    texto: cores.azul950,
    apoio: comAlfa(cores.azul950, 0.62),
    destaque: cores.azul800,
    linha: comAlfa(cores.azul950, 0.16),
    vidro: comAlfa(cores.azul950, 0.05),
    dedo: comAlfa(cores.azul950, 0.82),
  },
  vivo: {
    texto: cores.neutro50,
    apoio: comAlfa(cores.neutro50, 0.78),
    destaque: cores.gelo,
    linha: "rgba(255, 255, 255, .3)",
    vidro: "rgba(255, 255, 255, .12)",
    dedo: "rgba(255, 255, 255, .95)",
  },
};
