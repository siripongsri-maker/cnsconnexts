import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Heart, Layers, List } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MatchCard } from "@/components/match-card";
import { ShareCardButton } from "@/components/share-card-button";
import { DiscoverDeck } from "@/components/discover-deck";
import { rankMatches } from "@/lib/matching";
import { useStore } from "@/lib/store";
import { ISSUES } from "@/lib/types";
import { issueTh } from "@/lib/i18n";

export const Route = createFileRoute("/matches")({
  head: () => ({
    meta: [
      { title: "คนที่คุณควรเจอวันนี้ — คนส. Connexts" },
      {
        name: "description",
        content:
          "ปัดเพื่อค้นหาคนที่ใช่ กดถูกใจหรือขอเชื่อมต่อได้ทันที พร้อมเหตุผลที่แมตช์กันแบบสั้นๆ",
      },
      { property: "og:title", content: "คนที่คุณควรเจอวันนี้" },
      { property: "og:description", content: "ปัดเร็ว กดถูกใจ ขอเชื่อมต่อได้ในแตะเดียว" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Matches,
});

type Mode = "deck" | "list" | "liked";

function Matches() {
  const { me, users, hydrated, likedUsers, skippedUsers } = useStore();
  const navigate = useNavigate();
  const [issue, setIssue] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("deck");

  useEffect(() => {
    if (!hydrated || me) return;
    // มีโปรไฟล์อยู่แล้วในเครื่องนี้ (แค่ยังโหลดไม่เสร็จ) อย่าเด้งไปกรอกซ้ำ
    let hasProfile = false;
    try {
      hasProfile = !!localStorage.getItem("connexts-participant-id");
    } catch {
      hasProfile = false;
    }
    if (hasProfile) return;
    navigate({ to: "/onboarding", replace: true });
  }, [hydrated, me, navigate]);

  const all = useMemo(() => {
    if (!me) return [];
    const ranked = rankMatches(me, users, 30);
    return issue ? ranked.filter((m) => m.user.interests.includes(issue)) : ranked;
  }, [me, users, issue]);

  const deck = useMemo(
    () => all.filter((m) => !skippedUsers.includes(m.user.id) && !likedUsers.includes(m.user.id)),
    [all, skippedUsers, likedUsers],
  );
  const liked = useMemo(() => all.filter((m) => likedUsers.includes(m.user.id)), [all, likedUsers]);

  if (!me) {
    return (
      <AppShell title="คนที่คุณควรเจอวันนี้">
        {!hydrated ? (
          <p className="p-6 text-sm text-muted-foreground">กำลังโหลดรายชื่อคู่เชื่อม…</p>
        ) : (
          <div role="status" className="card-soft m-5 grid gap-3 p-6 text-center">
            <p className="text-sm font-bold">ยังโหลดโปรไฟล์ไม่ได้</p>
            <p className="text-[12px] text-muted-foreground">
              ลองโหลดอีกครั้ง ข้อมูลของคุณยังอยู่ครบ
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="tap inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
            >
              ลองอีกครั้ง
            </button>
            <Link
              to="/onboarding"
              className="tap inline-flex min-h-11 items-center justify-center text-sm font-bold text-primary underline underline-offset-4"
            >
              กรอกโปรไฟล์อีกครั้ง
            </Link>
          </div>
        )}
      </AppShell>
    );
  }

  return (
    <AppShell
      title="คนที่คุณควรเจอวันนี้"
      titleEn="Discover"
      action={
        <ShareCardButton
          me={me}
          matches={all}
          kind="matches"
          label="แชร์"
          className="min-h-11 bg-secondary text-secondary-foreground"
        />
      }
    >
      <div className="px-5 pt-3">
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1">
          <ModeTab
            active={mode === "deck"}
            onClick={() => setMode("deck")}
            icon={<Layers className="h-4 w-4" />}
          >
            ปัดเร็ว
          </ModeTab>
          <ModeTab
            active={mode === "list"}
            onClick={() => setMode("list")}
            icon={<List className="h-4 w-4" />}
          >
            รายการ
          </ModeTab>
          <ModeTab
            active={mode === "liked"}
            onClick={() => setMode("liked")}
            icon={<Heart className="h-4 w-4" />}
          >
            ถูกใจ {liked.length > 0 ? `(${liked.length})` : ""}
          </ModeTab>
        </div>
      </div>

      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-5 py-3">
        <FilterPill active={!issue} onClick={() => setIssue(null)}>
          ทุกประเด็น
        </FilterPill>
        {ISSUES.filter((i) => i !== "Other").map((i) => (
          <FilterPill key={i} active={issue === i} onClick={() => setIssue(i)}>
            {issueTh(i)}
          </FilterPill>
        ))}
      </div>

      {mode === "deck" ? (
        <div className="pb-8">
          <DiscoverDeck matches={deck} onShowLiked={() => setMode("liked")} />
        </div>
      ) : (
        <div className="space-y-3 px-5 pb-6">
          {(mode === "liked" ? liked : all).length === 0 && (
            <p className="card-soft p-6 text-center text-sm text-muted-foreground">
              {mode === "liked"
                ? "ยังไม่มีคนถูกใจ ลองโหมดปัดเร็ว"
                : "ยังไม่มีใครในหมวดนี้ ลองประเด็นอื่น"}
            </p>
          )}
          {(mode === "liked" ? liked : all).map((m, i) => (
            <MatchCard key={m.user.id} match={m} index={i} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

function ModeTab({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`tap inline-flex h-11 items-center justify-center gap-1.5 rounded-xl text-[12px] font-extrabold ${
        active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`tap inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-[12px] font-bold ${
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
      }`}
    >
      {children}
    </button>
  );
}
