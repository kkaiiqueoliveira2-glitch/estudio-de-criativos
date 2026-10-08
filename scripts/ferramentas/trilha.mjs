// Trilhas do Pixabay Music (licença do Pixabay: uso comercial em anúncio, sem crédito).
// O Pixabay barra curl (403); pelo Chrome instalado, headless, funciona.
//
//   node scripts/ferramentas/trilha.mjs buscar <saida.json> "termo" ["termo"...]
//        escolha dos editores pra cada termo, com título e link da página
//   node scripts/ferramentas/trilha.mjs baixar <link da página no Pixabay> <nome>
//        salva em public/som/trilha/<nome>.mp3
//
// Depois de baixar: medir-musica.js (BPM e energia), achar-drop.js e grade-batida.js (onde o
// grave entra = "drop"), e pôr { arquivo, drop, bpm } no marca.json ou no criativo.json.

import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { chrome } from "../chrome.mjs";

const [acao, ...args] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: chrome, headless: true, args: ["--disable-blink-features=AutomationControlled"] });
const ctx = await b.newContext({
  locale: "en-US",
  viewport: { width: 1366, height: 900 },
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
});
const p = await ctx.newPage();

// abre a página da música e acha o link do mp3 no HTML
const mp3DaPagina = async (url) => {
  await p.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(1500);
  const m = (await p.content()).match(/https:\/\/cdn\.pixabay\.com\/download\/audio\/[^"'\s<]+?\.mp3\?filename=[^"'\s<]+/);
  const titulo = (await p.title()).replace(/ \| .*$/, "").replace(/ - Pixabay.*$/, "");
  return { titulo, mp3: m ? m[0].replace(/&amp;/g, "&") : null };
};

if (acao === "buscar") {
  const [saida, ...termos] = args;
  const faixas = [];
  for (const termo of termos) {
    await p.goto(`https://pixabay.com/music/search/${encodeURIComponent(termo)}/?order=ec`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await p.waitForTimeout(4000);
    const itens = await p.evaluate(() => [
      ...new Set([...document.querySelectorAll('a[href^="/music/"]')].map((a) => a.getAttribute("href")).filter((h) => /-\d+\/$/.test(h))),
    ]);
    for (const href of itens.slice(0, 6)) {
      if (faixas.some((f) => f.href === href)) continue;
      const { titulo, mp3 } = await mp3DaPagina(`https://pixabay.com${href}`);
      faixas.push({ termo, pagina: `https://pixabay.com${href}`, titulo, mp3 });
    }
  }
  fs.writeFileSync(saida, JSON.stringify(faixas, null, 1));
  console.log(faixas.map((f) => `${f.termo} | ${f.titulo} | ${f.pagina}`).join("\n"));
} else if (acao === "baixar") {
  const [pagina, nome] = args;
  if (!pagina || !nome) throw new Error("Uso: trilha.mjs baixar <link da página> <nome>");
  const { titulo, mp3 } = await mp3DaPagina(pagina);
  if (!mp3) throw new Error(`Não achei o mp3 em ${pagina}`);
  const r = await ctx.request.get(mp3, { headers: { referer: pagina } });
  if (!r.ok()) throw new Error(`Download recusado (${r.status()})`);
  const destino = path.join("public", "som", "trilha", `${nome}.mp3`);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, await r.body());
  console.log(`${titulo} → ${destino}`);
} else {
  throw new Error("Uso: trilha.mjs buscar <saida.json> \"termo\"...  |  trilha.mjs baixar <link> <nome>");
}
await b.close();
