import { useEffect, useState } from "react";
import { CheckCircle2, Handshake, Heart, MessageCircle, Radio, Sparkles } from "lucide-react";

import { useLiveEvents, type LiveEvent, type LiveKind } from "@/lib/live";
import { playConnext } from "@/lib/notify";

const ICON: Record<LiveKind, typeof Handshake> = {
  match: Sparkles,
  like: Heart,
  connect: Handshake,
  commitment: CheckCircle2,
  message: MessageCircle,
};

const TONE: Record<LiveKind, string> = {
  match: "bg-primary/12 text-primary",
  like: "bg-coral/15 text-coral",
  connect: "bg-electric/15 text-electric",
  commitment: "bg-lime/20 text-ink",
  message: "bg-primary/12 text-primary",
};

const KIND_TH: Record<LiveKind, string> = {
  match: "แมตช์",
  like: "ถูกใจ",
  connect: "เชื่อมต่อ",
  commitment: "คำมั่นสัญญา",
  message: "แชท",
};

function ago(iso: string, now: number) {
  const diff = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (diff < 10) return "เมื่อกี้";
  if (diff < 60) return `${diff} วิ`;
  if (diff < 3600) return `${Math.floor(diff / 60)} นาที`;
  return `${Math.floor(diff / 3600)} ชม.`;
}

/** ฟีดกิจกรรมสด + ป๊อปอัปแจ้งเตือนแบบเรียลไทม์ในแดชบอร์ด */
export function LiveTicker() {
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
      <div className="card-soft rounded-3xl bg-card p-5">
        <div className="flex items-center gap-2">
          <span className="relative grid h-8 w-8 place-items-center rounded-xl bg-coral/15 text-coral">
            <Radio className="h-4 w-4" />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse-node rounded-full bg-coral" />
          </span>
          <h2 className="text-[15px] font-extrabold">แจ้งเตือนสดในงาน</h2>
          <span className="ml-auto text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            live
          </span>
        </div>

        {events.length === 0 ? (
          <p className="mt-3 text-[13px] text-muted-foreground">
            ยังไม่มีสัญญาณสด — เมื่อมีการแมตช์ ถูกใจ เชื่อมต่อ หรืออัปเดตคำมั่นสัญญา จะขึ้นที่นี่ทันที
          </p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {events.map((e) => {
              const Icon = ICON[e.kind];
              return (
                <li key={e.id} className="flex items-start gap-3 animate-rise">
                  <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl ${TONE[e.kind]}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold">
                      {e.title}
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {KIND_TH[e.kind]}
                      </span>
                    </p>
                    <p className="truncate text-[12px] text-muted-foreground">{e.detail}</p>
                  </div>
                  <span className="ml-auto shrink-0 text-[11px] font-bold text-muted-foreground">
                    {ago(e.created_at, now)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-50 mx-auto max-w-md animate-rise"
        >
          <div className="card-soft flex items-center gap-3 rounded-2xl border border-border bg-card/95 px-4 py-3 backdrop-blur">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${TONE[toast.kind]}`}>
              {(() => {
                const Icon = ICON[toast.kind];
                return <Icon className="h-4 w-4" />;
              })()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-extrabold">{toast.title}</p>
              <p className="truncate text-[12px] text-muted-foreground">{toast.detail}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
