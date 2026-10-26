import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { MatchCelebration } from "@/components/match-celebration";
import { MeadowState, STATE_PRIMARY } from "@/components/meadow-state";
import { Avatar, IssueBlock, PowerPill, ScoreRing } from "@/components/power-bits";
import { QuickProfileSheet } from "@/components/quick-profile-sheet";
import { connectionWith } from "@/lib/connect-rules";
import { deckPrimaryAction } from "@/lib/deck-rules";
import { isDevPreview } from "@/lib/dev-preview";
import { hasLocalParticipantId, homeVisitor } from "@/lib/guest";
import { scoreMatch } from "@/lib/matching";
import { EMPTY_QUICK_DRAFT, type QuickDraft, type QuickStep } from "@/lib/quick-profile";
import { useConnectAndInvite } from "@/lib/meetup-context";
import { inviteSentNote } from "@/lib/meetup-cards";
import { useStore } from "@/lib/store";
import type { User } from "@/lib/types";
import { ProfileSyncFailed } from "@/components/profile-sync-failed";
import { useRetryProfileSync } from "@/lib/use-retry-profile-sync";
import { provinceTh, regionLabel, GENERATION_TH } from "@/lib/i18n";

export const Route = createFileRoute("/people/$id")({
  head: () => ({
    meta: [
      { title: "โปรไฟล์พลัง — คนส. Connexts" },
      { name: "description", content: "ดูว่าคนนี้มีพลังอะไรมาแบ่งปัน และกำลังมองหาอะไรอยู่" },
      { property: "og:title", content: "โปรไฟล์พลัง — คนส. Connexts" },
      { property: "og:description", content: "ดูว่าเขามีพลังอะไร และกำลังมองหาอะไร" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Person,
  notFoundComponent: () => (
    <MeadowState
      title="ไม่พบโปรไฟล์นี้"
      description="โปรไฟล์อาจถูกลบ หรือลิงก์ไม่ครบ ลองจับคู่กับคนอื่นในเครือข่ายได้เลย"
    >
      <Link to="/" className={STATE_PRIMARY}>
        กลับไปจับคู่
      </Link>
    </MeadowState>
  ),
});

/** รหัสคอนเนกชันปลอมของโหมดทดสอบ ?dryrun — ไม่มีแถวนี้ในฐานข้อมูล */
const DRYRUN_CONNECTION_ID = "dryrun";

/**
 * โปรไฟล์เต็มของอีกคน + ปุ่มขอเชื่อมต่อด้านล่าง
 * ผู้เยี่ยมชม: กดแล้วเปิดแผ่นถาม 3 ข้อบนหน้านี้ (ไม่พาออกไป /onboarding ที่ทำให้หลงคนนี้)
 * บันทึกเสร็จแล้วเชื่อมกับคนนี้ต่อทันที แล้วแสดงจอฉลอง — กติกาเดียวกับหน้าแรก (src/routes/index.tsx)
 */
function Person() {
  const { id } = Route.useParams();
  const { users, me, connections, ideas, hydrated, pendingProfile } = useStore();
  const connect = useConnectAndInvite();
  const { retrying: syncing, retry: retryProfileSync } = useRetryProfileSync();
  const [celebration, setCelebration] = useState<{
    me: User;
    connectionId: string;
    reason: string;
    inviteNote?: string | undefined;
  } | null>(null);
  /** กำลังรอฐานข้อมูลยืนยันการเชื่อมต่อ — ล็อกปุ่ม จอฉลองขึ้นเมื่อสำเร็จเท่านั้น */
  const [connecting, setConnecting] = useState(false);

  // รู้ว่าเป็นใครได้หลัง mount เท่านั้น (localStorage) — คนเดิมที่ store ยังโหลดไม่เสร็จห้ามเห็นปุ่มทำโปรไฟล์
  const [mounted, setMounted] = useState(false);
  const [hasLocalId, setHasLocalId] = useState(false);
  useEffect(() => {
    setHasLocalId(hasLocalParticipantId());
    setMounted(true);
  }, []);
  const visitor = homeVisitor({ mounted, me, hasLocalId, hydrated });
  const waitingForMe = visitor === "unknown" || visitor === "returning-loading";

  // แผ่นถาม 3 ข้อ — ถือสถานะเปิด/ปิดและคำตอบเอง (คำตอบไม่หายเมื่อปิดแล้วเปิดใหม่)
  // ระหว่างบันทึกปิดแผ่นไม่ได้ ถ้าบันทึกไม่สำเร็จแผ่นค้างไว้พร้อมข้อความ (จัดการใน QuickProfileSheet)
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<QuickDraft>(EMPTY_QUICK_DRAFT);
  const [step, setStep] = useState<QuickStep>(1);
  /** มีจอฉลองค้างอยู่ — อ่านตอนแผ่นถามปิดสนิท (อาจเกิดในรอบเรนเดอร์เดียวกับที่เปิดจอฉลอง) */
  const celebratingRef = useRef(false);

  // ปุ่มกด "ขอเชื่อมต่อ" ถูกแทนที่ด้วยลิงก์ตอนเชื่อมสำเร็จ — เก็บ ref ของปุ่มล่างสุดไว้คืนโฟกัสหลังปิดจอฉลอง
  const actionRef = useRef<HTMLElement | null>(null);
  const focusActionAfterCelebration = useRef(false);
  useEffect(() => {
    if (celebration || !focusActionAfterCelebration.current) return;
    focusActionAfterCelebration.current = false;
    // รอหลัง Radix คืนโฟกัส (setTimeout 0 ตอนถอด overlay) เหมือนหน้าแรก
    const t = setTimeout(() => {
      if (actionRef.current?.isConnected) actionRef.current.focus();
    }, 0);
    return () => clearTimeout(t);
  }, [celebration]);
  const user = users.find((u) => u.id === id);
  if (!hydrated && !user) {
    return <MeadowState loading title="กำลังเปิดโปรไฟล์…" />;
  }
  if (!user) throw notFound();

  const match = me ? scoreMatch(me, user) : null;
  const existing = connectionWith(connections, user.id);
  const action = deckPrimaryAction({
    hasProfile: me !== null,
    // ระหว่างรอยืนยัน คอนเนกชันชั่วคราวอยู่ในรายการแล้ว — ยังไม่นับว่าเชื่อมกันจนกว่าจะสำเร็จ
    connected: !!existing && !connecting,
    pendingProfile: pendingProfile !== null,
  });

  const celebrate = (who: User, connectionId: string, reason: string, inviteNote?: string) => {
    celebratingRef.current = true;
    setCelebration({ me: who, connectionId, reason, inviteNote });
  };

  /** ขอเชื่อมต่อจริง — ฉลองเมื่อฐานข้อมูลยืนยันเท่านั้น (ไม่สำเร็จ store ถอนออกและแจ้ง toast แล้ว) */
  const connectWith = (who: User, score: number, reason: string) => {
    setConnecting(true);
    void connect(user.id, score, reason).then((result) => {
      setConnecting(false);
      if (result.ok && !result.existed) {
        celebrate(who, result.connection.id, reason, inviteSentNote(user.name));
      }
    });
  };

  const onSaved = (newMe: User) => {
    setSheetOpen(false);
    setDraft(EMPTY_QUICK_DRAFT);
    setStep(1);
    const m = scoreMatch(newMe, user);
    // โหมดทดสอบ ?dryrun: newMe เป็นผู้ใช้ปลอม ห้ามเรียก connect (เขียนฐานข้อมูลจริง)
    if (isDevPreview("dryrun")) {
      celebrate(newMe, DRYRUN_CONNECTION_ID, m.reason, inviteSentNote(user.name));
      return;
    }
    connectWith(newMe, m.score, m.reason);
  };

  const onSheetClosed = (event: Event) => {
    // Radix คืนโฟกัสให้ Dialog.Trigger ซึ่งแผ่นนี้ไม่มี — คืนไปที่ปุ่มล่างเอง (จอฉลองถือโฟกัสอยู่ก็ปล่อยไว้)
    event.preventDefault();
    if (celebratingRef.current) return;
    if (actionRef.current?.isConnected) actionRef.current.focus();
  };

  const onPrimary = () => {
    if (connecting || syncing) return;
    if (action === "open-profile-sheet") {
      if (!waitingForMe) setSheetOpen(true);
      return;
    }
    if (action === "retry-profile-sync") {
      void retryProfileSync();
      return;
    }
    if (action === "connect" && me && match) connectWith(me, match.score, match.reason);
  };
  const theirIdeas = ideas.filter((i) => i.owner_id === user.id);
  const place = [provinceTh(user.province), regionLabel(user.region)].filter(Boolean).join(" · ");
  const work = [user.organization, GENERATION_TH[user.generation]].filter(Boolean).join(" · ");

  return (
    <div className="min-h-dvh pb-40">
      <header className="bg-sky-soft pb-6 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mx-auto w-full max-w-xl px-4 lg:max-w-3xl">
          <Link
            to="/"
            aria-label="กลับไปหน้าจับคู่"
            className="tap inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-4 text-body font-semibold text-ink shadow-[0_6px_16px_-10px_rgba(43,40,120,0.45)]"
          >
            <ArrowLeft className="h-6 w-6" aria-hidden />
            ย้อนกลับ
          </Link>
          <div className="mt-5 flex items-center gap-4">
            <Avatar user={user} size={72} />
            <div className="min-w-0 flex-1">
              <h1 className="font-heading text-title font-bold text-ink [overflow-wrap:anywhere]">
                {user.name}
              </h1>
              {place && <p className="text-body text-ink-soft [overflow-wrap:anywhere]">{place}</p>}
              {work && <p className="text-body text-ink-soft [overflow-wrap:anywhere]">{work}</p>}
            </div>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-5 lg:max-w-3xl"
      >
        {match && (
          <section aria-label="ความเข้ากัน" className="meadow-card flex items-center gap-4 p-5">
            <ScoreRing score={match.score} size={84} />
            <div className="min-w-0 flex-1">
              <p className="font-heading text-lead font-semibold text-ink">แมตช์กัน</p>
              <p className="text-body text-ink-soft [overflow-wrap:anywhere]">{match.reason}</p>
            </div>
          </section>
        )}

        {user.bio && (
          <p className="meadow-card p-5 text-body text-ink [overflow-wrap:anywhere]">
            “{user.bio}”
          </p>
        )}

        {user.interests.length > 0 && (
          <Block title="ใส่ใจเรื่อง">
            {user.interests.map((i) => (
              <IssueBlock key={i} issue={i} />
            ))}
          </Block>
        )}
        {user.powers_have.length > 0 && (
          <Block title="มีพลังด้าน">
            {user.powers_have.map((p) => (
              <PowerPill key={p} name={p} kind="have" />
            ))}
          </Block>
        )}
        {user.powers_need.length > 0 && (
          <Block title="กำลังมองหา">
            {user.powers_need.map((p) => (
              <PowerPill key={p} name={p} kind="need" />
            ))}
          </Block>
        )}

        {theirIdeas.length > 0 && (
          <section aria-labelledby="their-ideas" className="meadow-card p-5">
            <h2 id="their-ideas" className="mb-3 font-heading text-lead font-semibold text-ink">
              ไอเดียของเขา
            </h2>
            <ul className="flex flex-col gap-2">
              {theirIdeas.map((i) => (
                <li key={i.id}>
                  <Link
                    to="/marketplace"
                    className="tap flex min-h-14 items-center justify-between gap-2 rounded-2xl bg-sky-soft px-4 py-2 text-body font-semibold text-ink"
                  >
                    <span className="min-w-0 [overflow-wrap:anywhere]">{i.title}</span>
                    <ChevronRight className="h-6 w-6 shrink-0" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <QuickProfileSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onCloseAutoFocus={onSheetClosed}
        onSaved={onSaved}
        draft={draft}
        onDraftChange={setDraft}
        step={step}
        onStepChange={setStep}
      />

      {celebration && (
        <MatchCelebration
          me={celebration.me}
          other={user}
          reason={celebration.reason}
          connectionId={celebration.connectionId}
          inviteNote={celebration.inviteNote}
          onClose={() => {
            celebratingRef.current = false;
            focusActionAfterCelebration.current = true;
            setCelebration(null);
          }}
        />
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E6E3F2] bg-paper px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto w-full max-w-xl lg:max-w-3xl">
          {action === "retry-profile-sync" && (
            <p role="status" className="pb-2 text-center text-body font-semibold text-ink">
              <ProfileSyncFailed />
            </p>
          )}
          {action === "open-connection" && existing ? (
            <Link
              to="/connection/$id"
              params={{ id: existing.id }}
              ref={(el) => {
                actionRef.current = el;
              }}
              className="meadow-btn-primary tap w-full text-center"
            >
              เชื่อมกันแล้ว · ทำอะไรต่อ
            </Link>
          ) : (
            <button
              type="button"
              ref={(el) => {
                actionRef.current = el;
              }}
              onClick={onPrimary}
              aria-disabled={
                connecting || syncing || (action === "open-profile-sheet" && waitingForMe)
              }
              aria-busy={connecting || syncing}
              className="meadow-btn-primary tap w-full py-2 text-center [overflow-wrap:anywhere] aria-disabled:cursor-not-allowed aria-disabled:opacity-55"
            >
              {connecting
                ? "กำลังเชื่อมต่อ…"
                : action === "retry-profile-sync"
                  ? syncing
                    ? "กำลังส่ง…"
                    : "ส่งโปรไฟล์"
                  : action === "open-profile-sheet"
                    ? "สร้างโปรไฟล์เพื่อเชื่อมต่อ"
                    : `ขอเชื่อมต่อกับ ${user.name}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="meadow-card p-5">
      <h2 className="mb-3 font-heading text-lead font-semibold text-ink">{title}</h2>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}
