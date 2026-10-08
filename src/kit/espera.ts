import { useLayoutEffect, useMemo, useState } from "react";
import { useDelayRender } from "remotion";
import { FONTE, FONTE_DESTAQUE, fontesProntas } from "../tema";

// Segura o render até `tarefa` terminar. A espera nasce dentro do efeito e é
// sempre liberada na limpeza: com o delayRender num useState, a montagem dupla
// do modo de desenvolvimento deixava uma espera pendurada e o preview do Studio
// ficava preso no fundo azul (07/10/2026).
export const useEspera = (rotulo: string, tarefa: () => Promise<void>) => {
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  useLayoutEffect(() => {
    const espera = delayRender(rotulo);
    let liberada = false;
    const libera = () => {
      if (!liberada) {
        liberada = true;
        continueRender(espera);
      }
    };
    tarefa().then(libera, (erro) => cancelRender(erro));
    return libera;
    // roda uma vez por montagem
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

// As faces que o layout mede já estão no documento? (document.fonts.check não serve:
// ele responde "sim" também quando a face nem foi registrada ainda)
const fontesNoDocumento = () => {
  const faces = [...document.fonts];
  const tem = (familia: string, estilo: string) =>
    faces.some(
      (f) =>
        f.family.replace(/"/g, "") === familia &&
        f.style === estilo &&
        f.status === "loaded",
    );
  return tem(FONTE, "normal") && tem(FONTE_DESTAQUE, "italic");
};

// Mede texto com as fontes carregadas (antes disso a medida sai da fonte reserva).
// Se as fontes já estão no documento (Studio aberto há tempo), mede na hora, sem esperar.
export const useMedidas = <T>(medir: () => T): T | null => {
  const [prontas, setProntas] = useState(fontesNoDocumento);
  useEspera("Medindo texto com as fontes carregadas", async () => {
    await fontesProntas;
    setProntas(true);
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => (prontas ? medir() : null), [prontas]);
};
