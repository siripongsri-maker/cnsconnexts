import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { QuickProfileForm } from "@/components/quick-profile-form";
import type { User } from "@/lib/types";

/** แผ่นล่างถามสั้น ๆ 3 ข้อ — เปิดเมื่อผู้เยี่ยมชมกด "ขอเชื่อมต่อ" หรือ "เริ่มเลย" */
export function QuickProfileSheet({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (me: User) => void;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="meadow-sheet mx-auto max-h-[92dvh] max-w-xl rounded-t-3xl border-border bg-white">
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
          <QuickProfileForm onSaved={onSaved} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
