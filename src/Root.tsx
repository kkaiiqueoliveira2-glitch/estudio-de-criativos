import { Composition } from "remotion";
import { calcularCriativo, propsPadrao } from "./motor/composicao";
import { Criativo } from "./motor/Criativo";
import { REEL } from "./tema";

// Uma composição só: o montador. O vídeo sai de public/criativos/<nome>/ (scripts/criativo.mjs).
export const RemotionRoot: React.FC = () => (
  <Composition
    id="Criativo"
    component={Criativo}
    durationInFrames={60 * 10}
    fps={60}
    width={REEL.largura}
    height={REEL.altura}
    defaultProps={propsPadrao("exemplo")}
    calculateMetadata={calcularCriativo}
  />
);
