// Acabamento de um render do Remotion pra subir no Instagram/Meta:
// - áudio em -14 LUFS (loudnorm em 2 passos, ganho linear: não mexe na dinâmica da mixagem)
// - vídeo em yuv420p faixa tv (o render sai em faixa cheia, yuvj420p)
// - faststart
// e, se a saída passar de 29 MB, uma cópia "-celular" (só pra assistir) que cabe no app do Claude (limite de
// 30 MB pra mandar arquivo pro celular, 08/10/2026).
//
//   node scripts/finalizar.mjs <render bruto.mp4> <saida.mp4> [--crf=16]

import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";

const [entrada, saida, ...resto] = process.argv.slice(2);
const crf = resto.find((a) => a.startsWith("--crf="))?.split("=")[1] ?? "16";

const medicao = spawnSync(
  "ffmpeg",
  ["-nostdin", "-hide_banner", "-i", entrada, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
  { encoding: "utf8" },
).stderr;
const json = JSON.parse(medicao.slice(medicao.lastIndexOf("{"), medicao.lastIndexOf("}") + 1));
const loudnorm =
  `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${json.input_i}:measured_TP=${json.input_tp}` +
  `:measured_LRA=${json.input_lra}:measured_thresh=${json.input_thresh}:offset=${json.target_offset}:linear=true`;

const codificar = (crfUsado, destino) =>
  execFileSync("ffmpeg", [
    "-nostdin", "-v", "error", "-y", "-i", entrada,
    "-vf", "scale=in_range=pc:out_range=tv,format=yuv420p",
    "-c:v", "libx264", "-profile:v", "high", "-crf", String(crfUsado), "-preset", "slow",
    "-color_range", "tv", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
    "-af", loudnorm, "-c:a", "aac", "-b:a", "256k", "-ar", "48000",
    "-movflags", "+faststart", destino,
  ]);

codificar(crf, saida);
const mb = (f) => fs.statSync(f).size / 1048576;
console.log(`${saida}: ${mb(saida).toFixed(1)} MB`);

if (mb(saida) > 29) {
  const leve = saida.replace(/\.mp4$/, "-celular.mp4");
  for (const c of [20, 22, 24, 26]) {
    codificar(c, leve);
    if (mb(leve) <= 29) break;
  }
  console.log(`${leve}: ${mb(leve).toFixed(1)} MB (cabe no app do Claude)`);
}
