import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Camera, Check, CheckCircle2, Pencil, X } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { ChoicePill } from "@/components/choice-pill";
import { MeadowScene } from "@/components/meadow-scene";
import { Avatar, IssueBlock } from "@/components/power-bits";
import { useStore } from "@/lib/store";
import { COURSES, type Course } from "@/lib/types";
import { provinceTh, regionLabel } from "@/lib/i18n";
import { PROVINCES_BY_REGION } from "@/lib/thailand-geo";
import { ProjectContactFields } from "@/components/project-contact-fields";
import type { ProjectContacts } from "@/lib/project-contact";

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
  const [contacts, setContacts] = useState<ProjectContacts>({});
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
      ...contacts,
    });
    setDone(true);
  };

  if (hydrated && !me) {
    return (
      <AppShell title="ส่งผลงาน" subtitle="ต้องมีโปรไฟล์ก่อน">
        <div className="meadow-card overflow-hidden text-center">
          <MeadowScene variant="empty" className="pointer-events-none" />
          <div className="flex flex-col items-center gap-3 p-6">
            <h2 className="font-heading text-title font-semibold text-ink">
              ให้เครือข่ายรู้จักงานของคุณ
            </h2>
            <p className="text-body text-ink-soft">
              สร้างโปรไฟล์ก่อน แล้วเราจะเติมชื่อ พื้นที่ และประเด็นให้ คุณเล่าเฉพาะเรื่องงานได้เลย
            </p>
            <Link
              to="/onboarding"
              className="meadow-btn-primary tap mt-1 w-full max-w-sm text-center"
            >
              สร้างโปรไฟล์ของฉัน
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  if (done) {
    return (
      <AppShell title="ส่งผลงานแล้ว" subtitle="ขอบคุณที่แบ่งปันพลังของคุณ">
        <div className="meadow-card flex flex-col items-center gap-3 p-6 text-center">
          <CheckCircle2 className="h-14 w-14 text-[#3D7A1C]" aria-hidden />
          <h2 className="font-heading text-title font-semibold text-ink">บันทึกผลงานเรียบร้อย</h2>
          <p className="text-body text-ink-soft">
            ผลงานของคุณจะไปปรากฏในหนังสือรวมผลงาน (e-book) และบอร์ดนิทรรศการทันที
          </p>
          <div className="mt-2 flex w-full flex-col gap-3">
            <Link to="/ebook" className="meadow-btn-primary tap w-full text-center">
              ดูหนังสือรวมผลงาน
            </Link>
            <button
              type="button"
              onClick={() => {
                setDone(false);
                setSummary("");
                setHighlight("");
                setWanted("");
                setPhoto(undefined);
              }}
              className="meadow-btn-secondary tap w-full"
            >
              ส่งผลงานอีกชิ้น
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: "/map" })}
              className="tap min-h-12 text-body font-semibold text-primary underline underline-offset-4"
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
      <div className="flex flex-col gap-4">
        {me && (
          <section aria-label="ข้อมูลจากโปรไฟล์ของคุณ" className="meadow-card p-5">
            <div className="flex items-start gap-3">
              <Avatar user={me} size={56} />
              <div className="min-w-0 flex-1">
                <p className="font-heading text-lead font-semibold text-ink [overflow-wrap:anywhere]">
                  {me.name}
                </p>
                <p className="text-body text-ink-soft [overflow-wrap:anywhere]">
                  {[regionLabel(me.region), provinceTh(me.province), me.organization]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </div>
            {me.interests.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {me.interests.map((i) => (
                  <IssueBlock key={i} issue={i} />
                ))}
              </div>
            )}
            <Link to="/update" className="meadow-btn-secondary tap mt-4 w-full">
              <Pencil className="h-6 w-6" aria-hidden /> แก้ไขโปรไฟล์
            </Link>
          </section>
        )}

        <Field label="รุ่น / หลักสูตร">
          <div role="group" aria-label="หลักสูตร" className="flex flex-wrap gap-2">
            {COURSES.map((c) => (
              <ChoicePill key={c} active={course === c} onClick={() => setCourse(c)}>
                {c}
              </ChoicePill>
            ))}
          </div>
          <input
            aria-label="รุ่นที่"
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
            placeholder="รุ่นที่ (เช่น รุ่น 7)"
            className={`${INPUT} mt-3`}
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
            className={`${INPUT} resize-none py-3`}
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
            className={`${INPUT} resize-none py-3`}
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
            className={`${INPUT} resize-none py-3`}
          />
          <p className="mt-2 text-body text-ink-soft">เว้นว่างเพื่อใช้พลังที่กำลังมองหาในโปรไฟล์</p>
        </Field>

        <Field label="แนบรูปผลงาน (ไม่บังคับ)">
          {photo ? (
            <div className="relative w-fit">
              <img
                src={photo}
                alt="รูปผลงาน"
                className="h-40 w-40 rounded-2xl border border-[#E6E3F2] object-cover"
              />
              <button
                type="button"
                onClick={() => setPhoto(undefined)}
                className="tap absolute -right-3 -top-3 grid h-12 w-12 place-items-center rounded-full bg-ink text-white"
                aria-label="ลบรูป"
              >
                <X className="h-6 w-6" aria-hidden />
              </button>
            </div>
          ) : (
            <label className="tap flex min-h-24 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#8F8BB8] bg-white px-4 py-3 text-center text-body font-semibold text-ink focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary">
              <Camera className="h-6 w-6 shrink-0" aria-hidden />
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

        <Field label="ผู้รับผิดชอบและช่องทางติดต่อ">
          <ProjectContactFields value={contacts} onChange={setContacts} />
        </Field>

        <button
          type="button"
          aria-pressed={stageReady}
          onClick={() => setStageReady((v) => !v)}
          className={`tap flex min-h-16 w-full items-center gap-3 rounded-3xl border-2 p-4 text-left ${
            stageReady ? "border-[#3D7A1C] bg-[#EEF6E8]" : "border-[#C9C6E0] bg-white"
          }`}
        >
          <span
            aria-hidden
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border-2 ${
              stageReady ? "border-[#3D7A1C] bg-[#3D7A1C] text-white" : "border-[#8F8BB8] bg-white"
            }`}
          >
            {stageReady && <Check className="h-5 w-5" strokeWidth={3} />}
          </span>
          <span className="text-body font-semibold text-ink">
            ยินดีขึ้นเวทีนำเสนอสั้น ๆ (3–5 นาที)
          </span>
        </button>

        <div>
          <button
            type="button"
            onClick={submit}
            disabled={!valid}
            aria-describedby={!valid ? "submit-hint" : undefined}
            className="meadow-btn-primary tap w-full text-center"
          >
            ส่งผลงาน
          </button>
          {!valid && (
            <p id="submit-hint" className="mt-2 text-center text-body text-ink-soft">
              {shrinking ? "กำลังเตรียมรูป รอสักครู่" : "เขียนสรุปงานสั้น ๆ ก่อน แล้วกดส่งได้เลย"}
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}

/** ช่องกรอกข้อความ 20px (ความสูงขั้นต่ำ 56px มาจาก meadow.css) */
const INPUT =
  "w-full rounded-2xl border-2 bg-white px-4 text-body text-ink outline-none placeholder:text-ink-soft/70";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="meadow-card p-5">
      <h2 className="mb-3 font-heading text-lead font-semibold text-ink">{label}</h2>
      {children}
    </section>
  );
}
