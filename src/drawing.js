import {
  CABLE_TYPES,
  hitStroke,
  eraseCircle,
  eraseSweep,
} from "../shared/drawing.js";
import { esc, iconButton } from "./ui.js";
let tool = "move",
  color = "#ff6d46",
  opacity = 1,
  width = 3,
  cableKind = "audio",
  cableLabel = "",
  eraserSize = 18,
  selected = -1,
  cableDraft = null,
  projectId = "",
  optionChanging = false;
const histories = new Map();
export function mountDrawing({ state, save, render, collaboration }) {
  const id = collaboration?.access().projectId || "local";
  if (projectId !== id) {
    projectId = id;
    selected = -1;
    cableDraft = null;
    optionChanging = false;
  }
  let history = histories.get(id);
  if (!history) {
    history = { past: [], future: [], last: JSON.stringify(state.drawings) };
    histories.set(id, history);
  }
  const snapshot = () => JSON.stringify(state.drawings);
  if (history.last !== snapshot()) {
    history.past = [];
    history.future = [];
    history.last = snapshot();
    selected = -1;
    cableDraft = null;
    optionChanging = false;
  }
  const record = (before) => {
    if (before === snapshot()) return;
    history.past.push(before);
    if (history.past.length > 50) history.past.shift();
    history.future = [];
    history.last = snapshot();
  };
  const allowed = () =>
    !collaboration ||
    (collaboration.access().canEdit &&
      collaboration.access().connected &&
      !collaboration.access().conflict);
  const stage = document.querySelector("#stage"),
    wrap = document.querySelector(".stage-wrap");
  stage.tabIndex = 0;
  const selectedDrawing = state.drawings[selected];
  const controls = document.createElement("div");
  controls.className = "drawing-tools";
  controls.innerHTML = `<div class="tool-rail" role="toolbar" aria-label="Herramientas del plano">${[
    ["move", "move", "Seleccionar y mover"],
    ["draw", "pen", "Dibujo libre"],
    ["comment", "comment", "Comentario de posición"],
    ["erase-stroke", "delete", "Eliminar trazo completo"],
    ["erase", "eraser", "Goma: borrar parte del trazo"],
    ["cable", "cable", "Trazar cableado"],
  ]
    .map(([key, ico, label]) =>
      iconButton(
        "tool-" + key,
        ico,
        label,
        `data-edit data-tool="${key}" aria-pressed="${tool === key}"`,
      ),
    )
    .join(
      "",
    )}${iconButton("undo-drawing", "undo", "Deshacer dibujo o borrado", "data-edit")}${iconButton("redo-drawing", "undo", "Rehacer dibujo o borrado", "data-edit")}</div><div class="drawing-options"><label title="Color del trazo">Color<input data-edit id="draw-color" type="color" value="${selectedDrawing?.color || color}"></label><label>Grosor<input data-edit id="draw-width" type="number" min="1" max="40" value="${selectedDrawing?.width || width}"></label><label>Opacidad <span id="opacity-value">${Math.round((selectedDrawing?.opacity ?? opacity) * 100)}%</span><input data-edit id="draw-opacity" type="range" min="5" max="100" value="${Math.round((selectedDrawing?.opacity ?? opacity) * 100)}"></label>${tool === "erase" ? `<label>Goma (px)<input data-edit id="eraser-size" type="number" min="4" max="80" value="${eraserSize}"></label>` : ""}${
    tool === "cable"
      ? `<label>Tipo de cable<select data-edit id="cable-kind">${Object.entries(
          CABLE_TYPES,
        )
          .map(
            ([key, c]) =>
              `<option value="${key}" ${key === cableKind ? "selected" : ""}>${c.label}</option>`,
          )
          .join(
            "",
          )}</select></label><label>Etiqueta<input data-edit id="cable-label" maxlength="120" value="${esc(cableLabel)}" placeholder="Origen → destino"></label><button data-edit id="finish-cable" class="button">Terminar cable</button>`
      : ""
  }<span class="drawing-hint">${tool === "cable" ? "Clic para cada esquina · Enter o doble clic para terminar · Esc para cancelar" : tool === "erase" ? "Arrastra para borrar una parte" : selectedDrawing ? "Trazo seleccionado · ajusta color, grosor u opacidad" : "Selecciona un equipo o un trazo para editar"}</span></div>`;
  wrap.prepend(controls);
  controls.querySelectorAll("[data-tool]").forEach((button) => {
    button.classList.toggle("chosen", button.dataset.tool === tool);
    button.onclick = () => {
      tool = button.dataset.tool;
      cableDraft = null;
      selected = -1;
      render();
    };
  });
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("drawing-layer");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("preserveAspectRatio", "none");
  stage.prepend(svg);
  function addLine(d, index, preview = false) {
    const line = document.createElementNS(svg.namespaceURI, "polyline");
    line.setAttribute("points", d.points.map((p) => p.join(",")).join(" "));
    line.setAttribute("stroke", d.color);
    line.setAttribute("stroke-opacity", d.opacity);
    line.setAttribute("fill", "none");
    line.setAttribute("stroke-width", d.width);
    line.setAttribute("vector-effect", "non-scaling-stroke");
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute("stroke-linejoin", "round");
    if (CABLE_TYPES[d.kind]?.dash)
      line.setAttribute("stroke-dasharray", CABLE_TYPES[d.kind].dash);
    line.dataset.stroke = index;
    if (preview) line.classList.add("draft-cable");
    if (index === selected) line.classList.add("selected-stroke");
    svg.append(line);
    if (d.kind !== "free" && d.points.length > 1) {
      const label = document.createElementNS(svg.namespaceURI, "text");
      label.setAttribute("x", d.points[0][0]);
      label.setAttribute("y", Math.max(2, d.points[0][1] - 1));
      label.setAttribute("fill", d.color);
      label.setAttribute("font-size", "1.6");
      label.textContent = d.label || CABLE_TYPES[d.kind].label;
      svg.append(label);
    }
    return line;
  }
  const paint = () => {
    svg.replaceChildren();
    state.drawings.forEach((d, n) => addLine(d, n));
    if (cableDraft) addLine(cableDraft, -1, true);
  };
  paint();
  state.positionComments.forEach((c, n) => {
    const pin = document.createElement("span");
    pin.className = "comment-pin";
    pin.style.left = c.x + "%";
    pin.style.top = c.y + "%";
    pin.textContent = n + 1;
    pin.title = c.text;
    stage.append(pin);
  });
  const kinds = [
    ...new Set(state.drawings.map((d) => d.kind).filter((k) => k !== "free")),
  ];
  if (kinds.length) {
    const legend = document.createElement("div");
    legend.className = "cable-legend";
    legend.innerHTML = kinds
      .map(
        (k) =>
          `<span style="--cable-color:${CABLE_TYPES[k].color}">${CABLE_TYPES[k].label}</span>`,
      )
      .join("");
    wrap.append(legend);
  }
  if (tool !== "move") stage.classList.add("annotating");
  stage.classList.toggle("eraser-active", tool === "erase");
  function option(field, value) {
    if (!allowed()) return;
    if (selected >= 0 && state.drawings[selected]) {
      if (!optionChanging) {
        history.past.push(snapshot());
        history.future = [];
        optionChanging = true;
      }
      state.drawings[selected][field] = value;
      history.last = snapshot();
      save();
      paint();
    }
    if (field === "color") color = value;
    if (field === "opacity") opacity = value;
    if (field === "width") width = value;
  }
  controls.querySelector("#draw-color").oninput = (e) =>
    option("color", e.target.value);
  controls.querySelector("#draw-width").oninput = (e) =>
    option("width", Math.max(1, Math.min(40, +e.target.value || 3)));
  controls.querySelector("#draw-opacity").oninput = (e) => {
    controls.querySelector("#opacity-value").textContent = e.target.value + "%";
    option("opacity", +e.target.value / 100);
  };
  controls.querySelectorAll("#draw-color,#draw-width,#draw-opacity").forEach(
    (el) =>
      (el.onchange = () => {
        optionChanging = false;
        if (selected >= 0) render();
      }),
  );
  controls
    .querySelector("#eraser-size")
    ?.addEventListener(
      "change",
      (e) => (eraserSize = Math.max(4, Math.min(80, +e.target.value || 18))),
    );
  controls.querySelector("#cable-kind")?.addEventListener("change", (e) => {
    cableKind = e.target.value;
    color = CABLE_TYPES[cableKind].color;
    if (cableDraft) {
      cableDraft.kind = cableKind;
      cableDraft.color = color;
    }
    render();
  });
  controls.querySelector("#cable-label")?.addEventListener("input", (e) => {
    cableLabel = e.target.value;
    if (cableDraft) {
      cableDraft.label = cableLabel;
      paint();
    }
  });
  const finishCable = () => {
    if (!allowed() || !cableDraft || cableDraft.points.length < 2) return;
    if (state.drawings.length >= 1000)
      return alert("Máximo de trazos alcanzado");
    const before = snapshot();
    state.drawings.push(cableDraft);
    cableDraft = null;
    record(before);
    save();
    render();
  };
  controls
    .querySelector("#finish-cable")
    ?.addEventListener("click", finishCable);
  controls.querySelector("#undo-drawing").onclick = () => {
    if (!allowed() || !history.past.length) return;
    history.future.push(snapshot());
    state.drawings = JSON.parse(history.past.pop());
    history.last = snapshot();
    selected = -1;
    cableDraft = null;
    save();
    render();
  };
  controls.querySelector("#redo-drawing").onclick = () => {
    if (!allowed() || !history.future.length) return;
    history.past.push(snapshot());
    state.drawings = JSON.parse(history.future.pop());
    history.last = snapshot();
    save();
    render();
  };
  stage.onkeydown = (e) => {
    if (e.key === "Enter" && cableDraft) {
      e.preventDefault();
      finishCable();
    }
    if (e.key === "Escape") {
      cableDraft = null;
      selected = -1;
      paint();
    }
  };
  stage.ondblclick = (e) => {
    if (tool === "cable") {
      e.preventDefault();
      finishCable();
    }
  };
  stage.addEventListener(
    "pointerdown",
    (e) => {
      if (!allowed()) return;
      if (tool === "move" && e.target.closest("[data-item]")) return;
      const rect = stage.getBoundingClientRect();
      const point = (event) => [
        Math.max(
          0,
          Math.min(100, ((event.clientX - rect.left) / rect.width) * 100),
        ),
        Math.max(
          0,
          Math.min(100, ((event.clientY - rect.top) / rect.height) * 100),
        ),
      ];
      const start = point(e);
      if (tool === "move") {
        selected = hitStroke(state.drawings, start, rect.width, rect.height);
        render();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      stage.focus({ preventScroll: true });
      if (tool === "comment") {
        const text = prompt("Comentario para esta posición:");
        if (text?.trim() && state.positionComments.length < 500) {
          state.positionComments.push({
            x: start[0],
            y: start[1],
            text: text.trim().slice(0, 10000),
          });
          save();
          render();
        }
        return;
      }
      if (tool === "erase-stroke") {
        const index = hitStroke(state.drawings, start, rect.width, rect.height);
        if (index >= 0) {
          const before = snapshot();
          state.drawings.splice(index, 1);
          record(before);
          save();
          render();
        }
        return;
      }
      if (tool === "cable") {
        if (state.drawings.length >= 1000 || cableDraft?.points.length >= 2000)
          return alert("Máximo de trazos o puntos alcanzado");
        if (!cableDraft)
          cableDraft = {
            points: [],
            color: CABLE_TYPES[cableKind].color,
            kind: cableKind,
            label: cableLabel,
            opacity,
            width,
          };
        const last = cableDraft.points.at(-1);
        if (!last || Math.hypot(start[0] - last[0], start[1] - last[1]) > 0.2)
          cableDraft.points.push(start);
        paint();
        return;
      }
      if (state.drawings.length >= 990 && tool === "draw")
        return alert("Máximo de trazos alcanzado");
      stage.setPointerCapture(e.pointerId);
      const before = snapshot();
      let previous = start;
      const drawing = {
        points: [start],
        color,
        opacity,
        width,
        kind: "free",
        label: "",
      };
      let line;
      if (tool === "draw") line = addLine(drawing, -1);
      else {
        state.drawings = eraseCircle(
          state.drawings,
          start,
          eraserSize / 2,
          rect.width,
          rect.height,
        );
        paint();
      }
      stage.onpointermove = (event) => {
        const current = point(event);
        if (tool === "draw") {
          if (drawing.points.length >= 2000) return;
          drawing.points.push(current);
          line.setAttribute(
            "points",
            drawing.points.map((p) => p.join(",")).join(" "),
          );
        } else {
          state.drawings = eraseSweep(
            state.drawings,
            previous,
            current,
            eraserSize / 2,
            rect.width,
            rect.height,
          );
          paint();
        }
        previous = current;
      };
      const finish = (event) => {
        stage.onpointermove = null;
        stage.onpointerup = null;
        stage.onpointercancel = null;
        if (event.type === "pointercancel") {
          state.drawings = JSON.parse(before);
          paint();
          return;
        }
        if (tool === "draw" && drawing.points.length >= 2)
          state.drawings.push(drawing);
        if (state.drawings.length > 1000) {
          state.drawings = JSON.parse(before);
          alert(
            "El borrado generaría demasiados fragmentos. Borra trazos completos primero.",
          );
        }
        record(before);
        selected = -1;
        save();
        render();
      };
      stage.onpointerup = finish;
      stage.onpointercancel = finish;
    },
    true,
  );
}
