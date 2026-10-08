// Efeitos sonoros do montador (Mixkit, licença gratuita): baixa os que faltam em
// public/som/sfx/ (direto do site do Mixkit, não vão no pacote) e prepara em public/som/sfx-n/:
// recorta o trecho útil, normaliza o pico em -1 dBFS (o volume de cada um fica no plano)
// e monta a rolagem, que o Mixkit não tem, com cliques curtos.
//
//   node scripts/sons.mjs

import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ORIGEM = "public/som/sfx";
const DESTINO = "public/som/sfx-n";
fs.mkdirSync(ORIGEM, { recursive: true });
fs.mkdirSync(DESTINO, { recursive: true });

// arquivo de origem: número do efeito no Mixkit (mixkit.co/free-sound-effects)
const MIXKIT = {
  "impacto-zoom": 772,
  "impacto-reverso": 784,
  "risco-sweep": 166,
  "whoosh-rapido": 1490,
  "whoosh-tech": 3120,
  "swipe-zoom": 2627,
  "notificacao-mensagem": 2354,
  "digitacao-celular": 1395,
  "clique-select": 1109,
  "clique-mouse": 2997,
  "clique-interface": 2568,
  "pop-forte": 2364,
  "pop-whoosh": 3005,
  "bip-positivo": 221,
};
for (const [arquivo, id] of Object.entries(MIXKIT)) {
  const destino = path.join(ORIGEM, `${arquivo}.mp3`);
  if (fs.existsSync(destino)) continue;
  const r = await fetch(`https://assets.mixkit.co/active_storage/sfx/${id}/${id}-preview.mp3`);
  if (!r.ok) throw new Error(`Não baixou ${arquivo} (Mixkit ${id}): ${r.status}`);
  fs.writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
  console.log("baixado", arquivo);
}

// nome final: [arquivo de origem, início (s), duração (s) ou null pro arquivo todo]
const LISTA = {
  impacto: ["impacto-zoom", 0, null],
  subida: ["impacto-reverso", 8.3, 1.7], // a cauda do reverso cresce até o fim
  risco: ["risco-sweep", 0, null],
  whoosh: ["whoosh-rapido", 0, null],
  whooshTech: ["whoosh-tech", 0, null],
  swipe: ["swipe-zoom", 0, null],
  notificacao: ["notificacao-mensagem", 0, null],
  digitacao: ["digitacao-celular", 2.5, 2.2],
  clique: ["clique-select", 0, null],
  cliqueMouse: ["clique-mouse", 0, null],
  pop: ["pop-forte", 0, null],
  popLeve: ["pop-whoosh", 0, null],
  bip: ["bip-positivo", 0, null],
};

for (const [nome, [arquivo, ini, dur]] of Object.entries(LISTA)) {
  const entrada = path.join(ORIGEM, `${arquivo}.mp3`);
  const corte = dur ? ["-ss", String(ini), "-t", String(dur)] : [];
  const tmp = path.join(DESTINO, `_${nome}.wav`);
  ffmpeg([...corte, "-i", entrada, "-ac", "2", "-ar", "44100", "-af", "afade=t=in:d=0.005", tmp]);
  normalizar(tmp, path.join(DESTINO, `${nome}.wav`));
  fs.unlinkSync(tmp);
}

// Rolagem: a rodinha do celular/mouse, 12 tiques que desaceleram (inércia)
{
  const tique = path.join(DESTINO, "_tique.wav");
  ffmpeg(["-i", path.join(ORIGEM, "clique-interface.mp3"), "-t", "0.06", "-ac", "2", "-ar", "44100", "-af", "highpass=f=1200,afade=t=out:st=0.03:d=0.03", tique]);
  const passos = [0, 0.045, 0.048, 0.052, 0.057, 0.063, 0.07, 0.079, 0.09, 0.104, 0.122, 0.146];
  let t = 0;
  const instantes = passos.map((p) => (t += p));
  const filtros = instantes
    .map((s, i) => `[0]volume=${(1 - i * 0.06).toFixed(2)},adelay=${Math.round(s * 1000)}:all=1[t${i}]`)
    .join(";");
  const tmp = path.join(DESTINO, "_rolagem.wav");
  ffmpeg([
    "-i", tique,
    "-filter_complex", `${filtros};${instantes.map((_, i) => `[t${i}]`).join("")}amix=inputs=${instantes.length}:normalize=0[r]`,
    "-map", "[r]", tmp,
  ]);
  normalizar(tmp, path.join(DESTINO, "rolagem.wav"));
  fs.unlinkSync(tmp);
  fs.unlinkSync(tique);
}

console.log(fs.readdirSync(DESTINO).join(" "));

function ffmpeg(args) {
  execFileSync("ffmpeg", ["-nostdin", "-v", "error", "-y", ...args]);
}

function normalizar(de, para) {
  const log = spawnSync("ffmpeg", ["-nostdin", "-hide_banner", "-i", de, "-af", "volumedetect", "-f", "null", "-"], {
    encoding: "utf8",
  }).stderr;
  const pico = parseFloat(log.match(/max_volume: (-?[0-9.]+) dB/)[1]);
  ffmpeg(["-i", de, "-af", `volume=${(-1 - pico).toFixed(2)}dB`, para]);
}
