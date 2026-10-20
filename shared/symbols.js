import { GORDOSTAGE_CATALOG } from "./gordostage-catalog.js";
export const LEGACY_ALIASES = { voice:"vocal_mic_wired", guitar:"electric_guitar", bass:"bass_guitar", drums:"acoustic_drum_kit", keys:"single_keyboard_rig", monitor:"wedge_monitor", amp:"electric_guitar_amp", di:"active_di_box" };
export const COMMON_SYMBOL_IDS = ["vocal_mic_wired", "electric_guitar", "bass_guitar", "acoustic_drum_kit", "single_keyboard_rig", "wedge_monitor", "electric_guitar_amp", "active_di_box"];
export function symbolSource(id, style = "original", theme = "claro") {
  const view = style === "cenital" ? "cenital" : "original";
  const variant = ["oscuro", "neon"].includes(theme) ? "oscuro" : "claro";
  return `/symbols/gordostage/${view}/${variant}/${id}.svg`;
}
export const SYMBOLS = GORDOSTAGE_CATALOG.map(symbol => ({ ...symbol, family: "gordostage", src: symbolSource(symbol.id) }));
const byId = new Map(SYMBOLS.map(symbol => [symbol.id, symbol]));
export function getOriginalSymbol(id) { return byId.get(LEGACY_ALIASES[id] || id); }
export function getSymbol(id, style = "original", theme = "claro") {
  const symbol = getOriginalSymbol(id);
  if (!symbol) return;
  const src = symbolSource(symbol.id, style, theme);
  return src === symbol.src ? symbol : { ...symbol, src };
}
export const ALL_SYMBOLS = SYMBOLS;
export const SYMBOL_CATEGORIES = [...new Set(SYMBOLS.map(symbol => symbol.category))];
export const symbolSearchText = symbol => `${symbol.label} ${symbol.id} ${symbol.category}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
