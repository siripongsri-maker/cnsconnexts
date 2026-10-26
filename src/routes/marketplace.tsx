import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bookmark, BookmarkCheck, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { ExploreTabs } from "@/components/explore-tabs";
import { MissionVisual } from "@/components/mission-ui";
import { IdeaForm } from "@/components/idea-form";
import { Avatar, Chip } from "@/components/power-bits";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { scoreMatch } from "@/lib/matching";
import { useStore } from "@/lib/store";
import { ISSUES, POWER_EMOJI, POWERS, REGIONS, type Idea, type Region } from "@/lib/types";
import { issueTh, powerTh, REGION_LABEL } from "@/lib/i18n";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "ตลาดพลัง — คนส. Connexts" },
      {
        name: "description",
        content:
          "จับคู่ไอเดียกับพลัง! เลือกโปรเจกต์ที่กำลังมองหาพาร์ตเนอร์ ทุน คอนเนกชัน หรือความรู้ท้องถิ่น",
      },
      { property: "og:title", content: "ตลาดพลัง — คนส. Connexts" },
      { property: "og:description", content: "ตลาดแลกเปลี่ยนพลังและไอเดีย" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Marketplace,
});

type Scope = "all" | "fit" | "mine" | "saved";

function Marketplace() {
  const { ideas, users, savedIdeas, toggleSaveIdea, connect, connections, me, removeIdea } =
    useStore();
  const navigate = useNavigate();
  const [issue, setIssue] = useState<string | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [need, setNeed] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Idea | null>(null);
  const [scope, setScope] = useState<Scope>("all");
  const [pendingDelete, setPendingDelete] = useState<Idea | null>(null);

  const needOptions = useMemo(() => {
    const known = POWERS.map((p) => p.key as string).filter((k) =>
      ideas.some((i) => i.resources_need.includes(k)),
    );
    const extra = Array.from(
      new Set(
        ideas.flatMap((i) => i.resources_need).filter((k) => !POWERS.some((p) => p.key === k)),
      ),
    );
    return [...known, ...extra];
  }, [ideas]);

  const savedCount = ideas.filter((i) => savedIdeas.includes(i.id)).length;

  const fitOf = (i: Idea) => {
    if (!me || i.owner_id === "me") return { canHelp: [] as string[], theyHelp: [] as string[] };
    return {
      canHelp: i.resources_need.filter((p) => (me.powers_have ?? []).includes(p)),
      theyHelp: i.resources_have.filter((p) => (me.powers_need ?? []).includes(p)),
    };
  };
  const fitScore = (i: Idea) => {
    const f = fitOf(i);
    return f.canHelp.length * 2 + f.theyHelp.length;
  };

  const inScope = (i: Idea) => {
    if (scope === "mine") return i.owner_id === "me";
    if (scope === "saved") return savedIdeas.includes(i.id);
    if (scope === "fit") return fitScore(i) > 0;
    return true;
  };

  const filtered = ideas
    .filter(
      (i) =>
        (!issue || i.issues.includes(issue)) &&
        (!region || i.region === region) &&
        (!need || i.resources_need.includes(need)) &&
        inScope(i),
    )
    .map((i, idx) => ({ i, idx, s: fitScore(i) }))
    .sort((a, b) => b.s - a.s || a.idx - b.idx)
    .map((x) => x.i);

  const hasFilters = !!(issue || region || need);
  const clearFilters = () => {
    setIssue(null);
    setRegion(null);
    setNeed(null);
  };

  const openNewIdea = () => {
    if (!me) {
      navigate({ to: "/onboarding" });
      return;
    }
    setEditing(null);
    setFormOpen(true);
  };

  const emptyText =
    scope === "saved"
      ? "ยังไม่มีไอเดียที่บันทึก กดบันทึกไว้ดูภายหลังได้"
      : scope === "mine"
        ? "คุณยังไม่ได้ลงไอเดียเลย"
        : scope === "fit"
          ? "ยังไม่มีไอเดียที่ตรงพลัง ลองเพิ่มพลังในโปรไฟล์หรือดูทั้งหมด"
          : "ยังไม่มีไอเดียในหมวดนี้";

  return (
    <AppShell
      title="สำรวจ"
      subtitle="จับคู่ไอเดียกับพลัง"
      action={
        <button
          type="button"
          onClick={openNewIdea}
          className="tap inline-flex h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-[13px] font-extrabold text-primary-foreground shadow-sm"
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> ลงไอเดีย
        </button>
      }
    >
      <ExploreTabs current="ideas" />
      <div className="core-page core-marketplace">
        <section className="core-filter-panel space-y-2 px-5 py-3" aria-label="ตัวกรองไอเดีย">
          <div className="core-section-head">
            <div>
              <p className="mission-kicker">IDEAS IN MOTION</p>
              <h2>พลังของคุณต่อยอดอะไรได้บ้าง</h2>
            </div>
            <span className="core-data-count">
              {filtered.length}
              <span>ไอเดีย</span>
            </span>
          </div>
          <Row label="แสดงไอเดีย" fade={false}>
            <Pill active={scope === "all"} onClick={() => setScope("all")}>
              ไอเดียทั้งหมด
            </Pill>
            {me && (
              <Pill active={scope === "fit"} onClick={() => setScope("fit")}>
                เหมาะกับฉัน
              </Pill>
            )}
            <Pill active={scope === "mine"} onClick={() => setScope("mine")}>
              ของฉัน
            </Pill>
            <Pill active={scope === "saved"} onClick={() => setScope("saved")}>
              ที่บันทึกไว้ ({savedCount})
            </Pill>
          </Row>
          <Row label="กรองตามประเด็น">
            <Pill active={!issue} onClick={() => setIssue(null)}>
              ทุกประเด็น
            </Pill>
            {ISSUES.filter((i) => i !== "Other").map((i) => (
              <Pill key={i} active={issue === i} onClick={() => setIssue(i)}>
                {issueTh(i)}
              </Pill>
            ))}
          </Row>
          <Row label="กรองตามภูมิภาค">
            <Pill active={!region} onClick={() => setRegion(null)}>
              ทุกภูมิภาค
            </Pill>
            {REGIONS.map((r) => (
              <Pill key={r} active={region === r} onClick={() => setRegion(r)}>
                {REGION_LABEL[r]}
              </Pill>
            ))}
          </Row>
          <Row label="กรองตามสิ่งที่เขาต้องการ">
            <Pill active={!need} onClick={() => setNeed(null)}>
              ทุกความต้องการ
            </Pill>
            {needOptions.map((n) => (
              <Pill key={n} active={need === n} onClick={() => setNeed(n)}>
                <span aria-hidden>{POWER_EMOJI[n] ?? "✨"}</span> ต้องการ{powerTh(n)}
              </Pill>
            ))}
          </Row>
          <div className="flex min-h-6 items-center justify-between">
            <p aria-live="polite" className="text-xs font-semibold text-muted-foreground">
              {hasFilters
                ? `ตรงกับตัวกรอง ${filtered.length} ไอเดีย`
                : `ทั้งหมด ${ideas.length} ไอเดีย`}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="tap min-h-10 px-2 text-xs font-bold text-primary underline-offset-2 hover:underline"
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>
        </section>

        {!me && (
          <Link
            to="/onboarding"
            className="tap mx-5 mb-2 flex min-h-11 items-center rounded-xl bg-primary/10 px-3 text-[13px] font-semibold text-primary"
          >
            สร้างโปรไฟล์ เพื่อดูไอเดียที่คุณช่วยได้ →
          </Link>
        )}

        <div className="core-idea-grid px-5 pb-6">
          {filtered.map((idea, idx) => {
            const owner = users.find((u) => u.id === idea.owner_id);
            const saved = savedIdeas.includes(idea.id);
            const isMine = idea.owner_id === "me";
            const f = fitOf(idea);
            return (
              <article
                key={idea.id}
                className="mission-idea card-soft animate-rise overflow-hidden"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="core-idea-body p-4">
                  <div className="core-card-index">
                    <span>IDEA / {String(idx + 1).padStart(2, "0")}</span>
                    <span>
                      {REGION_LABEL[idea.region]} <span aria-hidden="true">↗</span>
                    </span>
                  </div>
                  {(f.canHelp.length > 0 || f.theyHelp.length > 0) && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {f.canHelp.length > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-lime/30 px-2.5 py-1 text-[12px] font-bold text-lime-foreground">
                          <span aria-hidden>✨</span> คุณช่วยได้: {powerTh(f.canHelp[0] ?? "")}
                        </span>
                      )}
                      {f.theyHelp.length > 0 && (
                        <Chip tone="primary" className="font-bold">
                          <span aria-hidden>🤝</span> เขาเติมให้คุณได้:{" "}
                          {powerTh(f.theyHelp[0] ?? "")}
                        </Chip>
                      )}
                    </div>
                  )}
                  <h3 className="text-lg font-extrabold leading-tight">{idea.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                    {idea.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-electric/12 px-2.5 py-1 text-xs font-semibold text-electric-ink">
                      <span aria-hidden>📍</span> {REGION_LABEL[idea.region]}
                    </span>
                    {idea.issues.map((i) => (
                      <Chip key={i} tone="primary">
                        {issueTh(i)}
                      </Chip>
                    ))}
                  </div>

                  {owner && (
                    <div className="mt-3 flex items-center gap-2">
                      <Avatar user={owner} size={32} />
                      <p className="min-w-0 flex-1 line-clamp-2 break-words text-[12px] font-semibold leading-snug">
                        {owner.name} ·{" "}
                        <span className="text-muted-foreground">{owner.organization}</span>
                      </p>
                    </div>
                  )}

                  <div className="core-resource-pair mt-3 grid grid-cols-2 gap-3">
                    <div className="border-t border-border p-3">
                      <p className="mb-1.5 text-xs font-medium text-lime-ink">มีให้</p>
                      <ul className="space-y-0.5 text-[12px] font-semibold">
                        {idea.resources_have.map((r) => (
                          <li key={r}>
                            <span aria-hidden>{POWER_EMOJI[r] ?? "✨"}</span> {powerTh(r)}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="border-t border-border p-3">
                      <p className="mb-1.5 text-xs font-extrabold text-foreground">ต้องการ</p>
                      <ul className="space-y-0.5 text-[12px] font-semibold">
                        {idea.resources_need.map((r) => (
                          <li key={r}>
                            <span aria-hidden>{POWER_EMOJI[r] ?? "✨"}</span> {powerTh(r)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {isMine && (
                    <div className="mt-3 flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(idea);
                          setFormOpen(true);
                        }}
                        className="tap inline-flex h-11 items-center gap-1 rounded-lg border border-border px-3 text-[12px] font-bold"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> แก้ไข
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(idea)}
                        className="tap inline-flex h-11 items-center gap-1 rounded-lg border border-destructive/40 px-3 text-[12px] font-bold text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> ลบ
                      </button>
                    </div>
                  )}

                  <div className="core-idea-actions mt-4 flex gap-2">
                    {isMine ? (
                      <p className="flex h-12 flex-1 items-center rounded-xl bg-muted px-3 text-[13px] font-semibold text-muted-foreground">
                        ไอเดียของคุณ · รอเพื่อนมาร่วมทำ
                      </p>
                    ) : me && !owner ? (
                      <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        className="h-12 flex-1 rounded-xl bg-muted text-sm font-bold text-muted-foreground"
                      >
                        ไม่พบเจ้าของไอเดีย
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (!me) {
                            navigate({ to: "/onboarding" });
                            return;
                          }
                          if (!owner || owner.id === "me") return;
                          const existing = connections.find(
                            (c) =>
                              (c.user_a === "me" && c.user_b === owner.id) ||
                              (c.user_b === "me" && c.user_a === owner.id),
                          );
                          if (existing) {
                            toast(
                              `คุณกับ ${owner.name} เชื่อมกันอยู่แล้ว ไปคุยต่อเรื่องไอเดียนี้กัน`,
                            );
                            navigate({ to: "/connection/$id", params: { id: existing.id } });
                            return;
                          }
                          const m = scoreMatch(me, owner);
                          const conn = connect(
                            owner.id,
                            m.score,
                            `อยากร่วมไอเดีย “${idea.title}” · ${m.reason}`,
                          );
                          toast.success("ส่งคำขอเชื่อมแล้ว! ✨", {
                            description: `มาคิดกันว่าจะทำ “${idea.title}” กับ ${owner.name} ยังไงดี`,
                          });
                          navigate({ to: "/connection/$id", params: { id: conn.id } });
                        }}
                        className="tap h-12 flex-1 rounded-xl gradient-power text-sm font-extrabold text-primary-foreground"
                      >
                        ขอเชื่อมต่อ
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        toggleSaveIdea(idea.id);
                        toast(
                          saved
                            ? "เอาออกจากที่บันทึกไว้แล้ว"
                            : "บันทึกไว้แล้ว ดูได้ที่แท็บ “ที่บันทึกไว้”",
                        );
                      }}
                      aria-pressed={saved}
                      aria-label={
                        saved ? "เอาไอเดียนี้ออกจากที่บันทึกไว้" : "บันทึกไอเดียนี้ไว้ดูทีหลัง"
                      }
                      className={`tap inline-flex h-12 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-[13px] font-bold ${
                        saved
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card"
                      }`}
                    >
                      {saved ? (
                        <BookmarkCheck className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <Bookmark className="h-5 w-5" aria-hidden="true" />
                      )}
                      <span>{saved ? "บันทึกแล้ว" : "บันทึก"}</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}

          {filtered.length === 0 && (
            <div className="core-empty mission-empty">
              <MissionVisual variant="signal" className="core-empty-visual" />
              <p className="mission-kicker">ROOM FOR YOUR IDEA</p>
              <h2>เริ่มจากไอเดียเดียว</h2>
              {hasFilters && (scope === "all" || scope === "fit") ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    ไม่พบไอเดียที่ตรงตัวกรอง ลองล้างตัวกรอง
                  </p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="tap mt-3 h-11 w-full rounded-xl bg-primary text-sm font-extrabold text-primary-foreground"
                  >
                    ล้างตัวกรอง
                  </button>
                  <button
                    type="button"
                    onClick={openNewIdea}
                    className="tap mt-2 h-11 w-full rounded-xl border border-border bg-card text-sm font-bold"
                  >
                    ลงไอเดีย
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">{emptyText}</p>
                  {scope === "saved" || scope === "fit" ? (
                    <button
                      type="button"
                      onClick={() => setScope("all")}
                      className="tap mt-3 h-11 w-full rounded-xl bg-primary text-sm font-extrabold text-primary-foreground"
                    >
                      ดูไอเดียทั้งหมด
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={openNewIdea}
                      className="tap mt-3 h-11 w-full rounded-xl bg-primary text-sm font-extrabold text-primary-foreground"
                    >
                      ลงไอเดีย
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {formOpen && (
          <IdeaForm
            idea={editing ?? undefined}
            onClose={() => {
              setFormOpen(false);
              setEditing(null);
            }}
          />
        )}

        <AlertDialog
          open={!!pendingDelete}
          onOpenChange={(open) => {
            if (!open) setPendingDelete(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>ลบไอเดีย “{pendingDelete?.title}” ไหม?</AlertDialogTitle>
              <AlertDialogDescription>ลบแล้วกู้คืนไม่ได้นะ</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="min-h-11">ยังก่อน</AlertDialogCancel>
              <AlertDialogAction
                className="min-h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (!pendingDelete) return;
                  removeIdea(pendingDelete.id);
                  toast.success("ลบไอเดียแล้ว");
                  setPendingDelete(null);
                }}
              >
                ลบเลย
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppShell>
  );
}

function Row({
  label,
  fade = true,
  children,
}: {
  label: string;
  fade?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`core-filter-row no-scrollbar flex gap-2 overflow-x-auto pr-6 ${
        fade ? "[mask-image:linear-gradient(to_right,#000_85%,transparent)]" : ""
      }`}
    >
      <span className="core-filter-label">
        {label
          .replace("กรองตาม", "")
          .replace("แสดงไอเดีย", "มุมมอง")
          .replace("สิ่งที่เขาต้องการ", "พลังที่ต้องการ")}
      </span>
      {children}
    </div>
  );
}

function Pill({
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
      className={`tap inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full border px-3.5 text-xs font-bold ${
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
      }`}
    >
      {children}
    </button>
  );
}
