import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * ฉากทุ่งหญ้า (ธีมสมัชชาสุขภาพแห่งชาติ ครั้งที่ 19) — ภาพตกแต่งล้วน ไม่มีข้อความ/โลโก้
 * ใช้เป็นหัวหน้าจับคู่ (header) ฉากหลังตอนจับคู่สำเร็จ (celebrate) และภาพสถานะว่าง (empty)
 *
 * ฉากวาดใน viewBox 400×160 แบบ "meet" ชิดล่าง: ฉากเต็มทั้งชิ้นเสมอ
 * ส่วนที่เกินกรอบ (ฟ้าด้านบนเมื่อสูงกว่า, ทุ่ง/ต้นไม้ด้านข้างเมื่อกว้างกว่า) วาดเผื่อไว้นอก viewBox
 * ความสูงตายตัวต่อแบบ จึงไม่ทำให้เลย์เอาต์ขยับ
 * ใบพัด (.meadow-rotor) หมุนด้วย CSS ใน src/meadow.css และหยุดเมื่อผู้ใช้ลดการเคลื่อนไหว/เครื่องสเปกต่ำ
 */

type Variant = "header" | "celebrate" | "empty";

const HEIGHT: Record<Variant, string> = {
  header: "h-[140px]",
  celebrate: "h-[240px]",
  empty: "h-[180px]",
};

const SKY = "#CFEAFB";
const CLOUD = "#FFF7E8";
const MOUNTAIN = "#B65A4E";
const SNOW = "#FFFFFF";
const TREE = "#3F7D3A";
const TRUNK = "#B23A3A";
const MEADOW = "#A9CC93";
const MEADOW_LIGHT = "#C7DDB4";
const BUSH = "#BCD5A6";
const TURBINE = "#FFFFFF";
const TURBINE_EDGE = "#D9D3C6";
const GROUND = 130;

/**
 * กังหันลม: x, ความสูงจากพื้นถึงดุมใบพัด, มุมเริ่มของใบพัด และแบบที่แสดง
 * (celebrate มีครบ 3 ต้น, header 2 ต้นซ้าย-ขวา, empty 1 ต้นกลาง)
 */
const WINDMILLS: { x: number; h: number; angle: number; in: readonly Variant[] }[] = [
  { x: 150, h: 86, angle: 10, in: ["header", "celebrate"] },
  { x: 234, h: 72, angle: 70, in: ["celebrate", "empty"] },
  { x: 322, h: 78, angle: 40, in: ["header", "celebrate"] },
];

/** ต้นไม้กลม ลำต้นแดง (ตัวท้าย ๆ อยู่นอก viewBox ใช้เติมด้านข้างบนจอกว้าง) */
const TREES = [
  { x: 110, y: 130, s: 1 },
  { x: 194, y: 124, s: 0.72 },
  { x: 276, y: 132, s: 1.05 },
  { x: 376, y: 136, s: 1.2 },
  { x: -32, y: 132, s: 1.1 },
  { x: 436, y: 130, s: 1 },
  { x: 470, y: 134, s: 0.8 },
] as const;

export function MeadowScene({ variant, className }: { variant: Variant; className?: string }) {
  const id = useId();
  const clipLeft = `${id}-mountain-left`;
  const clipRight = `${id}-mountain-right`;
  const leftMountain = "M-20 130 C20 98 40 58 62 58 C84 58 108 98 152 130 Z";
  const rightMountain = "M262 130 C300 102 318 66 342 66 C366 66 392 100 432 130 Z";

  return (
    <svg
      viewBox="0 0 400 160"
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
      focusable="false"
      data-variant={variant}
      className={cn("meadow-scene block w-full select-none", HEIGHT[variant], className)}
    >
      <defs>
        <clipPath id={clipLeft}>
          <path d={leftMountain} />
        </clipPath>
        <clipPath id={clipRight}>
          <path d={rightMountain} />
        </clipPath>
      </defs>

      {/* ฟ้า — กว้างเกิน viewBox เพื่อเติมพื้นที่เมื่อกล่องสูง/กว้างกว่าสัดส่วนฉาก */}
      <rect x="-1000" y="-1000" width="2400" height="1200" fill={SKY} />

      {/* เมฆ 3 ก้อน */}
      <Cloud x={28} y={34} s={1} />
      <Cloud x={238} y={24} s={0.8} />
      <Cloud x={330} y={44} s={0.66} />

      {/* ภูเขาสีอิฐ ยอดหิมะ */}
      <path d={leftMountain} fill={MOUNTAIN} />
      <path
        clipPath={`url(#${clipLeft})`}
        fill={SNOW}
        d="M20 40 H106 V74 Q98 80 90 74 Q81 82 72 75 Q63 83 54 75 Q45 81 36 74 Q28 79 20 74 Z"
      />
      <path d={rightMountain} fill={MOUNTAIN} />
      <path
        clipPath={`url(#${clipRight})`}
        fill={SNOW}
        d="M300 48 H386 V80 Q378 86 370 80 Q361 88 352 81 Q343 89 334 81 Q325 87 316 80 Q308 85 300 80 Z"
      />

      {/* กังหันลม — ฐานจมอยู่ใต้ทุ่ง */}
      {WINDMILLS.filter((w) => w.in.includes(variant)).map((w) => (
        <Windmill key={w.x} x={w.x} h={w.h} angle={w.angle} />
      ))}

      {/* พุ่มไม้จาง ๆ แนวขอบฟ้า */}
      <Bush x={74} y={124} s={1.3} />
      <Bush x={248} y={124} s={1} />
      <Bush x={344} y={122} s={1.2} />

      {/* ทุ่งหญ้า + ทางเดินสีอ่อน */}
      <path
        fill={MEADOW}
        d="M-1000 121 Q-300 114 0 121 Q90 112 190 119 Q290 127 400 117 Q700 110 1400 121 V400 H-1000 Z"
      />
      <path
        fill={MEADOW_LIGHT}
        d="M166 161 C196 146 214 134 204 120 L212 120 C236 132 242 148 264 161 Z"
      />

      {TREES.map((t) => (
        <Tree key={`${t.x}-${t.y}`} {...t} />
      ))}
    </svg>
  );
}

function Cloud({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      fill={CLOUD}
      d="M0 0 Q0 -8 9 -8 Q11 -18 22 -17 Q29 -27 40 -19 Q51 -21 52 -9 Q60 -8 60 0 Z"
    />
  );
}

function Bush({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      fill={BUSH}
      d="M0 0 Q1 -7 8 -7 Q12 -13 18 -9 Q24 -12 27 -6 Q32 -5 32 0 Z"
    />
  );
}

function Tree({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path
        fill={TRUNK}
        d="M-2.2 0 H2.2 L1.8 -11 L7 -17 L5.2 -18.6 L1.4 -14.6 L1.2 -24 H-1.2 L-1.6 -13 L-5.6 -17 L-7 -15.6 L-1.8 -10 Z"
      />
      <circle cx="0" cy="-29" r="10" fill={TREE} />
      <circle cx="-9" cy="-23" r="7.5" fill={TREE} />
      <circle cx="9" cy="-24" r="8" fill={TREE} />
      <circle cx="-4" cy="-37" r="7" fill={TREE} />
      <circle cx="5" cy="-36" r="6.5" fill={TREE} />
      {/* ปิดโคนกิ่งที่ยื่นออกมาให้เหลือเฉพาะลำต้นด้านล่าง */}
      <circle cx="0" cy="-20" r="6" fill={TREE} />
    </g>
  );
}

/**
 * วาดในหน่วยภายใน: เสาสูง 100 ดุมอยู่ที่ (0,-100) ใบยาว 42
 * กลุ่ม .meadow-rotor ห้ามมี transform attribute (CSS rotate จะทับ) — ตำแหน่งดุมอยู่ที่กลุ่มแม่
 * วงกลมล่องหน r=44 ทำให้กรอบ fill-box มีจุดกึ่งกลางที่ดุมพอดี ใบพัดจึงหมุนรอบดุม
 */
function Windmill({ x, h, angle }: { x: number; h: number; angle: number }) {
  const blade = "M0 0 C3 -6 4.6 -22 1.6 -41 C1 -43 -1 -43 -1.4 -40 C-2.6 -24 -2.2 -8 0 0 Z";
  return (
    <g transform={`translate(${x} ${GROUND}) scale(${h / 100})`}>
      <path
        fill={TURBINE}
        stroke={TURBINE_EDGE}
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
        d="M-2.4 0 L2.4 0 L1.2 -100 L-1.2 -100 Z"
      />
      <g transform="translate(0 -100)">
        <g className="meadow-rotor">
          <circle r="44" fill="none" />
          {[0, 120, 240].map((a) => (
            <path
              key={a}
              transform={`rotate(${angle + a})`}
              fill={TURBINE}
              stroke={TURBINE_EDGE}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              d={blade}
            />
          ))}
          <circle
            r="3.4"
            fill={TURBINE}
            stroke={TURBINE_EDGE}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      </g>
    </g>
  );
}
