// Caminho do Chrome instalado nesta máquina. No Windows, o Chrome que o Remotion baixa não é
// assinado e o Controle Inteligente de Aplicativos bloqueia ("spawn UNKNOWN"); o instalado é
// assinado pelo Google e passa. REMOTION_CHROME troca o caminho. Sem Chrome (Mac/Linux sem ele),
// devolve undefined e o Remotion usa o navegador dele.

import fs from "node:fs";
import path from "node:path";

const candidatos = [
  process.env.REMOTION_CHROME,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Google/Chrome/Application/chrome.exe"),
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
];

export const chrome = candidatos.find((c) => c && fs.existsSync(c));
