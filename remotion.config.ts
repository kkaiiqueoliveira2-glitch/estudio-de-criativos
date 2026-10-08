/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import fs from "node:fs";
import path from "node:path";
import { Config } from "@remotion/cli/config";

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

// O Chrome headless que o Remotion baixa não é assinado e o Controle Inteligente
// de Aplicativos do Windows bloqueia ("spawn UNKNOWN", 07/10/2026). Renderiza com o
// Chrome instalado, que é assinado pelo Google. REMOTION_CHROME troca o caminho.
// A mesma lista do scripts/chrome.mjs; sem Chrome, o Remotion usa o navegador dele.
const chrome = [
  process.env.REMOTION_CHROME,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Google/Chrome/Application/chrome.exe"),
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
].find((c) => c && fs.existsSync(c));
if (chrome) Config.setBrowserExecutable(chrome);
Config.setChromeMode("chrome-for-testing");

// WebGL do criativo v2 (navegador 3D): ANGLE usa a GPU desta máquina (GTX 1660 Super)
Config.setChromiumOpenGlRenderer("angle");
