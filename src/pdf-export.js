import { dialog, esc } from "./ui.js";
const sections = {
  plot: "Plano de escenario",
  channels: "Lista de canales",
  equipment: "Requerimientos técnicos por equipo",
  positions: "Comentarios de posiciones",
  mounting: "Comentarios de montaje",
  notes: "Notas técnicas",
  heading: "Nombre, evento y descripción",
};
const details = {
  icons: "Iconos de equipos",
  labels: "Etiquetas de equipos",
  free: "Dibujo libre",
  cables: "Rutas de cableado",
  cableLabels: "Etiquetas y leyenda del cableado",
  pins: "Marcadores de comentarios",
  grid: "Cuadrícula del escenario",
};
let currentCleanup;
export function openPdfExport(state) {
  const snapshot = document.querySelector("main").cloneNode(true);
  snapshot.hidden = false;
  const el = dialog(
    `<div class="dialog-heading"><h2>Exportar PDF</h2><button class="button" data-dismiss>Cerrar</button></div><p>Elige qué incluir. Estas opciones cambian solo la exportación.</p><div class="pdf-export-options"><fieldset><legend>Secciones del rider</legend>${Object.entries(
      sections,
    )
      .map(
        ([key, label]) =>
          `<label class="check-label"><input type="checkbox" data-pdf-section="${key}" checked>${label}</label>`,
      )
      .join(
        "",
      )}</fieldset><fieldset><legend>Contenido del plano</legend>${Object.entries(
      details,
    )
      .map(
        ([key, label]) =>
          `<label class="check-label"><input type="checkbox" data-pdf-detail="${key}" checked>${label}</label>`,
      )
      .join(
        "",
      )}</fieldset></div><details class="pdf-items" open><summary>Equipos del escenario (${state.items.length})</summary><div class="pdf-select-actions"><button class="button" data-pdf-items="all">Todos</button><button class="button" data-pdf-items="none">Ninguno</button></div><div class="pdf-item-list">${state.items.map((item) => `<label class="check-label"><input type="checkbox" data-pdf-item="${item.id}" checked>${esc(item.label)}</label>`).join("") || "<p>No hay equipos.</p>"}</div></details><details class="pdf-items"><summary>Canales del input list (${state.channels.length})</summary><p>La selección es independiente de los equipos; conserva el número CH y patch actuales.</p><div class="pdf-select-actions"><button class="button" data-pdf-channels="all">Todos</button><button class="button" data-pdf-channels="none">Ninguno</button></div><div class="pdf-item-list">${state.channels.map((row, n) => `<label class="check-label"><input type="checkbox" data-pdf-channel="${n}" checked>CH ${n + 1} · ${esc(row.source || "Sin nombre")}</label>`).join("")}</div></details><p id="pdf-export-error" role="status"></p><div class="pdf-export-actions"><button class="button" id="pdf-export-all">Exportar con todo</button><button class="button dark" id="pdf-export-selected">Exportar selección</button></div>`,
  );
  el.classList.add("pdf-export-dialog");
  el.querySelector("[data-dismiss]").onclick = () => el.close();
  el.querySelectorAll("[data-pdf-items]").forEach(
    (b) =>
      (b.onclick = () =>
        el
          .querySelectorAll("[data-pdf-item]")
          .forEach((input) => (input.checked = b.dataset.pdfItems === "all"))),
  );
  el.querySelectorAll("[data-pdf-channels]").forEach(
    (b) =>
      (b.onclick = () =>
        el
          .querySelectorAll("[data-pdf-channel]")
          .forEach(
            (input) => (input.checked = b.dataset.pdfChannels === "all"),
          )),
  );
  const start = async (all) => {
    const chosen = Object.fromEntries(
      Object.keys(sections).map((key) => [
        key,
        all || el.querySelector(`[data-pdf-section="${key}"]`).checked,
      ]),
    );
    if (!Object.values(chosen).some(Boolean)) {
      el.querySelector("#pdf-export-error").textContent =
        "Selecciona al menos una sección.";
      return;
    }
    const options = Object.fromEntries(
      Object.keys(details).map((key) => [
        key,
        all || el.querySelector(`[data-pdf-detail="${key}"]`).checked,
      ]),
    );
    const items = new Set(
      [...el.querySelectorAll("[data-pdf-item]")]
        .filter((input) => all || input.checked)
        .map((input) => input.dataset.pdfItem),
    );
    const channels = new Set(
      [...el.querySelectorAll("[data-pdf-channel]")]
        .filter((input) => all || input.checked)
        .map((input) => input.dataset.pdfChannel),
    );
    const copy = snapshot.cloneNode(true);
    const selectors = {
      plot: ".editor",
      channels: ".channel-section",
      equipment: ".equipment-summary",
      positions: ".annotation-section",
      mounting: ".mounting-section",
      notes: ".notes",
      heading: ".heading",
    };
    for (const [key, selector] of Object.entries(selectors))
      if (!chosen[key])
        copy.querySelectorAll(selector).forEach((node) => node.remove());
    copy
      .querySelectorAll(
        "[data-item],[data-equipment-summary],[data-item-comment]",
      )
      .forEach((node) => {
        const id =
          node.dataset.item ||
          node.dataset.equipmentSummary ||
          node.dataset.itemComment;
        if (!items.has(id)) node.remove();
      });
    copy.querySelectorAll("tbody [data-channel-row]").forEach((node) => {
      if (!channels.has(node.dataset.channelRow)) node.remove();
    });
    if (!options.icons)
      copy.querySelectorAll(".instrument").forEach((node) => node.remove());
    if (!options.labels)
      copy.querySelectorAll(".item-label").forEach((node) => node.remove());
    if (!options.pins)
      copy.querySelectorAll(".comment-pin").forEach((node) => node.remove());
    copy
      .querySelectorAll(
        ".drawing-layer [data-stroke],.drawing-layer [data-stroke-label]",
      )
      .forEach((node) => {
        const drawing =
          state.drawings[
            Number(node.dataset.stroke ?? node.dataset.strokeLabel)
          ];
        if (!drawing) return;
        if (
          (drawing.kind === "free" && !options.free) ||
          (drawing.kind !== "free" && !options.cables) ||
          (node.tagName.toLowerCase() === "text" && !options.cableLabels)
        )
          node.remove();
      });
    if (!options.cableLabels || !options.cables)
      copy.querySelectorAll(".cable-legend").forEach((node) => node.remove());
    if (!options.grid)
      copy
        .querySelector(".stage")
        ?.style.setProperty("background-image", "none", "important");
    copy
      .querySelectorAll(".stage-item")
      .forEach((node) => node.classList.remove("selected"));
    copy
      .querySelectorAll(".selected-stroke")
      .forEach((node) => node.classList.remove("selected-stroke"));
    // Editable forms do not belong to the printed rider; retain the saved comments.
    copy
      .querySelectorAll(".mounting-section form,#mount-error")
      .forEach((node) => node.remove());
    currentCleanup?.();
    copy.querySelectorAll("img[data-print-src]").forEach(img => { img.src = img.dataset.printSrc; });
    copy.querySelectorAll(".edit-field-button,.project-topline").forEach(node => node.remove());
    copy.id = "pdf-export-document";
    document.body.append(copy);
    document.body.dataset.pdfExport = "true";
    const cleanup = () => {
      copy.remove();
      delete document.body.dataset.pdfExport;
      window.removeEventListener("afterprint", cleanup);
      if (currentCleanup === cleanup) currentCleanup = null;
    };
    currentCleanup = cleanup;
    window.addEventListener("afterprint", cleanup);
    el.close();
    try {
      await Promise.allSettled(
        [...copy.querySelectorAll("img")].map((img) => img.decode()),
      );
      window.print();
    } catch {
      cleanup();
    }
  };
  el.querySelector("#pdf-export-all").onclick = () => start(true);
  el.querySelector("#pdf-export-selected").onclick = () => start(false);
}
