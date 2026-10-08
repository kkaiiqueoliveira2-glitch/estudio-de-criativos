// Renderiza quadros soltos de uma composição pra conferir layout, com um bundle só.
//
//   node scripts/stills.mjs <Composicao> <pasta-saida> <segundos...> [--escala=0.5] [--video=<nome>]
//   --video=<nome>: na composição Criativo, qual pasta de public/criativos/ (padrão: o do Root.tsx)
//   ex.: node scripts/stills.mjs CriativoV3 saida/stills 0 1.5 4.3
//
// Usa o Chrome instalado (o baixado pelo Remotion é barrado pelo App Control do Windows).

import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { chrome } from "./chrome.mjs";

const [id, saida, ...resto] = process.argv.slice(2);
const escala = parseFloat(resto.find((a) => a.startsWith("--escala="))?.split("=")[1] ?? "0.5");
const segundos = resto.filter((a) => !a.startsWith("--")).map(Number);
const video = resto.find((a) => a.startsWith("--video="))?.split("=")[1];
const inputProps = video ? { nome: video } : {};
fs.mkdirSync(saida, { recursive: true });

const opcoes = {
  browserExecutable: chrome ?? null,
  chromeMode: "chrome-for-testing",
  chromiumOptions: { gl: "angle" },
  timeoutInMilliseconds: 180000,
};

const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composicao = await selectComposition({ serveUrl, id, inputProps, ...opcoes });
for (const s of segundos) {
  const frame = Math.min(composicao.durationInFrames - 1, Math.round(s * composicao.fps));
  const arquivo = path.join(saida, `${id}-${s.toFixed(2)}s.jpg`);
  await renderStill({
    serveUrl,
    composition: composicao,
    frame,
    output: arquivo,
    imageFormat: "jpeg",
    jpegQuality: 85,
    scale: escala,
    inputProps,
    ...opcoes,
  });
  console.log(arquivo);
}
