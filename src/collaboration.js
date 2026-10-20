// Server authority with revision checks: concurrent edits never overwrite silently.
export async function collaborate({ getState, setState, render }) {
  let revision = 0,
    canEdit = false,
    connected = false,
    pending = false,
    busy = false,
    conflict = false,
    timer;
  let code = sessionStorage.getItem("stagecraft-edit-code") || "";
  const headers = () => ({
    "Content-Type": "application/json",
    "x-edit-code": code,
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
  function decorate() {
    document.querySelector("#network-controls")?.remove();
    const box = document.createElement("div");
    box.id = "network-controls";
    box.className = "network-controls";
    box.innerHTML = `<span>SESIÓN LOCAL</span><button id="access-code" class="button">${canEdit ? "Cambiar acceso" : "Entrar a editar"}</button>${conflict ? '<button id="reload-project" class="button">Cargar versión del servidor</button>' : ""}`;
    document.querySelector("main").prepend(box);
    document.querySelector("#access-code").onclick = async () => {
      const value = prompt(
        "Código de edición mostrado en el PC anfitrión (vacío para solo lectura):",
      );
      if (value === null) return;
      code = value;
      sessionStorage.setItem("stagecraft-edit-code", code);
      await sync(true);
    };
    const reload = document.querySelector("#reload-project");
    if (reload)
      reload.onclick = async () => {
        if (
          !confirm(
            "Se reemplazarán los cambios locales pendientes. ¿Continuar?",
          )
        )
          return;
        pending = false;
        conflict = false;
        await sync(true);
      };
    if (!canEdit || !connected || conflict) {
      document
        .querySelectorAll(
          "main input:not([type=file]),main textarea,[data-add],[data-item],[data-remove],#add-channel,#delete-item,#import,[data-edit]",
        )
        .forEach((e) => (e.disabled = true));
    }
    status();
  }
  async function sync(force = false) {
    try {
      const res = await fetch("/api/project", { headers: headers() });
      if (!res.ok) throw Error();
      const remote = await res.json();
      const redraw =
        force ||
        !connected ||
        canEdit !== remote.canEdit ||
        remote.revision !== revision;
      connected = true;
      canEdit = remote.canEdit;
      if (pending && remote.revision !== revision) {
        conflict = true;
      } else if (!pending && (force || remote.revision !== revision)) {
        revision = remote.revision;
        if (remote.document) setState(remote.document);
      }
      if (!remote.document && canEdit && !pending) {
        pending = true;
      }
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
    if (busy || !pending || conflict || !canEdit || !connected) return;
    busy = true;
    const snapshot = JSON.stringify(getState());
    try {
      const res = await fetch("/api/project", {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({ revision, document: JSON.parse(snapshot) }),
      });
      if (res.status === 409) {
        conflict = true;
        render();
        decorate();
        return;
      }
      if (!res.ok) throw Error();
      revision = (await res.json()).revision;
      pending = JSON.stringify(getState()) !== snapshot;
      status();
    } catch {
      connected = false;
      status();
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
  // A static deployment has no API; retain the standalone editor in that mode.
  try {
    const res = await fetch("/api/project");
    if (
      !res.ok ||
      !res.headers.get("content-type")?.includes("application/json")
    )
      return null;
  } catch {
    return null;
  }
  await sync(true);
  let socket;
  const connect = () => {
    socket = new WebSocket(
      `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/live`,
    );
    socket.onmessage = (event) => {
      try {
        if (JSON.parse(event.data).type === "chat") {
          window.dispatchEvent(new Event("stagecraft-chat"));
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
    if (!busy) sync();
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
    access: () => ({ canEdit, connected, conflict }),
    request: (path, options = {}) =>
      fetch(path, { ...options, headers: headers() }),
  };
}
