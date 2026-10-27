import type { PairSymbol as PairSymbolName } from "@/lib/pair-badge";

/** สัญลักษณ์ใหญ่ ๆ ของคู่ ใช้ currentColor (ตั้งสีขาวจากที่เรียกใช้) */
export function PairSymbol({ symbol, className }: { symbol: PairSymbolName; className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {SHAPES[symbol]}
    </svg>
  );
}

const BLADE = "M0 0 C9 -8 12 -30 5 -44 C2 -48 -2 -48 -5 -44 C-12 -30 -9 -8 0 0 Z";

const SHAPES: Record<PairSymbolName, React.ReactNode> = {
  star: (
    <path d="M50 6 L62.3 36.2 L94.8 38.7 L70 59.8 L77.8 91.3 L50 74 L22.2 91.3 L30 59.8 L5.2 38.7 L37.7 36.2 Z" />
  ),
  heart: (
    <path d="M50 90 C14 62 6 42 6 29 C6 16 16 8 28 8 C38 8 46 14 50 22 C54 14 62 8 72 8 C84 8 94 16 94 29 C94 42 86 62 50 90 Z" />
  ),
  circle: <circle cx="50" cy="50" r="44" />,
  triangle: <path d="M50 8 L95 88 L5 88 Z" />,
  square: <rect x="10" y="10" width="80" height="80" rx="8" />,
  windmill: (
    <>
      <path d="M45 52 L55 52 L58 96 L42 96 Z" />
      <g transform="translate(50 40)">
        {[0, 120, 240].map((a) => (
          <path key={a} transform={`rotate(${a + 15}) scale(0.82)`} d={BLADE} />
        ))}
        <circle r="7" />
      </g>
    </>
  ),
};
