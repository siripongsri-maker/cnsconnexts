import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Bell } from "lucide-react";

import { BottomNav } from "@/components/bottom-nav";
import { DiscoverDeck } from "@/components/discover-deck";
import { MatchCelebration } from "@/components/match-celebration";
import { MeadowScene } from "@/components/meadow-scene";
import { PdpaConsent } from "@/components/pdpa-consent";
import { PendingSyncBanner } from "@/components/pending-sync-banner";
import { QuickProfileSheet } from "@/components/quick-profile-sheet";
import { SponsorFooter } from "@/components/sponsor-footer";
import { Wordmark } from "@/components/wordmark";
import { unseenEntries } from "@/lib/deck-rules";
import { isDevPreview } from "@/lib/dev-preview";
import { hasLocalParticipantId, homeVisitor } from "@/lib/guest";
import { buildDeck, dayKey, scoreMatch, type DeckEntry } from "@/lib/matching";
import { EMPTY_QUICK_DRAFT, type QuickDraft, type QuickStep } from "@/lib/quick-profile";
import { useConnectAndInvite } from "@/lib/meetup-context";
import { inviteSentNote } from "@/lib/meetup-cards";
import { useStore } from "@/lib/store";
import type { Connection, User } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "คนส. Connexts — เชื่อมคน เชื่อมไอเดีย เชื่อมพลัง" },
      {
        name: "description",
        content:
          "ทุกคนมีพลังของตัวเอง มาค้นหาว่าวันนี้คุณควรเชื่อมกับใคร ในงานสมัชชาสุขภาพแห่งชาติ",
      },
      { property: "og:title", content: "คนส. Connexts" },
      {
        property: "og:description",
        content: "เชื่อมคน เชื่อมไอเดีย เชื่อมพื้นที่ สู่การลงมือทำ",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

/** จอฉลองที่กำลังแสดง */
type Celebration = {
  me: User;
  other: User;
  reason: string;
  connectionId: string;
  /** "ส่งคำชวนเจอแล้ว รอ … ตอบ" — เฉพาะเชื่อมใหม่ (หรือตัวอย่าง dev) */
  inviteNote?: string | undefined;
};

/** รหัสคอนเนกชันปลอมของโหมดทดสอบ (?dryrun / ?celebrate) — ไม่มีแถวนี้ในฐานข้อมูล */
const DRYRUN_CONNECTION_ID = "dryrun";
const PREVIEW_CONNECTION_ID = "celebrate-preview";

/**
 * หน้าแรก = หน้าจับคู่ สแกน QR แล้วเห็นการ์ดคนแรกที่ควรคุยทันที ไม่ต้องกดอะไร
 *
 * ผู้เยี่ยมชม (ไม่มีโปรไฟล์ ไม่มีรหัสในเครื่อง): การ์ดเรียงแบบผู้เยี่ยมชม + แถบชวนทำโปรไฟล์
 * กด "ขอเชื่อมต่อ"/"เริ่มเลย" → แผ่นถาม 3 ข้อ แล้วเชื่อมกับคนบนการ์ดต่อทันที
 * คนเดิมที่มีรหัสในเครื่องแต่โปรไฟล์ยังไม่มา: การ์ดโครงกำลังโหลด ไม่มีแถบ ไม่เปิดแผ่นถาม
 * จนกว่า store จะโหลดเสร็จ (กติกาทั้งหมดอยู่ใน homeVisitor — src/lib/guest.ts)
 */
function Home() {
  const { me, users, notifications, hydrated, skippedUsers, likedUsers } = useStore();
  const connect = useConnectAndInvite();

  // localStorage มีแค่ฝั่งเบราว์เซอร์ — ก่อน mount ยังไม่รู้ว่าเป็นใคร: แสดงการ์ดโครง ไม่มีแถบ
  // (เรนเดอร์ฝั่งเซิร์ฟเวอร์กับรอบแรกฝั่งเบราว์เซอร์ตรงกัน และแถบไม่กะพริบให้คนเดิมเห็น)
  const [mounted, setMounted] = useState(false);
  const [hasLocalId, setHasLocalId] = useState(false);
  const [previewCelebrate, setPreviewCelebrate] = useState(false);
  useEffect(() => {
    setHasLocalId(hasLocalParticipantId());
    setPreviewCelebrate(isDevPreview("celebrate"));
    setMounted(true);
  }, []);

  const visitor = homeVisitor({ mounted, me, hasLocalId, hydrated });
  const guest = visitor === "guest";
  // ยังไม่รู้ว่าเป็นใคร หรือคนเดิมที่ store ยังโหลดไม่เสร็จ → การ์ดโครง; โหลดเสร็จแล้วยังไม่ได้โปรไฟล์
  // (returning-no-profile) ให้สำรับใช้สถานะของตัวเอง เช่น "ลองอีกครั้ง" ไม่ค้างโหลดตลอดไป
  const waitingForMe = visitor === "unknown" || visitor === "returning-loading";

  // แผ่นถาม 3 ข้อ — หน้านี้ถือสถานะเปิด/ปิดเอง (ห้ามคิดจาก !me: saveProfile ใส่ me ก่อนเขียนฐานข้อมูล
  // ถ้าบันทึกไม่สำเร็จแผ่นต้องค้างไว้พร้อมข้อความแจ้ง) และเก็บคำตอบไว้แม้ปิดแผ่น
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTarget, setSheetTarget] = useState<User | null>(null);
  const [draft, setDraft] = useState<QuickDraft>(EMPTY_QUICK_DRAFT);
  const [step, setStep] = useState<QuickStep>(1);
  const sheetOpenerRef = useRef<HTMLElement | null>(null);

  const [celebration, setCelebration] = useState<Celebration | null>(null);
  /** มีจอฉลองค้างอยู่ — อ่านตอนแผ่นถามปิดสนิท (อาจเกิดในรอบเรนเดอร์เดียวกับที่เปิดจอฉลอง) */
  const celebratingRef = useRef(false);
  const focusDeckAfterCelebration = useRef(false);
  /** คนที่เพิ่งเชื่อมจากหน้านี้ — เลื่อนไปการ์ดถัดไป ("ไว้ทีหลัง" = กลับการ์ดถัดไป) */
  const [connectedHere, setConnectedHere] = useState<string[]>([]);

  const deckRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const today = dayKey(new Date());
  const entries = useMemo(
    () => buildDeck(me, users, today).filter((e) => !connectedHere.includes(e.user.id)),
    [me, users, today, connectedHere],
  );
  const left = unseenEntries(entries, [...skippedUsers, ...likedUsers]).length;
  const unread = notifications.filter((n) => !n.read).length;

  /** ปุ่มหลักของสำรับ (อาจเป็นปุ่มของการ์ดใบถัดไปแล้ว) ถ้าไม่มีให้ไปที่หัวข้อหน้า */
  const focusDeck = useCallback(() => {
    const primary = deckRef.current?.querySelector<HTMLElement>("[data-deck-primary]");
    (primary ?? headingRef.current)?.focus();
  }, []);

  const openSheet = (target: User | null) => {
    // เปิดได้เฉพาะผู้เยี่ยมชม และคนเดิมที่โหลดเสร็จแล้วแต่ไม่พบโปรไฟล์ (ทางออกของเขา)
    // ระหว่างโหลดห้ามถามซ้ำ (ปกติไม่มีปุ่มให้กดอยู่แล้วเพราะสำรับยังโหลด)
    if (waitingForMe || me) return;
    const active = document.activeElement;
    sheetOpenerRef.current =
      active instanceof HTMLElement && active !== document.body ? active : null;
    setSheetTarget(target);
    setSheetOpen(true);
  };

  const showCelebration = (next: Celebration) => {
    celebratingRef.current = true;
    setConnectedHere((ids) => (ids.includes(next.other.id) ? ids : [...ids, next.other.id]));
    setCelebration(next);
  };

  const onConnected = (c: Connection, entry: DeckEntry) => {
    if (!me) return;
    showCelebration({
      me,
      other: entry.user,
      reason: c.match_reason,
      connectionId: c.id,
      inviteNote: inviteSentNote(entry.user.name),
    });
  };

  const onSaved = (newMe: User) => {
    const target = sheetTarget;
    setSheetOpen(false);
    setSheetTarget(null);
    setDraft(EMPTY_QUICK_DRAFT);
    setStep(1);
    if (!target) return;
    const m = scoreMatch(newMe, target);
    // โหมดทดสอบ ?dryrun: newMe เป็นผู้ใช้ปลอม ห้ามเรียก connect (เขียนฐานข้อมูลจริง)
    if (isDevPreview("dryrun")) {
      showCelebration({
        me: newMe,
        other: target,
        reason: m.reason,
        connectionId: DRYRUN_CONNECTION_ID,
        inviteNote: inviteSentNote(target.name),
      });
      return;
    }
    void connect(target.id, m.score, m.reason).then((result) => {
      // ไม่สำเร็จ: store ถอนคอนเนกชันและแจ้ง toast แล้ว — ไม่ฉลอง การ์ดเดิมยังอยู่ให้ลองใหม่
      if (!result.ok) return;
      showCelebration({
        me: newMe,
        other: target,
        reason: m.reason,
        connectionId: result.connection.id,
        inviteNote: result.existed ? undefined : inviteSentNote(target.name),
      });
    });
  };

  const onSheetClosed = (event: Event) => {
    // Radix คืนโฟกัสให้ Dialog.Trigger ซึ่งแผ่นนี้ไม่มี — จัดการเอง
    event.preventDefault();
    if (celebratingRef.current) return; // จอฉลองถือโฟกัสอยู่
    const opener = sheetOpenerRef.current;
    sheetOpenerRef.current = null;
    if (opener?.isConnected) opener.focus();
    else focusDeck(); // เช่น ปุ่ม "เริ่มเลย" หายไปหลังบันทึกโปรไฟล์แล้ว
  };

  // ตัวอย่างจอฉลองตอน dev (?celebrate): ใช้สองคนแรกที่โหลดมา ไม่เขียนข้อมูล
  const [first, second] = users;
  const preview: Celebration | null =
    previewCelebrate && !celebration && first && second
      ? {
          me: first,
          other: second,
          reason: scoreMatch(first, second).reason,
          connectionId: PREVIEW_CONNECTION_ID,
          inviteNote: inviteSentNote(second.name),
        }
      : null;
  const shown = celebration ?? preview;

  const closeCelebration = () => {
    celebratingRef.current = false;
    focusDeckAfterCelebration.current = true;
    if (celebration) setCelebration(null);
    else setPreviewCelebrate(false);
  };

  // ปิดจอฉลองแล้วกลับไปที่ปุ่มหลักของสำรับ — รอหลัง Radix คืนโฟกัส (setTimeout 0 ตอนถอด overlay)
  useEffect(() => {
    if (shown || !focusDeckAfterCelebration.current) return;
    focusDeckAfterCelebration.current = false;
    const t = setTimeout(focusDeck, 0);
    return () => clearTimeout(t);
  }, [shown, focusDeck]);

  return (
    <div
      className="min-h-dvh"
      style={{
        paddingBottom: "calc(6rem + env(safe-area-inset-bottom) + var(--pdpa-height, 0px))",
      }}
    >
      <header className="bg-sky">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3 px-4 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <Link
            to="/"
            aria-label="คนส. Connexts หน้าแรก"
            className="tap inline-flex min-h-12 min-w-0 items-center rounded-xl"
          >
            <Wordmark size="header" withMark />
          </Link>
          <Link
            to="/notifications"
            aria-label={unread > 0 ? `การแจ้งเตือน ${unread} รายการใหม่` : "การแจ้งเตือน"}
            className="tap relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-ink shadow-[0_6px_16px_-10px_rgba(43,40,120,0.45)]"
          >
            <Bell className="h-7 w-7" strokeWidth={2.2} aria-hidden />
            {unread > 0 && (
              <span
                aria-hidden
                className="absolute -right-2 -top-2 grid h-7 min-w-7 place-items-center rounded-full bg-primary px-1.5 text-body font-semibold leading-none text-white"
              >
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
        </div>
        {/* ฉากเต็มความกว้าง: ทุ่งกับฟ้าวาดเผื่อด้านข้างไว้ จอกว้างจึงเห็นขอบฟ้ายาวต่อเนื่อง ภูเขาอยู่กลาง */}
        <MeadowScene variant="header" className="pointer-events-none" />
      </header>

      <main id="main-content">
        {/* โปรไฟล์ที่บันทึกไม่สำเร็จ — อยู่ในเนื้อหาใต้แถบหัว ไม่ลอยทับแถบปุ่มของสำรับ */}
        <PendingSyncBanner />
        <div className="mx-auto w-full max-w-xl px-4 pt-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="font-heading text-display font-bold text-ink outline-none"
            >
              คนที่ควรเจอวันนี้
            </h1>
            {!waitingForMe && left > 0 && (
              <p className="text-body font-semibold text-ink-soft">เหลือ {left} คน</p>
            )}
          </div>

          {guest && (
            <div className="mt-4 flex items-center gap-3 rounded-3xl border border-[#E6E3F2] bg-sky-soft p-4 max-[359px]:flex-col max-[359px]:items-stretch">
              <p className="min-w-0 flex-1 text-body font-semibold text-ink">
                {/* เว้นวรรคไม่ตัดบรรทัดระหว่าง "3" กับ "ข้อ" */}
                บอกเรื่องที่คุณสนใจ 3{"\u00A0"}ข้อ แมตช์จะแม่นขึ้น
              </p>
              <button
                type="button"
                onClick={() => openSheet(null)}
                className="meadow-btn-secondary tap shrink-0"
              >
                เริ่มเลย
              </button>
            </div>
          )}
        </div>

        {/* หัวข้อของส่วนสำรับ ให้ชื่อบนการ์ด (h3) ไม่ข้ามระดับ */}
        <h2 className="sr-only">การ์ดคนที่ควรเจอ</h2>
        {/* contents: แถบปุ่ม sticky ของสำรับใช้ <main> เป็นกรอบ (ดู discover-deck) */}
        <div className="h-4" aria-hidden />
        <div ref={deckRef} className="contents">
          <DiscoverDeck
            entries={entries}
            me={me}
            loading={waitingForMe}
            onNeedProfile={openSheet}
            onConnected={onConnected}
          />
        </div>
      </main>

      <div className="mx-auto mt-10 flex w-full max-w-xl flex-col items-center px-4">
        <SponsorFooter className="pb-4" />
        <Link
          to="/guide"
          className="tap inline-flex min-h-12 items-center gap-2 rounded-xl px-3 text-body font-semibold text-primary underline underline-offset-4"
        >
          คู่มือใช้งาน
          <ArrowUpRight className="h-6 w-6" aria-hidden />
        </Link>
      </div>

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

      {shown && (
        <MatchCelebration
          me={shown.me}
          other={shown.other}
          reason={shown.reason}
          connectionId={shown.connectionId}
          inviteNote={shown.inviteNote}
          onClose={closeCelebration}
        />
      )}

      <PdpaConsent />
      <BottomNav />
    </div>
  );
}
