// Render sem o ffmpeg do Remotion (barrado pelo Smart App Control desde 08/10/2026):
// o Remotion gera os quadros em JPEG e o ffmpeg do sistema monta o vídeo com o áudio.
//
//   node scripts/render-quadros.mjs <Composicao> <fps> <audio.wav> <saida-bruto.mov> [--props='{...}'] [--scale=0.5]
//   node scripts/finalizar.mjs <saida-bruto.mov> <final.mp4>
//
// O bruto sai em .mov (vídeo quase sem perda + áudio PCM); o finalizar.mjs converte.

import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const [id, fps, audio, saida, ...resto] = process.argv.slice(2);
const pasta = path.join("saida", `_quadros-${id}`);
fs.rmSync(pasta, { recursive: true, force: true });

const r = spawnSync(
  "npx",
  ["remotion", "render", id, pasta, "--sequence", "--image-format=jpeg", "--jpeg-quality=95", "--timeout=180000", "--concurrency=4", ...resto],
  { stdio: "inherit", shell: true },
);
if (r.status !== 0) throw new Error("O render dos quadros falhou");

const quadros = fs.readdirSync(pasta).filter((f) => f.endsWith(".jpeg")).sort();
const m = quadros[0].match(/^(.*?)(\d+)\.jpeg$/);
execFileSync("ffmpeg", [
  "-nostdin", "-v", "error", "-y",
  "-framerate", fps, "-i", path.join(pasta, `${m[1]}%0${m[2].length}d.jpeg`),
  "-i", audio,
  "-map", "0:v", "-map", "1:a",
  "-c:v", "libx264", "-crf", "10", "-preset", "medium", "-pix_fmt", "yuvj420p",
  "-c:a", "pcm_s16le", "-shortest",
  saida,
]);
fs.rmSync(pasta, { recursive: true, force: true });
console.log(`${saida}: ${quadros.length} quadros a ${fps} fps`);
