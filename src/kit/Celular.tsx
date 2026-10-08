import { Video } from "@remotion/media";
import { Img, Sequence, staticFile, useVideoConfig } from "remotion";
import { comAlfa, cores } from "../tema";

// Formato das gravações de tela (public/telas/<nome>/tela.mp4): 736x1600 a 30 fps.
// A 60 fps o Video do @remotion/media trava no render ("Timeout while extracting frame").
export const TELA = { largura: 736, altura: 1600 };

// Celular genérico (sem marca): moldura escura, ilha no topo e a tela por dentro.
// A tela tem a proporção das gravações (TELA).
const BORDA = 0.034; // da largura
const RAIO = 0.16; // da largura

export const Celular: React.FC<{
  largura: number;
  children: React.ReactNode;
  brilho?: number; // 0..1, aro de luz em volta (destaque)
  style?: React.CSSProperties;
}> = ({ largura, children, brilho = 0, style }) => {
  const borda = largura * BORDA;
  const telaL = largura - 2 * borda;
  const telaA = (telaL * TELA.altura) / TELA.largura;
  const altura = telaA + 2 * borda;
  return (
    <div
      style={{
        position: "relative",
        width: largura,
        height: altura,
        borderRadius: largura * RAIO,
        background: "linear-gradient(145deg, #2a3242, #0c111c 45%, #1b2230)",
        boxShadow: [
          "0 40px 90px rgba(0, 4, 24, .55)",
          "inset 0 0 0 2px rgba(255,255,255,.08)",
          brilho > 0 ? `0 0 ${60 * brilho}px ${10 * brilho}px ${comAlfa(cores.azul800, 0.55 * brilho)}` : "",
        ]
          .filter(Boolean)
          .join(", "),
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: borda,
          top: borda,
          width: telaL,
          height: telaA,
          borderRadius: largura * (RAIO - BORDA * 0.9),
          overflow: "hidden",
          backgroundColor: "#000",
        }}
      >
        {children}
        {/* ilha */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: telaA * 0.014,
            width: telaL * 0.3,
            height: telaL * 0.085,
            translate: "-50% 0",
            borderRadius: 999,
            backgroundColor: "#000",
          }}
        />
        {/* reflexo do vidro */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(120deg, rgba(255,255,255,.10) 0%, rgba(255,255,255,0) 32%, rgba(255,255,255,0) 100%)",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
};

// Tela com uma gravação rolando (public/telas/<nome>/tela.mp4). OffthreadVideo não serve:
// o ffprobe dele é barrado pelo App Control do Windows. `de` = instante (s) em que a gravação
// começa a tocar; `desde` = de onde (s) dentro da gravação.
export const TelaGravada: React.FC<{ src: string; de: number; ate: number; desde: number }> = ({ src, de, ate, desde }) => {
  const { fps } = useVideoConfig();
  return (
    <Sequence from={Math.round(de * fps)} durationInFrames={Math.max(1, Math.round((ate - de) * fps))} layout="none">
      <Video
        src={staticFile(src)}
        trimBefore={Math.round(desde * fps)}
        muted
        objectFit="cover"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
    </Sequence>
  );
};

// Tela parada (primeiro quadro do site)
export const TelaParada: React.FC<{ src: string }> = ({ src }) => (
  <Img
    src={staticFile(src)}
    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
  />
);
