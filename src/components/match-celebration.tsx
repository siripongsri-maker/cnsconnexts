import { useRef, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Heart, MessageCircle } from "lucide-react";
import { MeadowScene } from "@/components/meadow-scene";
import { Avatar } from "@/components/power-bits";
import type { User } from "@/lib/types";

/**
 * จอฉลองตอนเชื่อมกันสำเร็จ — เต็มจอบนทุ่งหญ้า Avatar ของเรากับเขาลอยมาจากซ้าย/ขวา
 * แล้วเส้นประค่อย ๆ ลากเชื่อมกัน ตามด้วยข้อความ "เชื่อมกันแล้ว!" (ท่าทางทั้งหมดอยู่ใน src/meadow.css
 * ใต้คลาส .meadow-celebrate-* และหยุดเป็นภาพสุดท้ายทันทีเมื่อผู้ใช้ลดการเคลื่อนไหว/เครื่องสเปกต่ำ)
 *
 * ใช้ Radix Dialog: กัก Tab ไว้ใน overlay, Esc ปิดได้, ซ่อนเนื้อหาข้างหลังจากโปรแกรมอ่านหน้าจอ
 * โฟกัสไปที่หัวข้อตอนเปิด และคืนให้ปุ่มที่เปิด overlay ตอนปิด (ยกเว้นตอนกด "คุยกันเลย" ที่ออกจากหน้านี้)
 * ผู้เรียกควรเลิก render คอมโพเนนต์นี้ใน onClose
 */
export function MatchCelebration({
  me,
  other,
  reason,
  connectionId,
  inviteNote,
  onClose,
}: {
  me: User;
  other: User;
  reason: string;
  connectionId: string;
  /** เช่น "ส่งคำชวนเจอแล้ว รอ {ชื่อ} ตอบ" — แสดงใต้เหตุผล (เชื่อมใหม่แล้วส่งคำชวนเจอให้อัตโนมัติ) */
  inviteNote?: string | undefined;
  onClose: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const leavingRef = useRef(false);

  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        {/* ต้องมี Overlay: Radix ล็อกการเลื่อนหน้าข้างหลัง (RemoveScroll) ไว้ที่ Overlay เท่านั้น
            ส่วน Content ถูกลงทะเบียนเป็น shard จึงยังเลื่อนได้บนจอเตี้ย */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-[80] bg-sky-soft" />
        <DialogPrimitive.Content
          aria-modal="true"
          className="meadow-celebrate fixed inset-0 z-[80] overflow-y-auto overflow-x-hidden overscroll-contain bg-sky-soft text-ink focus:outline-none"
          onOpenAutoFocus={(event) => {
            const active = document.activeElement;
            openerRef.current =
              active instanceof HTMLElement && active !== document.body ? active : null;
            event.preventDefault();
            headingRef.current?.focus({ preventScroll: true });
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (leavingRef.current) return;
            const opener = openerRef.current;
            if (opener?.isConnected) opener.focus({ preventScroll: true });
          }}
        >
          <div className="flex min-h-full w-full flex-col">
            {/* ฟ้า + ทุ่งหญ้า: Avatar สองคนลอยมาพบกันกลางฟ้า (ฟ้าส่วนบนยืดกินที่ว่างบนจอสูง) */}
            <div className="relative flex flex-1 flex-col bg-sky" aria-hidden="true">
              <div className="relative z-10 flex min-h-[136px] flex-1 items-center justify-center px-4 pt-[max(1rem,env(safe-area-inset-top))]">
                <Confetti />
                <div className="meadow-celebrate-left relative">
                  <AvatarBadge user={me} />
                </div>
                <div className="relative mx-1 flex h-24 w-[min(7rem,22vw)] shrink items-center justify-center">
                  <span className="meadow-celebrate-line absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-[3px] border-dashed border-primary" />
                  <span className="meadow-celebrate-knot relative grid size-11 place-items-center rounded-full bg-white text-primary shadow-[0_6px_16px_-8px_rgba(43,40,120,0.45)]">
                    <Heart className="size-6" fill="currentColor" strokeWidth={0} />
                  </span>
                </div>
                <div className="meadow-celebrate-right relative">
                  <AvatarBadge user={other} />
                </div>
              </div>
              <MeadowScene variant="celebrate" className="pointer-events-none -mt-16 shrink-0" />
            </div>

            {/* แผ่นข้อความโค้งทับขอบทุ่ง */}
            <div className="relative -mt-6 rounded-t-[28px] bg-sky-soft px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 text-center">
              <div className="meadow-celebrate-text">
                <DialogPrimitive.Title asChild>
                  <h2
                    ref={headingRef}
                    tabIndex={-1}
                    className="font-heading text-display font-bold text-ink focus:outline-none"
                  >
                    เชื่อมกันแล้ว!
                  </h2>
                </DialogPrimitive.Title>
                <DialogPrimitive.Description asChild>
                  <div className="mt-2">
                    <p className="line-clamp-2 break-words text-lead font-semibold text-ink [overflow-wrap:anywhere]">
                      คุณกับ {other.name}
                    </p>
                    {reason && (
                      <p className="mx-auto mt-2 line-clamp-2 max-w-md break-words text-body text-ink-soft [overflow-wrap:anywhere]">
                        {reason}
                      </p>
                    )}
                    {inviteNote && (
                      <p className="mx-auto mt-2 max-w-md break-words text-body font-semibold text-ink [overflow-wrap:anywhere]">
                        {inviteNote}
                      </p>
                    )}
                  </div>
                </DialogPrimitive.Description>
              </div>

              <div className="meadow-celebrate-actions mx-auto flex w-full max-w-sm flex-col gap-3 pt-6">
                <Link
                  to="/connection/$id"
                  params={{ id: connectionId }}
                  className="meadow-btn-primary tap w-full text-center"
                  onClick={(e) => {
                    // เปิดในแท็บใหม่ (กดค้างปุ่มลัด) = ยังอยู่หน้านี้ ปล่อย overlay ไว้
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                    leavingRef.current = true;
                    onClose();
                  }}
                >
                  <MessageCircle className="size-6 shrink-0" aria-hidden="true" />
                  คุยกันเลย
                </Link>
                <button type="button" className="meadow-btn-secondary tap w-full" onClick={onClose}>
                  ไว้ทีหลัง
                </button>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** กรอบขาวรอบ Avatar 96px ให้เด่นบนฟ้า */
function AvatarBadge({ user }: { user: User }) {
  return (
    <div className="rounded-[30px] bg-white p-1.5 shadow-[0_10px_24px_-12px_rgba(43,40,120,0.45)]">
      <Avatar user={user} size={96} />
    </div>
  );
}

/**
 * บล็อกสีเล็ก ๆ (สีตกแต่งของธีม) กระจายออกจากจุดกลางแล้วค้างอยู่รอบสองคน
 * ตำแหน่งสุดท้ายคือภาพนิ่ง เมื่อลดการเคลื่อนไหวจึงยังเห็นเป็นของตกแต่ง
 */
const CONFETTI: { left: number; top: number; color: string; rotate: number; size: number }[] = [
  { left: 8, top: 10, color: "#F2B21B", rotate: -18, size: 12 },
  { left: 43, top: 122, color: "#129E8C", rotate: 24, size: 10 },
  { left: 40, top: 6, color: "#1488D8", rotate: 12, size: 10 },
  { left: 60, top: 12, color: "#F47B20", rotate: -28, size: 12 },
  { left: 57, top: 130, color: "#5DA130", rotate: 16, size: 10 },
  { left: 90, top: 22, color: "#6A2C91", rotate: 32, size: 12 },
];

function Confetti() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 h-[150px] w-[min(360px,100%)] -translate-x-1/2 -translate-y-1/2">
      {CONFETTI.map((c, i) => (
        <span
          key={i}
          className="meadow-celebrate-confetti absolute block rounded-[3px]"
          style={
            {
              left: `${c.left}%`,
              top: c.top,
              width: c.size,
              height: c.size,
              backgroundColor: c.color,
              rotate: `${c.rotate}deg`,
              // จุดเริ่ม: ขยับเข้าหาเส้นเชื่อมตรงกลาง (กล่องสูง 150px จุดกลาง y = 75px)
              "--meadow-confetti-x": `${Math.round((50 - c.left) * 2.4)}px`,
              "--meadow-confetti-y": `${75 - c.top}px`,
              animationDelay: `${480 + i * 40}ms`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
