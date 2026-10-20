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
    channelLabels: [],
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
export function inputSides(input) {
  return input.signal === "custom"
    ? (input.channelLabels || []).map((_, n) => `C${n + 1}`)
    : input.signal === "stereo"
      ? ["L", "R"]
      : ["M"];
}
export function inputSource(input, side) {
  return input.signal === "custom"
    ? input.channelLabels[Number(side.slice(1)) - 1] ||
        `${input.name} ${Number(side.slice(1))}`
    : input.name + (side === "M" ? "" : " " + side);
}
export function signalLabel(input, side) {
  return input.signal === "custom"
    ? `Personalizado ${side.slice(1)} / ${input.channelLabels.length}`
    : input.signal === "stereo"
      ? `Estéreo ${side}`
      : "Mono";
}
const linkKey = (link) => `${link.itemId}:${link.inputId}:${link.side}`;
export function reconcileInputs(project) {
  const expected = new Map();
  for (const item of project.items)
    for (const input of technical(item).inputs)
      for (const side of inputSides(input)) {
        const link = { itemId: item.id, inputId: input.id, side };
        const values = {
          source: inputSource(input, side),
          mic: input.microphone,
          stand: input.stand,
          notes: input.notes,
          c_signal: signalLabel(input, side),
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
    const fallbackSides =
      { M: ["L", "C1"], L: ["M", "C1"], R: ["C2"], C1: ["M", "L"], C2: ["R"] }[
        row._link.side
      ] || [];
    const entry =
      expected.get(key) ||
      fallbackSides
        .map((side) => expected.get(linkKey({ ...row._link, side })))
        .find(Boolean);
    if (!entry) return [];
    expected.delete(linkKey(entry.link));
    return [update(row, entry)];
  });
  for (const entry of expected.values()) {
    const row = update({}, entry);
    const predecessor =
      entry.link.side === "R"
        ? "L"
        : /^C[2-9]$|^C[1-6][0-9]$/.test(entry.link.side)
          ? `C${Number(entry.link.side.slice(1)) - 1}`
          : null;
    const leftIndex = predecessor
      ? project.channels.findIndex(
          (c) =>
            c._link?.itemId === entry.link.itemId &&
            c._link.inputId === entry.link.inputId &&
            c._link.side === predecessor,
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
    if (field === "source" && input.signal === "custom")
      input.channelLabels[Number(row._link.side.slice(1)) - 1] = value;
    else if (key)
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
