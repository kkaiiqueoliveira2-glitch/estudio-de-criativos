// Prévia de trilha pra escolha: narração + música com o drop da música caindo num instante
// da fala, a cama em volume fixo (sem compressor: a música subindo nas pausas foi vetada
// em 08/10/2026) e, se pedido, o abafamento antes do drop (o silêncio seco também foi vetado).
//
//   node scripts/ferramentas/previa-trilha.mjs <voz> <musica> <drop na música s> <drop na fala s> <saida.mp3> [abafa s] [fim da voz s]
//
// "drop na fala" = onde a parte forte da música deve entrar (ex.: início da frase da virada).
// "abafa" = onde a música começa a abafar (ex.: início de "E você nunca vai saber").

import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";

const [voz, musica, dropMusica, entrada, saida, abafaArg, fimVozArg] = process.argv.slice(2);
const ENTRADA = +entrada;
const ABAFA = abafaArg ? +abafaArg : null;
const duracaoVoz = parseFloat(
  String(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", voz])),
);
const FIM_VOZ = fimVozArg ? +fimVozArg : duracaoVoz;
const DUR = FIM_VOZ + 1.2;

const lufs = (args) => {
  const e = spawnSync("ffmpeg", ["-nostdin", "-hide_banner", ...args, "-af", "ebur128", "-f", "null", "-"], {
    encoding: "utf8",
  }).stderr;
  const todos = [...e.matchAll(/I:\s+(-?[0-9.]+) LUFS/g)];
  return parseFloat(todos[todos.length - 1][1]);
};

const ini = +dropMusica - ENTRADA;
const trecho = ini >= 0 ? ["-ss", String(ini), "-t", String(DUR), "-i", musica] : ["-t", String(DUR + ini), "-i", musica];
const gVoz = -16 - lufs(["-i", voz]);
const gMus = -29 - lufs(trecho);

let abafa = "";
if (ABAFA !== null) {
  const cmds = [];
  const fimAbafa = ENTRADA - 0.4;
  for (let t = ABAFA; t <= fimAbafa; t += 0.05) {
    const p = (t - ABAFA) / (fimAbafa - ABAFA);
    cmds.push(`${t.toFixed(2)} lowpass@lp f ${Math.round(18000 * Math.pow(380 / 18000, p))}`);
  }
  cmds.push(`${(ENTRADA - 0.02).toFixed(2)} lowpass@lp f 20000`);
  abafa = `asendcmd=c='${cmds.join(";")}',lowpass@lp=f=20000,volume='if(between(t,${ABAFA},${ENTRADA - 0.02}),0.8,1)':eval=frame,`;
}

const atraso = ini < 0 ? Math.round(-ini * 1000) : 0;
const tmp = `${saida}.tmp.wav`;
execFileSync("ffmpeg", [
  "-nostdin", "-v", "error", "-y", "-i", voz, ...trecho,
  "-filter_complex",
  `[1]${atraso ? `adelay=${atraso}|${atraso},` : ""}aresample=44100,aformat=channel_layouts=stereo,volume=${gMus.toFixed(2)}dB,${abafa}` +
    `afade=t=out:st=${(DUR - 1.1).toFixed(2)}:d=1.1,atrim=0:${DUR}[mus];` +
    `[0]aresample=44100,aformat=channel_layouts=stereo,volume=${gVoz.toFixed(2)}dB,apad=whole_dur=${DUR}[voz];` +
    `[voz][mus]amix=inputs=2:normalize=0:duration=first[mix]`,
  "-map", "[mix]", tmp,
]);
const g = -14 - lufs(["-i", tmp]);
execFileSync("ffmpeg", ["-nostdin", "-v", "error", "-y", "-i", tmp, "-af", `volume=${g.toFixed(2)}dB,alimiter=limit=0.89:level=false`, "-b:a", "192k", saida]);
fs.unlinkSync(tmp);
console.log(saida);
