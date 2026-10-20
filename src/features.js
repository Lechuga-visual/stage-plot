import {
  updateChannel,
  removeChannel,
  findLinkedInput,
} from "../shared/equipment.js";
import { mountChannelOrder } from "./channel-order.js";
import { refreshChannelCells } from "./equipment-panel.js";
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let mountDrafts = new Map();
import { mountDrawing } from "./drawing.js";
import { identity } from "./identity.js";
const time = (s) => new Date(s).toLocaleString("es-CL");
export function mountFeatures({
  state,
  selected,
  save,
  render,
  collaboration,
  deleteItem,
  clearItemSelection,
}) {
  const projectId = collaboration?.access().projectId || "local";
  const currentIdentity = identity();
  // Customize the input list without losing hidden cells when removing a column.
  const table = document.querySelector(".channel-section table");
  table.innerHTML = `<thead><tr><th class="channel-index"><label><input data-edit id="select-all-channels" type="checkbox" aria-label="Seleccionar todos los canales"> CH</label></th>${state.columns.map((c, n) => `<th><input data-edit data-column="${n}" aria-label="Nombre columna ${n + 1}" value="${esc(c.label)}"><div class="column-actions"><button data-edit data-col-move="${n}" data-dir="-1" aria-label="Mover columna a la izquierda" ${n === 0 ? "disabled" : ""}>←</button><button data-edit data-col-move="${n}" data-dir="1" aria-label="Mover columna a la derecha" ${n === state.columns.length - 1 ? "disabled" : ""}>→</button><button data-edit data-col-delete="${n}" aria-label="Eliminar columna" ${state.columns.length === 1 ? "disabled" : ""}>×</button></div></th>`).join("")}<th class="row-actions">Orden</th></tr></thead><tbody>${state.channels.map((c, n) => `<tr data-channel-row="${n}"><td class="channel-index"><button data-edit class="channel-drag-handle" draggable="true" data-drag-channel="${n}" aria-label="Arrastrar canal ${n + 1}" title="Arrastrar canal o selección">⋮⋮</button><input data-edit data-row-select="${n}" type="checkbox" aria-label="Seleccionar canal ${n + 1}"><span>${n + 1}</span></td>${state.columns.map((col) => `<td><input data-channel="${n}" data-field="${col.id}" aria-label="${esc(col.label)} canal ${n + 1}" value="${esc(c[col.id] || "")}"></td>`).join("")}<td class="row-actions"><button data-edit class="channel-drag-handle" draggable="true" data-drag-channel="${n}" aria-label="Arrastrar canal ${n + 1} desde el final" title="Arrastrar canal o selección">⋮⋮</button><button data-edit data-row-move="${n}" data-dir="-1" aria-label="Subir canal ${n + 1}" ${n === 0 ? "disabled" : ""}>↑</button><button data-edit data-row-move="${n}" data-dir="1" aria-label="Bajar canal ${n + 1}" ${n === state.channels.length - 1 ? "disabled" : ""}>↓</button><button data-edit data-row-delete="${n}" aria-label="Eliminar canal ${n + 1}">×</button></td></tr>`).join("")}</tbody>`;
  table.querySelectorAll("[data-channel]").forEach((el) => {
    const row = state.channels[+el.dataset.channel];
    if (
      row._link &&
      ["c_signal", "c_phantom", "c_power"].includes(el.dataset.field)
    ) {
      el.readOnly = true;
      el.title = "Editar desde el equipo en el stage plot";
    }
  });
  const colButton = document.createElement("button");
  colButton.className = "button";
  colButton.id = "add-column";
  colButton.dataset.edit = "";
  colButton.textContent = "+ Columna";
  document.querySelector(".channel-section .section-heading").append(colButton);
  colButton.onclick = () => {
    if (state.columns.length >= 20) return alert("Máximo 20 columnas");
    const label = prompt("Nombre de la columna:");
    if (!label?.trim()) return;
    const id =
      "c_" +
      Array.from(crypto.getRandomValues(new Uint32Array(3)), (n) =>
        n.toString(16),
      ).join("_");
    state.columns.push({ id, label: label.trim().slice(0, 100) });
    state.channels.forEach((c) => (c[id] = ""));
    save();
    render();
  };
  table.querySelectorAll("[data-column]").forEach(
    (input) =>
      (input.oninput = () => {
        state.columns[+input.dataset.column].label = input.value.slice(0, 100);
        save();
      }),
  );
  table.querySelectorAll("[data-channel]").forEach(
    (input) =>
      (input.oninput = () => {
        updateChannel(
          state,
          +input.dataset.channel,
          input.dataset.field,
          input.value,
        );
        refreshChannelCells(state, input);
        const linked = findLinkedInput(
          state,
          state.channels[+input.dataset.channel],
        ).input;
        if (linked)
          document.querySelectorAll("[data-technical-field]").forEach((el) => {
            if (el.dataset.inputId === linked.id)
              el.value = String(linked[el.dataset.technicalField]);
          });
        save();
      }),
  );
  table.querySelectorAll("[data-channel]").forEach((el) => {
    if (state.channels[+el.dataset.channel]._link) el.onchange = render;
  });
  table.querySelectorAll("[data-col-move],[data-row-move]").forEach(
    (b) =>
      (b.onclick = () => {
        const isCol = b.dataset.colMove !== undefined;
        const n = +(isCol ? b.dataset.colMove : b.dataset.rowMove);
        const target = n + Number(b.dataset.dir);
        const arr = isCol ? state.columns : state.channels;
        if (target < 0 || target >= arr.length) return;
        [arr[n], arr[target]] = [arr[target], arr[n]];
        save();
        render();
      }),
  );
  table.querySelectorAll("[data-col-delete]").forEach(
    (b) =>
      (b.onclick = () => {
        if (state.columns.length <= 1) return;
        if (!confirm("¿Quitar esta columna de la lista?")) return;
        state.columns.splice(+b.dataset.colDelete, 1);
        save();
        render();
      }),
  );
  table.querySelectorAll("[data-row-delete]").forEach(
    (b) =>
      (b.onclick = () => {
        const { input } = findLinkedInput(
          state,
          state.channels[+b.dataset.rowDelete],
        );
        if (
          input &&
          !confirm(
            "Se eliminará la entrada vinculada y sus canales. ¿Continuar?",
          )
        )
          return;
        removeChannel(state, +b.dataset.rowDelete);
        save();
        render();
      }),
  );
  document.querySelector("#add-channel").onclick = () => {
    if (state.channels.length >= 500) return;
    state.channels.push(
      Object.fromEntries(state.columns.map((c) => [c.id, ""])),
    );
    save();
    render();
  };
  mountChannelOrder({ state, table, save, render, collaboration });
  mountDrawing({
    state,
    save,
    render,
    collaboration,
    selectedItemId: selected,
    deleteItem,
    clearItemSelection,
  });
  const item = state.items.find((i) => i.id === selected);
  if (item) {
    const label = document.createElement("label");
    label.className = "item-comment";
    label.innerHTML = `Comentario de posición <textarea id="item-comment" maxlength="10000">${esc(item.comment)}</textarea>`;
    document.querySelector(".item-editor").append(label);
    label.querySelector("textarea").oninput = (e) => {
      item.comment = e.target.value;
      save();
    };
  }
  const section = document.createElement("section");
  section.className = "annotation-section";
  section.innerHTML = `<h2>Comentarios de posiciones</h2><p>Selecciona un instrumento para comentar su ubicación o marca cualquier punto del plano.</p>${state.items
    .filter((i) => i.comment)
    .map(
      (i) =>
        `<article data-item-comment="${i.id}"><b>${esc(i.label)}</b><p>${esc(i.comment)}</p></article>`,
    )
    .join(
      "",
    )}${state.positionComments.map((c, n) => `<article><b>Punto ${n + 1} · ${c.x.toFixed(0)}%, ${c.y.toFixed(0)}%</b><textarea data-position-comment="${n}" aria-label="Comentario punto ${n + 1}">${esc(c.text)}</textarea><button data-edit data-delete-position="${n}" class="button">Eliminar comentario</button></article>`).join("")}`;
  document.querySelector(".notes").before(section);
  section.querySelectorAll("[data-position-comment]").forEach(
    (t) =>
      (t.oninput = () => {
        state.positionComments[+t.dataset.positionComment].text = t.value;
        save();
      }),
  );
  section.querySelectorAll("[data-delete-position]").forEach(
    (b) =>
      (b.onclick = () => {
        state.positionComments.splice(+b.dataset.deletePosition, 1);
        save();
        render();
      }),
  );
  const mounting = document.createElement("section");
  mounting.className = "mounting-section";
  mounting.innerHTML = `<h2>Comentarios de montaje</h2><div>${state.mountComments.map((c) => `<article><b>${esc(c.author)}</b> <time>${esc(time(c.createdAt))}</time><p>${esc(c.text)}</p></article>`).join("")}</div><form id="mount-form"><p class="mount-author">${esc(currentIdentity?.name || "Identifícate desde la sesión para comentar")}</p><label>Comentario<textarea id="mount-text" required maxlength="2000">${esc(mountDrafts.get(projectId) || "")}</textarea></label><button data-edit class="button">Añadir comentario</button></form><p id="mount-error" role="status"></p>`;
  section.after(mounting);
  mounting.querySelector("textarea").oninput = (e) =>
    mountDrafts.set(projectId, e.target.value);
  mounting.querySelector("form").onsubmit = (e) => {
    e.preventDefault();
    const text = mounting.querySelector("textarea").value.trim();
    if (!currentIdentity?.name || !text) {
      mounting.querySelector("#mount-error").textContent =
        "Escribe tu nombre y un comentario.";
      return;
    }
    if (state.mountComments.length >= 500) return;
    state.mountComments.push({
      author: currentIdentity.name,
      text,
      createdAt: new Date().toISOString(),
    });
    mountDrafts.set(projectId, "");
    save();
    render();
  };
}
