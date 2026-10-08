// Comando único do montador (08/10/2026): áudio → mixagem → render → acabamento.
//
//   node scripts/criativo.mjs <nome>            rascunho (30 fps, metade do tamanho)
//   node scripts/criativo.mjs <nome> --final    final (1080x1920, 60 fps)
//   node scripts/criativo.mjs <nome> --audio    refaz o áudio antes (narração nova, pausas, trilha)
//
// Pasta do vídeo: public/criativos/<nome>/ (narracao-crua.mp3, roteiro.txt, criativo.json).
// Saída: saida/<nome>_rascunho.mp4 ou saida/<nome>.mp4 (+ <nome>-celular.mp4 se passar de 29 MB).

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { nomesDasTelas, planejar } from "../src/motor/plano.mjs";

const [nome, ...flags] = process.argv.slice(2);
if (!nome) throw new Error("Uso: node scripts/criativo.mjs <nome> [--final] [--audio]");
const final = flags.includes("--final");
const pasta = path.join("public", "criativos", nome);
const rodar = (args) => execFileSync("node", args, { stdio: "inherit" });

// 1. áudio (voz editada, trilha, legendas e tempos)
if (flags.includes("--audio") || !fs.existsSync(path.join(pasta, "tempos.json"))) {
  rodar(["scripts/audio.mjs", nome]);
}

// 2. plano (o mesmo que a composição usa) e mixagem de voz + trilha + efeitos
const ler = (f) => JSON.parse(fs.readFileSync(path.join(pasta, f), "utf8"));
const config = ler("criativo.json");
const tempos = ler("tempos.json");
// a mesma marca que o Root.tsx passa pra composição (telas padrão, gestos, botão)
const marca = JSON.parse(fs.readFileSync("public/marca/marca.json", "utf8"));
const lerGestos = (n) => {
  const f = path.join("public", "telas", n, "gestos.json");
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : [];
};
const telas = nomesDasTelas(config, marca.telas ?? []);
const faltando = telas.filter((n) => !fs.existsSync(path.join("public", "telas", n, "tela.mp4")));
if (faltando.length) {
  throw new Error(`Tela do celular não encontrada: ${faltando.join(", ")}. Crie com: node scripts/tela.mjs <nome> <url ou gravação.mp4>`);
}
const gestos = Object.fromEntries(telas.map((n) => [n, lerGestos(n)]));
const plano = planejar(config, ler("legendas.json"), tempos, { telas: marca.telas ?? [], gestos, botao: marca.botao });
const lista = {
  duracao: tempos.duracao,
  faixas: [
    { arquivo: path.join(pasta, "narracao.mp3"), em: 0, volume: 1 },
    { arquivo: path.join(pasta, "trilha.mp3"), em: 0, volume: 1 },
    ...plano.sons.map((s) => ({ arquivo: `public/som/sfx-n/${s.som}.wav`, em: Math.max(0, s.t), volume: s.volume })),
  ],
};
fs.mkdirSync("saida", { recursive: true });
const listaArq = path.join("saida", `_mix-${nome}.json`);
const audio = path.join("saida", `_audio-${nome}.wav`);
fs.writeFileSync(listaArq, JSON.stringify(lista, null, 1));
rodar(["scripts/mixar.mjs", listaArq, audio]);

// 3. quadros + montagem (sem o ffmpeg do Remotion, barrado pelo Smart App Control)
const props = path.join("saida", `_props-${nome}.json`);
fs.writeFileSync(props, JSON.stringify({ nome, rascunho: !final }));
const bruto = path.join("saida", `_bruto-${nome}.mov`);
rodar([
  "scripts/render-quadros.mjs",
  "Criativo",
  final ? "60" : "30",
  audio,
  bruto,
  `--props=${props}`,
  ...(final ? [] : ["--scale=0.5"]),
]);

// 4. acabamento (-14 LUFS, cor de celular, faststart)
const saida = path.join("saida", final ? `${nome}.mp4` : `${nome}_rascunho.mp4`);
rodar(["scripts/finalizar.mjs", bruto, saida, `--crf=${final ? 16 : 18}`]);
for (const f of [listaArq, audio, props, bruto]) fs.rmSync(f, { force: true });
console.log(`\nPronto: ${saida}`);
