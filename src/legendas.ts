import type { Caption } from "@remotion/captions";

// Frases e páginas de legenda a partir do legendas.json (uma Caption por palavra,
// gerado por scripts/legendas.mjs).

export type Frase = {
  palavras: Caption[];
  inicioMs: number;
  fimMs: number;
};

export type Pagina = Frase;

export const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9+]/g, "");

const fimDeFrase = (c: Caption) => /[.!?]$/.test(c.text.trim());
const temVirgula = (c: Caption) => /[,;:]$/.test(c.text.trim());

const montar = (palavras: Caption[]): Frase => ({
  palavras,
  inicioMs: palavras[0].startMs,
  fimMs: palavras[palavras.length - 1].endMs,
});

export const separarFrases = (legendas: Caption[]): Frase[] => {
  const frases: Frase[] = [];
  let atual: Caption[] = [];
  for (const c of legendas) {
    atual.push(c);
    if (fimDeFrase(c)) {
      frases.push(montar(atual));
      atual = [];
    }
  }
  if (atual.length > 0) frases.push(montar(atual));
  return frases;
};

// Palavra que não fecha página: deixa "no", "seu", "te" pendurados
const FRACAS = new Set([
  "o",
  "a",
  "os",
  "as",
  "e",
  "ou",
  "de",
  "do",
  "da",
  "dos",
  "das",
  "no",
  "na",
  "nos",
  "nas",
  "em",
  "um",
  "uma",
  "pro",
  "pra",
  "te",
  "que",
  "com",
  "se",
  "seu",
  "sua",
]);
const ARTIGOS = new Set(["o", "a", "os", "as", "um", "uma"]); // pior ainda no fim

const custoPagina = (pagina: Caption[], seguinte: Caption | undefined) => {
  const ultima = pagina[pagina.length - 1];
  let custo = pagina.length === 2 ? 0.3 : 0; // 3 palavras troca menos a tela
  if (FRACAS.has(normalizar(ultima.text))) custo += 3;
  if (ARTIGOS.has(normalizar(ultima.text))) custo += 1;
  if (pagina.slice(0, -1).some(temVirgula)) custo += 2;
  if (temVirgula(ultima)) custo -= 1;
  if (seguinte) custo -= Math.min(1, (seguinte.startMs - ultima.endMs) / 400);
  return custo;
};

// 2 a 3 palavras por página, sem atravessar frase. A divisão de menor custo
// sai por programação dinâmica dentro de cada frase.
export const paginar = (legendas: Caption[]): Pagina[] => {
  const paginas: Pagina[] = [];
  for (const { palavras } of separarFrases(legendas)) {
    const n = palavras.length;
    if (n <= 3) {
      paginas.push(montar(palavras));
      continue;
    }
    const melhor = new Array<number>(n + 1).fill(Infinity);
    const corte = new Array<number>(n + 1).fill(-1);
    melhor[0] = 0;
    for (let i = 2; i <= n; i++) {
      for (const tam of [2, 3]) {
        const ini = i - tam;
        if (ini < 0 || melhor[ini] === Infinity) continue;
        const c =
          melhor[ini] + custoPagina(palavras.slice(ini, i), palavras[i]);
        if (c < melhor[i]) {
          melhor[i] = c;
          corte[i] = ini;
        }
      }
    }
    const daFrase: Pagina[] = [];
    for (let i = n; i > 0; i = corte[i]) {
      daFrase.unshift(montar(palavras.slice(corte[i], i)));
    }
    paginas.push(...daFrase);
  }
  return paginas;
};

// Frame (relativo a `desdeMs`) em que a palavra é dita. Pra sincronizar animação com a voz.
export const quandoDiz = (
  frase: Frase,
  palavra: string,
  fps: number,
  desdeMs = frase.inicioMs,
) => {
  const alvo = normalizar(palavra);
  const c = frase.palavras.find((p) => normalizar(p.text) === alvo);
  if (!c)
    throw new Error(
      `"${palavra}" não aparece na frase "${frase.palavras.map((p) => p.text).join("")}"`,
    );
  return Math.round(((c.startMs - desdeMs) / 1000) * fps);
};
