import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Camera, CheckCircle2, Pencil, X } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { MissionEmpty } from "@/components/mission-ui";
import { useStore } from "@/lib/store";
import { COURSES, type Course } from "@/lib/types";
import { issueTh, REGION_LABEL } from "@/lib/i18n";
import { PROVINCES_BY_REGION } from "@/lib/thailand-geo";

export const Route = createFileRoute("/submit")({
  head: () => ({
    meta: [
      { title: "ส่งผลงาน — คนส. Connexts" },
      {
        name: "description",
        content: "ส่งผลงานโดยใช้ข้อมูลจากโปรไฟล์ของคุณอัตโนมัติ กรอกเฉพาะเรื่องงาน ไม่ต้องกรอกซ้ำ",
      },
      { property: "og:title", content: "ส่งผลงานของคุณ" },
      { property: "og:description", content: "กรอกเฉพาะเรื่องงาน ข้อมูลส่วนตัวดึงจากโปรไฟล์" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SubmitPage,
});

/** ด้านยาวสุดของรูปผลงาน — พอสำหรับพิมพ์เต็มความกว้างหน้า แต่ไม่หนักเท่ารูปจากกล้องมือถือ */
const SUBMISSION_PHOTO_MAX = 960;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * ย่อรูปก่อนบันทึก (ไม่ขยายรูปเล็ก) แล้วแปลงเป็น JPEG
 * ถ้าย่อไม่ได้ด้วยเหตุใดก็ตาม จะใช้รูปเดิม เพื่อไม่ให้รูปหาย
 */
async function shrinkImage(file: File, max: number, quality = 0.82): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode failed"));
      el.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return readAsDataUrl(file);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function SubmitPage() {
  const navigate = useNavigate();
  const { me, hydrated, addSubmission } = useStore();

  const [course, setCourse] = useState<Course>("คนส.");
  const [batch, setBatch] = useState("");
  const [summary, setSummary] = useState("");
  const [highlight, setHighlight] = useState("");
  const [wanted, setWanted] = useState("");
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [stageReady, setStageReady] = useState(false);
  const [done, setDone] = useState(false);
  const [shrinking, setShrinking] = useState(false);

  const valid = Boolean(me && summary.trim()) && !shrinking;

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    setShrinking(true);
    try {
      setPhoto(await shrinkImage(file, SUBMISSION_PHOTO_MAX));
    } catch {
      /* อ่านรูปไม่ได้ — ให้เลือกรูปใหม่ได้ */
    } finally {
      setShrinking(false);
    }
  };

  const submit = () => {
    if (!me || !valid) return;
    addSubmission({
      name: me.name,
      course,
      batch: batch.trim(),
      region: me.region,
      province: me.province || (PROVINCES_BY_REGION(me.region)[0]?.en ?? "Bangkok"),
      policy_issues: me.interests,
      summary: summary.trim(),
      highlight: highlight.trim(),
      wanted: wanted.trim() || me.powers_need.join(", "),
      photo: photo ?? me.photo,
      stage_ready: stageReady,
    });
    setDone(true);
  };

  if (hydrated && !me) {
    return (
      <AppShell title="ส่งผลงาน" subtitle="ต้องมีโปรไฟล์ก่อน">
        <MissionEmpty
          title="ให้เครือข่ายรู้จักงานของคุณ"
          description="สร้างโปรไฟล์ก่อน แล้วเราจะเติมชื่อ พื้นที่ และประเด็นให้ คุณเล่าเฉพาะเรื่องงานได้เลย"
          variant="archive"
        >
          <Link
            to="/onboarding"
            className="tap mt-5 inline-flex items-center justify-center rounded-3xl gradient-power px-6 py-3 text-sm font-extrabold text-primary-foreground"
          >
            สร้างโปรไฟล์ของฉัน
          </Link>
        </MissionEmpty>
      </AppShell>
    );
  }

  if (done) {
    return (
      <AppShell title="ส่งผลงานแล้ว" subtitle="ขอบคุณที่แบ่งปันพลังของคุณ">
        <div className="submission-success mission-panel px-5 py-10 text-center">
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
                setSummary("");
                setHighlight("");
                setWanted("");
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
    <AppShell title="ส่งผลงาน" subtitle="กรอกเฉพาะเรื่องงาน ข้อมูลอื่นดึงจากโปรไฟล์">
      <div className="submission-form-grid px-5 pb-32 pt-4">
        {me && (
          <div className="submission-author card-soft rounded-3xl bg-card p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-accent text-2xl">
                {me.photo ? (
                  <img src={me.photo} alt="" className="h-full w-full object-cover" />
                ) : (
                  me.avatar
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-extrabold leading-tight">{me.name}</p>
                <p className="text-[12px] text-muted-foreground">
                  {REGION_LABEL[me.region]} · {me.province} · {me.organization}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {me.interests.map((i) => (
                    <span
                      key={i}
                      className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary"
                    >
                      {issueTh(i)}
                    </span>
                  ))}
                </div>
              </div>
              <Link
                to="/update"
                className="tap inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-bold"
              >
                <Pencil className="h-3.5 w-3.5" />
                แก้ไข
              </Link>
            </div>
          </div>
        )}

        <Field label="รุ่น / หลักสูตร">
          <div className="flex flex-wrap gap-2">
            {COURSES.map((c) => (
              <button
                key={c}
                onClick={() => setCourse(c)}
                className={`tap rounded-2xl border px-4 py-2 text-sm font-bold ${
                  course === c
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <input
            aria-label="รุ่นที่"
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
            placeholder="รุ่นที่ (เช่น รุ่น 7)"
            className="input-line mt-2"
          />
        </Field>

        <Field label="สรุปงาน 1–2 บรรทัด">
          <textarea
            aria-label="สรุปงาน"
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
            aria-label="ผลงานเด่น"
            value={highlight}
            onChange={(e) => setHighlight(e.target.value)}
            rows={2}
            maxLength={180}
            placeholder="ชิ้นงานหรือผลลัพธ์ที่ภูมิใจที่สุด"
            className="input-line resize-none py-3"
          />
        </Field>

        <Field label="ชวนเพื่อนมาร่วมอะไร">
          <textarea
            aria-label="สิ่งที่อยากชวนเพื่อนมาร่วม"
            value={wanted}
            onChange={(e) => setWanted(e.target.value)}
            rows={2}
            maxLength={180}
            placeholder="อยากได้ทักษะ ทรัพยากร หรือเครือข่ายแบบไหน"
            className="input-line resize-none py-3"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            เว้นว่างเพื่อใช้พลังที่กำลังมองหาในโปรไฟล์
          </p>
        </Field>

        <Field label="แนบรูปผลงาน (ไม่บังคับ)">
          {photo ? (
            <div className="relative w-fit">
              <img
                src={photo}
                alt="รูปผลงาน"
                className="h-40 w-40 rounded-2xl border border-border object-cover"
              />
              <button
                type="button"
                onClick={() => setPhoto(undefined)}
                className="tap absolute -right-3 -top-3 grid h-11 w-11 place-items-center rounded-full bg-foreground text-background"
                aria-label="ลบรูป"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ) : (
            <label className="tap flex h-28 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card text-sm font-bold text-muted-foreground">
              <Camera className="h-5 w-5" aria-hidden />
              {shrinking ? "กำลังเตรียมรูป…" : "เลือกรูปจากเครื่อง"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={shrinking}
                onChange={(e) => void onPhoto(e.target.files?.[0])}
              />
            </label>
          )}
        </Field>

        <button
          type="button"
          aria-pressed={stageReady}
          onClick={() => setStageReady((v) => !v)}
          className={`submission-stage tap flex w-full items-center gap-3 rounded-2xl border p-5 text-left ${
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
          type="button"
          onClick={submit}
          disabled={!valid}
          className="submission-save tap flex h-14 w-full items-center justify-center rounded-3xl gradient-power text-sm font-extrabold text-primary-foreground disabled:opacity-40"
        >
          ส่งผลงาน
        </button>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="submission-field mission-panel">
      <p className="mb-2 text-[13px] font-extrabold">{label}</p>
      {children}
    </section>
  );
}
