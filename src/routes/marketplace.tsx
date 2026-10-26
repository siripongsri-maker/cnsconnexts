import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  Handshake,
  MapPin,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { ExploreTabs } from "@/components/explore-tabs";
import { IdeaForm } from "@/components/idea-form";
import { ChoicePill } from "@/components/choice-pill";
import { Avatar, IssueBlock, PowerIcon } from "@/components/power-bits";
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
import { ISSUES, POWERS, REGIONS, type Idea, type Region } from "@/lib/types";
import { issueTh, powerTh, REGION_LABEL, regionLabel } from "@/lib/i18n";

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

  const extraFilters = [issue, region, need].filter(Boolean).length;

  return (
    <AppShell
      title="สำรวจ"
      subtitle="จับคู่ไอเดียกับพลัง"
      action={
        <button type="button" onClick={openNewIdea} className="meadow-btn-primary tap">
          <Plus className="h-6 w-6 shrink-0" aria-hidden="true" /> ลงไอเดีย
        </button>
      }
    >
      <ExploreTabs current="ideas" />
      <div className="min-w-0 space-y-5 pb-4">
        <section aria-label="ตัวกรองไอเดีย" className="meadow-card space-y-4 p-5">
          <h2 className="font-heading text-lead font-semibold! text-ink">
            พลังของคุณต่อยอดอะไรได้บ้าง
          </h2>
          <div role="group" aria-label="แสดงไอเดีย" className="flex flex-wrap gap-2">
            <ChoicePill active={scope === "all"} onClick={() => setScope("all")}>
              ไอเดียทั้งหมด
            </ChoicePill>
            {me && (
              <ChoicePill active={scope === "fit"} onClick={() => setScope("fit")}>
                เหมาะกับฉัน
              </ChoicePill>
            )}
            <ChoicePill active={scope === "mine"} onClick={() => setScope("mine")}>
              ของฉัน
            </ChoicePill>
            <ChoicePill active={scope === "saved"} onClick={() => setScope("saved")}>
              ที่บันทึกไว้ ({savedCount})
            </ChoicePill>
          </div>

          <details className="group rounded-2xl bg-sky-soft px-4">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 text-body text-ink [&::-webkit-details-marker]:hidden">
              <span className="font-semibold">ตัวกรองเพิ่มเติม</span>
              <span className="flex shrink-0 items-center gap-2 text-ink-soft">
                {extraFilters > 0 ? `${extraFilters} ตัวกรอง` : "ทั้งหมด"}
                <ChevronDown
                  className="h-6 w-6 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </span>
            </summary>
            <div className="space-y-5 pb-4 pt-2">
              <FilterRow label="ประเด็น">
                <ChoicePill active={!issue} onClick={() => setIssue(null)}>
                  ทุกประเด็น
                </ChoicePill>
                {ISSUES.filter((i) => i !== "Other").map((i) => (
                  <ChoicePill key={i} active={issue === i} onClick={() => setIssue(i)}>
                    {issueTh(i)}
                  </ChoicePill>
                ))}
              </FilterRow>
              <FilterRow label="ภูมิภาค">
                <ChoicePill active={!region} onClick={() => setRegion(null)}>
                  ทุกภูมิภาค
                </ChoicePill>
                {REGIONS.map((r) => (
                  <ChoicePill key={r} active={region === r} onClick={() => setRegion(r)}>
                    {REGION_LABEL[r]}
                  </ChoicePill>
                ))}
              </FilterRow>
              <FilterRow label="พลังที่เขาต้องการ">
                <ChoicePill active={!need} onClick={() => setNeed(null)}>
                  ทุกความต้องการ
                </ChoicePill>
                {needOptions.map((n) => (
                  <ChoicePill key={n} active={need === n} onClick={() => setNeed(n)}>
                    <PowerIcon name={n} className="h-5 w-5 shrink-0" /> ต้องการ{powerTh(n)}
                  </ChoicePill>
                ))}
              </FilterRow>
            </div>
          </details>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p aria-live="polite" className="text-body text-ink-soft">
              {hasFilters
                ? `ตรงกับตัวกรอง ${filtered.length} ไอเดีย`
                : `ทั้งหมด ${ideas.length} ไอเดีย`}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="tap min-h-12 rounded-full px-3 text-body font-semibold text-primary underline underline-offset-4"
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>
        </section>

        {!me && (
          <Link to="/onboarding" className="meadow-btn-secondary tap w-full text-center">
            สร้างโปรไฟล์ เพื่อดูไอเดียที่คุณช่วยได้
          </Link>
        )}

        {filtered.length > 0 && (
          <ul aria-label="รายการไอเดีย" className="grid gap-5">
            {filtered.map((idea) => {
              const owner = users.find((u) => u.id === idea.owner_id);
              const saved = savedIdeas.includes(idea.id);
              const isMine = idea.owner_id === "me";
              const f = fitOf(idea);
              return (
                <li key={idea.id}>
                  <article className="meadow-card space-y-4 p-5">
                    {(f.canHelp.length > 0 || f.theyHelp.length > 0) && (
                      <div className="flex flex-wrap gap-2">
                        {f.canHelp.length > 0 && (
                          <span className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#3D7A1C] px-3 py-1 text-body font-semibold text-white">
                            <Sparkles className="h-5 w-5 shrink-0" aria-hidden="true" />
                            คุณช่วยได้: {powerTh(f.canHelp[0] ?? "")}
                          </span>
                        )}
                        {f.theyHelp.length > 0 && (
                          <span className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-sky px-3 py-1 text-body font-semibold text-ink">
                            <Handshake className="h-5 w-5 shrink-0" aria-hidden="true" />
                            เขาเติมให้คุณได้: {powerTh(f.theyHelp[0] ?? "")}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <h3 className="font-heading text-lead leading-snug font-semibold break-words text-ink">
                        {idea.title}
                      </h3>
                      <p className="text-body break-words text-ink-soft">{idea.description}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {regionLabel(idea.region) && (
                        <span className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-sky px-3 py-1 text-body font-semibold text-ink">
                          <MapPin className="h-5 w-5 shrink-0" aria-hidden="true" />
                          {regionLabel(idea.region)}
                        </span>
                      )}
                      {idea.issues.map((i) => (
                        <IssueBlock key={i} issue={i} />
                      ))}
                    </div>

                    {owner && (
                      <div className="flex items-center gap-3">
                        <Avatar user={owner} size={48} />
                        <p className="line-clamp-2 min-w-0 flex-1 text-body leading-snug break-words text-ink">
                          <span className="font-semibold">{owner.name}</span>
                          <span className="text-ink-soft"> · {owner.organization}</span>
                        </p>
                      </div>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <ResourceList title="มีให้" items={idea.resources_have} />
                      <ResourceList title="ต้องการ" items={idea.resources_need} />
                    </div>

                    {isMine && (
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(idea);
                            setFormOpen(true);
                          }}
                          className="meadow-btn-secondary tap min-h-14 flex-1"
                        >
                          <Pencil className="h-5 w-5 shrink-0" aria-hidden="true" /> แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(idea)}
                          className="tap inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-[18px] border-2 border-[#B3261E] bg-white px-5 text-body font-semibold text-[#B3261E]"
                        >
                          <Trash2 className="h-5 w-5 shrink-0" aria-hidden="true" /> ลบ
                        </button>
                      </div>
                    )}

                    <div className="flex flex-col gap-3">
                      {isMine ? (
                        <p className="flex min-h-14 items-center rounded-2xl bg-sky-soft px-4 py-2 text-body font-semibold text-ink">
                          ไอเดียของคุณ · รอเพื่อนมาร่วมทำ
                        </p>
                      ) : me && !owner ? (
                        <button
                          type="button"
                          disabled
                          aria-disabled="true"
                          className="meadow-btn-secondary w-full"
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
                            void connect(
                              owner.id,
                              m.score,
                              `อยากร่วมไอเดีย “${idea.title}” · ${m.reason}`,
                            ).then((result) => {
                              // ไม่สำเร็จ: store ถอนคอนเนกชันและแจ้ง toast ให้ลองอีกครั้งแล้ว
                              if (!result.ok) return;
                              toast.success("ส่งคำขอเชื่อมแล้ว!", {
                                description: `มาคิดกันว่าจะทำ “${idea.title}” กับ ${owner.name} ยังไงดี`,
                              });
                              navigate({
                                to: "/connection/$id",
                                params: { id: result.connection.id },
                              });
                            });
                          }}
                          className="meadow-btn-primary tap w-full"
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
                        className={`meadow-btn-secondary tap w-full ${saved ? "bg-sky!" : ""}`}
                      >
                        {saved ? (
                          <BookmarkCheck className="h-6 w-6 shrink-0" aria-hidden="true" />
                        ) : (
                          <Bookmark className="h-6 w-6 shrink-0" aria-hidden="true" />
                        )}
                        <span>{saved ? "บันทึกแล้ว" : "บันทึก"}</span>
                      </button>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}

        {filtered.length === 0 && (
          <div className="meadow-card space-y-3 p-5">
            <h2 className="font-heading text-title font-semibold! text-ink">เริ่มจากไอเดียเดียว</h2>
            {hasFilters && (scope === "all" || scope === "fit") ? (
              <>
                <p className="text-body text-ink-soft">ไม่พบไอเดียที่ตรงตัวกรอง ลองล้างตัวกรอง</p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="meadow-btn-primary tap w-full"
                >
                  ล้างตัวกรอง
                </button>
                <button
                  type="button"
                  onClick={openNewIdea}
                  className="meadow-btn-secondary tap w-full"
                >
                  ลงไอเดีย
                </button>
              </>
            ) : (
              <>
                <p className="text-body text-ink-soft">{emptyText}</p>
                {scope === "saved" || scope === "fit" ? (
                  <button
                    type="button"
                    onClick={() => setScope("all")}
                    className="meadow-btn-primary tap w-full"
                  >
                    ดูไอเดียทั้งหมด
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={openNewIdea}
                    className="meadow-btn-primary tap w-full"
                  >
                    ลงไอเดีย
                  </button>
                )}
              </>
            )}
          </div>
        )}

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
          <AlertDialogContent className="rounded-3xl border-[#E6E3F2] bg-white p-6 text-ink">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-heading text-title leading-snug font-semibold">
                ลบไอเดีย “{pendingDelete?.title}” ไหม?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-body text-ink-soft">
                ลบแล้วกู้คืนไม่ได้นะ
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3 sm:gap-3 sm:space-x-0">
              <AlertDialogCancel className="meadow-btn-secondary mt-0 min-h-14">
                ยังก่อน
              </AlertDialogCancel>
              <AlertDialogAction
                className="min-h-14 rounded-[18px] bg-[#B3261E] px-5 text-body font-semibold text-white hover:bg-[#B3261E]/90"
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

function ResourceList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl bg-sky-soft p-4">
      <p className="mb-2 text-body font-semibold text-ink">{title}</p>
      {items.length === 0 ? (
        <p className="text-body text-ink-soft">ยังไม่ระบุ</p>
      ) : (
        <ul className="space-y-1">
          {items.map((r) => (
            <li key={r} className="flex items-start gap-2 text-body text-ink">
              <PowerIcon name={r} className="mt-1 h-5 w-5 shrink-0 text-primary" />
              <span className="min-w-0 break-words">{powerTh(r)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label}>
      <p className="mb-2 text-body font-semibold text-ink">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
