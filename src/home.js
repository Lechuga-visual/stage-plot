import { esc, icon } from "./ui.js";
import { manageProfiles } from "./identity.js";
import { setTheme } from "./theme.js";
import { normalizeProject, exportProject } from "../shared/project.js";
export function mountHome({ api, visible, showHome }) {
  document.querySelector(".brand").onclick = (e) => {
    e.preventDefault();
    showHome();
  };
  document.body.classList.toggle("on-home", visible);
  document.querySelector("main").hidden = visible;
  document.querySelector("#welcome-page")?.remove();
  if (!visible) return;
  const section = document.createElement("section");
  section.id = "welcome-page";
  const projects = api?.listProjects() || [];
  section.innerHTML = `<div class="welcome-intro"><span class="eyebrow">CASA · OFICINA · DIRECTO</span><h1>Todo listo para el próximo show.</h1><p>Abre un proyecto, prepara el montaje y coordina al equipo.</p><div id="welcome-network" class="server-network welcome-network" hidden></div></div><div class="welcome-actions"><button class="welcome-action" id="home-projects" ${!api ? "disabled" : ""}>${icon("folder")}<b>Abrir o crear proyecto</b><span>Disponibles para todos los puestos de la red</span></button><button class="welcome-action" id="home-import" ${!api?.access().canEdit ? "disabled" : ""}>${icon("upload")}<b>Importar proyecto</b><span>Archivo JSON editable de otro equipo</span></button><button class="welcome-action" id="home-security" ${!api?.access().isHost ? "disabled" : ""}>${icon("settings")}<b>Configuración y permisos</b><span>${api?.access().isHost ? "Seguridad opcional y acceso al chat" : "Disponible solo en el PC anfitrión"}</span></button><button class="welcome-action" id="home-users" ${!api?.access().isHost ? "disabled" : ""}>${icon("person")}<b>Usuarios y puestos</b><span>${api?.access().isHost ? "Registro, permisos de edición y lectura" : "Disponible solo en el PC anfitrión"}</span></button></div><div class="welcome-section-heading"><h2>Proyectos disponibles <small>${projects.length}</small></h2><label>Tema<select id="theme-select"><option value="neon" ${document.documentElement.dataset.theme === "neon" ? "selected" : ""}>Neón · oscuro</option><option value="warm" ${document.documentElement.dataset.theme === "warm" ? "selected" : ""}>GordoStage · claro</option></select></label></div><div class="welcome-projects">${projects.map((p) => `<article><span class="project-card-mark">${esc(p.title.slice(0, 2).toUpperCase())}</span><div><h3>${esc(p.title)}</h3><p>${esc(p.description || "Agrega una descripción para identificar este montaje.")}</p></div><div class="project-card-actions"><button class="button dark" data-home-open="${p.id}">Abrir</button><button class="button" data-home-export="${p.id}">Exportar JSON</button></div></article>`).join("") || "<p>Conectando con el servidor…</p>"}</div><input id="home-import-file" hidden type="file" accept="application/json"><p id="home-error" role="status"></p><p class="welcome-local-note">La elección de proyecto y tema es independiente en cada dispositivo. Para administrar el servidor, abre esta página desde el PC anfitrión.</p>`;
  document.querySelector("header").after(section);
  section.querySelector("#theme-select").onchange = (e) =>
    setTheme(e.target.value);
  section.querySelector("#home-projects").onclick = () => api.projectPicker();
  section.querySelector("#home-security").onclick = () => api.securityDialog();
  section.querySelector("#home-users").onclick = manageProfiles;
  section
    .querySelectorAll("[data-home-open]")
    .forEach((b) => (b.onclick = () => api.switchProject(b.dataset.homeOpen)));
  section.querySelectorAll("[data-home-export]").forEach(
    (b) =>
      (b.onclick = async () => {
        try {
          const document = await api.exportProject(b.dataset.homeExport);
          if (!document)
            throw Error("El proyecto todavía no tiene contenido guardado");
          const url = URL.createObjectURL(
            new Blob([exportProject(document)], { type: "application/json" }),
          );
          const a = document.createElement("a");
          a.href = url;
          a.download =
            (document.band || "GordoStage").replace(/[^\p{L}\p{N}_-]/gu, "_") +
            ".json";
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (error) {
          section.querySelector("#home-error").textContent = error.message;
        }
      }),
  );
  section.querySelector("#home-import").onclick = () =>
    section.querySelector("#home-import-file").click();
  section.querySelector("#home-import-file").onchange = async (e) => {
    try {
      const document = normalizeProject(
        JSON.parse(await e.target.files[0].text()),
      );
      await api.createProject(document);
    } catch (error) {
      section.querySelector("#home-error").textContent =
        error.message || "No se pudo importar el proyecto";
    }
  };
}
