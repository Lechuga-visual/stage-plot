import { normalizeProject, exportProject } from "../shared/project.js";
import { mountFeatures } from "./features.js";
import { collaborate } from "./collaboration.js";
let collaboration;
import "./style.css";
const icons = {
  voice: "🎤",
  guitar: "🎸",
  bass: "🎸",
  drums: "🥁",
  keys: "🎹",
  monitor: "◢",
  amp: "▥",
  di: "▣",
};
const names = {
  voice: "Voz",
  guitar: "Guitarra",
  bass: "Bajo",
  drums: "Batería",
  keys: "Teclados",
  monitor: "Monitor",
  amp: "Amplificador",
  di: "Caja DI",
};
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
  tab = "plot";
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
function save() {
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
<div class="workspace"><header><div class="wordmark"><img src="/brand/gordostage-logo.png" alt=""><div class="brand-copy"><strong>GordoStage</strong><span>PLATAFORMA DE LOGÍSTICA DE ESCENARIO</span></div></div><div class="header-right"><span id="save-status">● Guardado en este dispositivo</span><button id="export" class="button">↓ Exportar proyecto</button><button id="print" class="button dark">↗ Exportar PDF</button></div></header>
<main><div class="breadcrumb">MIS PROYECTOS <span>/</span> RIDER TÉCNICO</div><section class="heading"><div><div class="eyebrow">EL SHOW EMPIEZA AQUÍ</div><input id="band" class="band" aria-label="Nombre de la banda" value="${esc(state.band)}"><input id="event" class="event" aria-label="Evento" value="${esc(state.event)}"></div><div class="project-badge"><span class="green-dot"></span> Proyecto en edición</div></section>
<nav class="tabs"><button data-tab="plot" class="${tab === "plot" ? "active" : ""}">▧ &nbsp; Stage plot</button><button data-tab="channels" class="${tab === "channels" ? "active" : ""}">☷ &nbsp; Lista de canales <span>${state.channels.length}</span></button><div class="tabs-tail">DISEÑA. CONECTA. TOCA.</div></nav>
<div class="editor ${tab === "channels" ? "channels-only" : ""}"><aside class="palette"><div class="section-label">TU ESCENARIO</div><h2>Todo en su lugar.</h2><p>Añade elementos y arrástralos al escenario.</p><div class="section-label category">INSTRUMENTOS Y EQUIPO</div><div class="tools">${Object.entries(
    names,
  )
    .map(
      ([k, v]) =>
        `<button data-add="${k}"><span class="tool-icon ${k === "bass" ? "bass" : ""}">${icons[k]}</span>${v}<span class="plus">+</span></button>`,
    )
    .join(
      "",
    )}</div><div class="tip"><span>✧</span><div><b>Hecho para el directo</b><p>Piensa el escenario desde el público. Así todos hablan el mismo idioma.</p></div></div></aside>
<section class="canvas-panel"><div class="canvas-toolbar"><div><b>Vista del escenario</b><span>Perspectiva del público</span></div><div class="dimensions"><input id="width" type="number" min="2" max="100" aria-label="Ancho en metros" value="${state.width}"> × <input id="depth" type="number" min="2" max="100" aria-label="Fondo en metros" value="${state.depth}"> m</div></div><div class="stage-wrap"><div class="stage-top">FONDO DEL ESCENARIO</div><div class="stage" id="stage" style="aspect-ratio:${state.width}/${state.depth}">${state.items.map((i) => `<button class="stage-item ${selected === i.id ? "selected" : ""}" data-item="${i.id}" style="left:${i.x}%;top:${i.y}%" aria-label="${esc(i.label)}"><span class="instrument ${i.type === "bass" ? "bass" : ""}">${icons[i.type]}</span><span class="item-label">${esc(i.label)}</span></button>`).join("")}<div class="stage-mark">GORDOSTAGE</div></div><div class="audience"><span></span>↓ &nbsp; PÚBLICO &nbsp; ↓<span></span></div></div><div class="canvas-footer"><span>↔ Arrastra para mover · Selecciona para editar</span><span>${state.items.length} elementos <i>·</i> ${state.width} × ${state.depth} m</span></div><div class="item-editor">${selected !== null ? `<label>Nombre <input id="item-name" value="${esc(state.items.find((i) => i.id === selected)?.label || "")}"></label><button class="button danger" id="delete-item">Eliminar elemento</button>` : "<span>✧ Un buen show empieza con un buen plano.</span>"}</div></section></div>
<section class="channel-section ${tab === "channels" ? "focused" : ""}"><div class="section-heading"><div><div class="section-label">CADA SEÑAL CUENTA</div><h2>Lista de canales <span>${state.channels.length} entradas</span></h2></div><button id="add-channel" class="button">+ Añadir canal</button></div><div class="table-wrap"><table><thead><tr><th>CH</th><th>FUENTE / INSTRUMENTO</th><th>MICRÓFONO / DI</th><th>PIE</th><th>NOTAS</th><th></th></tr></thead><tbody>${state.channels.map((c, n) => `<tr><td><span class="channel-number">${String(n + 1).padStart(2, "0")}</span></td>${["source", "mic", "stand", "notes"].map((k) => `<td><input aria-label="${k} canal ${n + 1}" data-channel="${n}" data-field="${k}" value="${esc(c[k])}" placeholder="—"></td>`).join("")}<td><button class="remove-channel" data-remove="${n}" aria-label="Eliminar canal ${n + 1}">×</button></td></tr>`).join("")}</tbody></table></div></section><section class="notes"><div class="section-label">NOTAS PARA EL EQUIPO TÉCNICO</div><textarea id="notes" aria-label="Notas técnicas" placeholder="Alimentación, monitores, necesidades especiales…">${esc(state.notes)}</textarea></section><footer><span>GordoStage <b>•</b> Menos improvisación. Más música.</span><button id="import" class="text-button">Importar proyecto</button><input type="file" id="import-file" accept="application/json" hidden></footer></main></div>`;
  bind();
  mountFeatures({ state, selected, save, render, collaboration });
  collaboration?.decorate();
}
function bind() {
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
  document.querySelectorAll("[data-add]").forEach(
    (b) =>
      (b.onclick = () => {
        let type = b.dataset.add;
        const item = {
          id: Date.now(),
          type,
          label: names[type],
          comment: "",
          x: 40 + Math.random() * 20,
          y: 40 + Math.random() * 20,
        };
        state.items.push(item);
        selected = item.id;
        save();
        render();
      }),
  );
  document.querySelectorAll("[data-item]").forEach((el) => {
    el.onpointerdown = (e) => {
      e.preventDefault();
      const id = Number(el.dataset.item),
        item = state.items.find((i) => i.id === id);
      selected = id;
      el.setPointerCapture(e.pointerId);
      const rect = document.querySelector("#stage").getBoundingClientRect();
      const offsetX = e.clientX - (rect.left + (item.x / 100) * rect.width),
        offsetY = e.clientY - (rect.top + (item.y / 100) * rect.height);
      el.onpointermove = (ev) => {
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
        save();
        render();
      };
      el.onpointercancel = () => {
        el.onpointermove = null;
        save();
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
    selected = null;
  },
  render,
});
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
