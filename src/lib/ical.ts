/**
 * สร้างไฟล์ iCal (.ics) และลิงก์ Google Calendar สำหรับคำมั่นสัญญา
 * ทำงานฝั่งเบราว์เซอร์ล้วน ไม่ต้องเชื่อมบัญชีใด ๆ
 */
import { downloadFile, stamp } from "./export";
import type { Commitment } from "./types";

/** ระยะเวลานัดเริ่มต้น 1 ชั่วโมง */
const DURATION_MS = 60 * 60 * 1000;

function utc(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function esc(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (m) => `\\${m}`);
}

export type CalendarEvent = {
  uid: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
};

/** แปลง commitment เป็นอีเวนต์ปฏิทิน (คืน null ถ้ายังไม่มีวันเวลา) */
export function commitmentToEvent(m: Commitment, partnerName?: string): CalendarEvent | null {
  if (!m.follow_up_date) return null;
  const start = new Date(m.follow_up_date);
  if (Number.isNaN(start.getTime())) return null;
  return {
    uid: `${m.id}@konsor-connect`,
    title: `[คนส. Connexts] ${m.action_type}${partnerName ? ` กับ ${partnerName}` : ""}`,
    description: m.description,
    start,
    end: new Date(start.getTime() + DURATION_MS),
  };
}

export function toICS(events: CalendarEvent[]) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//konsor-connect//TH//",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTAMP:${utc(new Date())}`,
      `DTSTART:${utc(e.start)}`,
      `DTEND:${utc(e.end)}`,
      `SUMMARY:${esc(e.title)}`,
      `DESCRIPTION:${esc(e.description)}`,
      "BEGIN:VALARM",
      "TRIGGER:-PT30M",
      "ACTION:DISPLAY",
      "DESCRIPTION:ใกล้ถึงเวลานัด",
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadICS(name: string, events: CalendarEvent[]) {
  downloadFile(`${name}-${stamp()}.ics`, toICS(events), "text/calendar;charset=utf-8");
}

/** ลิงก์เพิ่มลง Google Calendar (เปิดแท็บใหม่) */
export function googleCalendarUrl(e: CalendarEvent) {
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    details: e.description,
    dates: `${utc(e.start)}/${utc(e.end)}`,
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}
