# Estúdio de criativos

Faz vídeo de anúncio (Reels e Stories, 1080x1920) pra qualquer oferta: você manda a ideia, o
Claude escreve a copy, gera a voz e monta o vídeo com texto animado colado na fala, câmera
mexendo, trilha e efeitos sonoros. Tudo roda no seu computador.

Você só mexe em duas coisas: a pasta `public/marca/` (a sua marca) e o briefing de cada vídeo.

## O que precisa ter instalado

| O quê | Pra quê | Como |
|---|---|---|
| Node.js 20 ou mais novo | roda o estúdio | nodejs.org, versão LTS |
| ffmpeg | monta o vídeo e o som | Windows: `winget install Gyan.FFmpeg` (feche e abra o terminal depois). Mac: `brew install ffmpeg` |
| Google Chrome | desenha os quadros do vídeo | google.com/chrome |
| VS Code + Claude Code | é quem opera o estúdio | code.visualstudio.com e a extensão Claude Code (precisa de plano pago do Claude) |
| Higgsfield (opcional) | gera a voz | conta no Higgsfield conectada em claude.ai > Configurações > Conectores. Sem ela, você grava a própria voz |

Espaço livre: uns 2 GB (as bibliotecas e o modelo que lê a voz).

## Instalar (uma vez)

**Jeito mais fácil:** abra o VS Code numa pasta vazia, abra o Claude Code e cole:

> Clona https://github.com/kkaiiqueoliveira2-glitch/estudio-de-criativos e instala seguindo o README.

Ele baixa o estúdio e roda o `npm install`, que já prepara tudo: cria a sua pasta de marca, baixa
os efeitos sonoros e a trilha. Depois abra a pasta
`estudio-de-criativos` no VS Code (Arquivo > Abrir pasta) e a skill `/criativo-video` já
aparece.

**Só a skill:** `npx skills add kkaiiqueoliveira2-glitch/estudio-de-criativos`. No primeiro
`/criativo-video`, o Claude baixa o estúdio sozinho.

**À mão**, no terminal:
```
git clone https://github.com/kkaiiqueoliveira2-glitch/estudio-de-criativos
cd estudio-de-criativos
npm install
```
O `npm install` termina rodando o `scripts/preparar.mjs`: copia o modelo de marca, baixa os efeitos
sonoros (Mixkit) e a trilha padrão (Pixabay). Se faltar o ffmpeg, ele avisa; instale e rode
`node scripts/preparar.mjs`. Na primeira vez que montar um vídeo, ele baixa sozinho o modelo que
lê a voz (uns 500 MB).

**Atualizar** (quando sair melhoria no mecanismo): peça "atualiza o estúdio" (é um `git pull`).
A sua marca e os seus vídeos não são apagados.

## Sua marca (uma vez)

Tudo fica em `public/marca/` (criada na instalação a partir de `public/marca-modelo/`; o git
não mexe nela, então atualizar o estúdio não apaga a sua marca). Dá pra pedir pro Claude: **"configura a minha marca"** e responder
o que ele perguntar. O que cada coisa é:

- `marca.json`
  - `nome`: como aparece no fim do vídeo. `nomeFalado`: como a voz deve falar o nome.
  - `site`: o que aparece embaixo do nome (site ou @ do Instagram).
  - `botao`: o texto do botão do anúncio (o vídeo mostra esse botão sendo tocado; use o mesmo
    que você escolher no Gerenciador de Anúncios, ex. "Saiba mais", "Enviar mensagem").
  - `cores`: `principal` (a cor forte da marca), `escuro` (fundo escuro) e `claro` (fundo
    claro). As outras saem dessas três sozinhas.
  - `logo`: o arquivo do logo. Use a versão **branca**, com fundo transparente (PNG ou SVG), e
    ponha em `public/marca/`.
  - `voz`: a voz do Higgsfield. Peça pro Claude listar as vozes e escolha ouvindo.
  - `trilha`: a música padrão (`drop` = segundo em que a música entra forte; `bpm` = batida).
    Música nova: `trilha.mjs buscar`, e o Claude mede o drop e a batida.
  - `telas`: sites ou gravações de tela que aparecem no celular dos vídeos (veja abaixo).
  - `fontes`: opcional. Fonte nova = arquivos em `public/assets/fontes/` e os caminhos aqui.
- `regras.md`: quem é a empresa, o público, o que pode e o que não pode ser dito, o tom. É o
  que impede o Claude de inventar promessa. Vale ouro: preencha com calma.

## Fazer um vídeo

No Claude Code, digite `/criativo-video` e mande a ideia (ou o briefing completo, o modelo está
em `.claude/skills/criativo-video/briefing.md`). Ele:

1. Escreve a copy e mostra uma vez, com o custo da voz.
2. Com o seu ok, gera a voz e monta o rascunho (uns 10 min por minuto de vídeo).
3. Você pede os ajustes falando normal ("troca essa frase", "mais rápido aqui").
4. Com o ok, sai o final em `saida/<nome>.mp4`. É esse que sobe no anúncio.

Tem um exemplo pronto pra copiar o formato: `public/criativos/exemplo/` (oferta de
hamburgueria, 30 s). Pra ver o exemplo virar vídeo, gere a voz dele: peça **"gera a voz do
exemplo e monta"**.

## Pra nenhum vídeo sair igual ao anterior

Antes de escrever a copy, a skill faz duas coisas sozinha:

- **Lê o histórico** (`node scripts/historico.mjs`): o ângulo, o gancho e as cenas de cada vídeo
  que você já fez. O próximo sai com ângulo diferente.
- **Pesquisa o seu nicho** na Biblioteca de Anúncios da Meta (`node scripts/pesquisa.mjs`): acha os
  anúncios em vídeo há mais tempo no ar, baixa e transcreve a fala de cada um. Num anúncio em vídeo,
  a copy de verdade é a fala. A skill usa isso pra adaptar a estrutura, nunca pra copiar frase.

## Mostrar um site, app ou perfil no celular

```
node scripts/tela.mjs loja https://seusite.com.br        grava o site rolando num iPhone
node scripts/tela.mjs app gravacao-da-tela.mp4           usa uma gravação de tela do seu celular
```
Depois é só citar a tela no vídeo (`"telas": ["loja"]`) ou pôr na lista `telas` do marca.json.

## Se der problema

- **Windows avisando que bloqueou um programa** ("Controle Inteligente de Aplicativos"): não
  desligue a proteção. O estúdio já usa o Chrome instalado e o ffmpeg do sistema pra não cair
  nisso. Se cair, mostre o erro pro Claude.
- **"ffmpeg não é reconhecido"**: o ffmpeg não está no PATH. Feche e abra o VS Code depois de
  instalar.
- **Vídeo "sem som" no celular**: o arquivo tem som. No iPhone, a chave de silencioso cala vídeo
  dentro de app; salve na galeria e abra por lá.

## Licenças

- **Remotion** (o motor de vídeo): grátis pra pessoa física e empresa com até 3 pessoas. Acima
  disso, a empresa precisa da licença paga (remotion.pro).
- **Efeitos sonoros**: Mixkit, licença gratuita com uso comercial. Baixados direto do site
  deles pelo `sons.mjs`.
- **Trilha**: Pixabay, uso comercial em anúncio sem precisar dar crédito.
- **Fontes**: Outfit e Instrument Serif, licença OFL (livre, inclusive comercial).
- **Logos de outras empresas** (WhatsApp, Instagram, Google, IAs): são marcas registradas. Use
  inteiros, sem mudar cor nem formato, só pra indicar onde a pessoa te encontra.
