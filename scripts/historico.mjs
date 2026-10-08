// Histórico dos criativos: o ângulo, o gancho e a forma de cada vídeo já feito, pra o próximo não
// repetir. Lê public/criativos/*/criativo.json (campos "angulo", "estrutura", "referencias") e
// public/criativos/_anteriores.json (vídeos feitos antes do montador, se houver).
//
//   node scripts/historico.mjs

import fs from "node:fs";
import path from "node:path";

const base = path.join("public", "criativos");
const itens = [];
const anteriores = path.join(base, "_anteriores.json");
if (fs.existsSync(anteriores)) itens.push(...JSON.parse(fs.readFileSync(anteriores, "utf8")));

for (const nome of fs.readdirSync(base)) {
  const arq = path.join(base, nome, "criativo.json");
  if (!fs.existsSync(arq)) continue;
  const c = JSON.parse(fs.readFileSync(arq, "utf8"));
  const roteiro = path.join(base, nome, "roteiro.txt");
  const fala = fs.existsSync(roteiro) ? fs.readFileSync(roteiro, "utf8").trim() : "";
  const final = fs.existsSync(path.join("saida", `${nome}.mp4`));
  itens.push({
    nome,
    data: fs.statSync(arq).mtime.toISOString().slice(0, 10),
    status: final ? "final" : fs.existsSync(path.join("saida", `${nome}_rascunho.mp4`)) ? "rascunho" : "em montagem",
    angulo: c.angulo ?? "(sem ângulo anotado)",
    estrutura: c.estrutura ?? "",
    gancho: fala.split(/(?<=[.!?])\s+/).slice(0, 2).join(" "),
    cenas: c.cenas.map((s) => s.tipo).join(" › "),
    temas: [...new Set(c.cenas.map((s) => s.tema).filter(Boolean))].join(", "),
    referencias: c.referencias ?? [],
  });
}

itens.sort((a, b) => (a.data < b.data ? -1 : 1));
for (const i of itens) {
  console.log(`\n■ ${i.nome}  (${i.data}, ${i.status})`);
  console.log(`  ângulo:    ${i.angulo}`);
  if (i.estrutura) console.log(`  estrutura: ${i.estrutura}`);
  console.log(`  gancho:    ${i.gancho}`);
  if (i.cenas) console.log(`  cenas:     ${i.cenas}${i.temas ? `  [${i.temas}]` : ""}`);
  if (i.referencias.length) console.log(`  modelou:   ${i.referencias.join(", ")}`);
}
console.log(`\n${itens.length} criativos. O próximo precisa de ângulo, gancho e forma diferentes dos últimos.`);
