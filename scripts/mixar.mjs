// Mixa trilha e efeitos sonoros com o ffmpeg do sistema, a partir de uma lista (JSON).
// Existe porque o Smart App Control passou a barrar o ffmpeg do Remotion (08/10/2026):
// com o render por quadros, o áudio sai daqui.
//
//   node scripts/mixar.mjs <lista.json> <saida.wav>
//
// lista.json: { "duracao": 12, "faixas": [
//   { "arquivo": "public/som/trilha/x.mp3", "em": 0, "de": 62.14, "ate": 80, "volume": 0.5,
//     "abafa": [1.75, 2.38], "some": [11, 1] },
//   { "arquivo": "public/som/sfx-n/impacto.wav", "em": 2.4, "volume": 0.7 } ] }
// em = quando entra no vídeo (s); de/ate = trecho do arquivo; abafa = [início, fim] da
// música abafando (passa-baixa) até reabrir no fim; some = [início, duração] do fade final.

import { execFileSync } from "node:child_process";
import fs from "node:fs";

const [listaArq, saida] = process.argv.slice(2);
const lista = JSON.parse(fs.readFileSync(listaArq, "utf8"));
const D = lista.duracao;

const entradas = [];
const filtros = [];
lista.faixas.forEach((f, i) => {
  entradas.push("-i", f.arquivo);
  const partes = [];
  if (f.de !== undefined || f.ate !== undefined) {
    partes.push(`atrim=${f.de ?? 0}${f.ate !== undefined ? `:${f.ate}` : ""}`, "asetpts=PTS-STARTPTS");
  }
  partes.push("aresample=48000", "aformat=channel_layouts=stereo", `volume=${f.volume ?? 1}`);
  const atraso = Math.round((f.em ?? 0) * 1000);
  if (atraso > 0) partes.push(`adelay=${atraso}:all=1`);
  if (f.abafa) {
    const [a, b] = f.abafa;
    const cmds = [];
    for (let t = a; t <= b + 1e-6; t += 0.04) {
      cmds.push(`${t.toFixed(3)} lowpass@lp${i} f ${Math.round(18000 * Math.pow(380 / 18000, (t - a) / (b - a)))}`);
    }
    cmds.push(`${(b + 0.02).toFixed(3)} lowpass@lp${i} f 20000`);
    partes.push(`asendcmd=c='${cmds.join(";")}'`, `lowpass@lp${i}=f=20000`);
  }
  if (f.some) partes.push(`afade=t=out:st=${f.some[0]}:d=${f.some[1]}`);
  filtros.push(`[${i}]${partes.join(",")}[f${i}]`);
});
const juntar = lista.faixas.map((_, i) => `[f${i}]`).join("");
execFileSync("ffmpeg", [
  "-nostdin", "-v", "error", "-y", ...entradas,
  "-filter_complex", `${filtros.join(";")};${juntar}amix=inputs=${lista.faixas.length}:normalize=0:duration=longest,apad=whole_dur=${D},atrim=0:${D}[m]`,
  "-map", "[m]", "-ar", "48000", saida,
]);
console.log(saida);
