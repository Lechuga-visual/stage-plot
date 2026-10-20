export const POWER_OPTIONS = {
  none: "No requiere",
  mains: "Red eléctrica",
  battery: "Batería / pilas",
  usb: "USB",
};
export function newInput(name = "Nueva fuente") {
  const bytes = new Uint32Array(3);
  globalThis.crypto.getRandomValues(bytes);
  return {
    id: "in_" + Array.from(bytes, (n) => n.toString(16)).join("_"),
    name,
    microphone: "",
    signal: "mono",
    phantom: false,
    stand: "",
    notes: "",
  };
}
export function technical(item) {
  return (item.technical ||= { power: "none", powerNotes: "", inputs: [] });
}
export function powerLabel(item) {
  const t = technical(item);
  return POWER_OPTIONS[t.power] + (t.powerNotes ? " · " + t.powerNotes : "");
}
export function ensureTechnicalColumns(project) {
  for (const [id, label] of [
    ["c_signal", "Señal"],
    ["c_phantom", "48 V"],
    ["c_power", "Alimentación"],
  ])
    if (
      !project.columns.some((c) => c.id === id) &&
      project.columns.length < 20
    ) {
      project.columns.push({ id, label });
      for (const row of project.channels) row[id] = "";
    }
}
const linkKey = (link) => `${link.itemId}:${link.inputId}:${link.side}`;
export function reconcileInputs(project) {
  const expected = new Map();
  for (const item of project.items)
    for (const input of technical(item).inputs)
      for (const side of input.signal === "stereo" ? ["L", "R"] : ["M"]) {
        const link = { itemId: item.id, inputId: input.id, side };
        const values = {
          source: input.name + (side === "M" ? "" : " " + side),
          mic: input.microphone,
          stand: input.stand,
          notes: input.notes,
          c_signal: input.signal === "mono" ? "Mono" : "Estéreo " + side,
          c_phantom: input.phantom ? "Sí · 48 V" : "No",
          c_power: powerLabel(item),
        };
        expected.set(linkKey(link), { link, values });
      }
  const update = (row, entry) => {
    for (const col of project.columns)
      if (!Object.hasOwn(row, col.id)) row[col.id] = "";
    return Object.assign(row, entry.values, { _link: entry.link });
  };
  project.channels = project.channels.flatMap((row) => {
    if (!row._link) return [row];
    const key = linkKey(row._link);
    // Preserve the L/mono row, its patch and its position when changing signal mode.
    const fallbackSide =
      row._link.side === "M" ? "L" : row._link.side === "L" ? "M" : null;
    const entry =
      expected.get(key) ||
      (fallbackSide &&
        expected.get(linkKey({ ...row._link, side: fallbackSide })));
    if (!entry) return [];
    expected.delete(linkKey(entry.link));
    return [update(row, entry)];
  });
  for (const entry of expected.values()) {
    const row = update({}, entry);
    const leftIndex =
      entry.link.side === "R"
        ? project.channels.findIndex(
            (c) =>
              c._link?.itemId === entry.link.itemId &&
              c._link.inputId === entry.link.inputId &&
              c._link.side === "L",
          )
        : -1;
    if (leftIndex >= 0) project.channels.splice(leftIndex + 1, 0, row);
    else project.channels.push(row);
  }
  return project;
}
export function findLinkedInput(project, row) {
  const item = project.items.find((item) => item.id === row._link?.itemId);
  const input = item?.technical?.inputs.find(
    (input) => input.id === row._link.inputId,
  );
  return { item, input };
}
export function updateChannel(project, index, field, value) {
  const row = project.channels[index];
  const { input } = findLinkedInput(project, row);
  if (input) {
    const key = {
      source: "name",
      mic: "microphone",
      stand: "stand",
      notes: "notes",
    }[field];
    if (key)
      input[key] =
        field === "source" && input.signal === "stereo"
          ? value.replace(/ [LR]$/, "")
          : value;
    else if (["c_signal", "c_phantom", "c_power"].includes(field)) return;
    else row[field] = value;
    reconcileInputs(project);
  } else row[field] = value;
}
export function removeChannel(project, index) {
  const row = project.channels[index];
  const { item, input } = findLinkedInput(project, row);
  if (input) {
    item.technical.inputs = item.technical.inputs.filter(
      (i) => i.id !== input.id,
    );
    reconcileInputs(project);
  } else project.channels.splice(index, 1);
}
