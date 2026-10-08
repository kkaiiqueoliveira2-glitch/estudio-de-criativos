import { useCurrentFrame, useVideoConfig } from "remotion";
import { Letras } from "../componentes/Cinetico";
import { molaEm } from "../movimento";
import { comAlfa, cores, FONTE, peso } from "../tema";
import { PALETA, type Tema } from "./paleta";

// Título numerado no topo da cena ("01 Aparecer"): selo com o número na cor principal
// e o nome letra a letra. Fica no topo da área segura.
const ESQ = 96;
const TITULO = { y: 300, tamanho: 120 };

export const TituloCapitulo: React.FC<{ n: number; nome: string; entra: number; tema: Tema }> = ({
  n,
  nome,
  entra,
  tema,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = molaEm(frame, fps, entra - 0.06, "mola");
  return (
    <div
      style={{
        position: "absolute",
        left: ESQ,
        top: TITULO.y,
        display: "flex",
        alignItems: "center",
        gap: 30,
      }}
    >
      <div
        style={{
          height: 104,
          padding: "0 30px",
          borderRadius: 999,
          backgroundColor: cores.azul800,
          display: "flex",
          alignItems: "center",
          fontFamily: FONTE,
          fontWeight: peso.extra,
          fontSize: 56,
          color: cores.neutro50,
          scale: String(s),
          boxShadow: `0 0 40px ${comAlfa(cores.azul800, 0.6)}`,
        }}
      >
        0{n}
      </div>
      <div
        style={{
          fontFamily: FONTE,
          fontWeight: peso.extra,
          fontSize: TITULO.tamanho,
          letterSpacing: "-0.045em",
          lineHeight: 1,
          color: PALETA[tema].texto,
        }}
      >
        <Letras texto={nome} entra={entra} passo={0.028} />
      </div>
    </div>
  );
};
