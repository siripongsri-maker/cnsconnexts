import type { TourGroupKey } from "./live-map-layout";
import {
  DEFAULT_CONTROL_STATE,
  type LiveControlState,
  type Speed,
  type ViewMode,
} from "./live-controls";

export const CONTROL_CHANNEL = "kns-live-control";

const SPEEDS: readonly Speed[] = ["slow", "normal", "fast"];
const GROUPS: readonly TourGroupKey[] = ["north", "northeast", "central", "south"];

export function encodeControl(state: LiveControlState): string {
  return JSON.stringify(state);
}

function decodeView(v: unknown): ViewMode | null {
  if (v === undefined) return DEFAULT_CONTROL_STATE.view;
  if (typeof v !== "object" || v === null) return null;
  const { kind, group } = v as { kind?: unknown; group?: unknown };
  if (kind === "country") return { kind: "country" };
  if (kind === "region" && GROUPS.includes(group as TourGroupKey)) {
    return { kind: "region", group: group as TourGroupKey };
  }
  return null;
}

export function decodeControl(raw: unknown): LiveControlState | null {
  if (typeof raw !== "string") return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) return null;
  const d = data as {
    speed?: unknown;
    view?: unknown;
    issue?: unknown;
    motion?: unknown;
    bubbles?: unknown;
  };

  const speed = d.speed === undefined ? DEFAULT_CONTROL_STATE.speed : d.speed;
  if (!SPEEDS.includes(speed as Speed)) return null;

  const view = decodeView(d.view);
  if (view === null) return null;

  const issue = d.issue === undefined ? DEFAULT_CONTROL_STATE.issue : d.issue;
  if (issue !== null && typeof issue !== "string") return null;

  const motion = d.motion === undefined ? DEFAULT_CONTROL_STATE.motion : d.motion;
  if (motion !== "moving" && motion !== "still") return null;

  const bubbles = d.bubbles === undefined ? DEFAULT_CONTROL_STATE.bubbles : d.bubbles;
  if (typeof bubbles !== "boolean") return null;

  return { speed: speed as Speed, view, issue, motion, bubbles };
}

function openChannel(): BroadcastChannel | null {
  try {
    if (typeof BroadcastChannel === "undefined") return null;
    return new BroadcastChannel(CONTROL_CHANNEL);
  } catch {
    return null;
  }
}

export function publishControl(state: LiveControlState): void {
  const message = encodeControl(state);
  const channel = openChannel();
  if (channel) {
    try {
      channel.postMessage(message);
    } catch {
      // ignore; localStorage fallback below
    }
    channel.close();
  }
  try {
    if (typeof window !== "undefined") localStorage.setItem(CONTROL_CHANNEL, message);
  } catch {
    // storage unavailable
  }
}

export function subscribeControl(onState: (s: LiveControlState) => void): () => void {
  const handle = (raw: unknown) => {
    const state = decodeControl(raw);
    if (state) onState(state);
  };

  const channel = openChannel();
  if (channel) channel.onmessage = (e: MessageEvent) => handle(e.data);

  const onStorage = (e: StorageEvent) => {
    if (e.key === CONTROL_CHANNEL) handle(e.newValue);
  };
  const hasWindow = typeof window !== "undefined";
  if (hasWindow) {
    try {
      window.addEventListener("storage", onStorage);
    } catch {
      // ignore
    }
  }

  return () => {
    channel?.close();
    if (hasWindow) {
      try {
        window.removeEventListener("storage", onStorage);
      } catch {
        // ignore
      }
    }
  };
}
