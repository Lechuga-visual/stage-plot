import { esc } from "./ui.js";
let textSize = Number(localStorage.getItem("gordostage-text-size")) || 120;
let network = null,
  requested = false;
export function setTextSize(value) {
  textSize = Math.max(100, Math.min(180, Math.round(value / 10) * 10));
  document.documentElement.style.setProperty("--text-scale", textSize / 100);
  localStorage.setItem("gordostage-text-size", String(textSize));
  const output = document.querySelector("#text-size-value");
  if (output) output.textContent = textSize + "%";
  document
    .querySelector("#text-smaller")
    ?.toggleAttribute("disabled", textSize === 100);
  document
    .querySelector("#text-larger")
    ?.toggleAttribute("disabled", textSize === 180);
}
setTextSize(textSize);
export function mountPreferences() {
  const controls = document.querySelector("#text-size-controls");
  if (controls) {
    controls.innerHTML = `<button class="button" id="text-smaller" aria-label="Reducir tamaño de texto" title="Reducir texto">A−</button><button class="button" id="text-size-value" aria-label="Restablecer tamaño de texto" title="Restablecer texto a 120%">${textSize}%</button><button class="button" id="text-larger" aria-label="Aumentar tamaño de texto" title="Aumentar texto">A+</button>`;
    controls.querySelector("#text-smaller").onclick = () =>
      setTextSize(textSize - 10);
    controls.querySelector("#text-larger").onclick = () =>
      setTextSize(textSize + 10);
    controls.querySelector("#text-size-value").onclick = () => setTextSize(120);
    setTextSize(textSize);
  }
  paintNetwork();
  if (!requested) {
    requested = true;
    fetch("/api/network")
      .then((r) =>
        r.ok && r.headers.get("content-type")?.includes("application/json")
          ? r.json()
          : null,
      )
      .then((data) => {
        network = data;
        paintNetwork();
      })
      .catch(() => {});
  }
}
function paintNetwork() {
  for (const id of ["header-network", "welcome-network"]) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.hidden = !network;
    if (!network) continue;
    const addresses = network.addresses?.length
      ? network.addresses
      : [network.currentAddress];
    const signature = JSON.stringify(addresses);
    if (el.dataset.addresses === signature) continue;
    el.dataset.addresses = signature;
    const content = addresses.map((url) => `<div class="network-address"><code>${esc(url)}</code><button type="button" class="button copy-address" data-address="${esc(url)}" aria-label="Copiar ${esc(url)}">Copiar</button></div>`).join("");
    el.innerHTML = id === "header-network"
      ? `<details class="network-menu"><summary>Acceso en red <span class="network-chevron" aria-hidden="true">›</span></summary><div class="network-popover"><span class="network-label">Direcciones del servidor · puerto ${network.port}</span>${content}</div></details>`
      : `<span class="network-label">Acceso ${network.addresses?.length ? "en red" : "al servidor"}</span>${content}`;
    el.querySelectorAll(".copy-address").forEach(
      (button) =>
        (button.onclick = async () => {
          try {
            if (!navigator.clipboard?.writeText) throw Error();
            await navigator.clipboard.writeText(button.dataset.address);
          } catch {
            const input = document.createElement("textarea");
            input.value = button.dataset.address;
            document.body.append(input);
            input.select();
            const copied = document.execCommand("copy");
            input.remove();
            if (!copied) {
              button.textContent = "Selecciona la dirección";
              return;
            }
          }
          button.textContent = "Copiada";
          setTimeout(() => {
            if (button.isConnected) button.textContent = "Copiar";
          }, 1800);
        }),
    );
  }
}
document.addEventListener("click", (event) => {
  const menu = document.querySelector("#header-network details");
  if (menu?.open && !menu.contains(event.target)) menu.open = false;
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    const menu = document.querySelector("#header-network details");
    if (menu?.open) { menu.open = false; menu.querySelector("summary").focus(); }
  }
});
