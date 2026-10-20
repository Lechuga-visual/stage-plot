import { moveChannels } from "../shared/channel-order.js";
import { esc } from "./ui.js";
let projectId,
  selected = new Set(),
  anchor = null,
  drag = null;
export function mountChannelOrder({
  state,
  table,
  save,
  render,
  collaboration,
}) {
  drag = null;
  const id = collaboration?.access().projectId || "local";
  if (id !== projectId) {
    projectId = id;
    selected.clear();
    anchor = null;
  }
  selected = new Set(
    [...selected].filter((row) => state.channels.includes(row)),
  );
  const allowed = () =>
    !collaboration ||
    (collaboration.access().canEdit &&
      collaboration.access().connected &&
      !collaboration.access().conflict);
  const rows = [...table.querySelectorAll("tbody tr")];
  const toolbar = document.createElement("div");
  toolbar.className = "channel-selection-tools";
  toolbar.innerHTML = `<span id="channel-selection-count" role="status"></span><button class="button" id="clear-channel-selection">Limpiar selección</button><label>Mover antes de<select data-edit id="channel-destination" aria-label="Destino de los canales seleccionados">${state.channels.map((row, n) => `<option value="${n}">CH ${n + 1} · ${esc((row.source || "Sin nombre").slice(0, 60))}</option>`).join("")}<option value="${state.channels.length}">Final de la lista</option></select></label><button data-edit class="button" id="move-channel-selection">Mover selección</button><span class="channel-order-hint">Arrastra desde ⋮⋮ al principio o final de la fila. Marca varios para moverlos juntos.</span>`;
  table.closest(".table-wrap").before(toolbar);
  function updateSelection() {
    rows.forEach((row, n) => {
      row.classList.toggle("channel-selected", selected.has(state.channels[n]));
      row.querySelector("[data-row-select]").checked = selected.has(
        state.channels[n],
      );
    });
    const all = table.querySelector("#select-all-channels");
    all.checked = !!rows.length && selected.size === rows.length;
    all.indeterminate = selected.size > 0 && selected.size < rows.length;
    toolbar.querySelector("#channel-selection-count").textContent =
      `${selected.size} canales seleccionados`;
    toolbar.querySelector("#move-channel-selection").disabled =
      !allowed() || !selected.size;
  }
  function move(boundary) {
    if (!allowed()) return;
    const indices = state.channels.flatMap((row, n) =>
      selected.has(row) ? [n] : [],
    );
    const result = moveChannels(state.channels, indices, boundary);
    if (result.every((row, n) => row === state.channels[n])) return;
    state.channels = result;
    save();
    render();
  }
  table.querySelector("#select-all-channels").onchange = (e) => {
    selected = e.target.checked ? new Set(state.channels) : new Set();
    updateSelection();
  };
  rows.forEach((row, n) => {
    row.querySelector("[data-row-select]").onclick = (e) => {
      const checked = e.target.checked;
      if (e.shiftKey && anchor !== null) {
        for (let i = Math.min(anchor, n); i <= Math.max(anchor, n); i++) {
          if (checked) selected.add(state.channels[i]);
          else selected.delete(state.channels[i]);
        }
      } else if (checked) selected.add(state.channels[n]);
      else selected.delete(state.channels[n]);
      anchor = n;
      updateSelection();
    };
    row.querySelectorAll("[data-drag-channel]").forEach((handle) => {
      handle.ondragstart = (e) => {
        if (!allowed()) {
          e.preventDefault();
          return;
        }
        if (!selected.has(state.channels[n]))
          selected = new Set([state.channels[n]]);
        drag = {
          projectId: id,
          // randomUUID requires HTTPS (or localhost); getRandomValues works on LAN HTTP.
          token: Array.from(crypto.getRandomValues(new Uint32Array(4)), (n) =>
            n.toString(16),
          ).join("-"),
          rows: [...selected],
        };
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("application/x-gordostage-channels", drag.token);
        updateSelection();
      };
      handle.ondragend = () => {
        drag = null;
        clearDrop();
      };
    });
    row.ondragover = (e) => {
      if (!drag || drag.projectId !== id || !allowed()) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      clearDrop();
      const r = row.getBoundingClientRect();
      row.classList.add(
        e.clientY < r.y + r.height / 2 ? "drop-before" : "drop-after",
      );
    };
    row.ondrop = (e) => {
      if (
        !drag ||
        drag.projectId !== id ||
        !allowed() ||
        e.dataTransfer.getData("application/x-gordostage-channels") !==
          drag.token
      )
        return;
      e.preventDefault();
      const r = row.getBoundingClientRect(),
        boundary = n + (e.clientY >= r.y + r.height / 2 ? 1 : 0);
      selected = new Set(drag.rows);
      drag = null;
      clearDrop();
      move(boundary);
    };
  });
  function clearDrop() {
    rows.forEach((row) => row.classList.remove("drop-before", "drop-after"));
  }
  toolbar.querySelector("#clear-channel-selection").onclick = () => {
    selected.clear();
    updateSelection();
  };
  toolbar.querySelector("#move-channel-selection").onclick = () =>
    move(+toolbar.querySelector("#channel-destination").value);
  updateSelection();
}
