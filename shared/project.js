export const FORMAT_VERSION = 2;
export const DEFAULT_COLUMNS = [
  { id: "source", label: "Fuente / instrumento" },
  { id: "mic", label: "Micrófono / DI" },
  { id: "stand", label: "Pie" },
  { id: "notes", label: "Notas" },
];
const text = (v, max = 10000) => typeof v === "string" && v.length <= max;
const list = (v, max, check) =>
  Array.isArray(v) && v.length <= max && v.every(check);
const percent = (v) => Number.isFinite(v) && v >= 0 && v <= 100;
const point = (p) => Array.isArray(p) && p.length === 2 && p.every(percent);
const unique = (xs) => new Set(xs).size === xs.length;
export function validProject(s) {
  return (
    !!s &&
    s.formatVersion === FORMAT_VERSION &&
    text(s.band) &&
    text(s.event) &&
    text(s.notes) &&
    [s.width, s.depth].every((n) => Number.isFinite(n) && n >= 2 && n <= 100) &&
    list(
      s.columns,
      20,
      (c) =>
        c &&
        /^c_[a-z0-9_-]+$|^(source|mic|stand|notes)$/.test(c.id) &&
        text(c.label, 100),
    ) &&
    s.columns.length > 0 &&
    unique(s.columns.map((c) => c.id)) &&
    list(
      s.items,
      500,
      (i) =>
        i &&
        Number.isSafeInteger(i.id) &&
        [
          "voice",
          "guitar",
          "bass",
          "drums",
          "keys",
          "monitor",
          "amp",
          "di",
        ].includes(i.type) &&
        text(i.label) &&
        text(i.comment) &&
        percent(i.x) &&
        percent(i.y),
    ) &&
    unique(s.items.map((i) => i.id)) &&
    list(
      s.channels,
      500,
      (c) =>
        c &&
        s.columns.every((col) => Object.hasOwn(c, col.id) && text(c[col.id])),
    ) &&
    list(
      s.drawings,
      200,
      (d) =>
        d &&
        /^#[0-9a-f]{6}$/i.test(d.color) &&
        list(d.points, 2000, point) &&
        d.points.length >= 2,
    ) &&
    list(
      s.positionComments,
      500,
      (c) => c && text(c.text) && percent(c.x) && percent(c.y),
    ) &&
    list(
      s.mountComments,
      500,
      (c) =>
        c && text(c.author, 80) && text(c.text, 2000) && text(c.createdAt, 50),
    )
  );
}
export function normalizeProject(input) {
  // Versionless files are the original Stagecraft format. Never guess future formats.
  const s = structuredClone(input);
  if (
    !s ||
    typeof s !== "object" ||
    (s.formatVersion !== undefined &&
      s.formatVersion !== 1 &&
      s.formatVersion !== 2)
  )
    throw Error("Versión de proyecto no compatible");
  if (s.formatVersion !== 2) {
    s.formatVersion = 2;
    s.columns = structuredClone(DEFAULT_COLUMNS);
    if (!Array.isArray(s.items)) throw Error("Proyecto inválido");
    s.items = s.items.map((item, n) => ({
      ...item,
      id: n + 1,
      comment: typeof item.comment === "string" ? item.comment : "",
    }));
    s.drawings = [];
    s.positionComments = [];
    s.mountComments = [];
  }
  if (!validProject(s)) throw Error("Proyecto inválido");
  return s;
}
export function exportProject(s) {
  return JSON.stringify(normalizeProject(s), null, 2);
}
