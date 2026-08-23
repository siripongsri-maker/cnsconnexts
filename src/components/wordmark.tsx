import cnsLogo from "@/assets/cns-logo.png";

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
    th: "text-[clamp(9px,3vw,13px)]",
    en: "text-[clamp(10.5px,3.5vw,15px)]",
    gap: "gap-x-0.5 sm:gap-x-1.5",
  },
  sm: {
    th: "text-[clamp(0.75rem,3.1vw,0.95rem)]",
    en: "text-[clamp(0.88rem,3.8vw,1.2rem)]",
    gap: "gap-x-1.5 sm:gap-x-2",
  },
  md: {
    th: "text-[clamp(0.9rem,3.4vw,1.35rem)]",
    en: "text-[clamp(1.25rem,5.4vw,2.15rem)]",
    gap: "gap-y-0.5",
  },
  hero: {
    th: "text-[clamp(1.25rem,5vw,2.75rem)]",
    en: "text-[clamp(1.7rem,8.4vw,4.25rem)]",
    gap: "gap-y-0.5 sm:gap-y-1",
  },
};

const MARK_SIZE: Record<Size, string> = {
  xs: "h-4 w-4 sm:h-[18px] sm:w-[18px]",
  sm: "h-[18px] w-[18px] sm:h-6 sm:w-6",
  md: "h-7 w-7 sm:h-9 sm:w-9",
  hero: "h-9 w-9 sm:h-12 sm:w-12",
};


export function Wordmark({
  size = "sm",
  className = "",
  withMark = false,
}: {
  size?: Size;
  className?: string;
  /** แสดงโลโก้สัญลักษณ์ CNS ข้างชื่อแบรนด์ */
  withMark?: boolean;
}) {
  const s = SIZES[size];
  const stacked = size === "md" || size === "hero";

  const text = (
    <span
      className={`inline-flex min-w-0 font-display leading-none ${
        stacked ? `flex-col items-start ${s.gap}` : `flex-row items-baseline ${s.gap}`
      } ${withMark ? "" : className}`}
    >
      <span
        aria-hidden
        className={`text-gradient font-extrabold leading-[1.15] tracking-tight ${s.th}`}
      >
        คนส.
      </span>
      <span
        aria-hidden
        className={`flex items-baseline whitespace-nowrap leading-[1.05] tracking-[-0.02em] ${s.en}`}
      >
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
            <span key={`${ch}-${i}`} className="font-extrabold text-ink/85 dark:text-ink">
              {ch}
            </span>
          ),
        )}
      </span>
      <span className="sr-only">คนส. Connexts</span>
    </span>
  );

  if (!withMark) return text;

  return (
    <span
      className={`inline-flex min-w-0 max-w-full items-center gap-1.5 sm:gap-2 ${className}`}
    >
      <img
        src={cnsLogo}
        alt=""
        aria-hidden
        loading="lazy"
        width={816}
        height={816}
        className={`${MARK_SIZE[size]} shrink-0 object-contain`}
      />
      {text}
    </span>
  );
}
