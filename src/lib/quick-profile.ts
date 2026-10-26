import type { ProfileInput } from "./store";
import { getSession, type ParticipantSession } from "./session";
import type { Region, User } from "./types";

/** ร่างโปรไฟล์แบบสั้น 3 ขั้น — ช่องอื่นแก้ทีหลังที่ /update */
export type QuickDraft = {
  name: string;
  region: Region | null;
  interests: string[];
  powers_have: string[];
  powers_need: string[];
};

export type QuickStep = 1 | 2 | 3;

export const EMPTY_QUICK_DRAFT: QuickDraft = {
  name: "",
  region: null,
  interests: [],
  powers_have: [],
  powers_need: [],
};

/** ขั้นนี้กรอกพอให้ไปต่อได้หรือยัง (พลังที่อยากได้ไม่บังคับ) */
export function quickStepValid(step: QuickStep, d: QuickDraft): boolean {
  if (step === 1) return d.name.trim().length >= 1 && d.region !== null;
  if (step === 2) return d.interests.length >= 1;
  return d.powers_have.length >= 1;
}

/** ข้อความบอกว่าขั้นนี้ยังขาดอะไร (ใช้เป็นข้อความช่วยใต้ปุ่มเมื่อกดไปต่อไม่ได้) */
export function quickStepHint(step: QuickStep): string {
  if (step === 1) return "ใส่ชื่อและเลือกภาคก่อนนะ";
  if (step === 2) return "เลือกอย่างน้อย 1 เรื่องก่อนนะ";
  return "เลือกพลังที่คุณมีอย่างน้อย 1 อย่างก่อนนะ";
}

/** ค่าเริ่มต้นของช่องที่ไม่ได้ถามเหมือนกับ ProfileForm ยาว; source = qr เมื่อเข้ามาจาก QR */
export function toProfileInput(
  d: QuickDraft,
  session: ParticipantSession | null = getSession(),
): ProfileInput {
  if (d.region === null) throw new Error("quick profile needs a region");
  return {
    name: d.name.trim(),
    region: d.region,
    province: "",
    organization: "อิสระ",
    generation: "Millennial",
    bio: "",
    interests: [...d.interests],
    powers_have: [...d.powers_have],
    powers_need: [...d.powers_need],
    ...(session?.source === "qr" ? { source: "qr" as const } : {}),
  };
}

/** ผู้ใช้จำลองสำหรับโหมดทดสอบ ?dryrun (ใช้เฉพาะตอน dev ไม่เขียนข้อมูลจริง) */
export function dryRunUser(input: ProfileInput): User {
  const now = new Date().toISOString();
  return {
    ...input,
    id: "dryrun",
    avatar: "✨",
    created_at: now,
    source: input.source ?? "direct",
  };
}
