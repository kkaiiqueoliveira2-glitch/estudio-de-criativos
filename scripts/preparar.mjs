// Prepara o estúdio depois do npm install (roda sozinho, é o "postinstall" do package.json):
// 1. cria public/marca/ a partir do modelo (só na primeira vez: a marca é sua e o git não mexe nela)
// 2. baixa e prepara os efeitos sonoros, se faltarem
// 3. baixa a trilha padrão, se o marca.json usar ela e o arquivo não existir
//
//   node scripts/preparar.mjs

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const rodar = (args) => execFileSync("node", args, { stdio: "inherit" });

const marca = path.join("public", "marca");
if (!fs.existsSync(path.join(marca, "marca.json"))) {
  fs.cpSync(path.join("public", "marca-modelo"), marca, { recursive: true });
  console.log("Marca criada a partir do modelo em public/marca/ (troque pelos dados da sua empresa)");
}

try {
  execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
} catch {
  console.log("\nAtenção: o ffmpeg não está instalado (ou o terminal não acha). Instale e rode de novo:");
  console.log("  Windows: winget install Gyan.FFmpeg   |   Mac: brew install ffmpeg");
  console.log("  depois: node scripts/preparar.mjs\n");
  process.exit(0);
}

if (!fs.existsSync(path.join("public", "som", "sfx-n", "rolagem.wav"))) rodar(["scripts/sons.mjs"]);

const TRILHA_PADRAO = {
  "som/trilha/vlog-hip-hop.mp3": "https://pixabay.com/music/beats-vlog-hip-hop-483574/",
};
const trilha = JSON.parse(fs.readFileSync(path.join(marca, "marca.json"), "utf8")).trilha?.arquivo;
if (trilha && TRILHA_PADRAO[trilha] && !fs.existsSync(path.join("public", trilha))) {
  try {
    rodar(["scripts/ferramentas/trilha.mjs", "baixar", TRILHA_PADRAO[trilha], path.basename(trilha, ".mp3")]);
  } catch {
    console.log(`\nNão consegui baixar a trilha (precisa do Google Chrome instalado). Baixe à mão em
${TRILHA_PADRAO[trilha]} e salve como public/${trilha}\n`);
  }
}
console.log("\nEstúdio pronto. No Claude Code: /criativo-video");
