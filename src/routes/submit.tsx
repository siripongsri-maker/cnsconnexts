import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Camera, CheckCircle2, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useStore } from "@/lib/store";
import { COURSES, ISSUES, REGIONS, type Course, type Region } from "@/lib/types";
import { issueTh, REGION_LABEL } from "@/lib/i18n";
import { PROVINCES_BY_REGION } from "@/lib/thailand-geo";

export const Route = createFileRoute("/submit")({
  head: () => ({
    meta: [
      { title: "ส่งผลงาน — Connecting Power" },
      {
        name: "description",
        content:
          "แบบฟอร์มส่งผลงานสำหรับสมาชิก คนส. นนส. คศน. เล่าประเด็นนโยบายที่ทำ ผลงานเด่น และสิ่งที่อยากให้เพื่อนมาร่วม",
      },
      { property: "og:title", content: "ส่งผลงานของคุณ" },
      { property: "og:description", content: "เล่าเรื่องงานของคุณให้เพื่อน ๆ ในเครือข่ายได้รู้จัก" },
    ],
  }),
  component: SubmitPage,
});

function SubmitPage() {
  const navigate = useNavigate();
  const { addSubmission } = useStore();

  const [name, setName] = useState("");
  const [course, setCourse] = useState<Course>("คนส.");
  const [batch, setBatch] = useState("");
  const [region, setRegion] = useState<Region>("Central");
  const [province, setProvince] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  const [summary, setSummary] = useState("");
  const [highlight, setHighlight] = useState("");
  const [wanted, setWanted] = useState("");
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [stageReady, setStageReady] = useState(false);
  const [done, setDone] = useState(false);

  const provinces = useMemo(() => PROVINCES_BY_REGION(region), [region]);
  const valid = name.trim() && summary.trim() && issues.length > 0;

  const onPhoto = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result));
    reader.readAsDataURL(file);
  };

  const submit = () => {
    if (!valid) return;
    addSubmission({
      name: name.trim(),
      course,
      batch: batch.trim(),
      region,
      province: province || (provinces[0]?.en ?? "Bangkok"),
      policy_issues: issues,
      summary: summary.trim(),
      highlight: highlight.trim(),
      wanted: wanted.trim(),
      photo,
      stage_ready: stageReady,
    });
    setDone(true);
  };

  if (done) {
    return (
      <AppShell title="ส่งผลงานแล้ว" subtitle="ขอบคุณที่แบ่งปันพลังของคุณ">
        <div className="px-5 py-10 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-lime" />
          <h2 className="mt-4 text-xl font-extrabold">บันทึกผลงานเรียบร้อย</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            ผลงานของคุณจะไปปรากฏในหนังสือรวมผลงาน (e-book) และบอร์ดนิทรรศการทันที
          </p>
          <div className="mt-6 grid gap-3">
            <Link
              to="/ebook"
              className="tap flex h-14 items-center justify-center rounded-3xl gradient-power text-sm font-extrabold text-primary-foreground"
            >
              ดูหนังสือรวมผลงาน
            </Link>
            <button
              onClick={() => {
                setDone(false);
                setName("");
                setSummary("");
                setHighlight("");
                setWanted("");
                setIssues([]);
                setPhoto(undefined);
              }}
              className="tap flex h-14 items-center justify-center rounded-3xl border border-border bg-card text-sm font-bold"
            >
              ส่งผลงานอีกชิ้น
            </button>
            <button
              onClick={() => navigate({ to: "/map" })}
              className="tap text-xs font-bold text-muted-foreground"
            >
              ไปดูแผนที่พลัง
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="ส่งผลงาน" subtitle="สำหรับสมาชิก คนส. / นนส. / คศน.">
      <div className="space-y-6 px-5 pb-32 pt-4">
        <Field label="ชื่อ">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ชื่อ–สกุล หรือชื่อเล่น"
            className="input-line"
          />
        </Field>

        <Field label="รุ่น / หลักสูตร">
          <div className="flex flex-wrap gap-2">
            {COURSES.map((c) => (
              <button
                key={c}
                onClick={() => setCourse(c)}
                className={`tap rounded-2xl border px-4 py-2 text-sm font-bold ${
                  course === c ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <input
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
            placeholder="รุ่นที่ (เช่น รุ่น 7)"
            className="input-line mt-2"
          />
        </Field>

        <Field label="ภาค">
          <div className="flex flex-wrap gap-2">
            {REGIONS.map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRegion(r);
                  setProvince("");
                }}
                className={`tap rounded-2xl border px-3.5 py-2 text-sm font-bold ${
                  region === r ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"
                }`}
              >
                {REGION_LABEL[r]}
              </button>
            ))}
          </div>
        </Field>

        <Field label="จังหวัด">
          <select
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            className="input-line"
          >
            <option value="">เลือกจังหวัด</option>
            {provinces.map((p) => (
              <option key={p.en} value={p.en}>
                {p.th}
              </option>
            ))}
          </select>
        </Field>

        <Field label="ประเด็นนโยบายที่ทำ">
          <div className="flex flex-wrap gap-2">
            {ISSUES.map((i) => {
              const on = issues.includes(i);
              return (
                <button
                  key={i}
                  onClick={() =>
                    setIssues(on ? issues.filter((x) => x !== i) : [...issues, i])
                  }
                  className={`tap rounded-full border px-3.5 py-1.5 text-[13px] font-semibold ${
                    on ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"
                  }`}
                >
                  {issueTh(i)}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="สรุปงาน 1–2 บรรทัด">
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            maxLength={220}
            placeholder="ทำอะไร กับใคร ที่ไหน"
            className="input-line resize-none py-3"
          />
        </Field>

        <Field label="ผลงานเด่น 1 ชิ้น">
          <textarea
            value={highlight}
            onChange={(e) => setHighlight(e.target.value)}
            rows={2}
            maxLength={180}
            placeholder="ชิ้นงานหรือผลลัพธ์ที่ภูมิใจที่สุด"
            className="input-line resize-none py-3"
          />
        </Field>

        <Field label="สิ่งที่อยากให้เพื่อนมาร่วม">
          <textarea
            value={wanted}
            onChange={(e) => setWanted(e.target.value)}
            rows={2}
            maxLength={180}
            placeholder="อยากได้ทักษะ ทรัพยากร หรือเครือข่ายแบบไหน"
            className="input-line resize-none py-3"
          />
        </Field>

        <Field label="แนบรูป (ไม่บังคับ)">
          {photo ? (
            <div className="relative w-fit">
              <img
                src={photo}
                alt="รูปผลงาน"
                className="h-40 w-40 rounded-2xl border border-border object-cover"
              />
              <button
                onClick={() => setPhoto(undefined)}
                className="tap absolute -right-2 -top-2 grid h-8 w-8 place-items-center rounded-full bg-foreground text-background"
                aria-label="ลบรูป"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="tap flex h-28 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card text-sm font-bold text-muted-foreground">
              <Camera className="h-5 w-5" />
              เลือกรูปจากเครื่อง
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPhoto(e.target.files?.[0])}
              />
            </label>
          )}
        </Field>

        <button
          onClick={() => setStageReady((v) => !v)}
          className={`tap flex w-full items-center gap-3 rounded-2xl border p-4 text-left ${
            stageReady ? "border-lime bg-lime/15" : "border-border bg-card"
          }`}
        >
          <span
            className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border ${
              stageReady ? "border-lime bg-lime text-lime-foreground" : "border-border"
            }`}
          >
            {stageReady && <CheckCircle2 className="h-4 w-4" />}
          </span>
          <span className="text-sm font-bold">ยินดีขึ้นเวทีนำเสนอสั้น ๆ (3–5 นาที)</span>
        </button>

        <button
          onClick={submit}
          disabled={!valid}
          className="tap flex h-14 w-full items-center justify-center rounded-3xl gradient-power text-sm font-extrabold text-primary-foreground disabled:opacity-40"
        >
          ส่งผลงาน
        </button>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[13px] font-extrabold">{label}</p>
      {children}
    </div>
  );
}
