import { validateImage } from "./assets.js";
import { reconcileInputs, POWER_OPTIONS, inputSides } from "./equipment.js";
import { getSymbol } from "./symbols.js";
export const FORMAT_VERSION = 5;
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
const validTechnical = (t) =>
  !!t &&
  Object.hasOwn(POWER_OPTIONS, t.power) &&
  text(t.powerNotes, 2000) &&
  list(
    t.inputs,
    64,
    (input) =>
      input &&
      /^in_[a-zA-Z0-9_-]+$/.test(input.id) &&
      text(input.name, 1000) &&
      text(input.microphone, 1000) &&
      ["mono", "stereo", "custom"].includes(input.signal) &&
      list(input.channelLabels, 64, (label) => text(label, 1000)) &&
      (input.signal !== "custom" || input.channelLabels.length > 0) &&
      typeof input.phantom === "boolean" &&
      text(input.stand, 1000) &&
      text(input.notes, 10000),
  ) &&
  new Set(t.inputs.map((input) => input.id)).size === t.inputs.length;
const unique = (xs) => new Set(xs).size === xs.length;
export function validProject(s) {
  return (
    !!s &&
    s.formatVersion === FORMAT_VERSION &&
    text(s.band) &&
    text(s.event) &&
    text(s.description, 1000) &&
    ["generic", "x32", "tecrider"].includes(s.symbolStyle) &&
    text(s.notes) &&
    list(
      s.customAssets,
      100,
      (a) =>
        a &&
        /^custom_[0-9a-f]{64}$/.test(a.id) &&
        text(a.label, 100) &&
        validImage(a.dataUrl),
    ) &&
    unique(s.customAssets.map((a) => a.id)) &&
    s.customAssets.reduce((n, a) => n + a.dataUrl.length, 0) <=
      10 * 1024 * 1024 &&
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
        (!!getSymbol(i.type) ||
          s.customAssets.some((asset) => asset.id === i.type)) &&
        text(i.label) &&
        text(i.comment) &&
        validTechnical(i.technical) &&
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
      1000,
      (d) =>
        d &&
        /^#[0-9a-f]{6}$/i.test(d.color) &&
        list(d.points, 2000, point) &&
        d.points.length >= 2 &&
        Number.isFinite(d.opacity) &&
        d.opacity >= 0.05 &&
        d.opacity <= 1 &&
        Number.isFinite(d.width) &&
        d.width >= 1 &&
        d.width <= 40 &&
        ["free", "power", "audio", "multicore", "ethernet", "video"].includes(
          d.kind,
        ) &&
        text(d.label, 120),
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
      s.formatVersion !== 2 &&
      s.formatVersion !== 3 &&
      s.formatVersion !== 4 &&
      s.formatVersion !== 5)
  )
    throw Error("Versión de proyecto no compatible");
  if (
    s.formatVersion !== 2 &&
    s.formatVersion !== 3 &&
    s.formatVersion !== 4 &&
    s.formatVersion !== 5
  ) {
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
  for (const item of s.items || [])
    if (item.technical === undefined)
      item.technical = { power: "none", powerNotes: "", inputs: [] };
  for (const item of s.items || [])
    for (const input of item.technical?.inputs || [])
      input.channelLabels ??= [];
  s.symbolStyle ??= "generic";
  s.description ??= "";
  s.customAssets ||= [];
  if (Array.isArray(s.drawings))
    s.drawings = s.drawings.map((d) => ({
      ...d,
      opacity: d.opacity ?? 1,
      width: d.width ?? 3,
      kind: d.kind ?? "free",
      label: d.label ?? "",
    }));
  s.formatVersion = FORMAT_VERSION;
  if (!validProject(s)) throw Error("Proyecto inválido");
  if (
    s.channels.some(
      (row) => row._link !== undefined && !validLink(s, row._link),
    )
  )
    throw Error("Vínculo de canal inválido");
  const links = s.channels
    .filter((row) => row._link)
    .map((row) => `${row._link.itemId}:${row._link.inputId}:${row._link.side}`);
  if (!unique(links)) throw Error("Canal vinculado duplicado");
  reconcileInputs(s);
  if (
    s.channels.length > 500 ||
    s.channels.some((row) => row._link && !validLink(s, row._link))
  )
    throw Error("Vínculo de canal inválido");
  return s;
}
export function exportProject(s) {
  return JSON.stringify(normalizeProject(s), null, 2);
}

function validLink(project, link) {
  if (
    !link ||
    !Number.isSafeInteger(link.itemId) ||
    typeof link.inputId !== "string" ||
    typeof link.side !== "string" ||
    !/^(M|L|R|C[1-9][0-9]?)$/.test(link.side)
  )
    return false;
  const item = project.items.find((item) => item.id === link.itemId);
  const input = item?.technical?.inputs.find(
    (input) => input.id === link.inputId,
  );
  return !!input && inputSides(input).includes(link.side);
}

function validImage(dataUrl) {
  try {
    validateImage(dataUrl);
    return true;
  } catch {
    return false;
  }
}
