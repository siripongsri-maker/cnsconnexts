import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BookOpen, Download, Sparkles, Star, Mic } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ChoicePill } from "@/components/choice-pill";
import { IssueBlock } from "@/components/power-bits";
import { BLOCK_TAG } from "@/lib/issue-colors";
import { useStore } from "@/lib/store";
import { REGIONS, type Region, type Submission } from "@/lib/types";
import { issueTh, provinceTh, REGION_LABEL, regionLabel } from "@/lib/i18n";

export const Route = createFileRoute("/ebook")({
  head: () => ({
    meta: [
      { title: "หนังสือรวมผลงาน — คนส. Connexts" },
      {
        name: "description",
        content:
          "รวมผลงานสมาชิกเครือข่าย จัดกลุ่มตามภาคและตามประเด็นนโยบาย พร้อมบันทึกเป็นไฟล์ PDF และเลือกกรณีศึกษาขึ้นเวที",
      },
      { property: "og:title", content: "หนังสือรวมผลงานเครือข่าย" },
      { property: "og:description", content: "ผลงานทั้งหมด จัดกลุ่มตามภาคและประเด็น" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Ebook,
});

function Ebook() {
  const { submissions, toggleShowcase } = useStore();
  const [mode, setMode] = useState<"region" | "issue">("region");
  const [onlyShowcase, setOnlyShowcase] = useState(false);

  const list = useMemo(
    () => (onlyShowcase ? submissions.filter((s) => s.showcase) : submissions),
    [submissions, onlyShowcase],
  );

  const groups = useMemo(() => {
    if (mode === "region") {
      return REGIONS.map((r) => ({
        key: r as string,
        label: REGION_LABEL[r as Region],
        items: list.filter((s) => s.region === r),
      })).filter((g) => g.items.length > 0);
    }
    const map = new Map<string, Submission[]>();
    list.forEach((s) =>
      (s.policy_issues.length ? s.policy_issues : ["Other"]).forEach((i) =>
        map.set(i, [...(map.get(i) ?? []), s]),
      ),
    );
    return [...map.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([k, items]) => ({ key: k, label: issueTh(k), items }));
  }, [list, mode]);

  const showcaseCount = submissions.filter((s) => s.showcase).length;

  return (
    <AppShell
      title="คลังผลงานของเรา"
      subtitle={`${submissions.length} ผลงาน · ยกขึ้นเวที ${showcaseCount} กรณีศึกษา`}
    >
      <div className="space-y-5 pb-8">
        <div className="no-print space-y-3">
          <div className="flex flex-wrap gap-2">
            {(["region", "issue"] as const).map((m) => (
              <ChoicePill key={m} active={mode === m} onClick={() => setMode(m)}>
                {m === "region" ? "ตามภาค" : "ตามประเด็น"}
              </ChoicePill>
            ))}
            <ChoicePill active={onlyShowcase} onClick={() => setOnlyShowcase((v) => !v)}>
              <Star className="h-5 w-5 shrink-0" aria-hidden="true" />
              กรณีศึกษาขึ้นเวที
            </ChoicePill>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="meadow-btn-secondary w-full"
          >
            <Download className="h-6 w-6 shrink-0" aria-hidden="true" />
            บันทึกเป็น PDF
          </button>
        </div>

        <div className="print-book space-y-8">
          <div className="hidden print-cover">
            <h1 className="text-3xl font-extrabold">หนังสือรวมผลงานเครือข่าย</h1>
            <p className="text-sm">คนส. Connexts · สมัชชาสุขภาพแห่งชาติ</p>
          </div>

          {groups.length === 0 && (
            <section className="meadow-card p-6 text-center">
              <span
                aria-hidden="true"
                className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-sky-soft text-primary"
              >
                <BookOpen className="h-8 w-8" />
              </span>
              <h2 className="mt-4 font-heading text-title font-semibold! text-ink">
                พื้นที่สำหรับผลงานต่อไป
              </h2>
              <p className="mt-2 text-body text-ink-soft">
                แบ่งปันสิ่งที่คุณทำ เพื่อให้เพื่อนในเครือข่ายได้เรียนรู้และร่วมต่อยอด
              </p>
              <Link to="/submit" className="meadow-btn-primary mt-5 w-full">
                แบ่งปันผลงาน
              </Link>
            </section>
          )}

          {groups.map((g) => (
            <section key={g.key}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b-2 border-[#E6E3F2] pb-3">
                <h2 className="min-w-0 font-heading text-title font-semibold! break-words text-ink">
                  {g.label}
                </h2>
                <span className="inline-flex min-h-10 items-center rounded-xl bg-sky-soft px-3 py-1 text-body font-semibold text-ink">
                  {g.items.length} ผลงาน
                </span>
              </div>
              <div className="mt-4 space-y-4">
                {g.items.map((s) => (
                  <article key={`${g.key}-${s.id}`} className="meadow-card break-inside-avoid p-5">
                    <div className="flex items-start gap-3">
                      {s.photo && (
                        <img
                          src={s.photo}
                          alt={s.name}
                          className="h-16 w-16 shrink-0 rounded-xl border border-[#E6E3F2] object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-heading text-lead font-semibold break-words text-ink">
                          {s.name}
                        </h3>
                        <p className="mt-1 text-body break-words text-ink-soft">
                          {[
                            `${s.course} ${s.batch}`.trim(),
                            provinceTh(s.province),
                            regionLabel(s.region),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleShowcase(s.id)}
                        aria-pressed={!!s.showcase}
                        aria-label="ยกเป็นกรณีศึกษาขึ้นเวที"
                        className={`no-print tap grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 ${
                          s.showcase
                            ? "border-[#F2B21B] bg-[#F2B21B] text-ink"
                            : "border-[#C9C6E0] bg-white text-ink"
                        }`}
                      >
                        <Star
                          className="h-6 w-6"
                          fill={s.showcase ? "currentColor" : "none"}
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                    <p className="mt-3 text-body break-words">{s.summary}</p>
                    {s.highlight && (
                      <p className="mt-3 flex items-start gap-2 text-body break-words">
                        <Sparkles
                          className="mt-1 h-5 w-5 shrink-0 text-primary"
                          aria-hidden="true"
                        />
                        <span>
                          <b className="text-ink">ผลงานเด่น: </b>
                          {s.highlight}
                        </span>
                      </p>
                    )}
                    {s.wanted && (
                      <p className="mt-3 text-body break-words">
                        <b className="text-ink">อยากชวนร่วม: </b>
                        {s.wanted}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {s.policy_issues.map((i) => (
                        <IssueBlock key={i} issue={i} />
                      ))}
                      {s.stage_ready && (
                        <span
                          className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 py-1 text-body font-bold"
                          style={{ backgroundColor: BLOCK_TAG.teal.bg, color: BLOCK_TAG.teal.fg }}
                        >
                          <Mic className="h-5 w-5 shrink-0" aria-hidden="true" /> ยินดีขึ้นเวที
                        </span>
                      )}
                      {s.showcase && (
                        <span
                          className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 py-1 text-body font-bold"
                          style={{
                            backgroundColor: BLOCK_TAG.yellow.bg,
                            color: BLOCK_TAG.yellow.fg,
                          }}
                        >
                          <Star className="h-5 w-5 shrink-0" aria-hidden="true" /> กรณีศึกษาขึ้นเวที
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
