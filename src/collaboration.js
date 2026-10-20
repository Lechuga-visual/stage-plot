import { esc, dialog, iconButton, icon } from "./ui.js";
import { normalizeProject } from "../shared/project.js";

export async function collaborate({ getState, setState, render, openEditor }) {
  let revision = 0,
    canEdit = false,
    connected = false,
    pending = false,
    busy = false,
    conflict = false,
    timer;
  let isHost = false,
    securityEnabled = false,
    chatEnabled = true,
    requireRegistered = false,
    sessionExpired = false,
    projects = [];
  let projectId = sessionStorage.getItem("gordostage-project") || "default";
  let openIds;
  try {
    openIds = JSON.parse(localStorage.getItem("gordostage-open-projects")) || [
      "default",
    ];
  } catch {
    openIds = ["default"];
  }
  let code = sessionStorage.getItem("stagecraft-edit-code") || "";
  const headers = () => ({
    "Content-Type": "application/json",
    "x-edit-code": code,
    "x-project-id": projectId,
    "x-session-token": sessionStorage.getItem("gordostage-session-token") || "",
  });
  const request = (path, options = {}) =>
    fetch(path, { ...options, headers: { ...headers(), ...options.headers } });
  const access = () => ({
    canEdit,
    connected,
    conflict,
    isHost,
    securityEnabled,
    chatEnabled,
    projectId,
    requireRegistered,
    sessionExpired,
  });
  const status = () => {
    const el = document.querySelector("#save-status");
    if (el)
      el.textContent = conflict
        ? "⚠ Conflicto: exporta tu copia o carga la del servidor"
        : !connected
          ? "○ Sin conexión"
          : pending
            ? "● Cambios pendientes"
            : canEdit
              ? "● Conectado · edición"
              : "● Conectado · solo lectura";
  };
  const persistTabs = () => {
    localStorage.setItem("gordostage-open-projects", JSON.stringify(openIds));
    sessionStorage.setItem("gordostage-project", projectId);
  };
  async function refreshProjects() {
    try {
      const r = await request("/api/projects");
      if (!r.ok) return;
      const body = await r.json();
      const changed =
        JSON.stringify(projects.map(({ revision, ...p }) => p)) !==
        JSON.stringify(body.projects.map(({ revision, ...p }) => p));
      projects = body.projects;
      isHost = body.isHost;
      securityEnabled = body.securityEnabled;
      chatEnabled = body.chatEnabled;
      drawRail();
      if (changed) window.dispatchEvent(new Event("gordostage-project-list"));
    } catch {}
  }
  async function switchProject(id) {
    if (id === projectId) {
      openEditor?.();
      render();
      decorate();
      window.dispatchEvent(
        new CustomEvent("gordostage-project", { detail: id }),
      );
      return;
    }
    clearTimeout(timer);
    if (pending) {
      await flush();
      if (pending) {
        alert(
          "Guarda o exporta los cambios pendientes y resuelve el conflicto antes de cambiar de proyecto.",
        );
        return;
      }
    }
    if (busy) return;
    const oldId = projectId;
    projectId = id;
    try {
      const r = await request("/api/project");
      if (!r.ok) throw Error();
      const remote = await r.json();
      if (projectId !== id) return;
      revision = remote.revision;
      conflict = false;
      pending = false;
      canEdit = remote.canEdit;
      if (remote.document) setState(remote.document);
      else setState(blank("Proyecto sin título"));
      if (!openIds.includes(id)) openIds.push(id);
      persistTabs();
      openEditor?.();
      render();
      decorate();
      window.dispatchEvent(
        new CustomEvent("gordostage-project", { detail: id }),
      );
    } catch {
      if (projectId === id) projectId = oldId;
      alert("No se pudo abrir el proyecto. Revisa la conexión.");
    }
  }
  function blank(title) {
    return normalizeProject({
      band: title,
      event: "",
      description: "",
      notes: "",
      width: 10,
      depth: 8,
      items: [],
      channels: [],
    });
  }
  function projectPicker() {
    const el = dialog(
      `<div class="dialog-heading"><h2>Proyectos del servidor</h2><button class="button" data-dismiss>Cerrar</button></div><p>Abre cualquier proyecto disponible. Cada dispositivo elige cuál ver.</p><div class="project-picker">${projects.map((p) => `<button class="button" data-open-project="${p.id}"><b>${esc(p.title)}</b><small>${esc(p.description || "Sin descripción")}</small></button>`).join("")}</div>${canEdit ? '<form id="create-project-form"><label>Nuevo proyecto<input id="new-project-title" maxlength="100" required placeholder="Nombre de la banda o evento"></label><button class="button dark">Crear proyecto</button></form>' : ""}<p role="status"></p>`,
    );
    el.querySelector("[data-dismiss]").onclick = () => el.close();
    el.querySelectorAll("[data-open-project]").forEach(
      (b) =>
        (b.onclick = async () => {
          el.close();
          await switchProject(b.dataset.openProject);
        }),
    );
    const form = el.querySelector("form");
    if (form)
      form.onsubmit = async (e) => {
        e.preventDefault();
        if (pending) {
          await flush();
          if (pending) {
            el.querySelector("[role=status]").textContent =
              "Resuelve los cambios pendientes antes de crear otro proyecto.";
            return;
          }
        }
        const r = await request("/api/projects", {
          method: "POST",
          body: JSON.stringify({
            document: blank(el.querySelector("input").value.trim()),
          }),
        });
        if (!r.ok) {
          el.querySelector("[role=status]").textContent = (
            await r.json()
          ).error;
          return;
        }
        const p = await r.json();
        await refreshProjects();
        el.close();
        await switchProject(p.id);
      };
  }
  function drawRail() {
    const rail = document.querySelector(".rail");
    if (!rail) return;
    const signature = JSON.stringify({
      projects: projects.map(({ revision, ...p }) => p),
      openIds,
      projectId,
    });
    if (rail.querySelector("#project-rail")?.dataset.signature === signature)
      return;
    rail.querySelector("#project-rail")?.remove();
    const box = document.createElement("nav");
    box.id = "project-rail";
    box.dataset.signature = signature;
    box.setAttribute("aria-label", "Proyectos abiertos");
    box.innerHTML = `<div class="rail-caption">PROYECTOS</div>${openIds
      .map((id) => projects.find((p) => p.id === id))
      .filter(Boolean)
      .map(
        (p) =>
          `<div class="project-tab ${p.id === projectId ? "active" : ""}"><button data-project="${p.id}" title="${esc(p.title)}${p.description ? " — " + esc(p.description) : ""}" aria-label="Abrir ${esc(p.title)}"><span class="project-initials">${esc(p.title.slice(0, 2).toUpperCase())}</span><span class="project-name">${esc(p.title)}</span></button><button class="close-project" data-close-project="${p.id}" title="Cerrar pestaña" aria-label="Cerrar pestaña ${esc(p.title)}">×</button><span role="tooltip" class="project-tooltip"><b>${esc(p.title)}</b><span>${esc(p.description || "Sin descripción")}</span></span></div>`,
      )
      .join(
        "",
      )}${iconButton("browse-projects", "plus", "Abrir o crear proyectos")}`;
    rail.querySelector(".brand").after(box);
    box.querySelector("#browse-projects").onclick = projectPicker;
    box
      .querySelectorAll("[data-project]")
      .forEach((b) => (b.onclick = () => switchProject(b.dataset.project)));
    box.querySelectorAll("[data-close-project]").forEach(
      (b) =>
        (b.onclick = async () => {
          const id = b.dataset.closeProject;
          if (openIds.length === 1) return projectPicker();
          if (id === projectId) {
            await switchProject(openIds.find((p) => p !== id));
            if (projectId === id) return;
          }
          openIds = openIds.filter((p) => p !== id);
          persistTabs();
          drawRail();
        }),
    );
  }
  function securityDialog() {
    const el = dialog(
      `<div class="dialog-heading"><h2>Seguridad de la sesión local</h2><button class="button" data-dismiss>Cerrar</button></div><form id="security-form"><label class="check-label"><input id="security-enabled" type="checkbox" ${securityEnabled ? "checked" : ""}> Pedir clave de edición a otros dispositivos</label><label>Nueva clave<input id="security-code" type="password" minlength="4" maxlength="128" autocomplete="new-password" placeholder="Deja vacío para conservar la actual"></label><label class="check-label"><input id="chat-enabled" type="checkbox" ${chatEnabled ? "checked" : ""}> Habilitar chat</label><label class="check-label"><input id="registered-only" type="checkbox" ${requireRegistered ? "checked" : ""}> Solo usuarios registrados</label><p>Este PC anfitrión puede configurar y editar sin clave. Con seguridad desactivada, los equipos de la red pueden editar.</p><button class="button dark">Guardar configuración</button><p role="status"></p></form>`,
    );
    el.querySelector("[data-dismiss]").onclick = () => el.close();
    el.querySelector("form").onsubmit = async (e) => {
      e.preventDefault();
      const value = el.querySelector("#security-code").value;
      const r = await request("/api/security", {
        method: "PUT",
        body: JSON.stringify({
          enabled: el.querySelector("#security-enabled").checked,
          chatEnabled: el.querySelector("#chat-enabled").checked,
          requireRegistered: el.querySelector("#registered-only").checked,
          ...(value ? { code: value } : {}),
        }),
      });
      if (!r.ok) {
        el.querySelector("[role=status]").textContent = (await r.json()).error;
        return;
      }
      el.close();
      await sync(true);
    };
  }
  function decorate() {
    document.querySelector("#network-controls")?.remove();
    const box = document.createElement("div");
    box.id = "network-controls";
    box.className = "network-controls";
    box.innerHTML = `<span>SESIÓN LOCAL · ${securityEnabled ? "CON CLAVE" : "ABIERTA"}</span>${isHost ? iconButton("security-settings", "settings", "Seguridad y chat") : securityEnabled ? '<button id="access-code" class="button">' + (canEdit ? "Cambiar acceso" : "Entrar a editar") + "</button>" : ""}<button id="identity-button" class="button">${esc(sessionStorage.getItem("gordostage-display-name") || "Identificarme")}</button>${conflict ? '<button id="reload-project" class="button">Cargar versión del servidor</button>' : ""}`;
    document.querySelector("main").prepend(box);
    box
      .querySelector("#security-settings")
      ?.addEventListener("click", securityDialog);
    box.querySelector("#identity-button").onclick = () =>
      window.dispatchEvent(new Event("gordostage-identify"));
    const login = box.querySelector("#access-code");
    if (login)
      login.onclick = async () => {
        const value = prompt("Clave de edición (vacío para solo lectura):");
        if (value === null) return;
        code = value;
        sessionStorage.setItem("stagecraft-edit-code", code);
        await sync(true);
      };
    const reload = box.querySelector("#reload-project");
    if (reload)
      reload.onclick = async () => {
        if (
          !confirm(
            "¿Reemplazar los cambios pendientes por la versión del servidor?",
          )
        )
          return;
        pending = false;
        conflict = false;
        await sync(true);
      };
    if (!canEdit || !connected || conflict)
      document
        .querySelectorAll(
          "main input:not([type=file]):not(#symbol-search),main textarea,.equipment-panel select,[data-add],[data-remove],#add-channel,#delete-item,#import,[data-edit]",
        )
        .forEach((e) => (e.disabled = true));
    drawRail();
    status();
    window.dispatchEvent(
      new CustomEvent("gordostage-access", { detail: access() }),
    );
  }
  async function sync(force = false) {
    const id = projectId;
    try {
      const r = await request("/api/project", {
        headers: { "x-known-revision": force ? "" : String(revision) },
      });
      if (!r.ok) throw Error();
      const remote = await r.json();
      if (id !== projectId || busy) return;
      const redraw =
        force ||
        remote.sessionExpired ||
        !connected ||
        canEdit !== remote.canEdit ||
        revision !== remote.revision ||
        securityEnabled !== remote.securityEnabled ||
        chatEnabled !== remote.chatEnabled;
      connected = true;
      canEdit = remote.canEdit;
      isHost = remote.isHost;
      securityEnabled = remote.securityEnabled;
      chatEnabled = remote.chatEnabled;
      requireRegistered = remote.requireRegistered;
      sessionExpired = remote.sessionExpired;
      if (pending && remote.revision !== revision) conflict = true;
      else if (!pending && (force || remote.revision !== revision)) {
        revision = remote.revision;
        if (remote.document) setState(remote.document);
      }
      if (!remote.document && !remote.unchanged && canEdit && !pending)
        pending = true;
      if (redraw) {
        render();
        decorate();
      } else status();
      if (pending && !conflict && canEdit) await flush();
    } catch {
      connected = false;
      decorate();
    }
  }
  async function flush() {
    if (busy) {
      for (let wait = 0; busy && wait < 100; wait++)
        await new Promise((resolve) => setTimeout(resolve, 25));
      if (busy) return;
    }
    if (busy || !pending || conflict || !canEdit || !connected) return;
    busy = true;
    const snapshot = JSON.stringify(getState()),
      id = projectId;
    try {
      const r = await request("/api/project", {
        method: "PUT",
        body: JSON.stringify({ revision, document: JSON.parse(snapshot) }),
      });
      if (id !== projectId) return;
      if (r.status === 409) {
        conflict = true;
        render();
        decorate();
        return;
      }
      if (!r.ok) throw Error();
      revision = (await r.json()).revision;
      pending = JSON.stringify(getState()) !== snapshot;
      status();
      await refreshProjects();
    } catch {
      connected = false;
      decorate();
    } finally {
      busy = false;
      if (pending && connected && !conflict) timer = setTimeout(flush, 200);
    }
  }
  const changed = () => {
    pending = true;
    clearTimeout(timer);
    timer = setTimeout(flush, 350);
    status();
  };
  try {
    const r = await fetch("/api/projects");
    if (!r.ok || !r.headers.get("content-type")?.includes("application/json"))
      return null;
    const body = await r.json();
    projects = body.projects;
    if (!projects.some((p) => p.id === projectId)) projectId = "default";
    openIds = Array.isArray(openIds)
      ? [...new Set(openIds)].filter((id) => projects.some((p) => p.id === id))
      : [];
    if (!openIds.includes(projectId)) openIds.push(projectId);
  } catch {
    return null;
  }
  await sync(true);
  await refreshProjects();
  persistTabs();
  const connect = () => {
    const socket = new WebSocket(
      `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/live`,
    );
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "chat") {
          window.dispatchEvent(
            new CustomEvent("stagecraft-chat", { detail: message.projectId }),
          );
          return;
        }
        if (message.type === "projects") {
          refreshProjects();
          return;
        }
        if (message.type === "assets") {
          window.dispatchEvent(new Event("gordostage-assets"));
          return;
        }
        if (message.type === "security") {
          if (!busy) sync(true);
          return;
        }
        if (message.projectId && message.projectId !== projectId) {
          refreshProjects();
          return;
        }
      } catch {}
      if (!busy) sync();
    };
    socket.onopen = () => sync();
    socket.onclose = () => {
      connected = false;
      decorate();
      setTimeout(connect, 2000);
    };
  };
  connect();
  setInterval(() => {
    if (!busy) {
      sync();
      refreshProjects();
    }
  }, 5000);
  window.addEventListener("beforeunload", (e) => {
    if (pending) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  return {
    changed,
    decorate,
    access,
    request,
    switchProject,
    projectPicker,
    securityDialog,
    listProjects: () => projects,
    resync: () => sync(true),
    refreshProjects,
    createProject: async (document) => {
      const r = await request("/api/projects", {
        method: "POST",
        body: JSON.stringify({ document }),
      });
      if (!r.ok) throw Error((await r.json()).error);
      const p = await r.json();
      await refreshProjects();
      await switchProject(p.id);
    },
    exportProject: async (id) => {
      const r = await request("/api/project", {
        headers: { "x-project-id": id },
      });
      if (!r.ok) throw Error("No se pudo exportar");
      return (await r.json()).document;
    },
  };
}
