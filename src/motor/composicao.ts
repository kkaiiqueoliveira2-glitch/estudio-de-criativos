import type { CalculateMetadataFunction } from "remotion";
import { staticFile } from "remotion";
import marca from "../../public/marca/marca.json";
import type { CriativoProps } from "./Criativo";
import { nomesDasTelas } from "./plano.mjs";

// Carrega tudo que a composição Criativo precisa: public/criativos/<nome>/ (criativo.json,
// legendas.json, tempos.json), a marca (public/marca/marca.json) e os gestos das telas
// gravadas (public/telas/<nome>/). Rascunho a 30 fps, final a 60.
export const calcularCriativo: CalculateMetadataFunction<CriativoProps> = async ({ props }) => {
  const ler = (f: string) => fetch(staticFile(f)).then((r) => r.json());
  const pasta = `criativos/${props.nome}/`;
  const [config, legendas, tempos] = await Promise.all([ler(pasta + "criativo.json"), ler(pasta + "legendas.json"), ler(pasta + "tempos.json")]);
  const telas = marca.telas as string[];
  const gestos = Object.fromEntries(
    await Promise.all(
      nomesDasTelas(config, telas).map(async (n) => {
        const r = await fetch(staticFile(`telas/${n}/gestos.json`));
        return [n, r.ok ? await r.json() : []];
      }),
    ),
  );
  const fps = props.rascunho ? 30 : 60;
  return {
    fps,
    durationInFrames: Math.round(tempos.duracao * fps),
    props: { ...props, config, legendas, tempos, marca: { telas, gestos, botao: marca.botao } },
  };
};

export const propsPadrao = (nome: string): CriativoProps => ({ nome, rascunho: true, config: null, legendas: [], tempos: null, marca: {} });
