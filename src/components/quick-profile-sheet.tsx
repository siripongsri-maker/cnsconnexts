import { useRef } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { QuickProfileForm, type QuickProfileFormProps } from "@/components/quick-profile-form";

/**
 * แผ่นล่างถามสั้น ๆ 3 ข้อ — เปิดเมื่อผู้เยี่ยมชมกด "ขอเชื่อมต่อ" หรือ "เริ่มเลย"
 * ส่ง draft/step (+ onChange) มาด้วยเพื่อให้คำตอบไม่หายเมื่อปิดแผ่นแล้วเปิดใหม่
 */
export function QuickProfileSheet({
  open,
  onOpenChange,
  onCloseAutoFocus,
  ...form
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** ตอนแผ่นปิดสนิท — preventDefault() แล้วย้ายโฟกัสเองได้ (เช่น ปุ่มที่เปิดแผ่นหายไปแล้ว) */
  onCloseAutoFocus?: (event: Event) => void;
} & QuickProfileFormProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        ref={contentRef}
        className="meadow-sheet mx-auto max-h-[92dvh] max-w-xl rounded-t-3xl border-border bg-white outline-none"
        onOpenAutoFocus={(event) => {
          // vaul ไม่ย้ายโฟกัสเข้าแผ่นเอง (ปุ่มข้างหลังยังถูกโฟกัสอยู่) — ย้ายไปที่ตัวแผ่น
          // โปรแกรมอ่านจอจะอ่านชื่อแผ่น และไม่โฟกัสช่องกรอกเพื่อไม่ให้แป้นพิมพ์มือถือเด้งขึ้นทันที
          event.preventDefault();
          contentRef.current?.focus({ preventScroll: true });
        }}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DrawerHeader className="pb-0 text-left">
          <DrawerTitle className="font-heading text-title font-semibold leading-snug tracking-normal text-ink">
            บอกเราสั้น ๆ 3 ข้อ
          </DrawerTitle>
          <DrawerDescription className="text-body text-ink-soft">
            ไม่ถึงนาที แล้วไปเจอคนที่ใช่ได้เลย
          </DrawerDescription>
        </DrawerHeader>
        <div
          className="overflow-y-auto overscroll-contain px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4"
          data-vaul-no-drag
        >
          <QuickProfileForm {...form} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
