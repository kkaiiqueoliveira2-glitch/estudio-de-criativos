# Catálogo do montador (o que dá pra pôr no criativo.json)

Vídeo novo = pasta `public/criativos/<nome>/` com `narracao-crua.mp3`, `roteiro.txt` (a fala,
escrita como deve aparecer na tela) e `criativo.json`. **Não precisa ler código pra montar um
vídeo.** Exemplo completo: `public/criativos/exemplo/criativo.json`.

## criativo.json

```json
{
  "titulo": "...",
  "audio": { "tempo": 1.08, "fraseDoDrop": 4, "pausas": { "1": 0.8 }, "substitui": {} },
  "cenas": [ ... ],
  "sons": [ { "t": 12.3, "som": "pop", "volume": 0.4 } ]
}
```

- **Frases** = frases da fala, contadas a partir de 0 (cada uma termina em . ! ?).
- `fraseDoDrop`: a frase que cai no drop da música (a anterior abafa a música, com subida).
- `pausas`: segundos de silêncio **depois** de uma frase. Pergunta que faz pensar = 0.7 a 0.9.
- `tempo`: acelera a voz (1.08 = 8% mais rápida, sem mudar o tom).
- `substitui`: frase regravada à parte, `{ "7": { "arquivo": "take.mp3", "texto": "..." } }`.
- `trilha`: só se o vídeo usar outra música que não a do `marca.json`:
  `{ "arquivo": "som/trilha/x.mp3", "drop": 64.5, "bpm": 124 }`.

## Campos de toda cena

| campo | o que faz | padrão |
|---|---|---|
| `tipo` | frase, pergunta, palavras, logos, celular, cta | obrigatório |
| `frases` | quais frases da fala a cena cobre, ex. `[3, 4]` | a próxima frase |
| `tema` | escuro, claro, vivo (cor principal da marca) | alterna |
| `transicao` | whip (câmera passa rápida) ou corte (corte seco com soco) | whip |
| `camera` | cortes, baixa, cima, orbita, parada | depende do tipo |
| `capitulo` | `{ "n": 1, "nome": "Rápido" }`: título numerado no topo | nenhum |
| `legenda` | pílula com a fala (pra cena de tela/celular) | false |
| `alinhar` | centro ou esquerda | centro |

## Marcação nos textos

`*palavra*` destaque (fonte de destaque em itálico, a palavra que bate) · `_palavra_` marca-texto ·
`~palavra~` riscada · `**palavra**` forte numa linha fina · linha que começa com `> ` = fina.
Várias palavras: `*duas palavras*`. Cada palavra entra **quando é dita** (casada com a fala).
Linha longa quebra sozinha em duas pra letra ficar grande. A primeira cena já está inteira no
quadro 0 (gancho legível); risco e marca acontecem quando a palavra é dita.
Preço: `"> de ~R$ 497~"`, `"por *R$ 297*"` (risca o antigo quando é dito, o novo bate).

## Tipos de cena

**frase** · texto cinético (o mais usado). `linhas: [...]` ou `blocos: [[...], [...]]` (páginas
que trocam quando a primeira palavra do bloco seguinte é dita).
```json
{ "tipo": "frase", "frases": [0], "tema": "escuro", "linhas": ["Você não precisa", "de mais ~seguidores.~"] }
```

**pergunta** · contexto → PAUSA (contexto apaga, câmera aproxima, partículas formam a palavra) →
a palavra-chave bate → o resto da pergunta. Pôr pausa de 0.7 s antes da frase da pergunta.
```json
{ "tipo": "pergunta", "frases": [2, 3], "contexto": ["> Hoje à noite,", "alguém vai pedir", "_o que você vende._"],
  "chave": "Quem", "resto": ["vai", "atender?"], "particulas": true }
```

**palavras** · 1 palavra enorme por vez, com RGB separado dando tranco e corte de ângulo em cada
uma. Se a palavra é dita, entra quando é dita; se não, na batida.
```json
{ "tipo": "palavras", "frases": [5], "tema": "vivo", "palavras": ["rápido,", "quente", "e barato."], "numerar": false }
```

**logos** · logos em blocos 3D explodindo do centro, frase no meio que troca. Arquivos em
`public/assets/imagens/` (SVG com `viewBox` ou PNG/JPG, até 8): já vêm `google-g.svg`,
`whatsapp.svg`, `instagram.svg`, `ia/chatgpt.svg`, `ia/gemini.svg`, `ia/claude.svg`,
`ia/perplexity.svg`, `ia/copilot.svg`, `ia/meta.svg`. Logo novo: pôr o arquivo lá (oficial, sem
recolorir). `logosEm`/`trocaEm`: palavra da fala em que os logos explodem / a frase troca.
```json
{ "tipo": "logos", "frases": [6], "frase1": ["Peça pelo", "WhatsApp"], "frase2": ["ou pelo", "*Instagram.*"],
  "logos": ["whatsapp.svg", "instagram.svg"], "logosEm": "WhatsApp", "trocaEm": "Instagram" }
```

**celular** · até 3 celulares; o do meio mostra uma tela rolando (gravação de verdade), com som
de rolagem. Telas em `public/telas/<nome>/`; padrão = `marca.json > telas`. Tela nova (site,
app, perfil do Instagram, produto em uso): `node scripts/tela.mjs <nome> <url ou gravacao.mp4>`.
`rolaEm`: palavra da fala em que a tela começa a rolar. `checks`: selos que entram no fim.
```json
{ "tipo": "celular", "frases": [7, 8], "titulo": ["*Pedido em 1 minuto*"], "rolaEm": "cardápio",
  "telas": ["cardapio"], "checks": ["Sem fila", "Sem taxa", "Entrega rápida"] }
```

**cta** · linhas em cima, botão tocado quando a 1ª palavra dele é dita, linhas embaixo, setas
pro botão do anúncio e logo da marca no fim. Texto do botão: `marca.json > botao` (ou `"botao"`
na cena, igual ao botão escolhido no anúncio).
```json
{ "tipo": "cta", "frases": [9], "tema": "vivo", "linhas": ["> Toque em"], "depois": ["> e garanta o *seu*", "antes de acabar."] }
```

## Efeitos sonoros (automáticos; extras no "sons")

whoosh (troca de cena), impacto (drop, palavra que bate, pergunta, logo), subida (pausa antes da
pergunta), risco (riscado, marca-texto), pop/popLeve (logos, checks), swipe, clique, rolagem,
notificacao, digitacao, bip, cliqueMouse, whooshTech.

## Efeito novo

Do 21st.dev ou de onde for: reescrever pro relógio do vídeo em `src/kit/efeitos/` (sem
requestAnimationFrame, Math.random nem animação CSS; tudo calculado do quadro). Tipo de cena
novo: componente em `src/motor/Cenas.tsx` + regra de tempo em `src/motor/plano.mjs` + linha aqui.
