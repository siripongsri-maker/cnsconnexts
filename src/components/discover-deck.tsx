import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Heart, RotateCcw, Sparkles, X } from "lucide-react";
import type { MatchResult } from "@/lib/matching";
import { useStore } from "@/lib/store";
import { issueTh, powerTh, provinceTh } from "@/lib/i18n";
import { Avatar, Chip, PowerChip, ScoreRing } from "./power-bits";
import { SwipeCoach } from "./swipe-coach";

/** สำรับ "ปัดเร็ว" — ข้าม / ถูกใจ / เชื่อมต่อ ได้ในแตะเดียว */
export function DiscoverDeck({ matches }: { matches: MatchResult[] }) {
  const { connect, connections, toggleLikeUser, skipUser, undoSkip, skippedUsers } = useStore();
  const [drag, setDrag] = useState(0);
  const [fly, setFly] = useState<"left" | "right" | null>(null);
  const start = useRef<number | null>(null);

  const top = matches[0];
  const next = matches[1];

  if (!top) {
    return (
      <div className="card-soft mx-5 grid place-items-center gap-3 p-8 text-center">
        <span className="text-3xl">🎉</span>
        <p className="text-sm font-bold">ดูครบทุกคนในหมวดนี้แล้ว</p>
        <p className="text-[12px] text-muted-foreground">
          ลองเปลี่ยนประเด็น หรือดูรายการที่คุณถูกใจไว้
        </p>
        {skippedUsers.length > 0 && (
          <button
            onClick={undoSkip}
            className="tap mt-1 inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-bold"
          >
            <RotateCcw className="h-4 w-4" /> ย้อนคนล่าสุด
          </button>
        )}
      </div>
    );
  }

  const u = top.user;
  const existing = connections.find(
    (c) => (c.user_a === "me" && c.user_b === u.id) || (c.user_b === "me" && c.user_a === u.id),
  );

  const finish = (dir: "left" | "right", run: () => void) => {
    setFly(dir);
    setDrag(0);
    setTimeout(() => {
      run();
      setFly(null);
    }, 180);
  };

  const doSkip = () => finish("left", () => skipUser(u.id));
  const doLike = () =>
    finish("right", () => {
      toggleLikeUser(u.id);
      toast.success("บันทึกไว้ในรายการถูกใจแล้ว 💜", { description: u.name });
    });
  const doConnect = () => {
    const c = connect(u.id, top.score, top.reason);
    toggleLikeUser(u.id);
    toast.success("ส่งคำขอเชื่อมแล้ว ✨", {
      description: `คุณกับ ${u.name} กำลังเชื่อมกัน`,
      action: { label: "ก้าวต่อไป", onClick: () => (window.location.href = `/connection/${c.id}`) },
    });
    finish("right", () => {});
  };

  const transform = fly
    ? `translateX(${fly === "left" ? -420 : 420}px) rotate(${fly === "left" ? -14 : 14}deg)`
    : `translateX(${drag}px) rotate(${drag / 22}deg)`;

  return (
    <div className="px-5">
      <div className="relative">
        {next && (
          <div className="card-soft absolute inset-x-2 top-3 h-full scale-[0.97] opacity-50" aria-hidden />
        )}

        <article
          className="card-soft relative touch-pan-y overflow-hidden p-4"
          style={{
            transform,
            transition: fly || drag === 0 ? "transform 180ms ease-out" : undefined,
          }}
          onPointerDown={(e) => {
            start.current = e.clientX;
          }}
          onPointerMove={(e) => {
            if (start.current === null) return;
            setDrag(e.clientX - start.current);
          }}
          onPointerUp={() => {
            const d = drag;
            start.current = null;
            if (d < -90) doSkip();
            else if (d > 90) doLike();
            else setDrag(0);
          }}
          onPointerCancel={() => {
            start.current = null;
            setDrag(0);
          }}
        >
          <div className="flex items-start gap-3">
            <Avatar user={u} size={64} />
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 break-words text-lg font-extrabold leading-snug">{u.name}</h3>
              <p className="line-clamp-2 break-words text-[12px] leading-snug text-muted-foreground">
                {provinceTh(u.province)} · {u.organization}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {u.interests.slice(0, 2).map((i) => (
                  <Chip key={i} tone="primary">
                    {issueTh(i)}
                  </Chip>
                ))}
              </div>
            </div>
            <ScoreRing score={top.score} />
          </div>

          {/* เหตุผลที่แมตช์ แบบสั้น */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {top.highlights.map((h) => (
              <Chip key={h} tone="electric">
                <Sparkles className="h-3 w-3" />
                {h}
              </Chip>
            ))}
          </div>

          <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">
            {u.bio}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                เขามีให้
              </p>
              <div className="flex flex-wrap gap-1.5">
                {top.theyBring.slice(0, 2).map((p) => (
                  <PowerChip key={p} name={powerTh(p)} tone="lime" />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                เขากำลังหา
              </p>
              <div className="flex flex-wrap gap-1.5">
                {top.theyNeed.slice(0, 2).map((p) => (
                  <PowerChip key={p} name={powerTh(p)} tone="coral" />
                ))}
              </div>
            </div>
          </div>

          <Link
            to="/people/$id"
            params={{ id: u.id }}
            className="tap mt-3 inline-flex text-[12px] font-bold text-primary underline underline-offset-4"
          >
            ดูโปรไฟล์เต็ม
          </Link>

          {drag < -40 && (
            <span className="pointer-events-none absolute right-4 top-4 rounded-xl border-2 border-muted-foreground px-2 py-1 text-xs font-extrabold text-muted-foreground">
              ข้าม
            </span>
          )}
          {drag > 40 && (
            <span className="pointer-events-none absolute left-4 top-4 rounded-xl border-2 border-primary px-2 py-1 text-xs font-extrabold text-primary">
              ถูกใจ
            </span>
          )}
        </article>
      </div>

      <div className="mt-4 grid grid-cols-[56px_1fr_56px] items-center gap-3">
        <button
          aria-label="ข้าม"
          onClick={doSkip}
          className="tap grid h-14 w-14 place-items-center rounded-2xl border border-border bg-card"
        >
          <X className="h-6 w-6 text-muted-foreground" />
        </button>

        {existing ? (
          <Link
            to="/connection/$id"
            params={{ id: existing.id }}
            className="tap inline-flex h-14 items-center justify-center rounded-2xl bg-lime px-4 text-sm font-extrabold text-lime-foreground"
          >
            เชื่อมกันแล้ว ✨ ดูก้าวต่อไป
          </Link>
        ) : (
          <button
            onClick={doConnect}
            className="tap inline-flex h-14 items-center justify-center rounded-2xl gradient-power px-4 text-base font-extrabold text-primary-foreground"
          >
            ขอเชื่อมต่อ
          </button>
        )}

        <button
          aria-label="ถูกใจ"
          onClick={doLike}
          className="tap grid h-14 w-14 place-items-center rounded-2xl border border-coral/40 bg-coral/10"
        >
          <Heart className="h-6 w-6 text-coral" />
        </button>
      </div>

      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        ปัดซ้ายเพื่อข้าม · ปัดขวาเพื่อถูกใจ · เหลืออีก {matches.length - 1} คน
      </p>
    </div>
  );
}
