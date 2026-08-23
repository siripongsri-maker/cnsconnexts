/** Client-side "connext" notification sound + haptics. */

const SOUND_KEY = "connext-sound-on";

export function isSoundOn(): boolean {
  if (typeof localStorage === "undefined") return true;
  return localStorage.getItem(SOUND_KEY) !== "off";
}

export function setSoundOn(on: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {
    /* ignore */
  }
}

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** A bright two-tone "ปิ๊ง" bell. */
function chime(audio: AudioContext) {
  const now = audio.currentTime;
  const master = audio.createGain();
  master.gain.value = 0.0001;
  master.connect(audio.destination);
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.35, now + 0.01);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);

  [
    { f: 1318.5, t: 0, g: 1 }, // E6
    { f: 1975.5, t: 0.09, g: 0.7 }, // B6
    { f: 2637, t: 0.09, g: 0.25 }, // E7 shimmer
  ].forEach(({ f, t, g }) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.value = f;
    gain.gain.setValueAtTime(0.0001, now + t);
    gain.gain.exponentialRampToValueAtTime(g, now + t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.9);
    osc.connect(gain).connect(master);
    osc.start(now + t);
    osc.stop(now + t + 1.0);
  });
}

function speakConnext() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    const u = new SpeechSynthesisUtterance("connexts");
    u.lang = "en-US";
    u.rate = 0.95;
    u.pitch = 1.15;
    u.volume = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

/** Plays the signature "connext" + ปิ๊ง notification cue. */
export function playConnext(opts: { speak?: boolean; force?: boolean } = {}) {
  if (!opts.force && !isSoundOn()) return;
  const audio = getCtx();
  if (audio) chime(audio);
  if (opts.speak !== false) setTimeout(speakConnext, 220);
  try {
    navigator.vibrate?.([25, 45, 25]);
  } catch {
    /* ignore */
  }
}

/** Call once from a user gesture so mobile browsers unlock audio. */
export function unlockAudio() {
  const audio = getCtx();
  if (!audio) return;
  const b = audio.createBuffer(1, 1, 22050);
  const src = audio.createBufferSource();
  src.buffer = b;
  src.connect(audio.destination);
  src.start(0);
}
