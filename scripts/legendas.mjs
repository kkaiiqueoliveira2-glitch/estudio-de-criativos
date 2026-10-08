// Gera legendas.json (tempo de cada palavra) ao lado do áudio da narração.
//
//   node scripts/legendas.mjs [audio] [roteiro]
//   padrão: public/narracao/narracao.mp3 e public/narracao/roteiro.txt
//
// O whisper.cpp dá os tempos; o texto sai do roteiro, alinhado palavra a palavra.
// Assim o nome da marca sai escrito certo mesmo que o whisper ouça outra coisa.
// Palavra do roteiro que o whisper não reconheceu ganha tempo por interpolação.

import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  downloadWhisperModel,
  installWhisperCpp,
  toCaptions,
  transcribe,
} from "@remotion/install-whisper-cpp";

const audio = process.argv[2] ?? "public/narracao/narracao.mp3";
const roteiroPath = process.argv[3] ?? "public/narracao/roteiro.txt";
const destino = path.join(path.dirname(audio), "legendas.json");

const WHISPER = path.join(process.cwd(), "whisper.cpp");
const VERSAO = "1.5.5";
const MODELO = "small"; // multilíngue; os modelos .en não entendem português

await installWhisperCpp({ to: WHISPER, version: VERSAO });
await downloadWhisperModel({ model: MODELO, folder: WHISPER });

// O whisper.cpp só lê WAV 16 kHz mono
const wav = path.join(WHISPER, "entrada-16k.wav");
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", audio, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wav]);

const resultado = await transcribe({
  inputPath: wav,
  whisperPath: WHISPER,
  whisperCppVersion: VERSAO,
  model: MODELO,
  tokenLevelTimestamps: true,
  language: "pt",
  // splitOnWord: true manda "--split-on-word true" e o whisper.cpp lê o "true" como arquivo
  additionalArgs: ["--split-on-word"],
});
const { captions: ouvidas } = toCaptions({ whisperCppOutput: resultado });

const roteiro = fs.readFileSync(roteiroPath, "utf8").trim().split(/\s+/);
const reconhecidas = ouvidas
  .map((c) => ({ ...c, norma: normalizar(c.text) }))
  .filter((c) => c.norma.length > 0);

const pares = alinhar(roteiro.map(normalizar), reconhecidas.map((c) => c.norma));

const palavras = roteiro.map((texto, i) => {
  const j = pares[i];
  return j === null
    ? { texto, inicio: null, fim: null, confianca: null }
    : {
        texto,
        inicio: reconhecidas[j].startMs,
        fim: reconhecidas[j].endMs,
        confianca: reconhecidas[j].confidence,
      };
});
interpolarFaltantes(palavras, duracaoMs(audio));
ajustarPelasPausas(palavras, medirPausas(audio));

const legendas = palavras.map((p, i) => ({
  text: (i === 0 ? "" : " ") + p.texto,
  startMs: Math.round(p.inicio),
  endMs: Math.round(p.fim),
  timestampMs: Math.round((p.inicio + p.fim) / 2),
  confidence: p.confianca,
}));

fs.writeFileSync(destino, JSON.stringify(legendas, null, 2) + "\n");

const casadas = pares.filter((j) => j !== null).length;
console.log(`${destino}: ${legendas.length} palavras, ${casadas} com tempo do whisper, ${legendas.length - casadas} interpoladas`);
console.log(`whisper ouviu: ${ouvidas.map((c) => c.text).join("").trim()}`);
console.log(
  "frases começam em: " +
    legendas
      .filter((p, i) => i === 0 || /[.!?]$/.test(legendas[i - 1].text))
      .map((p) => (p.startMs / 1000).toFixed(2) + "s")
      .join(", "),
);

// ── apoio ────────────────────────────────────────────────────────────────────

function normalizar(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9+]/g, "");
}

function semelhanca(a, b) {
  if (a === b) return 1;
  const d = levenshtein(a, b);
  return 1 - d / Math.max(a.length, b.length);
}

function levenshtein(a, b) {
  const linha = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let anterior = linha[0];
    linha[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const guardado = linha[j];
      linha[j] = Math.min(linha[j] + 1, linha[j - 1] + 1, anterior + (a[i - 1] === b[j - 1] ? 0 : 1));
      anterior = guardado;
    }
  }
  return linha[b.length];
}

// Needleman-Wunsch: devolve, pra cada palavra do roteiro, o índice da reconhecida (ou null)
function alinhar(a, b) {
  const LACUNA = -1;
  const pontos = (x, y) => {
    const s = semelhanca(x, y);
    return s === 1 ? 2 : s >= 0.6 ? 1 : -1;
  };
  const m = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) m[i][0] = i * LACUNA;
  for (let j = 1; j <= b.length; j++) m[0][j] = j * LACUNA;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      m[i][j] = Math.max(
        m[i - 1][j - 1] + pontos(a[i - 1], b[j - 1]),
        m[i - 1][j] + LACUNA,
        m[i][j - 1] + LACUNA,
      );
    }
  }
  const pares = new Array(a.length).fill(null);
  let i = a.length;
  let j = b.length;
  while (i > 0 && j > 0) {
    const p = pontos(a[i - 1], b[j - 1]);
    if (m[i][j] === m[i - 1][j - 1] + p) {
      if (p > 0) pares[i - 1] = j - 1;
      i--;
      j--;
    } else if (m[i][j] === m[i - 1][j] + LACUNA) {
      i--;
    } else {
      j--;
    }
  }
  return pares;
}

// Palavras sem tempo dividem o intervalo entre as vizinhas, proporcional ao tamanho
function interpolarFaltantes(palavras, totalMs) {
  let i = 0;
  while (i < palavras.length) {
    if (palavras[i].inicio !== null) {
      i++;
      continue;
    }
    let k = i;
    while (k < palavras.length && palavras[k].inicio === null) k++;
    const de = i === 0 ? 0 : palavras[i - 1].fim;
    const ate = k === palavras.length ? totalMs : palavras[k].inicio;
    const pesos = palavras.slice(i, k).map((p) => p.texto.length);
    const soma = pesos.reduce((x, y) => x + y, 0);
    let t = de;
    for (let n = i; n < k; n++) {
      const dur = ((ate - de) * pesos[n - i]) / soma;
      palavras[n].inicio = t;
      palavras[n].fim = t + dur;
      t += dur;
    }
    i = k;
  }
}

// Ajuste fino pelas pausas reais. O whisper estica a palavra antes de uma pausa
// por cima dela (até 0,8 s nesta narração) e às vezes atrasa as anteriores
// ("WhatsApp" saiu 0,4 s depois do real em 07/10/2026). Só mexe em fronteira
// com pontuação, onde a pausa é esperada:
// - a palavra pontuada termina onde a pausa começa;
// - a palavra seguinte começa onde a pausa termina;
// - se a palavra cortada ficou curta pro tamanho dela, as anteriores da mesma
//   frase recuam pra abrir espaço.
function ajustarPelasPausas(palavras, pausas) {
  const minimoMs = (p) => Math.max(120, p.texto.length * 55);
  for (let i = 0; i < palavras.length; i++) {
    const p = palavras[i];
    if (!/[.,!?;:]$/.test(p.texto)) continue;
    const pausa = pausas.find(([ini]) => ini > p.inicio && ini < p.fim);
    if (!pausa) continue;
    const [ini, fim] = pausa;
    p.fim = ini;

    const prox = palavras[i + 1];
    if (prox && prox.inicio >= ini && prox.inicio <= fim + 200) prox.inicio = fim;

    for (let k = i; k > 0; k--) {
      const w = palavras[k];
      if (w.fim - w.inicio >= minimoMs(w)) break;
      w.inicio = w.fim - minimoMs(w);
      const ant = palavras[k - 1];
      if (/[.!?]$/.test(ant.texto)) break;
      ant.fim = Math.min(ant.fim, w.inicio);
    }
  }
}

// Pausas pelo silencedetect, com limiar adaptado ao volume da gravação
// (input_thresh do loudnorm). Pausas coladas (< 50 ms) viram uma só.
function medirPausas(arquivo) {
  const medir = (filtro) =>
    spawnSync("ffmpeg", ["-hide_banner", "-i", arquivo, "-af", filtro, "-f", "null", "-"], {
      encoding: "utf8",
    }).stderr;
  const loud = medir("loudnorm=print_format=json");
  const limiar = parseFloat(loud.match(/"input_thresh"\s*:\s*"(-?[0-9.]+)"/)[1]);
  const log = medir(`silencedetect=noise=${limiar}dB:d=0.15`);
  const inicios = [...log.matchAll(/silence_start: ([0-9.]+)/g)].map((m) => +m[1] * 1000);
  const fins = [...log.matchAll(/silence_end: ([0-9.]+)/g)].map((m) => +m[1] * 1000);
  const pausas = [];
  for (let i = 0; i < fins.length; i++) {
    const ultima = pausas[pausas.length - 1];
    if (ultima && inicios[i] - ultima[1] < 50) ultima[1] = fins[i];
    else pausas.push([inicios[i], fins[i]]);
  }
  return pausas;
}

function duracaoMs(arquivo) {
  const s = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", arquivo]);
  return parseFloat(String(s)) * 1000;
}
