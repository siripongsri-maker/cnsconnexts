import type { ReactNode } from "react";
import { Check } from "lucide-react";

/**
 * ปุ่มเลือกแบบกดสลับ (ตัวกรอง / ตัวเลือกในฟอร์ม) — ตัวอักษร 20px สูง ≥ 48px ข้อความยาวตัดบรรทัดได้
 * ตัวที่เลือกอยู่มีเครื่องหมายถูก ไม่พึ่งสีอย่างเดียว
 */
export function ChoicePill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`tap inline-flex min-h-12 max-w-full items-center gap-2 rounded-full border-2 px-4 py-1 text-left text-body font-semibold ${
        active ? "border-primary bg-primary text-white" : "border-[#C9C6E0] bg-white text-ink"
      }`}
    >
      {active && <Check className="h-5 w-5 shrink-0" strokeWidth={3} aria-hidden="true" />}
      {children}
    </button>
  );
}
