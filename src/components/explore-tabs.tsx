import { Link } from "@tanstack/react-router";

const TABS = [
  { key: "map", to: "/map", label: "แผนที่" },
  { key: "ideas", to: "/marketplace", label: "ไอเดีย" },
] as const;

/**
 * สลับระหว่างสองหน้าของแท็บ "สำรวจ" — เป็นลิงก์จริงสองอัน ตัวที่เปิดอยู่มี aria-current="page"
 * (ไม่ใช้ ARIA tabs เพราะแต่ละหน้าเป็นเส้นทางของตัวเอง) แต่ละปุ่มสูง ≥ 48px
 */
export function ExploreTabs({ current }: { current: "map" | "ideas" }) {
  return (
    <nav
      aria-label="มุมมองสำรวจ"
      className="mb-5 flex rounded-[18px] border border-[#E6E3F2] bg-sky-soft p-1"
    >
      {TABS.map((t) => {
        const active = t.key === current;
        return (
          <Link
            key={t.key}
            to={t.to}
            aria-current={active ? "page" : undefined}
            className={`tap flex min-h-12 flex-1 items-center justify-center rounded-[14px] px-4 text-body font-semibold ${
              active ? "bg-primary text-white shadow-sm" : "text-ink"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
