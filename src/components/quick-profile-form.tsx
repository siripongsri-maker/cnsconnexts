import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Check, type LucideIcon } from "lucide-react";
import { BLOCK_TAG, POWER_ICON, blockFor } from "@/lib/issue-colors";
import { REGION_LABEL, issueTh } from "@/lib/i18n";
import {
  EMPTY_QUICK_DRAFT,
  dryRunUser,
  quickStepHint,
  quickStepValid,
  toProfileInput,
  type QuickDraft,
  type QuickStep,
} from "@/lib/quick-profile";
import { isDevPreview } from "@/lib/dev-preview";
import { PROVINCES_BY_REGION } from "@/lib/thailand-geo";
import { useStore } from "@/lib/store";
import { ISSUES, POWERS, REGIONS, type Power, type Region, type User } from "@/lib/types";

const SAVE_ERROR = "บันทึกยังไม่สำเร็จ ข้อมูลที่กรอกยังอยู่ ลองกดอีกครั้ง";

function toggle(list: string[], key: string): string[] {
  return list.includes(key) ? list.filter((k) => k !== key) : [...list, key];
}

const CHOICE_BASE =
  "tap inline-flex min-h-14 items-center gap-2 rounded-xl px-4 py-2 text-left text-body font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/** ปุ่มเลือกแบบสลับ: เลือกแล้วมีไอคอนติ๊ก + aria-pressed (ไม่ใช้สีอย่างเดียวบอกสถานะ) */
function Choice({
  pressed,
  onClick,
  icon: Icon,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  icon?: LucideIcon;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`${CHOICE_BASE} border-2 ${
        pressed
          ? "border-primary bg-primary text-white"
          : "border-border bg-white text-ink hover:bg-sky-soft"
      }`}
    >
      {pressed ? (
        <Check aria-hidden className="h-6 w-6 shrink-0" />
      ) : Icon ? (
        <Icon aria-hidden className="h-6 w-6 shrink-0 text-primary" />
      ) : null}
      {children}
    </button>
  );
}

/** ประเด็นแบบเลือกได้ — หน้าตาเดียวกับ IssueBlock (สีบล็อกทึบ) เลือกแล้วมีติ๊กและขอบหนา */
function IssueToggle({
  issue,
  pressed,
  onClick,
}: {
  issue: string;
  pressed: boolean;
  onClick: () => void;
}) {
  const tag = BLOCK_TAG[blockFor(issue)];
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      style={{ backgroundColor: tag.bg, color: tag.fg }}
      className={`tap inline-flex min-h-12 items-center gap-2 rounded-xl border-4 px-3 py-1 text-left text-body font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        pressed ? "border-ink" : "border-transparent opacity-90"
      }`}
    >
      {pressed && <Check aria-hidden className="h-6 w-6 shrink-0" />}
      {issueTh(issue)}
    </button>
  );
}

export type QuickProfileFormProps = {
  onSaved: (me: User) => void;
  /**
   * ร่างคำตอบแบบผู้เรียกถือเอง (ไม่ส่ง = ฟอร์มเก็บเอง) — แผ่นล่างที่ปิดแล้วเปิดใหม่จะได้คำตอบเดิม
   * เพราะเนื้อหาแผ่นถูกถอดออกตอนปิด
   */
  draft?: QuickDraft;
  onDraftChange?: (draft: QuickDraft) => void;
  /** ขั้นปัจจุบันแบบผู้เรียกถือเอง (ไม่ส่ง = เริ่มขั้นที่ 1 และฟอร์มเก็บเอง) */
  step?: QuickStep;
  onStepChange?: (step: QuickStep) => void;
  /** แจ้งเมื่อเริ่ม/จบการบันทึก — แผ่นล่างใช้ล็อกไม่ให้ปิดระหว่างบันทึก */
  onSavingChange?: (saving: boolean) => void;
};

/**
 * ฟอร์มโปรไฟล์ด่วน 3 ขั้น — ชื่อ+ภาค → ประเด็นที่สนใจ → พลังที่มี/อยากได้
 * ใช้ทั้งใน QuickProfileSheet และหน้าเต็ม /onboarding
 */
export function QuickProfileForm({
  onSaved,
  draft: draftProp,
  onDraftChange,
  step: stepProp,
  onStepChange,
  onSavingChange,
}: QuickProfileFormProps) {
  const { saveProfile } = useStore();
  const [ownStep, setOwnStep] = useState<QuickStep>(1);
  const [ownDraft, setOwnDraft] = useState<QuickDraft>(EMPTY_QUICK_DRAFT);
  const step = stepProp ?? ownStep;
  const draft = draftProp ?? ownDraft;
  const setStep = (next: QuickStep) => {
    setOwnStep(next);
    onStepChange?.(next);
  };
  const setDraft = (next: QuickDraft) => {
    setOwnDraft(next);
    onDraftChange?.(next);
  };
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const savingRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // เปลี่ยนขั้นแล้วย้ายโฟกัสไปหัวข้อใหม่ ให้คีย์บอร์ด/โปรแกรมอ่านจอรู้ว่าขั้นเปลี่ยน
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus({ preventScroll: false });
  }, [step]);

  const needsProvince =
    draft.region !== null && draft.region !== "Bangkok" && draft.region !== "Nationwide";
  const provinces = useMemo(
    () => (needsProvince && draft.region ? PROVINCES_BY_REGION(draft.region) : []),
    [needsProvince, draft.region],
  );
  const pickRegion = (r: Region) => {
    if (draft.region === r) return set({ region: null, province: "" });
    set({ region: r, province: r === "Bangkok" ? "Bangkok Metropolis" : "" });
  };

  const valid = quickStepValid(step, draft);
  const isLast = step === 3;
  const set = (patch: Partial<QuickDraft>) => {
    setDraft({ ...draft, ...patch });
    if (failed) setFailed(false);
  };

  const save = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    onSavingChange?.(true);
    setFailed(false);
    try {
      const input = toProfileInput(draft);
      if (isDevPreview("dryrun")) {
        onSaved(dryRunUser(input));
        return;
      }
      onSaved(await saveProfile(input));
    } catch (err) {
      console.error("[connexts] บันทึกโปรไฟล์ด่วนไม่สำเร็จ", err);
      setFailed(true);
    } finally {
      savingRef.current = false;
      setSaving(false);
      onSavingChange?.(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid || saving) return;
    if (isLast) void save();
    else setStep((step + 1) as QuickStep);
  };

  const headingCls = "font-heading text-title text-ink outline-none";
  const labelCls = "text-body font-semibold text-ink";

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <div>
        <p className="text-body font-semibold text-ink-soft">ขั้นที่ {step} จาก 3</p>
        <div aria-hidden className="mt-2 flex gap-2">
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className={`h-2 flex-1 rounded-full ${n <= step ? "bg-primary" : "bg-border"}`}
            />
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-5">
          <h2 ref={headingRef} tabIndex={-1} className={headingCls}>
            เราเรียกคุณว่าอะไรดี?
          </h2>
          <div className="flex flex-col gap-2">
            <label htmlFor="qp-name" className={labelCls}>
              ชื่อที่อยากให้เพื่อนเรียก
            </label>
            <input
              id="qp-name"
              type="text"
              value={draft.name}
              maxLength={60}
              autoComplete="nickname"
              enterKeyHint="next"
              onChange={(e) => set({ name: e.target.value })}
              className="w-full rounded-xl border-2 border-input bg-white px-4 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            />
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className={`${labelCls} mb-2`}>คุณทำงานอยู่ภาคไหน?</legend>
            <div className="grid grid-cols-2 gap-3">
              {REGIONS.map((r) => (
                <Choice key={r} pressed={draft.region === r} onClick={() => pickRegion(r)}>
                  {REGION_LABEL[r]}
                </Choice>
              ))}
            </div>
          </fieldset>
          {needsProvince && (
            <div className="flex flex-col gap-2">
              <label htmlFor="qp-province" className={labelCls}>
                จังหวัดที่ทำงานอยู่
              </label>
              <select
                id="qp-province"
                value={draft.province}
                aria-describedby="qp-province-note"
                onChange={(e) => set({ province: e.target.value })}
                className="h-14 w-full rounded-xl border-2 border-input bg-white px-4 text-body font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <option value="">เลือกจังหวัด</option>
                {provinces.map((p) => (
                  <option key={p.en} value={p.en}>
                    {p.th}
                  </option>
                ))}
              </select>
              <p id="qp-province-note" className="text-body text-ink-soft">
                จังหวัดของคุณจะขึ้นบนจอใหญ่ในงาน
              </p>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <h2 ref={headingRef} tabIndex={-1} className={headingCls}>
            คุณสนใจเรื่องอะไร?
          </h2>
          <div role="group" aria-label="เรื่องที่สนใจ" className="flex flex-wrap gap-3">
            {ISSUES.map((issue) => (
              <IssueToggle
                key={issue}
                issue={issue}
                pressed={draft.interests.includes(issue)}
                onClick={() => set({ interests: toggle(draft.interests, issue) })}
              />
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-6">
          <fieldset className="flex flex-col gap-3">
            <legend>
              <h2 ref={headingRef} tabIndex={-1} className={headingCls}>
                คุณมีพลังอะไรให้เพื่อน?
              </h2>
            </legend>
            <div className="flex flex-wrap gap-3">
              {POWERS.map((p) => (
                <Choice
                  key={p.key}
                  icon={POWER_ICON[p.key as Power]}
                  pressed={draft.powers_have.includes(p.key)}
                  onClick={() => set({ powers_have: toggle(draft.powers_have, p.key) })}
                >
                  {p.th}
                </Choice>
              ))}
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-3">
            <legend className="font-heading text-lead font-semibold text-ink">
              อยากได้พลังอะไรเพิ่ม? (ไม่บังคับ)
            </legend>
            <div className="flex flex-wrap gap-3">
              {POWERS.map((p) => (
                <Choice
                  key={p.key}
                  icon={POWER_ICON[p.key as Power]}
                  pressed={draft.powers_need.includes(p.key)}
                  onClick={() => set({ powers_need: toggle(draft.powers_need, p.key) })}
                >
                  {p.th}
                </Choice>
              ))}
            </div>
          </fieldset>
        </div>
      )}

      {/* ปุ่มตรึงไว้ล่างสุดของพื้นที่เลื่อน — รายการยาว (ประเด็น/พลัง) ก็ยังเห็นปุ่มเสมอ */}
      <div className="sticky bottom-0 -mx-1 flex flex-col gap-3 bg-white px-1 pb-1 pt-3">
        {!valid && (
          <p id="qp-hint" className="text-body font-semibold text-ink-soft">
            {quickStepHint(step)}
          </p>
        )}
        {failed && (
          <p
            role="alert"
            className="rounded-xl bg-[#FDECEA] p-3 text-body font-semibold text-[#8A1C12]"
          >
            {SAVE_ERROR}
          </p>
        )}

        <div className="flex gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={() => !saving && setStep((step - 1) as QuickStep)}
              aria-disabled={saving}
              className="meadow-btn-secondary tap"
            >
              <ArrowLeft aria-hidden className="h-6 w-6" />
              ย้อนกลับ
            </button>
          )}
          <button
            type="submit"
            aria-disabled={!valid || saving}
            aria-describedby={!valid ? "qp-hint" : undefined}
            aria-busy={saving}
            className="meadow-btn-primary tap flex-1 aria-disabled:cursor-not-allowed aria-disabled:bg-[#D9D5EA] aria-disabled:text-ink-soft"
          >
            {isLast ? (saving ? "กำลังบันทึก…" : "เริ่มจับคู่") : "ไปต่อ"}
          </button>
        </div>
      </div>
    </form>
  );
}
