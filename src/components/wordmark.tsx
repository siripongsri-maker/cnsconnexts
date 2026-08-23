/**
 * แบรนด์ "คนส. Connexts" — กิมมิค: ค-น-ส ↔ C-N-S
 * ในคำ connexts ตัว C N S จะถูกเน้นให้เชื่อมโยงกับ "คนส."
 */

const CONNEXTS = "connexts".split("");
const HILITE = new Set([0, 2, 7]); // c, n, s

type Size = "xs" | "sm" | "md" | "hero";

/** ขนาดฟอนต์แบบ responsive ในตัวเอง (ไม่พึ่งขนาดจาก parent) */
const SIZES: Record<Size, { th: string; en: string; gap: string }> = {
  xs: {
    th: "text-[13px] sm:text-sm",
    en: "text-[15px] sm:text-base",
    gap: "gap-x-1.5",
  },
  sm: {
    th: "text-[15px] sm:text-base",
    en: "text-[19px] sm:text-xl",
    gap: "gap-x-2",
  },
  md: {
    th: "text-[clamp(1.1rem,5vw,1.5rem)]",
    en: "text-[clamp(1.75rem,9vw,2.5rem)]",
    gap: "gap-y-0.5",
  },
  hero: {
    th: "text-[clamp(2.1rem,11vw,3.25rem)]",
    en: "text-[clamp(2.9rem,15.5vw,4.75rem)]",
    gap: "gap-y-1",
  },
};

export function Wordmark({
  size = "sm",
  className = "",
}: {
  size?: Size;
  className?: string;
}) {
  const s = SIZES[size];
  const stacked = size === "md" || size === "hero";

  return (
    <span
      className={`inline-flex min-w-0 font-display leading-none ${
        stacked ? `flex-col items-start ${s.gap}` : `flex-row items-baseline ${s.gap}`
      } ${className}`}
      aria-hidden
    >
      <span
        className={`text-gradient font-extrabold leading-[1.15] tracking-tight ${s.th}`}
      >
        คนส.
      </span>
      <span className={`flex items-baseline leading-[1.05] tracking-tight ${s.en}`}>
        {CONNEXTS.map((ch, i) =>
          HILITE.has(i) ? (
            <span
              key={`${ch}-${i}`}
              className="text-gradient font-extrabold uppercase"
              style={{ fontSize: "1.1em" }}
            >
              {ch}
            </span>
          ) : (
            <span key={`${ch}-${i}`} className="font-extrabold text-ink/85">
              {ch}
            </span>
          ),
        )}
      </span>
      <span className="sr-only">คนส. Connexts</span>
    </span>
  );
}
