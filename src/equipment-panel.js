import {
  technical,
  POWER_OPTIONS,
  powerLabel,
  newInput,
  ensureTechnicalColumns,
  reconcileInputs,
} from "../shared/equipment.js";
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function refreshChannelCells(state, except) {
  document.querySelectorAll("[data-channel]").forEach((el) => {
    if (el !== except)
      el.value = state.channels[+el.dataset.channel]?.[el.dataset.field] || "";
  });
}
export function mountEquipment({ state, selected, save, render }) {
  const item = state.items.find((item) => item.id === selected);
  if (item) {
    const t = technical(item),
      panel = document.createElement("section");
    panel.className = "equipment-panel";
    const unlinked = state.channels
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => !row._link);
    panel.innerHTML = `<div class="section-label">DATOS TÉCNICOS · ${esc(item.label)}</div><h2>Equipo e input list</h2><p>Configura entradas independientes para este equipo. Cada entrada estéreo ocupa dos canales: L y R.</p><div class="equipment-power"><label>Alimentación del equipo<select data-edit id="equipment-power">${Object.entries(
      POWER_OPTIONS,
    )
      .map(
        ([key, label]) =>
          `<option value="${key}" ${t.power === key ? "selected" : ""}>${label}</option>`,
      )
      .join(
        "",
      )}</select></label><label>Detalle de alimentación<input data-edit id="power-notes" maxlength="2000" value="${esc(t.powerNotes)}" placeholder="230 V · enchufe al lado del teclado"></label></div><div class="equipment-inputs">${t.inputs
      .map(
        (input, n) =>
          `<fieldset><legend>Entrada ${n + 1}</legend><div class="technical-grid"><label>Fuente<input data-edit data-input-id="${input.id}" data-technical-field="name" value="${esc(input.name)}" maxlength="1000"></label><label>Micrófono / DI<input data-edit data-input-id="${input.id}" data-technical-field="microphone" value="${esc(input.microphone)}" maxlength="1000" placeholder="SM57, DI activa…"></label><label>Señal<select data-edit data-input-id="${input.id}" data-technical-field="signal"><option value="mono" ${input.signal === "mono" ? "selected" : ""}>Mono · 1 canal</option><option value="stereo" ${input.signal === "stereo" ? "selected" : ""}>Estéreo · 2 canales L/R</option></select></label><label>Pie / soporte<input data-edit data-input-id="${input.id}" data-technical-field="stand" value="${esc(input.stand)}" maxlength="1000"></label><label>Phantom 48 V<select data-edit data-input-id="${input.id}" data-technical-field="phantom"><option value="false" ${!input.phantom ? "selected" : ""}>No</option><option value="true" ${input.phantom ? "selected" : ""}>Sí</option></select></label><label>Notas de entrada<input data-edit data-input-id="${input.id}" data-technical-field="notes" value="${esc(input.notes)}" maxlength="10000"></label></div><div class="input-footer"><span>Canales ${state.channels
            .map((row, index) =>
              row._link?.itemId === item.id && row._link?.inputId === input.id
                ? index + 1
                : null,
            )
            .filter(Boolean)
            .join(
              " / ",
            )}</span><button class="button" data-edit data-unlink-input="${input.id}">Desvincular y conservar canales</button><button class="button danger" data-edit data-delete-input="${input.id}">Eliminar entrada y canales</button></div></fieldset>`,
      )
      .join(
        "",
      )}</div><div class="equipment-actions"><button class="button" data-edit id="create-input">+ Crear entrada vinculada</button><label>Usar canal existente<select data-edit id="existing-channel"><option value="">Selecciona un canal…</option>${unlinked.map(({ row, index }) => `<option value="${index}">CH ${index + 1} · ${esc(row.source || "Sin nombre")}</option>`).join("")}</select></label><button class="button" data-edit id="link-channel">Vincular canal</button></div>`;
    document.querySelector(".item-editor").after(panel);
    const setPower = () => {
      t.power = panel.querySelector("#equipment-power").value;
      t.powerNotes = panel.querySelector("#power-notes").value;
      save();
      refreshChannelCells(state);
    };
    panel.querySelector("#equipment-power").onchange = () => {
      setPower();
      render();
    };
    panel.querySelector("#power-notes").oninput = setPower;
    panel.querySelector("#power-notes").onchange = render;
    const addInput = (row, index) => {
      if (t.inputs.length >= 64 || (!row && state.channels.length >= 500))
        return alert("Límite de entradas o canales alcanzado");
      ensureTechnicalColumns(state);
      const input = newInput(row?.source || item.label);
      if (row) {
        input.microphone = row.mic || "";
        input.stand = row.stand || "";
        input.notes = row.notes || "";
        row._link = { itemId: item.id, inputId: input.id, side: "M" };
      }
      t.inputs.push(input);
      save();
      render();
    };
    panel.querySelector("#create-input").onclick = () => addInput();
    panel.querySelector("#link-channel").onclick = () => {
      const value = panel.querySelector("#existing-channel").value;
      if (value === "") return;
      const row = state.channels[+value];
      if (row && !row._link) addInput(row, +value);
    };
    panel.querySelectorAll("[data-technical-field]").forEach((el) => {
      const update = () => {
        const input = t.inputs.find((input) => input.id === el.dataset.inputId);
        const field = el.dataset.technicalField;
        if (
          field === "signal" &&
          el.value === "stereo" &&
          input.signal === "mono" &&
          state.channels.length >= 500
        ) {
          el.value = input.signal;
          alert("Máximo 500 canales");
          return;
        }
        input[field] = field === "phantom" ? el.value === "true" : el.value;
        save();
        refreshChannelCells(state);
      };
      if (el.tagName === "SELECT")
        el.onchange = () => {
          update();
          render();
        };
      else {
        el.oninput = update;
        el.onchange = render;
      }
    });
    panel.querySelectorAll("[data-delete-input]").forEach(
      (button) =>
        (button.onclick = () => {
          if (!confirm("¿Eliminar esta entrada y sus canales vinculados?"))
            return;
          t.inputs = t.inputs.filter(
            (input) => input.id !== button.dataset.deleteInput,
          );
          save();
          render();
        }),
    );
    panel.querySelectorAll("[data-unlink-input]").forEach(
      (button) =>
        (button.onclick = () => {
          state.channels.forEach((row) => {
            if (
              row._link?.itemId === item.id &&
              row._link.inputId === button.dataset.unlinkInput
            )
              delete row._link;
          });
          t.inputs = t.inputs.filter(
            (input) => input.id !== button.dataset.unlinkInput,
          );
          save();
          render();
        }),
    );
  }
  const summary = document.createElement("section");
  summary.className = "equipment-summary";
  const configured = state.items.filter(
    (item) =>
      technical(item).power !== "none" ||
      technical(item).inputs.length ||
      technical(item).powerNotes,
  );
  if (configured.length) {
    summary.innerHTML = `<h2>Equipos y requerimientos técnicos</h2>${configured
      .map(
        (item) =>
          `<article><b>${esc(item.label)}</b><p>Alimentación: ${esc(powerLabel(item))}</p>${technical(
            item,
          )
            .inputs.map(
              (input) =>
                `<p>${esc(input.name)} · ${input.signal === "stereo" ? "Estéreo L/R" : "Mono"} · ${esc(input.microphone || "Micrófono / DI por definir")} · Phantom: ${input.phantom ? "48 V" : "No"}</p>`,
            )
            .join("")}</article>`,
      )
      .join("")}`;
    document.querySelector(".notes").before(summary);
  }
}
