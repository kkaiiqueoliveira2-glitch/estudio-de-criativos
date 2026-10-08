import { useCurrentFrame, useVideoConfig } from "remotion";
import { molaEm, progresso } from "../movimento";
import { comAlfa, cores, FONTE, MARCA, peso } from "../tema";
import { PALETA } from "./paleta";

// Peças da chamada final: o botão do anúncio sendo tocado, o dedo que toca e as setas
// apontando pro botão de verdade (embaixo da área segura).

// Dedo (indicador de toque): chega, aperta em `toca` e sai, com uma onda no toque
export const Dedo: React.FC<{ t: number; toca: number; x?: number; y?: number; cor?: string }> = ({
  t,
  toca,
  x = 700,
  y = 560,
  cor = PALETA.claro.dedo,
}) => {
  if (t < toca - 0.7 || t > toca + 0.9) return null;
  const vem = progresso(t, toca - 0.6, toca - 0.05, "chegada");
  const vai = progresso(t, toca + 0.35, toca + 0.85, "partida");
  const aperta = t >= toca && t < toca + 0.18;
  const onda = progresso(t, toca, toca + 0.45, "chegada");
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x - 70 * onda,
          top: y - 70 * onda,
          width: 140 * onda,
          height: 140 * onda,
          borderRadius: "50%",
          border: `6px solid ${cor}`,
          opacity: t >= toca ? 1 - onda : 0,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: x - 36 + 260 * (1 - vem) + 200 * vai,
          top: y - 20 + 340 * (1 - vem) + 260 * vai,
          width: 72,
          height: 72,
          borderRadius: "50%",
          backgroundColor: cor,
          border: "4px solid rgba(255, 255, 255, .9)",
          boxShadow: `0 8px 24px ${comAlfa(cores.sombra, 0.35)}`,
          scale: aperta ? "0.82" : "1",
          opacity: vem * (1 - vai),
        }}
      />
    </>
  );
};

// Botão branco com o texto do botão do anúncio (marca.json > botao), apertado em `toca`
export const BotaoChamada: React.FC<{ t: number; entra: number; toca: number; texto?: string }> = ({
  t,
  entra,
  toca,
  texto = MARCA.botao,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = molaEm(frame, fps, entra, "mola");
  const aperta = t >= toca && t < toca + 0.16 ? 0.93 : 1;
  const brilho = -30 + 160 * progresso(t, toca + 0.1, toca + 0.9, "travessia");
  // texto longo encolhe pra caber no botão
  const tamanho = Math.min(76, Math.round(1150 / Math.max(texto.length, 1)));
  return (
    <div
      style={{
        position: "absolute",
        left: 540 - 380,
        top: 470,
        width: 760,
        height: 170,
        borderRadius: 85,
        backgroundColor: cores.branco,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 26,
        fontFamily: FONTE,
        fontWeight: peso.extra,
        fontSize: tamanho,
        letterSpacing: "-0.03em",
        color: cores.azul800,
        whiteSpace: "nowrap",
        scale: String(s * aperta),
        boxShadow: `0 0 60px rgba(255, 255, 255, .35), 0 24px 50px ${comAlfa(cores.sombra, 0.45)}`,
      }}
    >
      {texto}
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
        <path d="M5 12h13M13 6l6 6-6 6" stroke={cores.azul800} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: `${brilho}%`,
          width: "16%",
          background: `linear-gradient(90deg, transparent, ${comAlfa(cores.azul800, 0.18)}, transparent)`,
          rotate: "16deg",
        }}
      />
    </div>
  );
};

// Setas apontando pro botão real do anúncio, embaixo da área segura
export const Setas: React.FC<{ t: number; entra: number }> = ({ t, entra }) => {
  if (t < entra - 0.6) return null;
  const aparece = progresso(t, entra - 0.6, entra, "chegada");
  return (
    <div style={{ position: "absolute", left: 540 - 60, top: 1060, width: 120, opacity: aparece }}>
      {[0, 1, 2].map((i) => {
        const onda = (Math.sin((t - entra) * 6 - i * 0.9) + 1) / 2;
        return (
          <svg key={i} width="120" height="90" viewBox="0 0 24 18" style={{ display: "block", marginTop: -20, opacity: 0.35 + 0.65 * onda }}>
            <path d="M4 5l8 8 8-8" stroke={cores.neutro50} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      })}
    </div>
  );
};
