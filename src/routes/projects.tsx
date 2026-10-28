import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FolderOpen, MapPin, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ChoicePill } from "@/components/choice-pill";
import { IssueBlock } from "@/components/power-bits";
import { useStore } from "@/lib/store";
import type { Submission } from "@/lib/types";
import { provinceTh, regionLabel } from "@/lib/i18n";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "โปรเจกต์ คนส. — คนส. Connexts" },
      {
        name: "description",
        content: "รวมโปรเจกต์ของ คนส. ทุกรุ่น จัดกลุ่มตามรุ่น พร้อมพื้นที่และประเด็นที่ทำ",
      },
      { property: "og:title", content: "โปรเจกต์ คนส. ทุกรุ่น" },
      { property: "og:description", content: "รวมโปรเจกต์ของ คนส. จัดกลุ่มตามรุ่น" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Projects,
});

const ALL = "all";

/** "รุ่น 4" → 4 เพื่อเรียงรุ่นตามตัวเลข รุ่นที่ไม่มีเลขไปไว้ท้าย */
function batchOrder(batch: string) {
  const n = Number(batch.match(/\d+/)?.[0]);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

function Projects() {
  const { submissions } = useStore();
  const [batch, setBatch] = useState<string>(ALL);

  const projects = useMemo(() => submissions.filter((s) => s.course === "คนส."), [submissions]);

  const batches = useMemo(
    () =>
      [...new Set(projects.map((s) => s.batch.trim() || "ไม่ระบุรุ่น"))].sort(
        (a, b) => batchOrder(a) - batchOrder(b) || a.localeCompare(b, "th"),
      ),
    [projects],
  );

  const groups = useMemo(
    () =>
      batches
        .filter((b) => batch === ALL || b === batch)
        .map((b) => ({
          key: b,
          items: projects
            .filter((s) => (s.batch.trim() || "ไม่ระบุรุ่น") === b)
            .sort((x, y) => x.name.localeCompare(y.name, "th")),
        })),
    [batches, batch, projects],
  );

  return (
    <AppShell
      title="โปรเจกต์ คนส."
      subtitle={`${projects.length} โปรเจกต์ · ${batches.length} รุ่น`}
    >
      <div className="space-y-5 pb-8">
        {batches.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <ChoicePill active={batch === ALL} onClick={() => setBatch(ALL)}>
              ทุกรุ่น
            </ChoicePill>
            {batches.map((b) => (
              <ChoicePill key={b} active={batch === b} onClick={() => setBatch(b)}>
                {b}
              </ChoicePill>
            ))}
          </div>
        )}

        {projects.length === 0 && (
          <section className="meadow-card p-6 text-center">
            <span
              aria-hidden="true"
              className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-sky-soft text-primary"
            >
              <FolderOpen className="h-8 w-8" />
            </span>
            <h2 className="mt-4 font-heading text-title font-semibold! text-ink">
              ยังไม่มีโปรเจกต์ คนส.
            </h2>
            <p className="mt-2 text-body text-ink-soft">
              ส่งโปรเจกต์ของรุ่นคุณเข้ามา เพื่อให้เพื่อนในเครือข่ายได้เรียนรู้และร่วมต่อยอด
            </p>
            <Link to="/submit" className="meadow-btn-primary mt-5 w-full">
              ส่งโปรเจกต์
            </Link>
          </section>
        )}

        {groups.map((g) => (
          <section key={g.key} aria-labelledby={`batch-${g.key}`}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b-2 border-[#E6E3F2] pb-3">
              <h2
                id={`batch-${g.key}`}
                className="min-w-0 font-heading text-title font-semibold! break-words text-ink"
              >
                คนส. {g.key}
              </h2>
              <span className="inline-flex min-h-10 items-center rounded-xl bg-sky-soft px-3 py-1 text-body font-semibold text-ink">
                {g.items.length} โปรเจกต์
              </span>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {g.items.map((s) => (
                <ProjectCard key={s.id} project={s} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}

function ProjectCard({ project: s }: { project: Submission }) {
  const place = s.province ? provinceTh(s.province) : regionLabel(s.region);
  return (
    <article className="meadow-card flex flex-col p-5">
      {s.photo && (
        <img
          src={s.photo}
          alt=""
          className="mb-4 aspect-video w-full rounded-xl border border-[#E6E3F2] object-cover"
        />
      )}
      <h3 className="font-heading text-lead font-semibold break-words text-ink">{s.name}</h3>
      <p className="mt-1 flex items-center gap-1.5 text-body text-ink-soft">
        <MapPin className="h-5 w-5 shrink-0" aria-hidden="true" />
        {place}
      </p>
      {s.summary && <p className="mt-3 text-body break-words">{s.summary}</p>}
      {s.highlight && (
        <p className="mt-3 flex items-start gap-2 text-body break-words">
          <Sparkles className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
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
      {s.policy_issues.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          {s.policy_issues.map((i) => (
            <IssueBlock key={i} issue={i} />
          ))}
        </div>
      )}
    </article>
  );
}
