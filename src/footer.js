import { version } from "../package.json";
import { esc } from "./ui.js";

export function appFooter(importButton = false) {
  return `<footer class="app-footer"><div><div class="footer-brand">GordoStage <span class="app-version">v${esc(version)}</span> <b>•</b> Menos improvisación. Más música.</div><p class="footer-credits">Idea original: <a href="https://www.instagram.com/don_xuru/" target="_blank" rel="noopener noreferrer">Don Xuru</a> <span>·</span> Diseño e implementación: <a href="https://www.instagram.com/soyellalo/" target="_blank" rel="noopener noreferrer">Lechuga</a> <span>·</span> <a href="https://lechuga.website/" target="_blank" rel="noopener noreferrer">lechuga.website</a></p></div>${importButton ? '<button id="import" class="text-button">Importar proyecto</button><input type="file" id="import-file" accept="application/json" hidden>' : ""}</footer>`;
}
