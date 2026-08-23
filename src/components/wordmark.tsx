/**
 * แบรนด์ "คนส. Connexts" — กิมมิค: ค-น-ส ↔ C-N-S
 * ตัวอักษรไทยแต่ละตัวมีคู่ละตินกำกับ และในคำ connexts ตัว C N S จะถูกเน้น
 */

const PAIRS = [
  { th: "ค", en: "C" },
  { th: "น", en: "N" },
  { th: "ส", en: "S" },
] as const;

/** ตำแหน่งตัว C, N, S ในคำ connexts */
const CONNEXTS = "connexts".split("");
const HILITE = new Set([0, 2, 7]); // c, n, s

export function Wordmark({
  size = "sm",
  className = "",
}: {
  size?: "sm" | "hero";
  className?: string;
}) {
  const hero = size === "hero";

  return (
    <span className={`inline-flex flex-col ${hero ? "gap-1" : "gap-0"} ${className}`}>
      <span className="flex items-end gap-[0.06em] leading-none">
        {PAIRS.map((p) => (
          <span key={p.en} className="relative inline-flex flex-col items-center leading-none">
            <span
              aria-hidden
              className={`font-extrabold uppercase tracking-[0.08em] text-primary/70 ${
                hero ? "text-[0.24em]" : "text-[0.42em]"
              }`}
            >
              {p.en}
            </span>
            <span className="text-gradient font-extrabold leading-[0.9]">{p.th}</span>
          </span>
        ))}
        <span className="text-gradient font-extrabold leading-[0.9]">.</span>
      </span>

      <span
        className={`flex items-baseline leading-none ${
          hero ? "tracking-tight" : "tracking-tight"
        }`}
      >
        {CONNEXTS.map((ch, i) =>
          HILITE.has(i) ? (
            <span
              key={`${ch}-${i}`}
              className="text-gradient font-extrabold uppercase"
              style={{ fontSize: "1.12em" }}
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
      <span className="sr-only">คนส. Connexts — CNS</span>
    </span>
  );
}
