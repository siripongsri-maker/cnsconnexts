/**
 * Live event bus (client-side prototype).
 * ส่งสัญญาณกิจกรรมสด: แมตช์ · ถูกใจ · เชื่อมต่อ · ความคืบหน้าคำมั่นสัญญา
 * ใช้ BroadcastChannel เพื่อให้หลายแท็บ/หลายหน้าจอในงานเห็นพร้อมกัน
 */
import { useEffect, useState } from "react";

export type LiveKind = "match" | "like" | "connect" | "commitment" | "message";

export type LiveEvent = {
  id: string;
  kind: LiveKind;
  title: string;
  detail: string;
  mine: boolean;
  created_at: string;
};

const CHANNEL = "connext-live";
const MAX = 40;

let channel: BroadcastChannel | null = null;
const buffer: LiveEvent[] = [];
const listeners = new Set<(e: LiveEvent) => void>();

function getChannel() {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) return null;
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (ev) => receive(ev.data as LiveEvent);
  }
  return channel;
}

function receive(event: LiveEvent) {
  if (buffer.some((e) => e.id === event.id)) return;
  buffer.unshift(event);
  if (buffer.length > MAX) buffer.length = MAX;
  listeners.forEach((fn) => fn(event));
}

export function emitLive(
  kind: LiveKind,
  title: string,
  detail: string,
  mine = true,
): LiveEvent {
  const event: LiveEvent = {
    id: `lv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    kind,
    title,
    detail,
    mine,
    created_at: new Date().toISOString(),
  };
  receive(event);
  try {
    getChannel()?.postMessage(event);
  } catch {
    /* ignore */
  }
  return event;
}

export function getLiveEvents() {
  return [...buffer];
}

/** ติดตามกิจกรรมสดแบบเรียลไทม์ */
export function useLiveEvents(limit = 12) {
  const [events, setEvents] = useState<LiveEvent[]>([]);

  useEffect(() => {
    getChannel();
    setEvents(getLiveEvents().slice(0, limit));
    const fn = () => setEvents(getLiveEvents().slice(0, limit));
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, [limit]);

  return events;
}
