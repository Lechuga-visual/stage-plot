export function setTheme(theme) {
  const value = ["neon", "warm"].includes(theme) ? theme : "neon";
  document.documentElement.dataset.theme = value;
  localStorage.setItem("gordostage-theme", value);
  window.dispatchEvent(new Event("gordostage-theme"));
}
setTheme(localStorage.getItem("gordostage-theme") || "neon");
