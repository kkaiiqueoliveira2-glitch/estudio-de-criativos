import { useCurrentFrame, useVideoConfig } from "remotion";
import { molaEm, type Mola, progresso } from "../movimento";
import { cores, FONTE_DESTAQUE, temas } from "../tema";

// Tipografia cinética do criativo v2. Tempos em segundos, curvas só de movimento.ts.

// A fenda da máscara: um pouco maior que a caixa da palavra, pra acento, descendente
// e o overshoot da mola não serem cortados
const FENDA = "inset(-0.22em -0.3em -0.2em -0.3em)";

// Duração da saída (s). Curta de propósito: quem sai libera o lugar antes de a
// próxima palavra subir na mesma fenda
const SAIDA = 0.24;

// Quanto a palavra anda (% da própria altura) pra ficar fora da fenda. Precisa
// passar da folga da fenda com acento e vírgula juntos: com 118% o til de "não"
// aparecia antes da hora e a vírgula de "acha," sobrava depois de sair
const DESLOCA = 145;

// Palavra que sobe de dentro de uma fenda (entra) e pode sair pela mesma fenda
// pra cima, ou escorregar pra direita, sem fenda, quando o texto "vai embora".
export const Mascara: React.FC<{
  entra: number;
  sai?: number;
  saida?: "cima" | "direita";
  mola?: Mola;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ entra, sai, saida = "cima", mola = "mola", style, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const s = molaEm(frame, fps, entra, mola);
  const saindo =
    sai !== undefined ? progresso(t, sai, sai + SAIDA, "partida") : 0;
  const pelaDireita = saida === "direita" && sai !== undefined && t >= sai;

  return (
    <span
      style={{
        display: "inline-block",
        clipPath: pelaDireita ? undefined : FENDA,
        ...style,
      }}
    >
      <span
        style={{
          display: "inline-block",
          translate: pelaDireita
            ? `${saindo * 1300}px 0`
            : `0 ${(1 - s) * DESLOCA - saindo * DESLOCA}%`,
          opacity: s <= 0.001 ? 0 : 1,
        }}
      >
        {children}
      </span>
    </span>
  );
};

// Palavra-chave letra a letra: cada letra sobe da fenda com overshoot, em cascata
export const Letras: React.FC<{
  texto: string;
  entra: number;
  passo?: number; // s entre letras
  sai?: number;
  saida?: "cima" | "direita";
  style?: React.CSSProperties;
}> = ({ texto, entra, passo = 0.032, sai, saida = "cima", style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const saindo =
    sai !== undefined ? progresso(t, sai, sai + SAIDA, "partida") : 0;
  const pelaDireita = saida === "direita" && sai !== undefined && t >= sai;

  return (
    <span
      style={{
        display: "inline-block",
        whiteSpace: "pre",
        translate: pelaDireita ? `${saindo * 1300}px 0` : undefined,
        ...style,
      }}
    >
      {[...texto].map((letra, i) => {
        const s = molaEm(frame, fps, entra + i * passo, "mola");
        const subida = pelaDireita ? 0 : saindo * DESLOCA;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              clipPath: pelaDireita ? undefined : FENDA,
            }}
          >
            <span
              style={{
                display: "inline-block",
                translate: `0 ${(1 - s) * DESLOCA - subida}%`,
                scale: String(0.72 + 0.28 * s),
                rotate: `${(1 - s) * 10}deg`,
                opacity: s <= 0.001 ? 0 : 1,
              }}
            >
              {letra}
            </span>
          </span>
        );
      })}
    </span>
  );
};

// Palavra de destaque: Instrument Serif Italic na cor de destaque do tema, com um
// brilho discreto que atravessa a palavra uma vez quando ela assenta
export const Destaque: React.FC<{
  children: string;
  brilhaEm?: number;
  cor?: string;
  style?: React.CSSProperties;
}> = ({ children, brilhaEm, cor = temas.escuro.destaque, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const p =
    brilhaEm === undefined
      ? -40
      : -40 + 180 * progresso(t, brilhaEm, brilhaEm + 0.8, "travessia");

  return (
    <span
      style={{
        fontFamily: FONTE_DESTAQUE,
        fontStyle: "italic",
        fontWeight: 400,
        letterSpacing: "-0.01em",
        paddingRight: "0.08em", // a itálica passa da caixa; sem isso o brilho corta a última letra
        backgroundImage: `linear-gradient(100deg, ${cor} ${p - 16}%, ${cores.branco} ${p}%, ${cor} ${p + 16}%)`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        ...style,
      }}
    >
      {children}
    </span>
  );
};
