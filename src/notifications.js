let context;
let enabled = localStorage.getItem("gordostage-chat-sound") !== "false";
export const soundEnabled = () => enabled;
export function setSoundEnabled(value) {
  enabled = !!value;
  localStorage.setItem("gordostage-chat-sound", String(enabled));
  if (enabled) unlockAudio();
}
function unlockAudio() {
  if (!enabled) return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    context ||= new Audio();
    if (context.state === "suspended") context.resume().catch(() => {});
  } catch {}
}
// Browsers allow audio after a user gesture, including when visiting over LAN HTTP.
window.addEventListener("pointerdown", unlockAudio, { capture: true });
window.addEventListener("keydown", unlockAudio, { capture: true });
export function notifyMessage() {
  if (!enabled || context?.state !== "running") return;
  try {
    const now = context.currentTime;
    for (const [offset, frequency] of [
      [0, 740],
      [0.12, 988],
    ]) {
      const oscillator = context.createOscillator(),
        gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, now + offset);
      gain.gain.linearRampToValueAtTime(0.065, now + offset + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.15);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now + offset);
      oscillator.stop(now + offset + 0.17);
    }
  } catch {}
}
