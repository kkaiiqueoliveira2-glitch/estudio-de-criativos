import { Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Destaque } from "../componentes/Cinetico";
import { Plano } from "../componentes/Mundo";
import { Celular, TelaGravada, TelaParada } from "../kit/Celular";
import { BotaoChamada, Dedo, Setas } from "../kit/Chamada";
import { TextoParticulas } from "../kit/efeitos/TextoParticulas";
import { ExplosaoDeLogos } from "../kit/ExplosaoDeLogos";
import { PalavrasNaBatida } from "../kit/PalavrasNaBatida";
import { PALETA } from "../kit/paleta";
import { TituloCapitulo } from "../kit/TituloCapitulo";
import { entre, molaEm, progresso } from "../movimento";
import { comAlfa, cores, FONTE, FONTE_DESTAQUE, MARCA, peso, temas } from "../tema";
import { Linhas } from "./Linhas";
import { type Cena, DESDE } from "./plano.mjs";

// As cenas do montador: cada uma lê só o plano (tempos já casados com a fala).

const noPalco = (c: Cena, x: number, y: number, z = 0) => ({
  x: c.estacao.x + x - 540,
  y: c.estacao.y + y - 960,
  z: c.estacao.z + z,
});

const Capitulo: React.FC<{ c: Cena }> = ({ c }) =>
  c.dados.capitulo ? (
    <TituloCapitulo n={c.dados.capitulo.n} nome={c.dados.capitulo.nome} entra={c.dados.capitulo.t} tema={c.tema} />
  ) : null;

// ── frase ────────────────────────────────────────────────────────────────────
export const CenaFrase: React.FC<{ c: Cena }> = ({ c }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const blocos = c.dados.blocos as { linhas: Cena["dados"]; de: number; ate: number }[];
  return (
    <Plano {...c.estacao} largura={1080} altura={1920}>
      <Capitulo c={c} />
      {blocos.map((b, k) =>
        t >= b.de - 0.1 && t < b.ate + 0.4 ? (
          <Linhas
            key={k}
            linhas={b.linhas}
            tema={c.tema}
            topo={c.dados.capitulo ? 470 : undefined}
            alinhar={c.cfg.alinhar}
            sai={k < blocos.length - 1 ? b.ate - 0.15 : undefined}
          />
        ) : null,
      )}
    </Plano>
  );
};

// ── pergunta com pausa ───────────────────────────────────────────────────────
export const CenaPergunta: React.FC<{ c: Cena }> = ({ c }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const d = c.dados;
  const C = PALETA[c.tema];
  const apaga = progresso(t, d.pausa, d.pausa + 0.5, "travessia");
  const bate = molaEm(frame, fps, d.chave.t, "mola");
  return (
    <Plano {...c.estacao} largura={1080} altura={1920}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 1 - 0.72 * apaga,
          translate: `0 ${-40 * apaga}px`,
          filter: apaga > 0.01 ? `blur(${(2.5 * apaga).toFixed(2)}px)` : undefined,
        }}
      >
        <Linhas linhas={d.contexto} tema={c.tema} topo={330} alinhar={c.cfg.alinhar ?? "esquerda"} />
      </div>
      {d.particulas && t >= d.pausa - 0.1 && t < d.chave.t + 0.6 ? (
        <TextoParticulas
          texto={d.chave.texto}
          fonte={`italic 400 300px "${FONTE_DESTAQUE}"`}
          largura={1080}
          altura={1920}
          centroY={790}
          de={d.pausa}
          junta={Math.max(0.3, d.chave.t - d.pausa - 0.3)}
          espalha={0.3}
          some={d.chave.t + 0.05}
          cores={[cores.ceu, c.tema === "claro" ? cores.azul800 : cores.neutro50]}
          style={{ left: 0, top: 0 }}
        />
      ) : null}
      {t >= d.chave.t - 0.05 ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 640,
            textAlign: "center",
            fontSize: 300,
            lineHeight: 1,
            scale: String(entre(bate, 0, 1, d.particulas ? 1.18 : 2.2, 1, "chegada")),
            opacity: Math.min(1, bate * 3),
            filter: `drop-shadow(0 0 ${60 * bate}px ${comAlfa(cores.ceu, 0.55)})`,
          }}
        >
          <Destaque brilhaEm={d.chave.t + 0.15} cor={C.destaque}>
            {d.chave.texto}
          </Destaque>
        </div>
      ) : null}
      <Linhas linhas={d.resto} tema={c.tema} topo={1000} />
    </Plano>
  );
};

// ── palavras na batida ───────────────────────────────────────────────────────
export const CenaPalavras: React.FC<{ c: Cena }> = ({ c }) => (
  <PalavrasNaBatida
    estacao={c.estacao}
    tema={c.tema}
    palavras={c.dados.palavras.map((p: { texto: string }) => p.texto)}
    batidas={c.dados.palavras.map((p: { t: number }) => p.t)}
    rgb={c.dados.rgb}
    numerar={c.cfg.numerar !== false}
    sai={c.fim - 0.3}
  />
);

// ── logos (os ícones 3D ficam no canvas do Criativo) ─────────────────────────
export const CenaLogos: React.FC<{ c: Cena }> = ({ c }) => (
  <>
    <Plano {...c.estacao} largura={1080} altura={1920}>
      <Capitulo c={c} />
    </Plano>
    <ExplosaoDeLogos
      estacao={c.estacao}
      tema={c.tema}
      frase1={c.dados.frase1}
      frase2={c.dados.frase2 ?? c.dados.frase1}
      entra={c.dados.entra}
      troca={c.dados.troca ?? c.fim + 10}
      sai={c.fim + 10}
      gradiente={c.cfg.gradiente === false ? undefined : [cores.azul800, cores.brilho, cores.ceu, cores.azul900]}
    />
  </>
);

// ── celular com uma tela gravada rolando (site, app, perfil, produto) ──────────
export const CenaCelular: React.FC<{ c: Cena }> = ({ c }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const d = c.dados;
  const foco = progresso(t, d.rola - 0.1, d.rola + 0.5, "chegada");
  const [meio, esq, dir] = d.telas as (string | undefined)[];
  const lado = (i: -1 | 1, g: string | undefined, atraso: number) => {
    if (!g) return null;
    const s = molaEm(frame, fps, d.entra + atraso, "mola");
    return (
      <Plano
        {...noPalco(c, 540 + i * 330, 1230 + (1 - s) * 900, -260 - 160 * foco)}
        largura={360}
        altura={780}
        rz={i * (9 + 3 * foco)}
        style={{ opacity: 1 - 0.35 * foco }}
      >
        <Celular largura={360}>
          <TelaParada src={`telas/${g}/topo.jpg`} />
        </Celular>
      </Plano>
    );
  };
  const sMeio = molaEm(frame, fps, d.entra + 0.12, "mola");
  return (
    <>
      <Plano {...c.estacao} largura={1080} altura={1920}>
        <Capitulo c={c} />
        <Linhas linhas={d.titulo} tema={c.tema} topo={c.dados.capitulo ? 470 : 330} />
      </Plano>
      {meio && t >= d.entra - 0.1 ? (
        <>
          {lado(-1, esq, 0)}
          {lado(1, dir, 0.06)}
          <Plano {...noPalco(c, 540, 1250 + (1 - sMeio) * 900, 40 + 90 * foco)} largura={440} altura={950}>
            <Celular largura={440} brilho={foco * 0.6}>
              <TelaParada src={`telas/${meio}/topo.jpg`} />
              <TelaGravada src={`telas/${meio}/tela.mp4`} de={d.rola} ate={c.fim + 0.5} desde={DESDE} />
            </Celular>
          </Plano>
        </>
      ) : null}
      {d.checks.length ? (
        <Plano {...noPalco(c, 540, 1150, 140)} largura={1080} altura={120} semDesfoque>
          <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center", gap: 14 }}>
            {d.checks.map((ck: { texto: string; t: number }) => (
              <Chip key={ck.texto} rotulo={ck.texto} entra={ck.t} />
            ))}
          </div>
        </Plano>
      ) : null}
    </>
  );
};

const Chip: React.FC<{ rotulo: string; entra: number }> = ({ rotulo, entra }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame / fps < entra - 0.05) return null;
  const s = molaEm(frame, fps, entra, "mola");
  return (
    <div
      style={{
        height: 80,
        padding: "0 26px 0 14px",
        borderRadius: 999,
        backgroundColor: cores.neutro50,
        display: "flex",
        alignItems: "center",
        gap: 14,
        fontFamily: FONTE,
        fontWeight: peso.semi,
        fontSize: 31,
        color: cores.azul950,
        boxShadow: `0 16px 40px ${comAlfa(cores.sombra, 0.45)}`,
        scale: String(s),
        opacity: Math.min(1, s * 2),
      }}
    >
      <div style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: cores.azul800, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
          <path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {rotulo}
    </div>
  );
};

// ── chamada (botão + logo da marca no fim) ───────────────────────────────────
export const CenaCTA: React.FC<{ c: Cena }> = ({ c }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const d = c.dados;
  const logo = molaEm(frame, fps, d.logo, "mola");
  const tudoSai = progresso(t, d.logo - 0.2, d.logo + 0.1, "partida");
  const ultimo = (d.depois as { t: number }[][]).flat().reduce((m, tk) => Math.max(m, tk.t), d.toque);
  return (
    <Plano {...c.estacao} largura={1080} altura={1920}>
      <div style={{ position: "absolute", inset: 0, opacity: 1 - tudoSai }}>
        <Linhas linhas={d.linhas} tema={c.tema} topo={330} />
        {t >= d.botao.t - 0.2 ? <BotaoChamada t={t} entra={d.botao.t - 0.1} toca={d.toque} texto={d.botao.texto} /> : null}
        <Dedo t={t} toca={d.toque} x={720} y={560} cor="rgba(255, 255, 255, .95)" />
        <Linhas linhas={d.depois} tema={c.tema} topo={720} />
        <Setas t={t} entra={ultimo + 0.2} />
      </div>
      {t >= d.logo - 0.1 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 560, display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
          {MARCA.logo ? <Img
            src={staticFile(MARCA.logo)}
            style={{ width: 210, scale: String(logo), filter: `drop-shadow(0 0 40px ${comAlfa(cores.brilho, 0.8)})` }}
          /> : null}
          <div style={{ fontFamily: FONTE, fontWeight: peso.extra, fontSize: Math.min(150, Math.round(1500 / MARCA.nome.length)), letterSpacing: "-0.05em", color: temas.escuro.texto, lineHeight: 1, scale: String(0.8 + 0.2 * logo) }}>
            {MARCA.nome}
          </div>
          <div style={{ fontFamily: FONTE, fontWeight: peso.fino, fontSize: 46, letterSpacing: "0.08em", color: comAlfa(cores.neutro50, 0.75), opacity: molaEm(frame, fps, d.logo + 0.3, "assentar") }}>
            {MARCA.site}
          </div>
        </div>
      ) : null}
    </Plano>
  );
};
