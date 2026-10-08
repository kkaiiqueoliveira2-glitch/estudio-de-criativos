// Pesquisa de copy na Biblioteca de Anúncios da Meta (pública, sem login): acha anúncios em VÍDEO
// ativos no Brasil, ordena pelo tempo no ar, baixa os primeiros e transcreve a fala com o whisper
// do estúdio. Num anúncio em vídeo, a copy de verdade é a fala, não o texto de cima.
// Tempo no ar é indício de anúncio que funciona (ninguém paga meses por anúncio ruim), não prova.
//
//   node scripts/pesquisa.mjs <pasta> "termo" ["termo"...] [--top=8] [--sem=regex] [--so=regex] [--exata]
//
//   --top    quantos vídeos baixar e transcrever (padrão 8; no máximo 2 por anunciante)
//   --sem    tira anúncio cujo texto bate (ex.: --sem="wix|hostinger|curso|renda extra")
//   --so     fica só com anúncio cujo texto bate
//   --exata  busca a frase exata
//   --ids    anúncios que já se sabe que valem (ids da biblioteca, separados por vírgula): entram na
//            frente dos achados pela busca, sem passar pelos filtros
//
// Saída em <pasta>/: anuncios.json (todos, ordenados), videos/<id>.mp4, videos/<id>.jpg (6 quadros
// do vídeo) e referencias.md (os escolhidos: anunciante, dias no ar, duração, texto e a fala).
// A pesquisa serve pra adaptar ESTRUTURA e ÂNGULO; nunca copiar frase de outro anunciante.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { downloadWhisperModel, installWhisperCpp, transcribe } from "@remotion/install-whisper-cpp";
import { chromium } from "playwright-core";
import { chrome } from "./chrome.mjs";

const args = process.argv.slice(2);
const opcao = (n) => args.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
const [pasta, ...termosBrutos] = args.filter((a) => !a.startsWith("--"));
const termos = termosBrutos.filter(Boolean);
const ids = (opcao("ids") ?? "").split(",").filter(Boolean);
if (!pasta || (!termos.length && !ids.length)) {
  throw new Error('Uso: node scripts/pesquisa.mjs <pasta> "termo" ["termo"...] [--ids=1,2] [--top=8]');
}
const TOP = Number(opcao("top") ?? 8);
const sem = opcao("sem") ? new RegExp(opcao("sem"), "i") : null;
const so = opcao("so") ? new RegExp(opcao("so"), "i") : null;
const videos = path.join(pasta, "videos");
fs.mkdirSync(videos, { recursive: true });

// ── 1. busca ─────────────────────────────────────────────────────────────────
const MES = { jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5, jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11 };
const RUIDO = /^(​|Ativo|Inativo|Plataformas|Abrir menu suspenso|Ver detalhes do anúncio|Ver resumo|Patrocinado|Esse anúncio tem várias versões|Learn More|Saiba mais|Enviar mensagem|Fale conosco|Cadastre-se|Comprar agora|Ver mais|\d+:\d+ \/ \d+:\d+)$/;
const b = await chromium.launch({ executablePath: chrome, headless: true });
const ctx = await b.newContext({
  locale: "pt-BR",
  viewport: { width: 1366, height: 900 },
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
});
const p = await ctx.newPage();
const anuncios = new Map();
const busca = args.includes("--exata") ? "keyword_exact_phrase" : "keyword_unordered";
// os anúncios escolhidos (--ids) abrem cada um na página dele; os termos, na busca
const paginas = [
  ...ids.map((id) => ({ termo: "", url: `https://www.facebook.com/ads/library/?id=${id}`, rolar: 0 })),
  ...termos.map((termo) => ({
    termo,
    url: `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=BR&media_type=video&search_type=${busca}&q=${encodeURIComponent(termo)}`,
    rolar: 8,
  })),
];
for (const { termo, url, rolar } of paginas) {
  await p.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(6000);
  for (const rot of ["Permitir todos os cookies", "Recusar cookies opcionais", "Allow all cookies"]) {
    const bt = p.getByRole("button", { name: rot });
    if (await bt.count()) {
      await bt.first().click().catch(() => {});
      await p.waitForTimeout(1500);
      break;
    }
  }
  for (let i = 0; i < rolar; i++) {
    await p.mouse.wheel(0, 3000);
    await p.waitForTimeout(1800);
  }
  // cada <video> sobe até o card dele (o primeiro ancestral com a identificação da biblioteca)
  const cards = await p.evaluate(() =>
    [...document.querySelectorAll("video")].flatMap((v) => {
      let el = v;
      while (el && !(el.innerText || "").includes("Identificação da biblioteca")) el = el.parentElement;
      return el ? [{ src: v.currentSrc || v.src, texto: el.innerText }] : [];
    }),
  );
  let novos = 0;
  for (const c of cards) {
    const id = c.texto.match(/Identificação da biblioteca: (\d+)/)?.[1];
    const ini = c.texto.match(/Veiculação iniciada em (\d+) de (\w{3}) de (\d{4})/);
    if (!id || !ini || !c.src) continue;
    const linhas = c.texto.split("\n").map((l) => l.trim()).filter(Boolean);
    const iPat = linhas.indexOf("Patrocinado");
    const anunciante = iPat > 0 ? linhas[iPat - 1] : "?";
    const fim = linhas.findIndex((l, i) => i > iPat && /^\d+:\d+ \/ \d+:\d+$/.test(l));
    const texto = linhas.slice(iPat + 1, fim < 0 ? undefined : fim).filter((l) => !RUIDO.test(l)).join("\n");
    const escolhido = ids.includes(id);
    if (!escolhido && ((sem && sem.test(c.texto)) || (so && !so.test(c.texto)))) continue;
    const inicio = new Date(+ini[3], MES[ini[2]], +ini[1]);
    const chave = `${anunciante}|${texto.slice(0, 100)}`;
    const atual = anuncios.get(chave);
    const dias = Math.round((Date.now() - inicio) / 864e5);
    if (!atual || atual.dias < dias) {
      anuncios.set(chave, {
        id,
        anunciante,
        dias,
        inicio: inicio.toISOString().slice(0, 10),
        duracao: c.texto.match(/0:00 \/ (\d+:\d+)/)?.[1] ?? null,
        versoes: /várias versões/.test(c.texto) || +(c.texto.match(/(\d+) anúncios usam esse criativo/)?.[1] ?? 1) > 1,
        termo: termo || "escolhido",
        escolhido,
        texto,
        src: c.src,
        link: `https://www.facebook.com/ads/library/?id=${id}`,
      });
      novos++;
    }
  }
  console.log(`"${termo || url}": ${cards.length} vídeos na página, ${novos} novos`);
}
await b.close();

// ── 2. escolhe (os de --ids primeiro; depois mais tempo no ar; no máximo 2 por anunciante) ──
const todos = [...anuncios.values()].sort(
  (a, c) => Number(c.escolhido) - Number(a.escolhido) || c.dias - a.dias || Number(c.versoes) - Number(a.versoes),
);
fs.writeFileSync(path.join(pasta, "anuncios.json"), JSON.stringify(todos.map(({ src: _src, ...a }) => a), null, 1));
const porAnunciante = {};
const escolhidos = todos.filter((a) => (porAnunciante[a.anunciante] = (porAnunciante[a.anunciante] ?? 0) + 1) <= 2).slice(0, TOP);

// ── 3. baixa, tira 6 quadros e transcreve ───────────────────────────────────
const WHISPER = path.join(process.cwd(), "whisper.cpp");
await installWhisperCpp({ to: WHISPER, version: "1.5.5" });
await downloadWhisperModel({ model: "small", folder: WHISPER });
const ffmpeg = (a) => execFileSync("ffmpeg", ["-nostdin", "-v", "error", "-y", ...a]);
const probe = (mp4, ...q) => execFileSync("ffprobe", ["-v", "error", ...q, "-of", "csv=p=0", mp4], { encoding: "utf8" }).trim();
for (const a of escolhidos) {
  const mp4 = path.join(videos, `${a.id}.mp4`);
  const txt = path.join(videos, `${a.id}.txt`); // transcrição guardada: rodar de novo não refaz
  try {
    if (!fs.existsSync(mp4)) {
      const r = await fetch(a.src);
      if (!r.ok) throw new Error(`não baixou (${r.status})`);
      fs.writeFileSync(mp4, Buffer.from(await r.arrayBuffer()));
    }
    const seg = parseFloat(probe(mp4, "-show_entries", "format=duration"));
    ffmpeg(["-i", mp4, "-vf", `fps=6/${Math.max(seg, 1)},scale=180:-2,tile=6x1`, "-frames:v", "1", "-q:v", "4", path.join(videos, `${a.id}.jpg`)]);
    if (fs.existsSync(txt)) {
      a.fala = fs.readFileSync(txt, "utf8");
    } else if (!probe(mp4, "-select_streams", "a", "-show_entries", "stream=index")) {
      a.fala = "(vídeo sem áudio: a mensagem está só no texto da tela)";
    } else {
      const wav = path.join(WHISPER, "pesquisa-16k.wav");
      ffmpeg(["-i", mp4, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wav]);
      const r = await transcribe({ inputPath: wav, whisperPath: WHISPER, whisperCppVersion: "1.5.5", model: "small", language: "pt" });
      // cada pedaço do whisper já traz o próprio espaço: juntar sem acrescentar
      a.fala = r.transcription.map((s) => s.text).join("").replace(/\s+/g, " ").trim() || "(sem fala, só música)";
      fs.writeFileSync(txt, a.fala);
    }
  } catch (e) {
    a.fala = `(falhou: ${String(e.message ?? e).split("\n")[0]})`;
  }
  console.log(`${a.anunciante} (${a.dias} dias): ${a.fala.slice(0, 80)}…`);
}

// ── 4. referencias.md ────────────────────────────────────────────────────────
const md = [
  `# Referências: ${termos.join(", ")}`,
  "",
  `Biblioteca de Anúncios da Meta, Brasil, anúncios em vídeo ativos em ${new Date().toISOString().slice(0, 10)}. ` +
    `${todos.length} anúncios achados; abaixo os ${escolhidos.length} há mais tempo no ar (no máximo 2 por anunciante). ` +
    "Tempo no ar é indício, não prova. Usar pra adaptar estrutura e ângulo, nunca copiar frase.",
  "",
  ...escolhidos.flatMap((a) => [
    `## ${a.anunciante} · ${a.dias} dias no ar${a.versoes ? " · várias versões" : ""} · ${a.duracao ?? "?"}${a.escolhido ? " · referência escolhida" : ""}`,
    "",
    `[Ver na biblioteca](${a.link}) · vídeo: \`videos/${a.id}.mp4\` · quadros: \`videos/${a.id}.jpg\``,
    "",
    `**Texto do anúncio:** ${a.texto.replace(/\n+/g, " / ")}`,
    "",
    `**Fala:** ${a.fala ?? "(sem fala)"}`,
    "",
  ]),
].join("\n");
fs.writeFileSync(path.join(pasta, "referencias.md"), md);
console.log(`\nPronto: ${path.join(pasta, "referencias.md")}`);
