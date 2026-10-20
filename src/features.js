const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let tool = "move",
  color = "#cc4433";
let author = sessionStorage.getItem("stagecraft-author") || "";
let mountDraft = "";
let chatDraft = "",
  chatMessages = [],
  chatError = "",
  chatLoading = false,
  api = null;
let chatScroll = 0;
const time = (s) => new Date(s).toLocaleString("es-CL");
const authorInput = () =>
  `<label>Tu nombre <input data-author maxlength="80" value="${esc(author)}" placeholder="Nombre del editor"></label>`;
function rememberAuthor(value) {
  author = value;
  sessionStorage.setItem("stagecraft-author", author);
}
function messagesHTML() {
  return (
    chatMessages
      .map(
        (m) =>
          `<article><b>${esc(m.author)}</b> <time>${esc(time(m.createdAt))}</time><p>${esc(m.text)}</p></article>`,
      )
      .join("") || "<p>Sin mensajes todavía.</p>"
  );
}
async function refreshChat() {
  if (!api?.access().canEdit) return;
  try {
    const r = await api.request("/api/chat");
    if (!r.ok) throw Error("No se pudo leer el chat");
    chatMessages = await r.json();
    chatError = "";
    const log = document.querySelector("#chat-log");
    if (log) {
      const bottom = log.scrollHeight - log.scrollTop - log.clientHeight < 30;
      log.innerHTML = messagesHTML();
      if (bottom) log.scrollTop = log.scrollHeight;
    }
  } catch {
    chatError = "Chat sin conexión. Tu borrador se conserva.";
  }
  const error = document.querySelector("#chat-error");
  if (error) error.textContent = chatError;
}
window.addEventListener("stagecraft-chat", refreshChat);
setInterval(refreshChat, 5000);
export function mountFeatures({
  state,
  selected,
  save,
  render,
  collaboration,
}) {
  api = collaboration;
  // Customize the input list without losing hidden cells when removing a column.
  const table = document.querySelector(".channel-section table");
  table.innerHTML = `<thead><tr><th>CH</th>${state.columns.map((c, n) => `<th><input data-edit data-column="${n}" aria-label="Nombre columna ${n + 1}" value="${esc(c.label)}"><div class="column-actions"><button data-edit data-col-move="${n}" data-dir="-1" aria-label="Mover columna a la izquierda" ${n === 0 ? "disabled" : ""}>←</button><button data-edit data-col-move="${n}" data-dir="1" aria-label="Mover columna a la derecha" ${n === state.columns.length - 1 ? "disabled" : ""}>→</button><button data-edit data-col-delete="${n}" aria-label="Eliminar columna" ${state.columns.length === 1 ? "disabled" : ""}>×</button></div></th>`).join("")}<th class="row-actions">Orden</th></tr></thead><tbody>${state.channels.map((c, n) => `<tr><td>${n + 1}</td>${state.columns.map((col) => `<td><input data-channel="${n}" data-field="${col.id}" aria-label="${esc(col.label)} canal ${n + 1}" value="${esc(c[col.id] || "")}"></td>`).join("")}<td class="row-actions"><button data-edit data-row-move="${n}" data-dir="-1" aria-label="Subir canal ${n + 1}" ${n === 0 ? "disabled" : ""}>↑</button><button data-edit data-row-move="${n}" data-dir="1" aria-label="Bajar canal ${n + 1}" ${n === state.channels.length - 1 ? "disabled" : ""}>↓</button><button data-edit data-row-delete="${n}" aria-label="Eliminar canal ${n + 1}">×</button></td></tr>`).join("")}</tbody>`;
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
    const id = "c_" + crypto.randomUUID();
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
        state.channels[+input.dataset.channel][input.dataset.field] =
          input.value;
        save();
      }),
  );
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
        state.channels.splice(+b.dataset.rowDelete, 1);
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
  // Annotations use percentages, so drawings and comments scale with the stage.
  const stage = document.querySelector("#stage");
  const toolbar = document.createElement("div");
  toolbar.className = "drawing-tools";
  toolbar.innerHTML = `<button data-edit data-tool="move" class="button ${tool === "move" ? "chosen" : ""}">Mover</button><button data-edit data-tool="draw" class="button ${tool === "draw" ? "chosen" : ""}">Dibujar</button><button data-edit data-tool="comment" class="button ${tool === "comment" ? "chosen" : ""}">Comentar posición</button><label>Color <input data-edit id="draw-color" type="color" value="${color}"></label><button data-edit id="undo-drawing" class="button">Deshacer trazo</button>`;
  document.querySelector(".stage-wrap").prepend(toolbar);
  toolbar.querySelectorAll("[data-tool]").forEach(
    (b) =>
      (b.onclick = () => {
        tool = b.dataset.tool;
        render();
      }),
  );
  toolbar.querySelector("#draw-color").oninput = (e) =>
    (color = e.target.value);
  toolbar.querySelector("#undo-drawing").onclick = () => {
    state.drawings.pop();
    save();
    render();
  };
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("drawing-layer");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("preserveAspectRatio", "none");
  const addLine = (d) => {
    const p = document.createElementNS(svg.namespaceURI, "polyline");
    p.setAttribute("points", d.points.map((p) => p.join(",")).join(" "));
    p.setAttribute("stroke", d.color);
    p.setAttribute("fill", "none");
    p.setAttribute("stroke-width", "3");
    p.setAttribute("vector-effect", "non-scaling-stroke");
    p.setAttribute("stroke-linecap", "round");
    p.setAttribute("stroke-linejoin", "round");
    svg.append(p);
    return p;
  };
  state.drawings.forEach(addLine);
  stage.prepend(svg);
  state.positionComments.forEach((c, n) => {
    const pin = document.createElement("span");
    pin.className = "comment-pin";
    pin.style.left = c.x + "%";
    pin.style.top = c.y + "%";
    pin.textContent = n + 1;
    pin.title = c.text;
    stage.append(pin);
  });
  if (tool !== "move") stage.classList.add("annotating");
  const allowed = () =>
    !api ||
    (api.access().canEdit && api.access().connected && !api.access().conflict);
  stage.addEventListener(
    "pointerdown",
    (e) => {
      if (tool === "move" || !allowed()) return;
      e.preventDefault();
      e.stopPropagation();
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
      if (tool === "comment") {
        if (state.positionComments.length >= 500) return;
        const text = prompt("Comentario para esta posición:");
        if (text?.trim()) {
          const [x, y] = point(e);
          state.positionComments.push({ x, y, text: text.trim() });
          save();
          render();
        }
        return;
      }
      if (state.drawings.length >= 200) return alert("Máximo 200 trazos");
      stage.setPointerCapture(e.pointerId);
      const drawing = { color, points: [point(e)] };
      const line = addLine(drawing);
      stage.onpointermove = (event) => {
        if (drawing.points.length >= 2000) return;
        drawing.points.push(point(event));
        line.setAttribute(
          "points",
          drawing.points.map((p) => p.join(",")).join(" "),
        );
      };
      const finish = (event) => {
        stage.onpointermove = null;
        stage.onpointerup = null;
        stage.onpointercancel = null;
        if (event.type !== "pointercancel" && drawing.points.length >= 2) {
          state.drawings.push(drawing);
          save();
        }
        render();
      };
      stage.onpointerup = finish;
      stage.onpointercancel = finish;
    },
    true,
  );
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
        `<article><b>${esc(i.label)}</b><p>${esc(i.comment)}</p></article>`,
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
  mounting.innerHTML = `<h2>Comentarios de montaje</h2><div>${state.mountComments.map((c) => `<article><b>${esc(c.author)}</b> <time>${esc(time(c.createdAt))}</time><p>${esc(c.text)}</p></article>`).join("")}</div><form id="mount-form">${authorInput()}<label>Comentario<textarea id="mount-text" required maxlength="2000">${esc(mountDraft)}</textarea></label><button data-edit class="button">Añadir comentario</button></form><p id="mount-error" role="status"></p>`;
  section.after(mounting);
  mounting.querySelector("[data-author]").oninput = (e) =>
    rememberAuthor(e.target.value);
  mounting.querySelector("textarea").oninput = (e) =>
    (mountDraft = e.target.value);
  mounting.querySelector("form").onsubmit = (e) => {
    e.preventDefault();
    const text = mounting.querySelector("textarea").value.trim();
    if (!author.trim() || !text) {
      mounting.querySelector("#mount-error").textContent =
        "Escribe tu nombre y un comentario.";
      return;
    }
    if (state.mountComments.length >= 500) return;
    state.mountComments.push({
      author: author.trim(),
      text,
      createdAt: new Date().toISOString(),
    });
    mountDraft = "";
    save();
    render();
  };
  if (api?.access().canEdit) {
    const chat = document.createElement("section");
    chat.className = "chat-section";
    chat.innerHTML = `<h2>Chat de editores · servidor local</h2><p>Conversación del montaje. No se incluye en el JSON ni en el PDF.</p><div id="chat-log" role="log" aria-live="polite">${messagesHTML()}</div><form id="chat-form">${authorInput()}<label>Mensaje<textarea id="chat-text" required maxlength="2000">${esc(chatDraft)}</textarea></label><button data-edit class="button" ${chatLoading ? "disabled" : ""}>Enviar mensaje</button></form><p id="chat-error" role="status">${esc(chatError)}</p>`;
    mounting.after(chat);
    const log = chat.querySelector("#chat-log");
    log.scrollTop = chatScroll;
    log.onscroll = () => (chatScroll = log.scrollTop);
    chat.querySelector("[data-author]").oninput = (e) =>
      rememberAuthor(e.target.value);
    chat.querySelector("textarea").oninput = (e) =>
      (chatDraft = e.target.value);
    chat.querySelector("form").onsubmit = async (e) => {
      e.preventDefault();
      if (chatLoading) return;
      if (!author.trim() || !chatDraft.trim()) {
        chat.querySelector("#chat-error").textContent =
          "Escribe tu nombre y un mensaje.";
        return;
      }
      chatLoading = true;
      chat.querySelector("button").disabled = true;
      try {
        const r = await api.request("/api/chat", {
          method: "POST",
          body: JSON.stringify({
            author: author.trim(),
            text: chatDraft.trim(),
          }),
        });
        if (!r.ok) throw Error();
        chatDraft = "";
        chat.querySelector("textarea").value = "";
        await refreshChat();
      } catch {
        chatError = "No se pudo enviar. El mensaje sigue en el borrador.";
        chat.querySelector("#chat-error").textContent = chatError;
      } finally {
        chatLoading = false;
        chat.querySelector("button").disabled = false;
      }
    };
    refreshChat();
  }
}
