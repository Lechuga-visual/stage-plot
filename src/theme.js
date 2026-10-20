export function setTheme(theme) {
  const value = ["neon", "warm"].includes(theme) ? theme : "neon";
  document.documentElement.dataset.theme = value;
  localStorage.setItem("gordostage-theme", value);
}
setTheme(localStorage.getItem("gordostage-theme") || "neon");
