import { esc, dialog } from "./ui.js";
export const ROLES = [
  "Escenario",
  "FOH",
  "Monitores",
  "Producción",
  "Backline",
  "Iluminación",
  "Vídeo",
  "Booking",
  "Otro",
];
let api;
const notified = new Set();
export function identity() {
  try {
    return JSON.parse(sessionStorage.getItem("gordostage-identity"));
  } catch {
    return null;
  }
}
export function setupIdentity(collaboration) {
  api = collaboration;
  window.addEventListener("gordostage-identify", () => identify());
  window.addEventListener("gordostage-project", (event) => {
    if (!notified.has(event.detail)) {
      notified.add(event.detail);
      identify();
    }
  });
  window.addEventListener("gordostage-access", (event) => {
    if (
      event.detail.sessionExpired &&
      identity() &&
      !document.querySelector("#workspace-dialog")
    ) {
      sessionStorage.removeItem("gordostage-session-token");
      sessionStorage.removeItem("gordostage-identity");
      identify();
    }
  });
}
export async function identify() {
  if (!api) return;
  let profiles = [];
  try {
    profiles = await (await api.request("/api/profiles")).json();
  } catch {}
  const saved = identity();
  const el = dialog(
    `<div class="dialog-heading"><h2>¿Desde dónde participas?</h2><button class="button" data-dismiss>Cerrar</button></div><p>Tu nombre y puesto se usarán automáticamente en el chat y los comentarios.</p><form id="identity-form"><label>Usuario registrado<select id="identity-profile"><option value="">Identificación rápida</option>${profiles.map((p) => `<option value="${p.id}">${esc(p.name)} · ${esc(p.role)} (${p.permission === "viewer" ? "lectura" : "edición"})</option>`).join("")}</select></label><div id="guest-identity"><label>Puesto<select id="identity-role">${ROLES.map((role) => `<option ${saved?.role === role ? "selected" : ""}>${role}</option>`).join("")}</select></label><label>Nombre o alias (opcional)<input id="identity-name" maxlength="60" placeholder="Si lo dejas vacío, se asignará un nombre por puesto"></label></div><label id="profile-pin-label" hidden>PIN del usuario<input id="identity-pin" type="password" maxlength="128" autocomplete="current-password"></label><button class="button dark">Participar</button><p role="status"></p></form>`,
  );
  el.querySelector("[data-dismiss]").onclick = () => el.close();
  el.querySelector("#identity-profile").onchange = (e) => {
    el.querySelector("#guest-identity").hidden = !!e.target.value;
    el.querySelector("#profile-pin-label").hidden = !profiles.find(
      (p) => p.id === e.target.value,
    )?.hasPin;
  };
  el.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    const profileId = el.querySelector("#identity-profile").value;
    const body = profileId
      ? { profileId, pin: el.querySelector("#identity-pin").value }
      : {
          role: el.querySelector("#identity-role").value,
          name: el.querySelector("#identity-name").value,
        };
    const r = await api.request("/api/session", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      el.querySelector("[role=status]").textContent = (await r.json()).error;
      return;
    }
    const session = await r.json();
    sessionStorage.setItem("gordostage-session-token", session.token);
    sessionStorage.setItem(
      "gordostage-identity",
      JSON.stringify({
        name: session.name,
        role: session.role,
        permission: session.permission,
      }),
    );
    sessionStorage.setItem("gordostage-display-name", session.name);
    el.close();
    window.dispatchEvent(new Event("gordostage-identity-changed"));
    await api.resync();
  };
}
export async function manageProfiles() {
  if (!api?.access().isHost) return;
  const profiles = await (await api.request("/api/profiles")).json();
  const el = dialog(
    `<div class="dialog-heading"><h2>Usuarios y permisos</h2><button class="button" data-dismiss>Cerrar</button></div><div class="registered-users">${profiles.map((p) => `<article><b>${esc(p.name)}</b><span>${esc(p.role)} · ${p.permission === "viewer" ? "Solo lectura" : "Edición"}${p.hasPin ? " · con PIN" : ""}</span><button class="button" data-edit-profile="${p.id}">Editar</button><button class="button danger" data-remove-profile="${p.id}">Eliminar</button></article>`).join("") || "<p>Aún no hay usuarios registrados.</p>"}</div><form id="profile-form"><input id="profile-id" type="hidden"><label>Nombre<input id="profile-name" maxlength="60" required></label><label>Puesto<select id="profile-role">${ROLES.map((r) => `<option>${r}</option>`).join("")}</select></label><label>Permiso<select id="profile-permission"><option value="editor">Editar</option><option value="viewer">Solo lectura</option></select></label><label>PIN opcional<input type="password" id="profile-pin" minlength="4" maxlength="128" autocomplete="new-password" placeholder="Vacío: sin PIN al crear, conservar al editar"></label><button class="button dark">Guardar usuario</button><p role="status"></p></form><p>Los usuarios sin PIN se eligen por identificación. Activa “Solo usuarios registrados” y usa PIN si necesitas restringir la participación.</p>`,
  );
  el.querySelector("[data-dismiss]").onclick = () => el.close();
  el.querySelectorAll("[data-edit-profile]").forEach(
    (b) =>
      (b.onclick = () => {
        const p = profiles.find((p) => p.id === b.dataset.editProfile);
        for (const key of ["id", "name", "role", "permission"])
          el.querySelector("#profile-" + key).value = p[key];
      }),
  );
  el.querySelectorAll("[data-remove-profile]").forEach(
    (b) =>
      (b.onclick = async () => {
        if (!confirm("¿Eliminar este usuario registrado?")) return;
        await api.request("/api/profiles/" + b.dataset.removeProfile, {
          method: "DELETE",
        });
        el.close();
        manageProfiles();
      }),
  );
  el.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(
      ["id", "name", "role", "permission", "pin"].map((k) => [
        k,
        el.querySelector("#profile-" + k).value,
      ]),
    );
    if (!body.id) delete body.id;
    const r = await api.request("/api/profiles", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      el.querySelector("[role=status]").textContent = (await r.json()).error;
      return;
    }
    el.close();
    manageProfiles();
  };
}
