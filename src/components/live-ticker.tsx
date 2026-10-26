import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Handshake,
  Heart,
  MessageCircle,
  Pause,
  Play,
  Radio,
  Sparkles,
} from "lucide-react";

import { BOTTOM_NAV_HEIGHT_VAR } from "@/components/bottom-nav";
import { useLiveEvents, type LiveEvent, type LiveKind } from "@/lib/live";
import { useMotionSettings } from "@/lib/motion";
import { playConnext } from "@/lib/notify";
import { issueTh, REGION_LABEL, STATUS_TH } from "@/lib/i18n";
import type { Commitment, Connection, User } from "@/lib/types";

const ICON: Record<LiveKind, typeof Handshake> = {
  match: Sparkles,
  like: Heart,
  connect: Handshake,
  commitment: CheckCircle2,
  message: MessageCircle,
};

/** สีป้ายไอคอนตามชนิดกิจกรรม — ใช้คู่สีป้ายแท็กของธีม (พื้นทึบ + ตัวอักษร/ไอคอนตัดกัน) */
const TONE: Record<LiveKind, string> = {
  match: "bg-primary text-white",
  like: "bg-block-orange text-white",
  connect: "bg-block-blue text-white",
  commitment: "bg-block-green text-white",
  message: "bg-primary text-white",
};

const KIND_TH: Record<LiveKind, string> = {
  match: "แมตช์",
  like: "ถูกใจ",
  connect: "เชื่อมต่อ",
  commitment: "นัดลงมือทำ",
  message: "แชท",
};

function ago(iso: string, now: number) {
  const diff = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (diff < 10) return "เมื่อกี้";
  if (diff < 60) return `${diff} วิ`;
  if (diff < 3600) return `${Math.floor(diff / 60)} นาที`;
  return `${Math.floor(diff / 3600)} ชม.`;
}

/**
 * กิจกรรมของฉัน (จาก BroadcastChannel ในเครื่องนี้) + ป๊อปอัปแจ้งเตือน
 * toastOnly: แสดงเฉพาะป๊อปอัป เมื่อหน้านั้นมีฟีดจากข้อมูลทั้งงานอยู่แล้ว
 */
export function LiveTicker({ toastOnly = false }: { toastOnly?: boolean } = {}) {
  const events = useLiveEvents(12);
  const [now, setNow] = useState(() => Date.now());
  const [toast, setToast] = useState<LiveEvent | null>(null);
  const [seen, setSeen] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const latest = events[0];
    if (!latest || latest.id === seen) return;
    setSeen(latest.id);
    setToast(latest);
    playConnext({ speak: latest.kind === "connect" });
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(30);
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [events, seen]);

  return (
    <>
      {!toastOnly && (
        <div className="meadow-card p-5">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-block-orange text-white"
            >
              <Radio className="h-6 w-6" />
              <span className="absolute -right-0.5 -top-0.5 h-3 w-3 animate-pulse-node rounded-full bg-block-yellow" />
            </span>
            <h2 className="min-w-0 font-heading text-lead font-semibold! text-ink">
              กิจกรรมล่าสุดของฉัน
            </h2>
          </div>

          {events.length === 0 ? (
            <p className="mt-3 text-body text-ink-soft">
              เมื่อคุณถูกใจ เชื่อมต่อ หรือนัดลงมือทำ กิจกรรมจะแสดงที่นี่
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {events.map((e) => {
                const Icon = ICON[e.kind];
                return (
                  <li key={e.id} className="flex animate-rise items-start gap-3">
                    <span
                      aria-hidden="true"
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${TONE[e.kind]}`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-body font-semibold break-words text-ink">
                        {e.title}
                        <span className="ml-2 font-normal text-ink-soft">{KIND_TH[e.kind]}</span>
                      </p>
                      <p className="line-clamp-2 text-body break-words text-ink-soft">{e.detail}</p>
                      <p className="text-body text-ink-soft">{ago(e.created_at, now)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-4 z-50 mx-auto max-w-md animate-rise"
          style={{ bottom: `calc(var(${BOTTOM_NAV_HEIGHT_VAR}, 77px) + 1rem)` }}
        >
          <div className="meadow-card flex items-center gap-3 px-4 py-3">
            <span
              aria-hidden="true"
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${TONE[toast.kind]}`}
            >
              {(() => {
                const Icon = ICON[toast.kind];
                return <Icon className="h-5 w-5" />;
              })()}
            </span>
            <div className="min-w-0">
              <p className="line-clamp-2 text-body font-semibold break-words text-ink">
                {toast.title}
              </p>
              <p className="line-clamp-2 text-body break-words text-ink-soft">{toast.detail}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* ข้อความหมุนเวียน "วันนี้พลังของคุณจะไปเชื่อมกับใคร?"                     */
/* ------------------------------------------------------------------ */

const PROMPT_LINES = [
  { th: "วันนี้พลังของคุณจะไปเชื่อมกับใคร?", en: "Who will you connect with next?" },
  { th: "ใครมีพลังที่คุณกำลังตามหา?", en: "Who has the power you're looking for?" },
  { th: "ทักคนข้าง ๆ แล้วลองแลกพลังกันดู", en: "Say hi to the person next to you and swap powers" },
];

export function RotatingPrompt({
  size = "md",
  tone = "brand",
}: {
  size?: "md" | "lg";
  /** brand = บนพื้นสีแบรนด์ (ตัวอักษรขาว), card = บนการ์ดสีอ่อน */
  tone?: "brand" | "card";
}) {
  const { reducedMotion } = useMotionSettings();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    if (reducedMotion || paused || hover) return;
    const t = setInterval(() => setI((n) => (n + 1) % PROMPT_LINES.length), 6000);
    return () => clearInterval(t);
  }, [reducedMotion, paused, hover]);

  const l = PROMPT_LINES[i]!;
  const lg = size === "lg";
  return (
    <div
      className="relative flex items-start gap-2"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <p className="sr-only">
        {PROMPT_LINES[0]!.th} / <span lang="en">{PROMPT_LINES[0]!.en}</span>
      </p>
      <div
        aria-hidden="true"
        className={lg ? "min-h-[5.5rem] min-w-0 flex-1" : "min-h-[9.5rem] min-w-0 flex-1"}
      >
        <p
          key={i}
          className={`${reducedMotion ? "" : "animate-rise "}${
            lg ? "text-[clamp(1.5rem,4vw,2.5rem)]" : "text-lg"
          } font-extrabold leading-snug`}
        >
          {l.th}
        </p>
        <p
          key={`en${i}`}
          lang="en"
          className={`${lg ? "text-base" : "text-sm"} font-bold ${
            tone === "brand" ? "opacity-90" : "text-muted-foreground"
          }`}
        >
          {l.en}
        </p>
      </div>
      {!reducedMotion && (
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          aria-label={paused ? "เล่นข้อความต่อ / Resume messages" : "หยุดข้อความ / Pause messages"}
          className={`tap grid h-12 w-12 shrink-0 place-items-center rounded-full ${
            tone === "brand" ? "bg-white/15" : "bg-muted text-foreground"
          }`}
        >
          {paused ? (
            <Play className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Pause className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ฟีดจากข้อมูลในสโตร์ (ซิงก์เรียลไทม์ทุกเครื่อง)                          */
/* ------------------------------------------------------------------ */

export type FeedItem = {
  id: string;
  icon: "connect" | "commit";
  title: string;
  detail: string;
  created_at: string;
};

/**
 * สร้างฟีดกิจกรรมจากคู่เชื่อมและนัดลงมือทำ
 * anonymous: ใช้บนจอสาธารณะ — ไม่แสดงชื่อคนหรือรายละเอียดนัด บอกแค่ภาคและประเด็นที่สนใจร่วมกัน
 */
export function buildFeed({
  connections,
  commitments,
  allConnections,
  userMap,
  anonymous,
  limit = 12,
}: {
  connections: Connection[];
  commitments: Commitment[];
  allConnections: Connection[];
  userMap: Record<string, User | undefined>;
  anonymous: boolean;
  limit?: number;
}): FeedItem[] {
  const items: FeedItem[] = [];
  connections.forEach((c) => {
    const a = userMap[c.user_a];
    const b = userMap[c.user_b];
    if (anonymous) {
      const shared = a?.interests.find((i) => b?.interests.includes(i));
      items.push({
        id: `c-${c.id}`,
        icon: "connect",
        title: `คนจาก${a ? REGION_LABEL[a.region] : "ในงาน"} 🤝 คนจาก${b ? REGION_LABEL[b.region] : "ในงาน"}`,
        detail: `${shared ? `สนใจเรื่อง${issueTh(shared)} · ` : ""}แมตช์ ${c.match_score}%`,
        created_at: c.created_at,
      });
    } else {
      items.push({
        id: `c-${c.id}`,
        icon: "connect",
        title: `${a?.name ?? "ผู้เข้าร่วม"} × ${b?.name ?? "ผู้เข้าร่วม"}`,
        detail: `แมตช์ ${c.match_score}% · ${STATUS_TH[c.status]}`,
        created_at: c.created_at,
      });
    }
  });
  commitments.forEach((m) => {
    if (anonymous) {
      items.push({
        id: `m-${m.id}`,
        icon: "commit",
        title: "คู่เชื่อมคู่หนึ่งนัดลงมือทำด้วยกัน",
        detail: `${m.action_type} · ${STATUS_TH[m.status]}`,
        created_at: m.created_at,
      });
      return;
    }
    const conn = allConnections.find((c) => c.id === m.connection_id);
    const pair = conn
      ? `${userMap[conn.user_a]?.name ?? "?"} × ${userMap[conn.user_b]?.name ?? "?"}`
      : "คู่เชื่อม";
    items.push({
      id: `m-${m.id}`,
      icon: "commit",
      title: `${pair} นัดลงมือทำ`,
      detail: `${m.description} · ${STATUS_TH[m.status]}`,
      created_at: m.created_at,
    });
  });
  return items.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, limit);
}
