import { useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Heart, RotateCcw, Sparkles, X } from "lucide-react";
import type { MatchResult } from "@/lib/matching";
import { useStore } from "@/lib/store";
import { issueTh, provinceTh, REGION_LABEL } from "@/lib/i18n";
import { Avatar, Chip, ConnectBurst, PowerChip, ScoreRing } from "./power-bits";
import { SwipeCoach } from "./swipe-coach";

/** สำรับ "ปัดเร็ว" — ข้าม / ถูกใจ / เชื่อมต่อ ได้ในแตะเดียว */
export function DiscoverDeck({
  matches,
  onShowLiked,
}: {
  matches: MatchResult[];
  onShowLiked?: () => void;
}) {
  const { connect, connections, toggleLikeUser, skipUser, undoSkip, skippedUsers } = useStore();
  const navigate = useNavigate();
  const [drag, setDrag] = useState(0);
  const [fly, setFly] = useState<"left" | "right" | null>(null);
  const [busy, setBusy] = useState(false);
  const [burst, setBurst] = useState(false);
  const start = useRef<number | null>(null);

  const top = matches[0];
  const next = matches[1];

  if (!top) {
    return (
      <div className="card-soft mx-5 grid place-items-center gap-3 p-8 text-center">
        <span className="text-3xl" aria-hidden>
          🎉
        </span>
        <p className="text-sm font-bold">ยังไม่มีใครให้ดูในหมวดนี้</p>
        <p className="text-[12px] text-muted-foreground">
          ลองเปลี่ยนประเด็น ดูคนที่คุณถูกใจไว้ หรือชวนคนข้าง ๆ สแกน QR มาเข้าร่วม
          จะได้มีคนให้เชื่อมเพิ่มขึ้น
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {onShowLiked && (
            <button
              type="button"
              onClick={onShowLiked}
              className="tap inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
            >
              <Heart className="h-4 w-4" aria-hidden /> ดูคนที่ถูกใจไว้
            </button>
          )}
          <Link
            to="/qr"
            className="tap inline-flex h-11 items-center rounded-xl border border-border px-4 text-sm font-bold"
          >
            ชวนคนข้าง ๆ สแกน QR
          </Link>
        </div>
        {skippedUsers.length > 0 && (
          <button
            type="button"
            onClick={undoSkip}
            className="tap mt-1 inline-flex h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-bold"
          >
            <RotateCcw className="h-4 w-4" aria-hidden /> ย้อนคนล่าสุด
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

  const doSkip = () => {
    if (busy) return;
    finish("left", () => {
      skipUser(u.id);
      toast(`ข้าม ${u.name} แล้ว`, {
        id: "deck-skip-undo",
        duration: 5000,
        action: { label: "ย้อนกลับ", onClick: undoSkip },
      });
    });
  };
  const doLike = () => {
    if (busy) return;
    finish("right", () => {
      toggleLikeUser(u.id);
      toast.success("บันทึกไว้ในรายการถูกใจแล้ว 💜", { description: u.name });
    });
  };
  const doConnect = () => {
    if (busy) return;
    setBusy(true);
    const c = connect(u.id, top.score, top.reason);
    setBurst(true);
    toast.success("เชื่อมกันแล้ว! ✨", {
      description: `คุณกับ ${u.name} เป็นคอนเนกชันใหม่ · New connection created`,
      action: {
        label: "ก้าวต่อไป",
        onClick: () => navigate({ to: "/connection/$id", params: { id: c.id } }),
      },
    });
    setTimeout(
      () =>
        finish("right", () => {
          toggleLikeUser(u.id);
          setBurst(false);
          setBusy(false);
        }),
      900,
    );
  };

  const resetDrag = () => {
    start.current = null;
    setDrag(0);
  };

  const transform = fly
    ? `translateX(${fly === "left" ? -420 : 420}px) rotate(${fly === "left" ? -14 : 14}deg)`
    : `translateX(${drag}px) rotate(${drag / 22}deg)`;

  return (
    <div className="px-5">
      <SwipeCoach />
      <div className="relative">
        {next && (
          <div className="card-soft absolute inset-x-2 top-3 h-full scale-[0.97] opacity-50" aria-hidden />
        )}

        <article
          key={u.id}
          className="card-soft holo-border relative touch-pan-y overflow-hidden p-4"
          style={{
            transform,
            transition: fly || drag === 0 ? "transform 180ms ease-out" : undefined,
          }}
          onPointerDown={(e) => {
            if (busy) return;
            start.current = e.clientX;
          }}
          onPointerMove={(e) => {
            if (busy || start.current === null) return;
            const dx = e.clientX - start.current;
            // จับ pointer เฉพาะตอนลากจริง ให้แตะลิงก์ในการ์ดได้ และปล่อยนอกการ์ดแล้วไม่ค้าง
            if (Math.abs(dx) > 8 && !e.currentTarget.hasPointerCapture(e.pointerId)) {
              e.currentTarget.setPointerCapture(e.pointerId);
            }
            setDrag(dx);
          }}
          onPointerUp={() => {
            if (start.current === null) return;
            const d = drag;
            start.current = null;
            if (d < -90) doSkip();
            else if (d > 90) doLike();
            else setDrag(0);
          }}
          onPointerCancel={resetDrag}
          onPointerLeave={(e) => {
            if (!e.currentTarget.hasPointerCapture(e.pointerId)) resetDrag();
          }}
        >
          <div className="flex items-start gap-3">
            <Avatar user={u} size={64} />
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 break-words text-lg font-extrabold leading-snug">{u.name}</h3>
              <p className="line-clamp-2 break-words text-[12px] leading-snug text-muted-foreground">
                {provinceTh(u.province) || REGION_LABEL[u.region]} · {u.organization}
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

          {/* ทำไมควรเจอกัน — ประโยคเดียวสั้น ๆ */}
          <p className="mt-3 flex items-start gap-1.5 text-[13px] font-semibold leading-relaxed text-foreground">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
            {top.reason}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1.5 text-xs font-extrabold text-muted-foreground">
                เขามีให้
              </p>
              <div className="flex flex-wrap gap-1.5">
                {top.theyBring.slice(0, 2).map((p) => (
                  <PowerChip key={p} name={p} tone="lime" />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-extrabold text-muted-foreground">
                เขากำลังหา
              </p>
              <div className="flex flex-wrap gap-1.5">
                {top.theyNeed.slice(0, 2).map((p) => (
                  <PowerChip key={p} name={p} tone="coral" canHelp={top.youCanGive.includes(p)} />
                ))}
              </div>
              {top.youCanGive.length > 0 && (
                <p className="mt-1 text-xs font-semibold text-muted-foreground">✓ = เรื่องที่คุณช่วยเขาได้</p>
              )}
            </div>
          </div>

          <Link
            to="/people/$id"
            params={{ id: u.id }}
            className="tap mt-1 inline-flex min-h-11 items-center text-[12px] font-bold text-primary underline underline-offset-4"
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
              สนใจ
            </span>
          )}

          {burst && <ConnectBurst name={u.name} />}
        </article>
      </div>

      <div className="mt-4 grid grid-cols-[64px_1fr_64px] items-center gap-3">
        <button
          type="button"
          aria-label="ข้ามคนนี้"
          onClick={doSkip}
          disabled={busy}
          className="tap flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-2xl border border-border bg-card"
        >
          <X className="h-5 w-5 text-muted-foreground" aria-hidden />
          <span className="text-xs font-extrabold text-muted-foreground">ข้าม</span>
        </button>

        {existing ? (
          <Link
            to="/connection/$id"
            params={{ id: existing.id }}
            className="tap inline-flex h-16 items-center justify-center rounded-2xl bg-lime px-4 text-sm font-extrabold text-lime-foreground"
          >
            เชื่อมกันแล้ว ✨ ดูก้าวต่อไป
          </Link>
        ) : (
          <button
            type="button"
            onClick={doConnect}
            disabled={busy}
            className="tap inline-flex h-16 items-center justify-center rounded-2xl cta-holo px-4 text-base font-extrabold text-primary-foreground"
          >
            ขอเชื่อมต่อ
          </button>
        )}

        <button
          type="button"
          aria-label="สนใจ เก็บไว้ก่อน"
          onClick={doLike}
          disabled={busy}
          className="tap flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-2xl border border-coral/40 bg-coral/10"
        >
          <Heart className="h-5 w-5 text-coral-ink" aria-hidden />
          <span className="text-xs font-extrabold text-coral-ink">สนใจ</span>
        </button>
      </div>

      <p className="mt-2 text-center text-xs text-muted-foreground">
        เหลืออีก {matches.length - 1} คน
      </p>
    </div>
  );
}
