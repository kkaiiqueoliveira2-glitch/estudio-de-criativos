import { useCurrentFrame, useVideoConfig } from "remotion";
import { progresso } from "../../movimento";

// Efeitos de texto trazidos do 21st.dev e refeitos pro relógio do vídeo (08/10/2026).

// ── Marca-texto ("Text Highlighter", danielpetho) ────────────────────────────
// O fundo de marca-texto varre a palavra da esquerda pra direita; a cor do texto troca
// quando o marcador passa. No original, a animação era do motion/react no scroll.
export const MarcaTexto: React.FC<{
  entra: number;
  duracao?: number;
  cor: string; // cor do marcador
  corTexto?: string; // cor do texto por cima do marcador
  children: React.ReactNode;
}> = ({ entra, duracao = 0.45, cor, corTexto, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = progresso(frame / fps, entra, entra + duracao, "chegada");
  return (
    <span
      style={{
        backgroundImage: `linear-gradient(${cor}, ${cor})`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "0 60%",
        backgroundSize: `${p * 100}% 88%`,
        borderRadius: "0.14em",
        padding: "0 0.08em",
        margin: "0 -0.08em",
        boxDecorationBreak: "clone",
        WebkitBoxDecorationBreak: "clone",
        color: corTexto && p > 0.55 ? corTexto : undefined,
      }}
    >
      {children}
    </span>
  );
};

// ── RGB separado ("NeonRGBTextEffect", xubohuah) ─────────────────────────────
// Três cópias do texto (vermelho, verde, azul) somadas por "screen": onde as três se
// encontram vira branco, nas bordas sobra a franja colorida. No original era um shader
// WebGL com deslocamento fixo; aqui o deslocamento dá um tranco em cada batida e assenta.
export const TextoRGB: React.FC<{
  texto: string;
  batidas: number[];
  base?: number; // deslocamento em repouso (px)
  tranco?: number; // deslocamento no tranco (px)
  style?: React.CSSProperties;
}> = ({ texto, batidas, base = 3, tranco = 26, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const ultima = batidas.filter((b) => t >= b).pop();
  const pulso = ultima === undefined ? 0 : Math.exp(-(t - ultima) / 0.11);
  const d = base + tranco * pulso;
  const vy = (Math.sin(frame * 2.3) * 0.5 + 0.5) * 6 * pulso; // tremida vertical no tranco
  const canal = (cor: string, dx: number, dy: number): React.CSSProperties => ({
    position: "absolute",
    inset: 0,
    color: cor,
    mixBlendMode: "screen",
    translate: `${dx}px ${dy}px`,
  });
  return (
    <span style={{ position: "relative", display: "inline-block", isolation: "isolate", ...style }}>
      <span style={{ visibility: "hidden" }}>{texto}</span>
      <span style={canal("#ff2a2a", d, -vy)}>{texto}</span>
      <span style={canal("#2aff6a", 0, 0)}>{texto}</span>
      <span style={canal("#2a5bff", -d, vy)}>{texto}</span>
    </span>
  );
};

// ── Degradê animado ("Animated Gradient Text", shadcnspace) ─────────────────
// Degradê correndo dentro das letras (background-clip). No original era keyframes CSS.
export const TextoGradiente: React.FC<{
  cores: string[];
  velocidade?: number; // voltas por segundo
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ cores, velocidade = 0.35, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pos = ((frame / fps) * velocidade * 100) % 100;
  return (
    <span
      style={{
        backgroundImage: `linear-gradient(100deg, ${[...cores, cores[0]].join(", ")})`,
        backgroundSize: "200% 100%",
        backgroundPosition: `${pos}% 50%`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        paddingRight: "0.08em",
        ...style,
      }}
    >
      {children}
    </span>
  );
};
