import { setupIdentity } from "./identity.js";
import { setupChat } from "./chat.js";
import { mountHome } from "./home.js";
import { setTheme } from "./theme.js";
import {
  SYMBOLS,
  SYMBOL_CATEGORIES,
  COMMON_SYMBOL_IDS,
  getSymbol,
  symbolSearchText,
} from "../shared/symbols.js";
import { reconcileInputs } from "../shared/equipment.js";
import { mountEquipment } from "./equipment-panel.js";
import { normalizeProject, exportProject } from "../shared/project.js";
import { mountFeatures } from "./features.js";
import { collaborate } from "./collaboration.js";
let collaboration;
let customLibrary = [];
let view = "home";
const showHome = () => {
  view = collaboration ? "home" : "editor";
  render();
};
import "./style.css";
const initial = {
  band: "Los Eléctricos",
  event: "Rider técnico · Tour 2026",
  width: 10,
  depth: 8,
  notes:
    "Monitores con mezcla independiente. Alimentación eléctrica a ambos lados del escenario.",
  items: [
    { id: 1, type: "drums", label: "Batería", x: 50, y: 24 },
    { id: 2, type: "bass", label: "Bajo", x: 23, y: 48 },
    { id: 3, type: "guitar", label: "Guitarra", x: 77, y: 48 },
    { id: 4, type: "voice", label: "Voz principal", x: 50, y: 70 },
    { id: 5, type: "monitor", label: "Mix 1", x: 48, y: 88 },
  ],
  channels: [
    { source: "Bombo", mic: "Shure Beta 52", stand: "Corto", notes: "" },
    { source: "Caja", mic: "Shure SM57", stand: "Corto", notes: "" },
    { source: "Overhead L", mic: "Condensador", stand: "Alto", notes: "48 V" },
    { source: "Overhead R", mic: "Condensador", stand: "Alto", notes: "48 V" },
    { source: "Bajo", mic: "DI activa", stand: "—", notes: "" },
    { source: "Guitarra", mic: "Shure SM57", stand: "Corto", notes: "" },
    { source: "Voz principal", mic: "Shure SM58", stand: "Alto", notes: "" },
  ],
};
let state;
try {
  state = normalizeProject(
    JSON.parse(localStorage.getItem("stagecraft-v1")) || initial,
  );
} catch {
  state = normalizeProject(initial);
}
let selected = null,
  tab = "plot",
  symbolCategory = "Frecuentes",
  symbolQuery = "";
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
function save() {
  reconcileInputs(state);
  try {
    localStorage.setItem("stagecraft-v1", JSON.stringify(state));
    document.querySelector("#save-status").textContent =
      "● Guardado en este dispositivo";
  } catch {
    document.querySelector("#save-status").textContent =
      "No se pudo guardar: exporta tu proyecto";
  }
  collaboration?.changed();
}
function render() {
  document.querySelector("#app").innerHTML = `
<aside class="rail"><a class="brand" href="#" aria-label="GordoStage"><img src="/brand/gordostage-logo.png" alt="GordoStage"></a><button class="rail-active" title="Editor">▧</button><div class="rail-bottom">GS</div></aside>
<div class="workspace"><header><div class="wordmark"><img src="/brand/gordostage-logo.png" alt=""><div class="brand-copy"><strong>GordoStage</strong><span>PLATAFORMA DE LOGÍSTICA DE ESCENARIO</span></div></div><div class="header-right"><button id="theme-toggle" class="button" title="Cambiar tema claro / neón" aria-label="Cambiar tema claro / neón">◐</button><span id="save-status">● Guardado en este dispositivo</span><button id="export" class="button">↓ Exportar proyecto</button><button id="print" class="button dark">↗ Exportar PDF</button></div></header>
<main><div class="breadcrumb">MIS PROYECTOS <span>/</span> RIDER TÉCNICO</div><section class="heading"><div><div class="eyebrow">EL SHOW EMPIEZA AQUÍ</div><input id="band" class="band" aria-label="Nombre de la banda" value="${esc(state.band)}"><input id="event" class="event" aria-label="Evento" value="${esc(state.event)}"><input id="project-description" class="project-description" aria-label="Descripción del proyecto" maxlength="1000" placeholder="Descripción del montaje o evento…" value="${esc(state.description)}"></div><div class="project-badge"><span class="green-dot"></span> Proyecto en edición</div></section>
<nav class="tabs"><button data-tab="plot" class="${tab === "plot" ? "active" : ""}">▧ &nbsp; Stage plot</button><button data-tab="channels" class="${tab === "channels" ? "active" : ""}">☷ &nbsp; Lista de canales <span>${state.channels.length}</span></button><div class="tabs-tail">DISEÑA. CONECTA. TOCA.</div></nav>
<div class="editor ${tab === "channels" ? "channels-only" : ""}"><aside class="palette"><div class="section-label">TU ESCENARIO</div><h2>Todo en su lugar.</h2><p>Añade elementos y arrástralos al escenario.</p><div class="section-label category">BIBLIOTECA · ${SYMBOLS.length} SÍMBOLOS</div><label class="symbol-search-label">Buscar equipo<input id="symbol-search" type="search" placeholder="Instrumento, micrófono, FOH…" value="${esc(symbolQuery)}"></label><select id="symbol-category" aria-label="Categoría de símbolos"><option>Frecuentes</option><option>Todos</option><option>Personalizados</option>${SYMBOL_CATEGORIES.map((c) => `<option ${symbolCategory === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select><button class="button upload-symbol-button" data-edit id="upload-symbol">＋ Subir icono</button><input data-edit id="symbol-file" type="file" accept="image/png,image/webp,image/jpeg" hidden><div id="symbol-results" aria-live="polite"></div><div class="tools" id="symbol-tools">${symbolButtons()}</div><div class="tip"><span>✧</span><div><b>Hecho para el directo</b><p>Piensa el escenario desde el público. Así todos hablan el mismo idioma.</p></div></div></aside>
<section class="canvas-panel"><div class="canvas-toolbar"><div><b>Vista del escenario</b><span>Perspectiva del público</span></div><div class="dimensions"><input id="width" type="number" min="2" max="100" aria-label="Ancho en metros" value="${state.width}"> × <input id="depth" type="number" min="2" max="100" aria-label="Fondo en metros" value="${state.depth}"> m</div></div><div class="stage-wrap"><div class="stage-top">FONDO DEL ESCENARIO</div><div class="stage" id="stage" style="aspect-ratio:${state.width}/${state.depth}">${state.items.map((i) => `<button class="stage-item ${selected === i.id ? "selected" : ""}" data-item="${i.id}" style="left:${i.x}%;top:${i.y}%" aria-label="${esc(i.label)}"><span class="instrument ">${symbolImage(i.type)}</span><span class="item-label">${esc(i.label)}</span></button>`).join("")}<div class="stage-mark">GORDOSTAGE</div></div><div class="audience"><span></span>↓ &nbsp; PÚBLICO &nbsp; ↓<span></span></div></div><div class="canvas-footer"><span>↔ Arrastra para mover · Selecciona para editar</span><span>${state.items.length} elementos <i>·</i> ${state.width} × ${state.depth} m</span></div><div class="item-editor">${selected !== null ? `<label>Nombre <input id="item-name" value="${esc(state.items.find((i) => i.id === selected)?.label || "")}"></label><button class="button danger" id="delete-item">Eliminar elemento</button>` : "<span>✧ Un buen show empieza con un buen plano.</span>"}</div></section></div>
<section class="channel-section ${tab === "channels" ? "focused" : ""}"><div class="section-heading"><div><div class="section-label">CADA SEÑAL CUENTA</div><h2>Lista de canales <span>${state.channels.length} entradas</span></h2></div><button id="add-channel" class="button">+ Añadir canal</button></div><div class="table-wrap"><table><thead><tr><th>CH</th><th>FUENTE / INSTRUMENTO</th><th>MICRÓFONO / DI</th><th>PIE</th><th>NOTAS</th><th></th></tr></thead><tbody>${state.channels.map((c, n) => `<tr><td><span class="channel-number">${String(n + 1).padStart(2, "0")}</span></td>${["source", "mic", "stand", "notes"].map((k) => `<td><input aria-label="${k} canal ${n + 1}" data-channel="${n}" data-field="${k}" value="${esc(c[k])}" placeholder="—"></td>`).join("")}<td><button class="remove-channel" data-remove="${n}" aria-label="Eliminar canal ${n + 1}">×</button></td></tr>`).join("")}</tbody></table></div></section><section class="notes"><div class="section-label">NOTAS PARA EL EQUIPO TÉCNICO</div><textarea id="notes" aria-label="Notas técnicas" placeholder="Alimentación, monitores, necesidades especiales…">${esc(state.notes)}</textarea></section><footer><span>GordoStage <b>•</b> Menos improvisación. Más música.</span><button id="import" class="text-button">Importar proyecto</button><input type="file" id="import-file" accept="application/json" hidden></footer></main></div>`;
  bind();
  mountFeatures({ state, selected, save, render, collaboration });
  mountEquipment({ state, selected, save, render });
  collaboration?.decorate();
  mountHome({ api: collaboration, visible: view === "home", showHome });
}
function bind() {
  document.querySelector("#theme-toggle").onclick = () =>
    setTheme(
      document.documentElement.dataset.theme === "neon" ? "warm" : "neon",
    );
  document.querySelector("#project-description").oninput = (e) => {
    state.description = e.target.value;
    save();
  };
  for (const k of ["band", "event", "notes"])
    document.getElementById(k).oninput = (e) => {
      state[k] = e.target.value;
      save();
    };
  for (const k of ["width", "depth"])
    document.getElementById(k).onchange = (e) => {
      state[k] = Math.min(100, Math.max(2, Number(e.target.value) || 8));
      save();
      render();
    };
  document.querySelectorAll("[data-tab]").forEach(
    (b) =>
      (b.onclick = () => {
        tab = b.dataset.tab;
        render();
      }),
  );
  bindLibrary();
  document.querySelectorAll("[data-item]").forEach((el) => {
    el.onpointerdown = (e) => {
      e.preventDefault();
      const id = Number(el.dataset.item),
        item = state.items.find((i) => i.id === id);
      selected = id;
      if (
        collaboration &&
        (!collaboration.access().canEdit ||
          !collaboration.access().connected ||
          collaboration.access().conflict)
      ) {
        render();
        return;
      }
      let moved = false;
      el.setPointerCapture(e.pointerId);
      const rect = document.querySelector("#stage").getBoundingClientRect();
      const offsetX = e.clientX - (rect.left + (item.x / 100) * rect.width),
        offsetY = e.clientY - (rect.top + (item.y / 100) * rect.height);
      el.onpointermove = (ev) => {
        if (
          Math.abs(ev.clientX - e.clientX) + Math.abs(ev.clientY - e.clientY) <
          3
        )
          return;
        moved = true;
        item.x = Math.max(
          7,
          Math.min(93, ((ev.clientX - offsetX - rect.left) / rect.width) * 100),
        );
        item.y = Math.max(
          8,
          Math.min(91, ((ev.clientY - offsetY - rect.top) / rect.height) * 100),
        );
        el.style.left = item.x + "%";
        el.style.top = item.y + "%";
      };
      el.onpointerup = () => {
        el.onpointermove = null;
        if (moved) save();
        render();
      };
      el.onpointercancel = () => {
        el.onpointermove = null;
        if (moved) save();
        render();
      };
    };
    el.onkeydown = (e) => {
      if (e.key === "Enter") {
        selected = Number(el.dataset.item);
        render();
      }
      const delta = {
        ArrowLeft: [-2, 0],
        ArrowRight: [2, 0],
        ArrowUp: [0, -2],
        ArrowDown: [0, 2],
      }[e.key];
      if (delta) {
        e.preventDefault();
        if (
          collaboration &&
          (!collaboration.access().canEdit ||
            !collaboration.access().connected ||
            collaboration.access().conflict)
        )
          return;
        const item = state.items.find((i) => i.id === Number(el.dataset.item));
        item.x = Math.max(7, Math.min(93, item.x + delta[0]));
        item.y = Math.max(8, Math.min(91, item.y + delta[1]));
        el.style.left = item.x + "%";
        el.style.top = item.y + "%";
        save();
      }
    };
  });
  const name = document.querySelector("#item-name");
  if (name)
    name.oninput = (e) => {
      state.items.find((i) => i.id === selected).label = e.target.value;
      document.querySelector(
        `[data-item="${selected}"] .item-label`,
      ).textContent = e.target.value;
      save();
    };
  const del = document.querySelector("#delete-item");
  if (del)
    del.onclick = () => {
      const linked = state.channels.filter(
        (c) => c._link?.itemId === selected,
      ).length;
      if (
        linked &&
        !confirm(
          `Se eliminarán el equipo y sus ${linked} canales vinculados. ¿Continuar?`,
        )
      )
        return;
      state.items = state.items.filter((i) => i.id !== selected);
      selected = null;
      save();
      render();
    };
  document.querySelectorAll("[data-channel]").forEach(
    (i) =>
      (i.oninput = (e) => {
        state.channels[Number(i.dataset.channel)][i.dataset.field] =
          e.target.value;
        save();
      }),
  );
  document.querySelectorAll("[data-remove]").forEach(
    (b) =>
      (b.onclick = () => {
        state.channels.splice(Number(b.dataset.remove), 1);
        save();
        render();
      }),
  );
  document.querySelector("#add-channel").onclick = () => {
    state.channels.push({ source: "", mic: "", stand: "", notes: "" });
    save();
    render();
  };
  document.querySelector("#print").onclick = () => window.print();
  document.querySelector("#export").onclick = () => {
    const url = URL.createObjectURL(
      new Blob([exportProject(state)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "gordostage-rider.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  document.querySelector("#import").onclick = () =>
    document.querySelector("#import-file").click();
  document.querySelector("#import-file").onchange = async (e) => {
    try {
      const s = normalizeProject(JSON.parse(await e.target.files[0].text()));
      if (
        !confirm(
          "¿Reemplazar el proyecto actual? Exporta primero si necesitas conservarlo.",
        )
      )
        return;
      state = s;
      selected = null;
      save();
      render();
    } catch {
      alert(
        "No se pudo importar. Selecciona un proyecto JSON válido de GordoStage.",
      );
    }
  };
}
render();

collaboration = await collaborate({
  getState: () => state,
  setState: (s) => {
    state = normalizeProject(s);
    if (!state.items.some((item) => item.id === selected)) selected = null;
  },
  render,
  openEditor: () => {
    view = "editor";
  },
});
if (!collaboration) view = "editor";
if (collaboration) {
  refreshAssets();
  setupIdentity(collaboration);
  setupChat(collaboration);
  window.addEventListener("gordostage-project-list", () => {
    if (view === "home")
      mountHome({ api: collaboration, visible: true, showHome });
  });
}
render();

window.addEventListener("beforeprint", () =>
  document.querySelectorAll("textarea").forEach((el) => {
    el.dataset.printHeight = el.style.height;
    el.style.height = el.scrollHeight + "px";
  }),
);
window.addEventListener("afterprint", () =>
  document.querySelectorAll("textarea").forEach((el) => {
    el.style.height = el.dataset.printHeight || "";
  }),
);

function symbolImage(type) {
  const symbol = lookupSymbol(type);
  return symbol
    ? `<img class="${symbol.custom ? "custom-symbol" : "builtin-symbol"}" src="${symbol.src}" alt="" draggable="false">`
    : "";
}
function filteredSymbols() {
  const query = symbolQuery
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  return availableSymbols().filter((symbol) =>
    !query
      ? symbolCategory === "Todos" ||
        (symbolCategory === "Frecuentes"
          ? COMMON_SYMBOL_IDS.includes(symbol.id)
          : symbol.category === symbolCategory)
      : symbolSearchText(symbol).includes(query),
  );
}
function symbolButtons() {
  return filteredSymbols()
    .map(
      (symbol) =>
        `<button data-add="${symbol.id}" title="${esc(symbol.label)} · ${symbol.id}"><span class="tool-icon">${symbolImage(symbol.id)}</span><span>${esc(symbol.label)}</span><span class="plus">+</span></button>`,
    )
    .join("");
}
function bindLibrary() {
  const category = document.querySelector("#symbol-category");
  category.value = symbolCategory;
  const repaint = () => {
    document.querySelector("#symbol-tools").innerHTML = symbolButtons();
    const count = filteredSymbols().length;
    document.querySelector("#symbol-results").textContent =
      `${count} símbolos${count ? "" : " · Prueba otra búsqueda"}`;
    bindSymbolButtons();
    collaboration?.decorate();
  };
  document.querySelector("#symbol-search").oninput = (e) => {
    symbolQuery = e.target.value;
    repaint();
  };
  category.onchange = (e) => {
    symbolCategory = e.target.value;
    repaint();
  };
  document.querySelector("#upload-symbol").onclick = () =>
    document.querySelector("#symbol-file").click();
  document.querySelector("#symbol-file").onchange = async (e) => {
    if (!collaboration)
      return alert("La subida de iconos requiere un servidor local.");
    const file = e.target.files[0];
    if (!file) return;
    if (
      !["image/png", "image/webp", "image/jpeg"].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    )
      return alert("Usa PNG, WebP o JPEG de hasta 2 MB.");
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const image = new Image();
      image.src = dataUrl;
      await image.decode();
      if (image.width > 4096 || image.height > 4096)
        throw Error("Máximo 4096 × 4096 píxeles");
      const r = await collaboration.request("/api/assets", {
        method: "POST",
        body: JSON.stringify({
          label: file.name
            .replace(/\.[^.]+$/, "")
            .replace(/[_-]/g, " ")
            .slice(0, 100),
          dataUrl,
        }),
      });
      if (!r.ok) throw Error((await r.json()).error);
      const asset = await r.json();
      if (!state.customAssets.some((a) => a.id === asset.id))
        state.customAssets.push(asset);
      symbolCategory = "Personalizados";
      symbolQuery = "";
      save();
      await refreshAssets();
      render();
    } catch (error) {
      alert(error.message || "No se pudo subir la imagen");
    }
  };
  repaint();
}
function bindSymbolButtons() {
  document.querySelectorAll("[data-add]").forEach(
    (button) =>
      (button.onclick = async () => {
        if (state.items.length >= 500) return alert("Máximo 500 elementos");
        let symbol = lookupSymbol(button.dataset.add);
        if (
          symbol.custom &&
          !state.customAssets.some((a) => a.id === symbol.id)
        ) {
          try {
            const r = await collaboration.request(
              "/api/assets/" + symbol.id + "/document",
            );
            if (!r.ok) throw Error();
            state.customAssets.push(await r.json());
            symbol = lookupSymbol(symbol.id);
          } catch {
            return alert("No se pudo cargar el icono del servidor");
          }
        }
        const item = {
          id: Math.max(Date.now(), ...state.items.map((i) => i.id + 1)),
          type: symbol.id,
          label: symbol.label,
          comment: "",
          technical: { power: "none", powerNotes: "", inputs: [] },
          x: 40 + Math.random() * 20,
          y: 40 + Math.random() * 20,
        };
        state.items.push(item);
        selected = item.id;
        save();
        render();
      }),
  );
}

function availableSymbols() {
  const custom = new Map(
    customLibrary.map((a) => [
      a.id,
      {
        id: a.id,
        label: a.label,
        category: "Personalizados",
        custom: true,
        src: "/api/assets/" + a.id,
      },
    ]),
  );
  for (const a of state.customAssets || [])
    custom.set(a.id, {
      id: a.id,
      label: a.label,
      category: "Personalizados",
      custom: true,
      src: a.dataUrl,
    });
  return [...SYMBOLS, ...custom.values()];
}
function lookupSymbol(id) {
  return getSymbol(id) || availableSymbols().find((s) => s.id === id);
}
async function refreshAssets() {
  if (!collaboration) return;
  try {
    const r = await collaboration.request("/api/assets");
    if (r.ok) {
      customLibrary = await r.json();
      if (document.querySelector("#symbol-tools")) {
        document.querySelector("#symbol-tools").innerHTML = symbolButtons();
        bindSymbolButtons();
        collaboration.decorate();
      }
    }
  } catch {}
}
window.addEventListener("gordostage-assets", refreshAssets);
