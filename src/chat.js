import { esc, icon } from "./ui.js";
import { identity, identify } from "./identity.js";
import {
  soundEnabled,
  setSoundEnabled,
  notifyMessage,
} from "./notifications.js";
let initialized = false,
  refreshing = false,
  refreshAgain = false;
const sentIds = new Set();
let api,
  projectId = "",
  messages = [],
  drafts = new Map(),
  last = 0,
  minimized = true,
  sending = false,
  unread = 0;
export function setupChat(collaboration) {
  api = collaboration;
  try {
    minimized = localStorage.getItem("gordostage-chat-minimized") !== "false";
  } catch {}
  window.addEventListener("stagecraft-chat", (e) => {
    if (!e.detail || e.detail === api.access().projectId) refresh();
  });
  window.addEventListener("gordostage-access", () => mount());
  window.addEventListener("gordostage-project", () => {
    messages = [];
    last = 0;
    initialized = false;
    unread = 0;
    mount();
    refresh();
  });
  window.addEventListener("gordostage-identity-changed", () => {
    mount();
    refresh();
  });
  const markRead = () => {
    if (!minimized && !document.hidden) {
      unread = 0;
      drawMessages();
    }
  };
  window.addEventListener("focus", markRead);
  document.addEventListener("visibilitychange", markRead);
  setInterval(refresh, 4000);
  mount();
  refresh();
}
function mount() {
  if (!api) return;
  const access = api.access();
  const id = access.projectId;
  let root = document.querySelector("#chat-dock");
  if (!root) {
    root = document.createElement("aside");
    root.id = "chat-dock";
    root.setAttribute("aria-label", "Chat del proyecto");
    document.body.append(root);
  }
  if (projectId !== id) {
    projectId = id;
    messages = [];
    last = 0;
    initialized = false;
    unread = 0;
  }
  const user = identity();
  const canChat = access.canEdit && access.connected && access.chatEnabled;
  const key = JSON.stringify({
    id,
    user,
    canChat,
    minimized,
    sound: soundEnabled(),
    enabled: access.chatEnabled,
  });
  if (root.dataset.key === key) {
    const title = root.querySelector(".chat-dock-heading>button span");
    if (title)
      title.innerHTML =
        icon("chat") +
        " Chat · " +
        esc(api.listProjects().find((p) => p.id === id)?.title || "Proyecto");
    drawMessages();
    return;
  }
  root.dataset.key = key;
  root.hidden = !access.chatEnabled;
  root.classList.toggle("minimized", minimized);
  root.innerHTML = `<div class="chat-dock-heading"><button id="toggle-chat" aria-expanded="${!minimized}"><span>${icon("chat")} Chat · ${esc(api.listProjects().find((p) => p.id === id)?.title || "Proyecto")}</span><b id="chat-unread">${unread || ""}</b><span>${minimized ? "＋" : "−"}</span></button><button id="chat-sound" type="button" aria-pressed="${soundEnabled()}" title="${soundEnabled() ? "Silenciar notificaciones" : "Activar sonido de notificación"}" aria-label="${soundEnabled() ? "Silenciar notificaciones" : "Activar sonido de notificación"}">${icon(soundEnabled() ? "volume" : "mute")}</button></div><div class="chat-dock-body"><div class="chat-identity">${esc(user?.name || "Identifícate para participar")}<button id="chat-identify" title="Cambiar identificación">Cambiar</button></div><div id="chat-log" role="log" aria-live="polite"></div><form id="chat-form"><label class="sr-only" for="chat-text">Mensaje</label><textarea id="chat-text" maxlength="2000" rows="2" placeholder="Enter: enviar · Shift+Enter: nueva línea" ${!user || !canChat ? "disabled" : ""}>${esc(drafts.get(id) || "")}</textarea><button class="button" ${!user || !canChat ? "disabled" : ""}>Enviar</button></form><p id="chat-error" role="status">${!canChat ? "El chat requiere permiso de edición." : ""}</p></div>`;
  root.querySelector("#toggle-chat").onclick = () => {
    minimized = !minimized;
    localStorage.setItem("gordostage-chat-minimized", String(minimized));
    if (!minimized) unread = 0;
    mount();
    refresh();
  };
  root.querySelector("#chat-identify").onclick = identify;
  root.querySelector("#chat-sound").onclick = () => {
    setSoundEnabled(!soundEnabled());
    mount();
  };
  root.querySelector("textarea").onkeydown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      if (canChat && !sending) root.querySelector("form").requestSubmit();
    }
  };
  root.querySelector("textarea").oninput = (e) =>
    drafts.set(id, e.target.value);
  root.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    if (
      sending ||
      !identity() ||
      !api.access().canEdit ||
      !api.access().connected
    )
      return;
    const text = (drafts.get(id) || "").trim();
    if (!text) return;
    sending = true;
    const button = root.querySelector("form button");
    button.disabled = true;
    try {
      const r = await api.request("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          text,
          author: identity().name,
          role: identity().role,
        }),
      });
      if (!r.ok) throw Error((await r.json()).error);
      sentIds.add((await r.json()).id);
      drafts.set(id, "");
      if (projectId === id) root.querySelector("textarea").value = "";
      await refresh();
    } catch (error) {
      root.querySelector("#chat-error").textContent =
        error.message || "No se pudo enviar; el borrador se conserva.";
    } finally {
      sending = false;
      button.disabled = !api.access().canEdit;
      if (refreshAgain) {
        refreshAgain = false;
        refresh();
      }
    }
  };
  drawMessages();
}
function drawMessages() {
  const log = document.querySelector("#chat-log");
  if (!log) return;
  const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 35;
  log.innerHTML =
    messages
      .map(
        (m) =>
          `<article><b>${esc(m.author)}</b><small>${esc(m.role || "Equipo")} · ${esc(new Date(m.createdAt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }))}</small><p>${esc(m.text)}</p></article>`,
      )
      .join("") ||
    '<p class="chat-empty">Los mensajes de este proyecto aparecerán aquí.</p>';
  if (atBottom) log.scrollTop = log.scrollHeight;
  const badge = document.querySelector("#chat-unread");
  if (badge) badge.textContent = unread || "";
  document
    .querySelector("#chat-dock")
    ?.classList.toggle("has-unread", unread > 0);
  document
    .querySelector("#toggle-chat")
    ?.setAttribute(
      "aria-label",
      `${minimized ? "Abrir" : "Minimizar"} chat${unread ? `, ${unread} mensajes sin leer` : ""}`,
    );
}
async function refresh() {
  if (!api || !api.access().canEdit || !api.access().chatEnabled) return;
  if (refreshing || sending) {
    refreshAgain = true;
    return;
  }
  refreshing = true;
  const id = api.access().projectId;
  try {
    const r = await api.request("/api/chat");
    if (!r.ok) return;
    const list = await r.json();
    if (id !== api.access().projectId) return;
    const incoming = initialized
      ? list.filter((m) => m.id > last && !sentIds.has(m.id))
      : [];
    if (incoming.length) {
      if (minimized || document.hidden) unread += incoming.length;
      notifyMessage();
    }
    initialized = true;
    last = list.at(-1)?.id || 0;
    messages = list;
    drawMessages();
  } catch {
    const error = document.querySelector("#chat-error");
    if (error) error.textContent = "Sin conexión. El borrador se conserva.";
  } finally {
    refreshing = false;
    if (refreshAgain) {
      refreshAgain = false;
      refresh();
    }
  }
}
