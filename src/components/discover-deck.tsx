import { useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Heart, RotateCcw, Sparkles, X } from "lucide-react";
import type { MatchResult } from "@/lib/matching";
import { useStore } from "@/lib/store";
import { issueTh, provinceTh, REGION_LABEL } from "@/lib/i18n";
import { Avatar, Chip, ConnectBurst, PowerChip, ScoreRing } from "./power-bits";
import { SwipeCoach } from "./swipe-coach";
import { Button } from "@/components/ui/button";

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
      toast.success("บันทึกไว้ในรายการถูกใจแล้ว ❤️", { description: u.name });
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

  const place = provinceTh(u.province) || REGION_LABEL[u.region];
  const stampOpacity = Math.min(Math.abs(drag) / 90, 1);

  return (
    <div className="mission-deck mx-auto max-w-2xl px-4">
      <SwipeCoach />
      <div className="relative h-[calc(100dvh-300px)] min-h-[440px]">
        {next && (
          <div
            className="absolute inset-x-3 top-3 bottom-0 scale-[0.96] rounded-lg bg-card opacity-70"
            aria-hidden
          />
        )}

        <article
          key={u.id}
          className="absolute inset-0 flex touch-pan-y flex-col overflow-hidden rounded-lg bg-card ring-1 ring-border"
          style={{
            transform,
            transition: fly || drag === 0 ? "transform 220ms cubic-bezier(0.22,1,0.36,1)" : undefined,
          }}
          onPointerDown={(e) => {
            if (busy) return;
            start.current = e.clientX;
          }}
          onPointerMove={(e) => {
            if (busy || start.current === null) return;
            const dx = e.clientX - start.current;
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
          {/* ภาพเต็มการ์ดแบบแอปหาคู่ */}
          <div className="relative min-h-0 flex-[1.15] overflow-hidden bg-accent">
            {u.photo ? (
              <img
                src={u.photo}
                alt={u.name}
                draggable={false}
                className="absolute inset-0 h-full w-full select-none object-cover"
              />
            ) : (
              <div
                className="absolute inset-0 grid place-items-center gradient-power"
                aria-hidden
              >
                <span className="text-[96px] leading-none drop-shadow-sm">
                  {u.avatar || u.name.slice(0, 1)}
                </span>
              </div>
            )}
            <div
              className="mission-profile-scrim absolute inset-x-0 bottom-0 h-2/3"
              aria-hidden
            />
            <span className="absolute right-4 top-4 rounded-full bg-card/90 px-3 py-1.5 font-tech text-sm font-bold text-primary shadow-sm backdrop-blur">
              {top.score}% <span className="text-xs text-muted-foreground">แมตช์</span>
            </span>
            <div className="absolute inset-x-0 bottom-0 p-5 text-foreground">
              <h3 className="line-clamp-2 break-words text-[28px] font-bold leading-tight">{u.name}</h3>
              <p className="mt-1 line-clamp-1 text-sm font-medium opacity-90">
                {place}
                {u.organization ? ` · ${u.organization}` : ""}
              </p>
            </div>

            <span
              className="pointer-events-none absolute left-5 top-6 -rotate-12 rounded-xl border-[3px] border-primary bg-card/80 px-3 py-1 text-xl font-extrabold text-primary"
              style={{ opacity: drag > 0 ? stampOpacity : 0 }}
              aria-hidden
            >
              สนใจ
            </span>
            <span
              className="pointer-events-none absolute right-5 top-16 rotate-12 rounded-xl border-[3px] border-muted-foreground bg-card/80 px-3 py-1 text-xl font-extrabold text-muted-foreground"
              style={{ opacity: drag < 0 ? stampOpacity : 0 }}
              aria-hidden
            >
              ข้าม
            </span>
          </div>

          <div className="no-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
            <p className="flex items-start gap-2 text-[15px] font-semibold leading-relaxed">
              <Sparkles className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden />
              {top.reason}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {u.interests.slice(0, 2).map((i) => (
                <Chip key={i} tone="primary">
                  {issueTh(i)}
                </Chip>
              ))}
              {top.theyBring.slice(0, 2).map((p) => (
                <PowerChip key={p} name={p} tone="lime" />
              ))}
              {top.theyNeed.slice(0, 2).map((p) => (
                <PowerChip key={p} name={p} tone="coral" canHelp={top.youCanGive.includes(p)} />
              ))}
            </div>
            <Link
              to="/people/$id"
              params={{ id: u.id }}
              className="tap inline-flex min-h-11 items-center text-sm font-bold text-primary"
            >
              ดูโปรไฟล์เต็ม →
            </Link>
          </div>

          {burst && <ConnectBurst name={u.name} />}
        </article>
      </div>

      <div className="mt-5 flex items-center justify-center gap-5">
        <Button
          type="button"
          aria-label="ข้ามคนนี้"
          variant="outline"
          size="icon"
          onClick={doSkip}
          disabled={busy}
          className="tap grid h-16 w-16 place-items-center rounded-full bg-card shadow-[var(--shadow-card)] ring-1 ring-border"
        >
          <X className="h-7 w-7 text-muted-foreground" strokeWidth={2.6} aria-hidden />
        </Button>

        {existing ? (
          <Link
            to="/connection/$id"
            params={{ id: existing.id }}
            className="tap inline-flex h-16 items-center justify-center rounded-full bg-lime px-6 text-sm font-extrabold text-lime-foreground"
          >
            เชื่อมแล้ว · ดูต่อ
          </Link>
        ) : (
          <Button
            type="button"
            onClick={doConnect}
            variant="mission"
            disabled={busy}
            className="tap inline-flex h-16 items-center justify-center rounded-full cta-holo px-8 text-base font-extrabold text-primary-foreground"
          >
            ขอเชื่อมต่อ
          </Button>
        )}

        <Button
          type="button"
          aria-label="สนใจ เก็บไว้ก่อน"
          variant="outline"
          size="icon"
          onClick={doLike}
          disabled={busy}
          className="tap grid h-16 w-16 place-items-center rounded-full bg-card shadow-[var(--shadow-card)] ring-1 ring-border"
        >
          <Heart className="h-7 w-7 text-primary" fill="currentColor" aria-hidden />
        </Button>
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">เหลืออีก {matches.length - 1} คน</p>
    </div>
  );
}
