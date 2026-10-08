// Prepara uma "tela" pra cena de celular: public/telas/<nome>/ com tela.mp4 (736x1600, 30 fps),
// topo.jpg (o primeiro quadro, pros celulares parados) e gestos.json (instantes de rolagem, pro
// som de rolagem).
//
//   node scripts/tela.mjs <nome> https://site.com       grava o site num iPhone rolando a página
//   node scripts/tela.mjs <nome> gravacao.mp4           usa uma gravação de tela pronta (app,
//                                                        Instagram, produto...), cortada pro formato
//   node scripts/tela.mjs <nome> gravacao.mp4 --gestos=1.2,3.4   marca onde a gravação rola
//
// A 30 fps e 736x1600 porque a 60 fps o Video do Remotion trava no render. O site é gravado
// pelos quadros do Chrome (screencast), com o Chrome instalado (scripts/chrome.mjs).

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { chrome } from "./chrome.mjs";

const [nome, origem, ...resto] = process.argv.slice(2);
if (!nome || !origem) throw new Error("Uso: node scripts/tela.mjs <nome> <url ou arquivo.mp4> [--gestos=1.2,3.4]");
const destino = path.join("public", "telas", nome);
fs.mkdirSync(destino, { recursive: true });
const video = path.join(destino, "tela.mp4");
const ffmpeg = (args) => execFileSync("ffmpeg", ["-nostdin", "-v", "error", "-y", ...args]);
const FORMATO = ["-c:v", "libx264", "-crf", "15", "-g", "30", "-bf", "0", "-pix_fmt", "yuv420p", "-an"];

let gestos = (resto.find((a) => a.startsWith("--gestos="))?.split("=")[1] ?? "")
  .split(",")
  .filter(Boolean)
  .map(Number);

if (/^https?:\/\//.test(origem)) {
  gestos = await gravarSite(origem);
} else {
  if (!fs.existsSync(origem)) throw new Error(`Não achei ${origem}`);
  // preenche 736x1600 (corta o que sobrar, sem barra preta)
  ffmpeg(["-i", origem, "-vf", "fps=30,scale=736:1600:force_original_aspect_ratio=increase,crop=736:1600", ...FORMATO, video]);
}

ffmpeg(["-i", video, "-frames:v", "1", "-q:v", "2", path.join(destino, "topo.jpg")]);
fs.writeFileSync(path.join(destino, "gestos.json"), JSON.stringify(gestos));
console.log(`Pronto: ${destino} (gestos em ${gestos.join(", ") || "nenhum"})`);

async function gravarSite(url) {
  const { chromium, devices } = await import("playwright-core");
  const quadrosDir = path.join("saida", `_tela-${nome}`);
  fs.rmSync(quadrosDir, { recursive: true, force: true });
  fs.mkdirSync(quadrosDir, { recursive: true });
  const b = await chromium.launch({ executablePath: chrome, headless: true });
  const ctx = await b.newContext({ ...devices["iPhone 14"], deviceScaleFactor: 2, locale: "pt-BR" });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  await p.waitForTimeout(2500);
  const cdp = await ctx.newCDPSession(p);
  const quadros = [];
  cdp.on("Page.screencastFrame", async (f) => {
    const arq = `q${String(quadros.length).padStart(5, "0")}.jpg`;
    quadros.push({ arq, t: f.metadata.timestamp });
    fs.writeFileSync(path.join(quadrosDir, arq), Buffer.from(f.data, "base64"));
    cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 780, maxHeight: 1688, everyNthFrame: 1 });
  // um "relógio" que repinta todo quadro, senão a tela parada não gera quadro
  await p.evaluate(() => {
    const d = document.createElement("div");
    d.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:.01;z-index:2147483647;pointer-events:none";
    document.body.appendChild(d);
    let k = 0;
    (function f() {
      d.style.transform = `translateX(${k++ % 2}px)`;
      requestAnimationFrame(f);
    })();
  });
  await p.waitForTimeout(1200);
  // 6 gestos de rolagem, como um dedo passando a página
  const instantes = [];
  for (let g = 0; g < 6; g++) {
    instantes.push(Date.now() / 1000);
    for (let k = 0; k < 8; k++) {
      await p.mouse.wheel(0, 75);
      await p.waitForTimeout(16);
    }
    await p.waitForTimeout(1100);
  }
  await cdp.send("Page.stopScreencast");
  await p.waitForTimeout(300);
  await b.close();

  // cada quadro dura até o próximo (tempo real), depois vira 30 fps
  const ini = quadros[0].t;
  const lista = quadros
    .map((q, i) => `file '${q.arq}'\nduration ${((quadros[i + 1]?.t ?? q.t + 1 / 30) - q.t).toFixed(4)}\n`)
    .join("");
  fs.writeFileSync(path.join(quadrosDir, "lista.txt"), lista);
  ffmpeg(["-f", "concat", "-safe", "0", "-i", path.join(quadrosDir, "lista.txt"), "-vf", "fps=30,scale=736:1600", ...FORMATO, video]);
  fs.rmSync(quadrosDir, { recursive: true, force: true });
  return instantes.map((g) => +(g - ini).toFixed(3));
}
