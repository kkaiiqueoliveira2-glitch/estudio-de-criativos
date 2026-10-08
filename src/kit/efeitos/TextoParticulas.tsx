import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { random, useCurrentFrame, useVideoConfig } from "remotion";
import { useEspera } from "../espera";
import { fontesProntas } from "../../tema";

// Texto de partículas, a partir do "ParticleTextEffect" do 21st.dev (xubohuah). No original
// cada partícula é um corpo com física rodando em requestAnimationFrame e Math.random: num
// vídeo isso sai diferente a cada render. Aqui a posição de cada partícula é uma função do
// tempo (sai de fora, faz uma curva e assenta no ponto da letra), com sementes fixas.
// O rastro (o "motion blur" do original) é o segmento entre o quadro anterior e o atual.

export const TextoParticulas: React.FC<{
  texto: string;
  fonte: string; // ex.: 'italic 400 300px "Instrument Serif"'
  largura: number;
  altura: number;
  de: number; // começa a juntar (s)
  junta: number; // tempo pra cada partícula chegar (s)
  espalha?: number; // atraso máximo entre partículas (s)
  some?: number; // quando as partículas apagam (o texto sólido assume)
  cores: [string, string]; // [cor no caminho, cor ao chegar]
  passo?: number; // px entre pontos amostrados
  centroY?: number; // altura do centro do texto no canvas (padrão: meio)
  semente?: string;
  style?: React.CSSProperties;
}> = ({ texto, fonte, largura, altura, de, junta, espalha = 0.35, some, cores, passo = 5, semente = "p", centroY, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const canvas = useRef<HTMLCanvasElement>(null);
  const [alvos, setAlvos] = useState<Float32Array | null>(null);

  // pontos das letras: o texto desenhado num canvas fora da tela, um ponto a cada `passo` px
  useEspera("Amostrando o texto das partículas", async () => {
    await fontesProntas;
    const c = new OffscreenCanvas(largura, altura);
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.font = fonte;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(texto, largura / 2, centroY ?? altura / 2);
    const px = ctx.getImageData(0, 0, largura, altura).data;
    const pts: number[] = [];
    for (let y = 0; y < altura; y += passo) {
      for (let x = 0; x < largura; x += passo) {
        if (px[(y * largura + x) * 4 + 3] > 128) pts.push(x, y);
      }
    }
    setAlvos(new Float32Array(pts));
  });

  // origem, atraso e curva de cada partícula (sementes fixas)
  const dados = useMemo(() => {
    if (!alvos) return null;
    const n = alvos.length / 2;
    const d = new Float32Array(n * 5);
    for (let i = 0; i < n; i++) {
      const a = random(`${semente}-a-${i}`) * Math.PI * 2;
      const r = 650 + random(`${semente}-r-${i}`) * 550;
      d[i * 5] = largura / 2 + Math.cos(a) * r;
      d[i * 5 + 1] = (centroY ?? altura / 2) + Math.sin(a) * r;
      d[i * 5 + 2] = random(`${semente}-d-${i}`) * espalha; // atraso
      d[i * 5 + 3] = (random(`${semente}-c-${i}`) - 0.5) * 360; // curva lateral
      d[i * 5 + 4] = 1.6 + random(`${semente}-s-${i}`) * 1.6; // espessura
    }
    return d;
  }, [alvos, largura, altura, espalha, semente, centroY]);

  useLayoutEffect(() => {
    const cv = canvas.current;
    if (!cv || !alvos || !dados) return;
    const ctx = cv.getContext("2d")!;
    ctx.clearRect(0, 0, largura, altura);
    const apaga = some === undefined ? 1 : 1 - Math.min(1, Math.max(0, (t - some) / 0.25));
    if (apaga <= 0) return;
    const n = alvos.length / 2;
    const pos = (i: number, tt: number) => {
      const p = Math.min(1, Math.max(0, (tt - de - dados[i * 5 + 2]) / junta));
      const e = 1 - Math.pow(1 - p, 3); // chega rápido e assenta
      const sx = dados[i * 5];
      const sy = dados[i * 5 + 1];
      const tx = alvos[i * 2];
      const ty = alvos[i * 2 + 1];
      const dx = tx - sx;
      const dy = ty - sy;
      const len = Math.hypot(dx, dy) || 1;
      const curva = Math.sin(Math.PI * e) * dados[i * 5 + 3];
      return { x: sx + dx * e + (-dy / len) * curva, y: sy + dy * e + (dx / len) * curva, p };
    };
    ctx.lineCap = "round";
    for (let i = 0; i < n; i++) {
      const agora = pos(i, t);
      if (t < de + dados[i * 5 + 2]) continue;
      const antes = pos(i, t - 1.5 / fps);
      ctx.globalAlpha = apaga * (0.35 + 0.65 * agora.p);
      ctx.strokeStyle = agora.p >= 1 ? cores[1] : cores[0];
      ctx.lineWidth = agora.p >= 1 ? passo * 0.75 : dados[i * 5 + 4];
      ctx.beginPath();
      ctx.moveTo(antes.x, antes.y);
      ctx.lineTo(agora.x + 0.01, agora.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }, [t, alvos, dados, largura, altura, de, junta, some, cores, passo, fps]);

  return <canvas ref={canvas} width={largura} height={altura} style={{ position: "absolute", ...style }} />;
};
