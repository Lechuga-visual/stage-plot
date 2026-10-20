export const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const paths = {
  volume: "M3 9h4l5-5v16l-5-5H3V9zm12-2a7 7 0 010 10m3-13a11 11 0 010 16",
  mute: "M3 9h4l5-5v16l-5-5H3V9zm13 0 5 6m0-6-5 6",
  move: "M4 3l6 16 2-7 7-2L4 3z",
  pen: "M4 20l4-1L20 7l-4-4L4 15v5zm10-15 4 4",
  comment: "M4 4h16v12H9l-5 4V4z",
  eraser: "M3 14l10-10 7 7-9 9H8l-5-6zm5-5 8 8M12 20h9",
  delete: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7m4-7v7",
  cable: "M5 3v5a4 4 0 004 4h6a4 4 0 010 8h-3M3 3h4M4 1v2m2-2v2",
  undo: "M8 4L3 9l5 5M3 9h11a6 6 0 010 12",
  plus: "M12 4v16M4 12h16",
  upload: "M12 16V3m-5 5 5-5 5 5M4 14v6h16v-6",
  chat: "M3 4h18v13H9l-6 4V4zm4 5h10M7 13h7",
  settings: "M4 7h16M4 17h16M9 4v6m6 4v6",
  close: "M5 5l14 14M19 5 5 19",
  minimize: "M5 12h14",
  folder: "M3 6h7l2 3h9v12H3V6z",
  person: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0",
};
export const icon = (name) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[name] || paths.folder}"/></svg>`;
export const iconButton = (id, name, label, attrs = "") =>
  `<button id="${id}" type="button" class="icon-button" title="${esc(label)}" aria-label="${esc(label)}" ${attrs}>${icon(name)}</button>`;
export function dialog(html) {
  document.querySelector("#workspace-dialog")?.remove();
  const el = document.createElement("dialog");
  el.id = "workspace-dialog";
  el.innerHTML = html;
  document.body.append(el);
  el.showModal();
  el.addEventListener("close", () => el.remove());
  return el;
}
