import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Sparkles, Star, Mic } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useStore } from "@/lib/store";
import { REGIONS, type Region, type Submission } from "@/lib/types";
import { issueTh, provinceTh, REGION_LABEL } from "@/lib/i18n";

export const Route = createFileRoute("/ebook")({
  head: () => ({
    meta: [
      { title: "หนังสือรวมผลงาน — Connecting Power" },
      {
        name: "description",
        content:
          "รวมผลงานสมาชิกเครือข่าย จัดกลุ่มตามภาคและตามประเด็นนโยบาย พร้อมบันทึกเป็นไฟล์ PDF และเลือกกรณีศึกษาขึ้นเวที",
      },
      { property: "og:title", content: "หนังสือรวมผลงานเครือข่าย" },
      { property: "og:description", content: "ผลงานทั้งหมด จัดกลุ่มตามภาคและประเด็น" },
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
      title="หนังสือรวมผลงาน"
      subtitle={`${submissions.length} ผลงาน · ยกขึ้นเวที ${showcaseCount} กรณีศึกษา`}
    >
      <div className="px-5 pb-32 pt-4">
        <div className="no-print flex flex-wrap items-center gap-2">
          <div className="flex rounded-2xl border border-border bg-card p-1">
            {(["region", "issue"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`tap rounded-xl px-4 py-2 text-[13px] font-bold ${
                  mode === m ? "gradient-power text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {m === "region" ? "ตามภาค" : "ตามประเด็น"}
              </button>
            ))}
          </div>
          <button
            onClick={() => setOnlyShowcase((v) => !v)}
            className={`tap flex items-center gap-1.5 rounded-2xl border px-3.5 py-2 text-[13px] font-bold ${
              onlyShowcase ? "border-coral bg-coral/12 text-coral" : "border-border bg-card"
            }`}
          >
            <Star className="h-4 w-4" />
            เฉพาะกรณีศึกษาขึ้นเวที
          </button>
          <button
            onClick={() => window.print()}
            className="tap ml-auto flex items-center gap-2 rounded-2xl gradient-power px-4 py-2.5 text-[13px] font-extrabold text-primary-foreground"
          >
            <Download className="h-4 w-4" />
            บันทึกเป็น PDF
          </button>
        </div>

        <div className="print-book mt-6 space-y-8">
          <div className="hidden print-cover">
            <h1 className="text-3xl font-extrabold">หนังสือรวมผลงานเครือข่าย</h1>
            <p className="text-sm">Connecting Power · สมัชชาสุขภาพแห่งชาติ</p>
          </div>

          {groups.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              ยังไม่มีผลงานในกลุ่มนี้ —{" "}
              <Link to="/submit" className="font-bold text-primary">
                ส่งผลงานชิ้นแรก
              </Link>
            </p>
          )}

          {groups.map((g) => (
            <section key={g.key}>
              <div className="flex items-baseline gap-2 border-b border-border pb-2">
                <h2 className="text-lg font-extrabold">{g.label}</h2>
                <span className="text-xs font-bold text-muted-foreground">
                  {g.items.length} ผลงาน
                </span>
              </div>
              <div className="mt-3 space-y-3">
                {g.items.map((s) => (
                  <article
                    key={`${g.key}-${s.id}`}
                    className="card-soft break-inside-avoid rounded-2xl bg-card p-4"
                  >
                    <div className="flex gap-3">
                      {s.photo && (
                        <img
                          src={s.photo}
                          alt={s.name}
                          className="h-16 w-16 shrink-0 rounded-xl border border-border object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <div className="min-w-0">
                            <h3 className="truncate text-base font-extrabold">{s.name}</h3>
                            <p className="text-[12px] text-muted-foreground">
                              {s.course} {s.batch} · {provinceTh(s.province)} ·{" "}
                              {REGION_LABEL[s.region]}
                            </p>
                          </div>
                          <button
                            onClick={() => toggleShowcase(s.id)}
                            className={`no-print tap ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-full border ${
                              s.showcase
                                ? "border-coral bg-coral/15 text-coral"
                                : "border-border text-muted-foreground"
                            }`}
                            aria-label="ยกเป็นกรณีศึกษาขึ้นเวที"
                          >
                            <Star className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="mt-2 text-[14px] leading-relaxed">{s.summary}</p>
                        {s.highlight && (
                          <p className="mt-2 flex gap-1.5 text-[13px] text-muted-foreground">
                            <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                            <span>
                              <span className="font-bold text-foreground">ผลงานเด่น: </span>
                              {s.highlight}
                            </span>
                          </p>
                        )}
                        {s.wanted && (
                          <p className="mt-1.5 text-[13px] text-muted-foreground">
                            <span className="font-bold text-foreground">อยากชวนร่วม: </span>
                            {s.wanted}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {s.policy_issues.map((i) => (
                            <span
                              key={i}
                              className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary"
                            >
                              {issueTh(i)}
                            </span>
                          ))}
                          {s.stage_ready && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-lime/25 px-2.5 py-1 text-[11px] font-semibold text-lime-foreground">
                              <Mic className="h-3 w-3" /> ยินดีขึ้นเวที
                            </span>
                          )}
                          {s.showcase && (
                            <span className="rounded-full bg-coral/12 px-2.5 py-1 text-[11px] font-semibold text-coral">
                              กรณีศึกษาขึ้นเวที
                            </span>
                          )}
                        </div>
                      </div>
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
