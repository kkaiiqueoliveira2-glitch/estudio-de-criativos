---
name: criativo-video
description: >
  Cria vídeo de anúncio (Reels/Stories 1080x1920) pra qualquer oferta pelo montador do estúdio
  Remotion: briefing curto → copy → voz → criativo.json com cenas prontas → um comando gera o
  rascunho e o final. A marca (nome, logo, cores, fontes, voz, trilha, regras de copy) vem de
  public/marca/. Use quando pedirem "criativo de vídeo", "anúncio em vídeo", "vídeo pra anúncio",
  "reel de anúncio", "/criativo-video", ou mandarem um briefing de vídeo.
---

# /criativo-video: do briefing ao vídeo, sem código por vídeo

**Economia de token e tempo é regra desta skill.** Vídeo novo = escrever um `criativo.json` e
rodar um comando. Não ler o código do estúdio nem montar storyboard escrito: o resultado se
mostra em vídeo (rascunho), não em proposta.

**Pasta do estúdio** = a pasta com o `package.json` do Remotion (`video-studio/`, se existir;
senão a raiz do projeto). Todos os caminhos abaixo são relativos a ela.

Ler só:
- `public/marca/marca.json` e `public/marca/regras.md`: quem é a marca, público, tom, o que pode
  prometer. **Regra da marca vence regra genérica.**
- `briefing.md` e `cenas.md` desta skill.

## Primeira vez

- Sem pasta do estúdio aqui (skill instalada sozinha): `git clone
  https://github.com/kkaiiqueoliveira2-glitch/estudio-de-criativos` e trabalhar dentro dela.
- Sem `node_modules` ou sem `public/som/sfx-n/`: seguir a seção "Instalar" do `README.md` do
  estúdio (`npm install`, `node scripts/sons.mjs`, trilha).
- `marca.json` ainda no modelo ("Sua Marca"): preencher com o usuário antes do primeiro vídeo
  (nome, site ou @, logo, 3 cores, texto do botão, voz) e a `regras.md`.

## Fluxo

1. **Briefing.** Faltando a Oferta ou a Ideia, mandar o `briefing.md` e parar. O resto tem padrão.
2. **Copy** (se não veio pronta): gancho (pergunta ou sacada contraintuitiva) → dor (uma cena
   concreta da vida do cliente) → virada (o que muda, o mecanismo da oferta) → prova ou
   benefícios (o que ele ganha) → chamada. Pelo menos uma pergunta que faz pensar, com pausa
   depois. Mostrar a copy **uma vez**, curta, e esperar o ok.
3. **Voz**, uma das duas:
   - Higgsfield (`text2speech_v2`, variant `elevenlabs`, voz do `marca.json > voz.id`). Gasta
     crédito: dizer o custo no mesmo recado da copy e só gerar com o ok. No texto da voz, o nome
     da marca vai como se fala (`marca.json > nomeFalado`); a pontuação puxa o tom ("?" na
     pergunta). Máximo 2 gerações por vez.
   - Voz gravada pelo dono (celular, lugar silencioso, uma frase por respiração).
   Salvar em `public/criativos/<nome>/narracao-crua.mp3` + `roteiro.txt` (a fala escrita como
   deve aparecer na tela, com o nome da marca certinho).
4. **criativo.json** na mesma pasta, pelo `cenas.md`: uma cena por momento, `fraseDoDrop` na
   virada, pausa de 0.7 a 0.9 s depois de pergunta, temas alternando, e cada vídeo com cara
   própria (tipos de cena, temas e câmera diferentes do anterior).
5. **Rascunho:** `node scripts/criativo.mjs <nome>` (em segundo plano; uns 10 min por minuto de
   vídeo). Conferir UMA folha de contato (`ffmpeg -i saida/<nome>_rascunho.mp4 -vf
   "fps=1/3,scale=180:320,tile=11x2" -frames:v 1 folha.jpg`) e entregar o arquivo.
6. **Ajustes** = mexer no `criativo.json` (texto, cena, tema, câmera) e rodar de novo. Fala nova:
   regravar só a frase e usar `audio.substitui`; depois `--audio`.
7. **Final:** `node scripts/criativo.mjs <nome> --final` → `saida/<nome>.mp4` (1080x1920, 60 fps,
   som em -14 LUFS), o que sobe no anúncio. Acima de 29 MB sai também um `-celular.mp4` leve, só
   pra assistir.

## Regras de copy e imagem (valem pra qualquer marca)

- Fala simples, sem termo técnico do ramo. Termo técnico pode ir escrito na tela.
- Só afirmar o que a `regras.md` permite; número só com fonte.
- Prender o público: pergunta sobre a vida dele a cada 10 a 15 s, pausa depois, resposta curta;
  loop aberto ("três motivos"); tom variando (dor baixa, virada forte, chamada firme).
- Trilha em volume fixo embaixo da voz: nunca sobe nas pausas, nunca corta seco (a virada é
  abafa + subida + drop, e o `audio.mjs` já faz assim).
- Texto sempre frase inteira, dentro da área segura do anúncio, colado na fala (o montador já
  faz). Logos de terceiros oficiais e intactos.

## Quando algo quebra

- Render quebra com "FFmpeg quit with code 3236495362" ou "spawn UNKNOWN": é o Controle
  Inteligente de Aplicativos do Windows barrando programa baixado. O `criativo.mjs` já evita
  (quadros + ffmpeg do sistema + Chrome instalado). Nunca desligar a proteção.
- Vídeo dentro do celular trava ("Timeout while extracting frame"): a tela tem que ser 30 fps;
  refazer com `node scripts/tela.mjs`.
- Ícone 3D branco: SVG sem `viewBox`; trocar o arquivo ou usar PNG.
- "Está sem som": o arquivo tem som; é o player (o do VS Code não toca AAC; iPhone cala vídeo
  dentro de app com a chave de silencioso). Salvar na galeria resolve.

## Ferramentas (já prontas, não reescrever)

`scripts/criativo.mjs` (tudo) · `scripts/audio.mjs` (voz + trilha + legendas + tempos) ·
`scripts/tela.mjs` (site ou gravação de tela → tela do celular) · `scripts/sons.mjs` (efeitos) ·
`scripts/stills.mjs` (quadros soltos pra conferir) · `scripts/mixar.mjs`,
`scripts/render-quadros.mjs`, `scripts/finalizar.mjs` (etapas do criativo.mjs) ·
`scripts/ferramentas/`: `trilha.mjs` (buscar e baixar no Pixabay), `previa-trilha.mjs` (prévia
com a voz, pra escolher ouvindo), `medir-musica.js`, `achar-drop.js`, `grade-batida.js` (o drop
real é onde o grave entra).
