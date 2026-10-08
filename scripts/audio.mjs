// Monta o áudio de um criativo do montador a partir da narração crua e da trilha.
// Generalização do audio-v3.mjs (08/10/2026): tudo vem do criativo.json do vídeo.
//
//   node scripts/audio.mjs <nome>      (pasta public/criativos/<nome>/)
//
// Precisa na pasta: narracao-crua.mp3 (Higgsfield ou voz gravada), roteiro.txt (a fala, escrita
// como deve aparecer na tela, ex. com o nome da marca certinho) e
// criativo.json. Se não houver legendas-crua.json, gera pelo scripts/legendas.mjs.
//
// criativo.json > "trilha": { "arquivo": "som/trilha/x.mp3", "drop": 64.542, "bpm": 124 }
//                 (sem "trilha", vale a da marca: public/marca/marca.json)
//               > "audio":  { "tempo": 1.08, "fraseDoDrop": 6, "pausas": { "0": 0.5 },
//                             "substitui": { "17": { "arquivo": "x.mp3", "texto": "..." } } }
// "fraseDoDrop": índice da frase (0 = primeira) que cai no drop da música; a frase antes
// dela abafa a música. Pausas: segundos depois de cada frase (ex.: depois de uma pergunta).
//
// Saídas na pasta: narracao.mp3, trilha.mp3, legendas.json, tempos.json.

import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const nome = process.argv[2];
if (!nome) throw new Error("Uso: node scripts/audio.mjs <nome>");
const PASTA = path.join("public", "criativos", nome);
const config = JSON.parse(fs.readFileSync(path.join(PASTA, "criativo.json"), "utf8"));
const CRUA = path.join(PASTA, "narracao-crua.mp3");
const marca = JSON.parse(fs.readFileSync(path.join("public", "marca", "marca.json"), "utf8"));
const trilha = config.trilha ?? marca.trilha;
if (!trilha?.arquivo) throw new Error('Falta a trilha: "trilha" no criativo.json ou no marca.json');
const TRILHA = path.join("public", trilha.arquivo);
if (!fs.existsSync(TRILHA)) throw new Error(`Trilha não encontrada: ${TRILHA}`);
const MUSICA = { drop: trilha.drop, periodo: 60 / trilha.bpm };
const A = config.audio ?? {};
const TEMPO = A.tempo ?? 1.08;
const VOZ_LUFS = -16;
const CAMA_LUFS = A.camaLufs ?? -29;
const FOLGA_ANTES = 0.03;
const FOLGA_DEPOIS = 0.07;
const PAUSA_DEPOIS = Object.fromEntries(Object.entries(A.pausas ?? {}).map(([k, v]) => [+k, v]));
const SUBSTITUI = Object.fromEntries(
  Object.entries(A.substitui ?? {}).map(([k, v]) => [+k, { ...v, arquivo: path.join(PASTA, v.arquivo) }]),
);

if (!fs.existsSync(path.join(PASTA, "legendas-crua.json"))) {
  execFileSync("node", ["scripts/legendas.mjs", CRUA, path.join(PASTA, "roteiro.txt")], { stdio: "inherit" });
  fs.renameSync(path.join(PASTA, "legendas.json"), path.join(PASTA, "legendas-crua.json"));
}

// ── narração crua: frases e pausas ───────────────────────────────────────────

const crua = JSON.parse(fs.readFileSync(path.join(PASTA, "legendas-crua.json"), "utf8"));
const duracaoCrua = duracao(CRUA);
const pausas = medirPausas(CRUA);

const frases = [];
let atual = [];
for (const p of crua) {
  atual.push(p);
  if (/[.!?]$/.test(p.text.trim())) {
    frases.push(atual);
    atual = [];
  }
}
if (atual.length) frases.push(atual);

// Fronteira entre frases = uma pausa real (silencedetect). O whisper erra o tempo de
// frase curta ("Fechar." saiu 0,6 s adiantado em 08/10/2026), então cada fronteira
// escolhe uma pausa diferente, em ordem, perto da estimativa e de preferência longa.
const fronteiras = escolherPausas(
  frases.slice(0, -1).map((ws, k) => (ws[ws.length - 1].endMs + frases[k + 1][0].startMs) / 2000),
  pausas,
);
const pedacos = frases.map((ws, k) => {
  const pausaAntes = k === 0 ? null : fronteiras[k - 1];
  const pausaDepois = k === frases.length - 1 ? null : fronteiras[k];
  const ataque = pausaAntes ? pausaAntes[1] : ws[0].startMs / 1000;
  const fimFala = pausaDepois ? pausaDepois[0] : Math.min(duracaoCrua, ws[ws.length - 1].endMs / 1000);
  // palavras reescaladas pra caber entre o ataque e o fim da fala reais
  const w0 = ws[0].startMs / 1000;
  const w1 = ws[ws.length - 1].endMs / 1000;
  const reescala = (s) => ataque + ((s - w0) / Math.max(0.05, w1 - w0)) * (fimFala - ataque);
  return {
    k,
    texto: ws.map((w) => w.text.trim()).join(" "),
    palavras: ws.map((w) => ({
      ...w,
      startMs: reescala(w.startMs / 1000) * 1000,
      endMs: reescala(w.endMs / 1000) * 1000,
    })),
    de: Math.max(0, ataque - FOLGA_ANTES),
    ataque,
    ate: pausaDepois ? Math.min(pausaDepois[0] + FOLGA_DEPOIS, pausaDepois[1]) : duracaoCrua,
    pausaNatural: pausaDepois ? pausaDepois[1] - pausaDepois[0] : 0,
    fimFala,
  };
});

// frase regravada: o pedaço vem do arquivo novo, recortado nas bordas de silêncio
const fontes = [CRUA];
for (const [k, sub] of Object.entries(SUBSTITUI)) {
  const p = pedacos[+k];
  const dur = duracao(sub.arquivo);
  const bordas = medirPausas(sub.arquivo);
  const inicio = bordas.find(([a]) => a < 0.05);
  const fim = bordas.find(([, b]) => b > dur - 0.05);
  p.ataque = inicio ? inicio[1] : 0;
  p.fimFala = fim ? fim[0] : dur;
  p.de = Math.max(0, p.ataque - FOLGA_ANTES);
  p.ate = Math.min(dur, p.fimFala + FOLGA_DEPOIS);
  p.texto = sub.texto;
  p.fonte = fontes.push(sub.arquivo) - 1;
}

const indiceDrop = A.fraseDoDrop ?? Math.min(1, pedacos.length - 1);
if (!pedacos[indiceDrop] || indiceDrop < 1) {
  throw new Error(`fraseDoDrop ${indiceDrop} inválida: precisa ser de 1 a ${pedacos.length - 1}`);
}

// ── linha do tempo ───────────────────────────────────────────────────────────

const meia = MUSICA.periodo / 2;
let tDrop = null;
let fimAnterior = 0;
for (const p of pedacos) {
  const ataqueRel = (p.ataque - p.de) / TEMPO; // do começo do pedaço até a voz
  let ataqueFinal;
  if (p.k === 0) {
    ataqueFinal = p.ataque; // a primeira frase fica onde está (voz no quadro 0)
  } else {
    const pausa =
      PAUSA_DEPOIS[p.k - 1] ??
      Math.min(0.42, Math.max(0.2, pedacos[p.k - 1].pausaNatural / TEMPO));
    const desejado = fimAnterior + pausa;
    if (tDrop === null || PAUSA_DEPOIS[p.k - 1] !== undefined) {
      ataqueFinal = desejado;
    } else {
      // colcheia mais perto do desejado, sem encostar na frase anterior
      const minimo = fimAnterior + 0.16;
      let m = Math.round((desejado - tDrop) / meia);
      while (tDrop + m * meia < minimo) m++;
      ataqueFinal = tDrop + m * meia;
    }
  }
  if (p.k === indiceDrop) tDrop = ataqueFinal;
  p.inicioFinal = ataqueFinal - ataqueRel;
  p.duracaoFinal = (p.ate - p.de) / TEMPO;
  fimAnterior = p.inicioFinal + (p.fimFala - p.de) / TEMPO;
}

const fimVoz = fimAnterior;
const DURACAO = +(fimVoz + 1.2).toFixed(3);

// ── voz ──────────────────────────────────────────────────────────────────────

const tmpVoz = path.join(PASTA, "_voz.wav");
{
  const partes = pedacos
    .map(
      (p, i) =>
        `[${p.fonte ?? 0}]atrim=${p.de.toFixed(4)}:${p.ate.toFixed(4)},asetpts=PTS-STARTPTS,atempo=${TEMPO},` +
        `afade=t=in:d=0.01,afade=t=out:st=${(p.duracaoFinal - 0.02).toFixed(4)}:d=0.02,` +
        `adelay=${Math.round(p.inicioFinal * 1000)}:all=1[p${i}]`,
    )
    .join(";");
  const juntar = pedacos.map((_, i) => `[p${i}]`).join("");
  ffmpeg([
    ...fontes.flatMap((a) => ["-i", a]),
    "-filter_complex",
    `${partes};${juntar}amix=inputs=${pedacos.length}:normalize=0:duration=longest,apad=whole_dur=${DURACAO},atrim=0:${DURACAO}[v]`,
    "-map", "[v]", "-ar", "44100", "-ac", "1", tmpVoz,
  ]);
}
const ganhoVoz = VOZ_LUFS - lufs(tmpVoz);
ffmpeg(["-i", tmpVoz, "-af", `volume=${ganhoVoz.toFixed(2)}dB`, "-b:a", "192k", path.join(PASTA, "narracao.mp3")]);
fs.unlinkSync(tmpVoz);

// ── legendas na linha final ──────────────────────────────────────────────────
// Medidas de novo, palavra por palavra, na narração final (scripts/legendas.mjs). Antes
// eram reescaladas dentro de cada frase e o texto entrava até 0,6 s atrasado na frase
// longa do CTA (08/10/2026).
const roteiroFinal = path.join(PASTA, "roteiro-final.txt");
fs.writeFileSync(roteiroFinal, `${pedacos.map((p) => p.texto).join(" ")}\n`);
execFileSync("node", ["scripts/legendas.mjs", path.join(PASTA, "narracao.mp3"), roteiroFinal], { stdio: "inherit" });

// ── trilha ───────────────────────────────────────────────────────────────────

const tAbafa = pedacos[indiceDrop - 1].inicioFinal + (pedacos[indiceDrop - 1].ataque - pedacos[indiceDrop - 1].de) / TEMPO;
const fimSaber = pedacos[indiceDrop - 1].inicioFinal + (pedacos[indiceDrop - 1].fimFala - pedacos[indiceDrop - 1].de) / TEMPO;
const inicioNaMusica = MUSICA.drop - tDrop;
if (inicioNaMusica < 0) throw new Error("O drop cai antes do começo da música");

const tmpCama = path.join(PASTA, "_cama.wav");
ffmpeg(["-ss", inicioNaMusica.toFixed(4), "-t", String(DURACAO), "-i", TRILHA, "-ac", "2", "-ar", "44100", tmpCama]);
const ganhoCama = CAMA_LUFS - lufs(tmpCama);

// passa-baixa: 18 kHz -> 380 Hz (exponencial) de "E você" até o fim de "saber.", segura, abre no drop
const comandos = [];
for (let t = tAbafa; t <= fimSaber + 1e-6; t += 0.04) {
  const p = (t - tAbafa) / (fimSaber - tAbafa);
  comandos.push(`${t.toFixed(3)} lowpass@lp f ${Math.round(18000 * Math.pow(380 / 18000, p))}`);
}
comandos.push(`${(tDrop - 0.01).toFixed(3)} lowpass@lp f 20000`);
const volume =
  `if(between(t,${tAbafa.toFixed(3)},${(tDrop - 0.01).toFixed(3)}),0.8,1)` +
  `*if(gt(t,${(fimVoz + 0.1).toFixed(3)}),1+0.8*min(1,(t-${(fimVoz + 0.1).toFixed(3)})/0.4),1)`;
ffmpeg([
  "-i", tmpCama,
  "-af",
  `volume=${ganhoCama.toFixed(2)}dB,asendcmd=c='${comandos.join(";")}',lowpass@lp=f=20000,` +
    `volume='${volume}':eval=frame,afade=t=in:d=0.08,afade=t=out:st=${(DURACAO - 1.1).toFixed(3)}:d=1.1`,
  "-b:a", "192k", path.join(PASTA, "trilha.mp3"),
]);
fs.unlinkSync(tmpCama);

// ── tempos pra composição ────────────────────────────────────────────────────

const tempos = {
  duracao: DURACAO,
  fimVoz: +fimVoz.toFixed(3),
  drop: +tDrop.toFixed(3),
  abafa: +tAbafa.toFixed(3),
  periodo: +MUSICA.periodo.toFixed(5),
  // batidas da música na linha final (a trilha toda segue a mesma grade)
  primeiraBatida: +(((tDrop % MUSICA.periodo) + MUSICA.periodo) % MUSICA.periodo).toFixed(4),
};
fs.writeFileSync(path.join(PASTA, "tempos.json"), JSON.stringify(tempos, null, 2) + "\n");

console.log(`voz ${ganhoVoz.toFixed(1)} dB, trilha ${ganhoCama.toFixed(1)} dB, música a partir de ${inicioNaMusica.toFixed(2)} s`);
console.log(`drop em ${tDrop.toFixed(2)} s, voz termina em ${fimVoz.toFixed(2)} s, vídeo com ${DURACAO} s`);
for (const p of pedacos) console.log(`  ${p.inicioFinal.toFixed(2).padStart(6)}  ${p.texto}`);

// ── apoio ────────────────────────────────────────────────────────────────────

function ffmpeg(args) {
  execFileSync("ffmpeg", ["-nostdin", "-v", "error", "-y", ...args]);
}

function lufs(arquivo) {
  const e = spawnSync("ffmpeg", ["-nostdin", "-hide_banner", "-i", arquivo, "-af", "ebur128", "-f", "null", "-"], {
    encoding: "utf8",
  }).stderr;
  const todos = [...e.matchAll(/I:\s+(-?[0-9.]+) LUFS/g)];
  return parseFloat(todos[todos.length - 1][1]);
}

function duracao(arquivo) {
  return parseFloat(
    String(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", arquivo])),
  );
}

function medirPausas(arquivo) {
  const log = spawnSync("ffmpeg", ["-nostdin", "-hide_banner", "-i", arquivo, "-af", "silencedetect=noise=-40dB:d=0.1", "-f", "null", "-"], {
    encoding: "utf8",
  }).stderr;
  const ini = [...log.matchAll(/silence_start: ([0-9.]+)/g)].map((m) => +m[1]);
  const fim = [...log.matchAll(/silence_end: ([0-9.]+)/g)].map((m) => +m[1]);
  return fim.map((f, i) => [ini[i], f]);
}

// Programação dinâmica: uma pausa distinta e crescente pra cada fronteira, perto da
// estimativa do whisper (custo = distância) e preferindo pausa longa (bônus)
function escolherPausas(estimativas, lista) {
  const custo = (e, p) => Math.abs((p[0] + p[1]) / 2 - e) - 0.6 * (p[1] - p[0]);
  const n = estimativas.length;
  const m = lista.length;
  const melhor = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(Infinity));
  const veio = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(-1));
  for (let j = 0; j <= m; j++) melhor[0][j] = 0;
  for (let i = 1; i <= n; i++) {
    for (let j = i; j <= m; j++) {
      // fronteira i usa a pausa j-1, ou pula a pausa j-1
      const usa = melhor[i - 1][j - 1] + custo(estimativas[i - 1], lista[j - 1]);
      const pula = melhor[i][j - 1];
      if (usa <= pula) {
        melhor[i][j] = usa;
        veio[i][j] = 1;
      } else {
        melhor[i][j] = pula;
        veio[i][j] = 0;
      }
    }
  }
  const escolhidas = new Array(n);
  for (let i = n, j = m; i > 0; j--) {
    if (veio[i][j] === 1) {
      escolhidas[i - 1] = lista[j - 1];
      i--;
    }
  }
  return escolhidas;
}
