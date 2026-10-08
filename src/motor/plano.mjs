// Planejador do montador de criativos (08/10/2026).
//
// Lê o criativo.json (lista de cenas do kit), as legendas e os tempos do áudio, e decide
// QUANDO cada coisa acontece: começo de cada cena, cada palavra na tela (casada com a fala),
// a câmera e os efeitos sonoros. É JavaScript puro de propósito: a composição (Remotion) e o
// script de mixagem (Node) usam o MESMO plano, então som e imagem nunca desencontram.
//
// Marcação nos textos das cenas:  *palavra*  destaque (serifada itálica)
//                                 _palavra_  marca-texto
//                                 ~palavra~  riscada
//                                 **palavra** forte (800) numa linha fina
// Várias palavras: *duas palavras*.

export const ANTECIPA = 0.1; // texto entra um pouco antes da fala (fica legível quando é dita)
export const DISTANCIA = 2600; // entre estações (px de mundo)

export const normalizar = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9+]/g, "");

// ── texto com marcação ───────────────────────────────────────────────────────

export const tokenizar = (linha) => {
  const tokens = [];
  const estado = { destaque: false, marca: false, risca: false, forte: false };
  for (const bruto of linha.split(/\s+/).filter(Boolean)) {
    let w = bruto;
    const abre = {};
    const fecha = {};
    for (const [simbolo, chave] of [["**", "forte"], ["*", "destaque"], ["_", "marca"], ["~", "risca"]]) {
      if (w.startsWith(simbolo)) {
        abre[chave] = true;
        w = w.slice(simbolo.length);
      }
    }
    for (const [simbolo, chave] of [["**", "forte"], ["*", "destaque"], ["_", "marca"], ["~", "risca"]]) {
      // o símbolo de fechar pode vir antes da pontuação: *site*.
      const m = w.match(new RegExp(`^(.*?)${simbolo.replace(/\*/g, "\\*")}([.,!?:;]*)$`));
      if (m && (estado[chave] || abre[chave])) {
        fecha[chave] = true;
        w = m[1] + m[2];
      }
    }
    for (const k of Object.keys(abre)) estado[k] = true;
    tokens.push({ texto: w, destaque: estado.destaque, marca: estado.marca, risca: estado.risca, forte: estado.forte });
    for (const k of Object.keys(fecha)) estado[k] = false;
  }
  return tokens;
};

// ── fala ─────────────────────────────────────────────────────────────────────

export const separarFrases = (legendas) => {
  const frases = [];
  let atual = [];
  for (const c of legendas) {
    const texto = c.text.trim();
    atual.push({ texto, norma: normalizar(texto), ini: c.startMs / 1000, fim: c.endMs / 1000 });
    if (/[.!?]$/.test(texto)) {
      frases.push(atual);
      atual = [];
    }
  }
  if (atual.length) frases.push(atual);
  return frases.map((p) => ({ palavras: p, ini: p[0].ini, fim: p[p.length - 1].fim }));
};

// Casa os tokens de uma linha com as palavras faladas, em ordem, a partir de um cursor.
// Palavra que não é dita (só aparece na tela) herda o tempo da anterior.
const casar = (tokens, palavras, cursor, inicio) => {
  let c = cursor;
  let ultimo = inicio;
  const saida = tokens.map((tk) => {
    const alvo = normalizar(tk.texto);
    let achou = -1;
    for (let k = c; k < Math.min(palavras.length, c + 6); k++) {
      if (palavras[k].norma === alvo) {
        achou = k;
        break;
      }
    }
    if (achou >= 0) {
      c = achou + 1;
      ultimo = palavras[achou].ini - ANTECIPA;
    }
    return { ...tk, t: ultimo };
  });
  return { tokens: saida, cursor: c };
};

const quando = (palavras, texto, depoisDe = -Infinity) => {
  const alvo = normalizar(texto);
  const p = palavras.find((w) => w.norma === alvo && w.ini > depoisDe);
  return p ? p.ini - ANTECIPA : null;
};

// ── plano ────────────────────────────────────────────────────────────────────

const TEMAS_PADRAO = ["escuro", "claro", "vivo"];

export const DESDE = 0.75; // de onde a gravação do meio começa a tocar (s)

// Telas que as cenas de celular mostram (public/telas/<nome>/): as da cena, senão as
// padrão da marca (marca.json > telas). Quem chama o planejar carrega os gestos delas.
export const nomesDasTelas = (config, padrao = []) => [
  ...new Set(config.cenas.filter((c) => c.tipo === "celular").flatMap((c) => c.telas ?? c.gravacoes ?? padrao)),
];

// marca = o que vem do marca.json e das telas: { telas: nomes padrão, gestos: { nome: [s de cada
// gesto de rolagem na gravação] }, botao: texto do botão do anúncio }
export const planejar = (config, legendas, tempos, marca = {}) => {
  const amb = { telas: [], gestos: {}, botao: "Saiba mais", ...marca };
  const frases = separarFrases(legendas);
  const batida = tempos.periodo;
  const naGrade = (t, fracao = 1) => {
    const passo = batida * fracao;
    return tempos.primeiraBatida + Math.ceil((t - tempos.primeiraBatida - 0.001) / passo) * passo;
  };
  const sons = [];
  const som = (t, nome, volume) => sons.push({ t, som: nome, volume });

  // a cena cobre as frases listadas; sem lista, segue de onde a anterior parou
  let proxima = 0;
  const cenas = config.cenas.map((c, i) => {
    const idx = c.frases ?? Array.from({ length: c.quantas ?? 1 }, (_, k) => proxima + k);
    proxima = Math.max(...idx) + 1;
    const fr = idx.map((k) => frases[k]).filter(Boolean);
    if (!fr.length) throw new Error(`A cena ${i + 1} (${c.tipo}) aponta pra frases que não existem: ${idx}`);
    return {
      i,
      tipo: c.tipo,
      cfg: c,
      tema: c.tema ?? TEMAS_PADRAO[i % 3],
      frasesIdx: idx,
      palavras: fr.flatMap((f) => f.palavras),
      iniciosFrases: fr.map((f) => f.ini - ANTECIPA),
      inicio: i === 0 ? 0 : fr[0].ini - ANTECIPA,
      estacao: { x: i * DISTANCIA, y: 0, z: 0 },
    };
  });
  cenas.forEach((c, i) => {
    c.fim = i < cenas.length - 1 ? cenas[i + 1].inicio : tempos.duracao;
    if (i > 0 && c.cfg.transicao !== "corte") som(c.inicio - 0.3, "whoosh", 0.32);
  });

  for (const c of cenas) {
    const cfg = c.cfg;
    const P = c.palavras;
    // o gancho tem que estar legível no quadro 0 (é a capa do anúncio): as palavras da primeira cena já
    // estão na tela; tf = tempo da fala, e o risco, o marca-texto e o brilho acontecem quando ela é dita
    const noQuadro0 = (ls) => ls.map((l) => l.map((tk, k) => ({ ...tk, t: -1 + k * 0.05, tf: tk.t })));
    const d = {};
    let cursor = 0;
    const linhas = (lista) =>
      (lista ?? []).map((l) => {
        const r = casar(tokenizar(l), P, cursor, c.inicio);
        cursor = r.cursor;
        return r.tokens;
      });

    if (cfg.capitulo) d.capitulo = { n: cfg.capitulo.n, nome: cfg.capitulo.nome, t: c.inicio };

    if (c.tipo === "frase") {
      // blocos = páginas de linhas que se substituem; "linhas" = um bloco só
      const paginas = cfg.blocos ?? [cfg.linhas];
      d.blocos = paginas.map((p) => ({ linhas: linhas(p) }));
      d.blocos.forEach((b, k) => {
        const reais = b.linhas.flat().filter((tk) => tk.texto !== ">");
        b.de = k === 0 ? c.inicio : Math.min(...reais.map((tk) => tk.t)) - 0.05;
      });
      d.blocos.forEach((b, k) => {
        b.ate = k < d.blocos.length - 1 ? d.blocos[k + 1].de : c.fim;
      });
      if (c.i === 0 && cfg.quadro0 !== false) d.blocos[0].linhas = noQuadro0(d.blocos[0].linhas);
      d.linhas = d.blocos.flatMap((b) => b.linhas);
      for (const l of d.linhas) {
        for (const tk of l) {
          if (tk.risca) som(tk.t + 0.25, "risco", 0.5);
          if (tk.marca) som(tk.t + 0.3, "risco", 0.3);
        }
      }
      const forte = d.linhas.flat().find((tk) => tk.destaque);
      if (forte && cfg.impacto) som(forte.t, "impacto", 0.5);
    }

    if (c.tipo === "pergunta") {
      d.contexto = linhas(cfg.contexto);
      if (c.i === 0 && cfg.quadro0 !== false) d.contexto = noQuadro0(d.contexto);
      const tChave = quando(P, cfg.chave) ?? c.inicio + 1;
      d.chave = { texto: cfg.chave, t: tChave };
      d.pausa = Math.max(c.inicio + 0.4, tChave - (cfg.pausa ?? 0.65));
      cursor = Math.max(cursor, P.findIndex((w) => w.norma === normalizar(cfg.chave)) + 1);
      d.resto = linhas(cfg.resto);
      d.particulas = cfg.particulas !== false;
      som(d.pausa, "subida", 0.45);
      som(tChave, "impacto", 0.7);
    }

    if (c.tipo === "palavras") {
      let base = c.inicio + 0.3;
      d.palavras = cfg.palavras.map((p) => {
        const t = quando(P, p, base - 0.05) ?? naGrade(base, 1);
        base = t + batida;
        som(t, "impacto", 0.5);
        return { texto: p, t };
      });
      d.rgb = cfg.rgb !== false;
    }

    if (c.tipo === "logos") {
      // a frase dos logos não tem marcação (a última linha já sai em destaque): tira se vier
      const limpa = (l) => l && l.map((t) => t.replace(/^>s*/, "").replace(/[*_~]/g, ""));
      d.frase1 = limpa(cfg.frase1);
      d.frase2 = limpa(cfg.frase2) ?? null;
      d.entra = c.inicio + 0.1;
      const t0 = naGrade(quando(P, cfg.logosEm ?? "") ?? c.inicio + 0.5, 0.5);
      d.logos = cfg.logos.map((logo, k) => ({ logo, t: t0 + k * (batida / 2) }));
      d.logos.forEach((l) => som(l.t, "pop", 0.32));
      d.troca = cfg.frase2 ? quando(P, cfg.trocaEm ?? "") ?? t0 + cfg.logos.length * (batida / 2) + 0.4 : null;
      if (d.troca) som(d.troca, "swipe", 0.3);
    }

    if (c.tipo === "celular") {
      d.titulo = linhas(cfg.titulo);
      d.entra = c.inicio + 0.15;
      d.rola = quando(P, cfg.rolaEm ?? "") ?? c.inicio + 0.9;
      d.telas = cfg.telas ?? cfg.gravacoes ?? amb.telas;
      d.checks = (cfg.checks ?? []).map((txt, k) => ({ texto: txt, t: c.fim - 1.2 + k * 0.16 }));
      som(d.entra, "swipe", 0.3);
      const gestos = amb.gestos[d.telas[0]];
      for (const g of Array.isArray(gestos) ? gestos : []) {
        const t = d.rola + (g - DESDE);
        if (t > d.rola && t < c.fim - 0.3) som(t, "rolagem", 0.4);
      }
      d.checks.forEach((ck) => som(ck.t, "popLeve", 0.35));
    }

    if (c.tipo === "cta") {
      d.linhas = linhas(cfg.linhas);
      // o botão entra quando a 1ª palavra dele é dita ("Saiba"); o texto de depois começa na última ("mais")
      const botao = cfg.botao ?? amb.botao;
      const palavrasBotao = botao.split(/s+/);
      d.botao = { texto: botao, t: quando(P, cfg.botaoEm ?? palavrasBotao[0]) ?? c.inicio + 0.6 };
      cursor = Math.max(cursor, P.findIndex((w) => w.norma === normalizar(cfg.botaoEm ?? palavrasBotao[palavrasBotao.length - 1])) + 1);
      d.depois = linhas(cfg.depois);
      d.toque = d.botao.t + 0.55;
      d.logo = tempos.fimVoz - 0.05;
      som(d.toque, "clique", 0.55);
      som(d.logo, "impacto", 0.5);
    }

    c.dados = d;
    delete c.palavras;
  }

  if (tempos.drop) som(tempos.drop, "impacto", 0.6);
  for (const s of config.sons ?? []) som(s.t, s.som, s.volume ?? 0.4);

  const legenda = cenas
    .filter((c) => c.cfg.legenda)
    .map((c) => ({ de: c.inicio, ate: c.fim - 0.05, tema: c.tema, topo: c.cfg.capitulo ? 468 : 300 }));

  return { duracao: tempos.duracao, cenas, sons: sons.sort((a, b) => a.t - b.t), legenda, batida };
};
