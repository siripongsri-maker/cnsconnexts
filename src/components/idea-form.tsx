import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { ChoicePill } from "@/components/choice-pill";
import { PowerIcon } from "@/components/power-bits";
import { useStore } from "@/lib/store";
import { ISSUES, POWERS, REGIONS, type Idea, type Region } from "@/lib/types";
import { issueTh, REGION_LABEL } from "@/lib/i18n";

type Props = {
  /** ถ้ามี = โหมดแก้ไข */
  idea?: Idea | undefined;
  onClose: () => void;
};

/** ฟอร์มสร้าง/แก้ไขไอเดียในตลาดพลัง */
export function IdeaForm({ idea, onClose }: Props) {
  const { addIdea, updateIdea, me } = useStore();
  const [title, setTitle] = useState(idea?.title ?? "");
  const [description, setDescription] = useState(idea?.description ?? "");
  const [region, setRegion] = useState<Region>(idea?.region ?? me?.region ?? "Nationwide");
  const [issues, setIssues] = useState<string[]>(idea?.issues ?? []);
  const [have, setHave] = useState<string[]>(idea?.resources_have ?? []);
  const [need, setNeed] = useState<string[]>(idea?.resources_need ?? []);
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<{ title?: string | undefined; need?: string | undefined }>(
    {},
  );
  const dialogRef = useRef<HTMLDivElement>(null);
  const needGroupRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prev?.focus?.();
    };
  }, []);

  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);

  const submit = () => {
    const nextErrors = {
      title: !title.trim() ? "ใส่ชื่อไอเดียก่อนนะ" : undefined,
      need: need.length === 0 ? "เลือกอย่างน้อย 1 พลังที่อยากได้นะ" : undefined,
    };
    if (nextErrors.title || nextErrors.need) {
      setErrors(nextErrors);
      toast.error(nextErrors.title ?? nextErrors.need);
      if (nextErrors.title) {
        document.getElementById("idea-title")?.focus();
      } else {
        const motionOff =
          window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
          document.documentElement.hasAttribute("data-lowspec");
        needGroupRef.current?.scrollIntoView({
          behavior: motionOff ? "instant" : "smooth",
          block: "center",
        });
        needGroupRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
      }
      return;
    }
    setSending(true);
    const payload = {
      title: title.trim(),
      description: description.trim(),
      region,
      issues,
      resources_have: have,
      resources_need: need,
    };
    if (idea) {
      updateIdea(idea.id, payload);
      toast.success("แก้ไขไอเดียแล้ว");
    } else {
      addIdea(payload);
      toast.success("ลงไอเดียในตลาดพลังแล้ว", { description: "รอเพื่อน ๆ มาขอเชื่อมต่อได้เลย" });
    }
    onClose();
  };

  const field =
    "w-full rounded-2xl border-2 bg-white px-4 text-body text-ink outline-none placeholder:text-ink-soft focus:border-primary focus:ring-2 focus:ring-ring";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="idea-form-title"
        className="meadow-sheet max-h-[92vh] w-full max-w-lg overflow-y-auto px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-body outline-none"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="idea-form-title" className="font-heading text-title font-bold! text-ink">
            {idea ? "แก้ไขไอเดีย" : "ลงไอเดียใหม่"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="tap grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sky text-ink"
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <label htmlFor="idea-title" className="mb-1 block text-body font-semibold text-ink">
          ชื่อไอเดีย <span className="font-normal text-ink-soft">(จำเป็น)</span>
        </label>
        <input
          id="idea-title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
          }}
          placeholder="เช่น ห้องเรียนสุขภาพจิตวัยรุ่น"
          aria-required="true"
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? "idea-title-err" : undefined}
          className={`h-14 ${field} ${errors.title ? "border-[#B3261E]" : "border-[#8F8BB8]"}`}
        />
        {errors.title ? (
          <p
            id="idea-title-err"
            role="alert"
            className="mt-1 mb-3 text-body font-semibold text-[#B3261E]"
          >
            {errors.title}
          </p>
        ) : (
          <div className="mb-3" />
        )}

        <label htmlFor="idea-desc" className="mb-1 block text-body font-semibold text-ink">
          เล่าให้ฟังสั้น ๆ
        </label>
        <textarea
          id="idea-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="อยากทำอะไร กับใคร ที่ไหน"
          className={`mb-4 border-[#8F8BB8] py-3 ${field}`}
        />

        <Section label="พื้นที่">
          {REGIONS.map((r) => (
            <ChoicePill key={r} active={region === r} onClick={() => setRegion(r)}>
              {REGION_LABEL[r]}
            </ChoicePill>
          ))}
        </Section>

        <Section label="ประเด็นที่เกี่ยวข้อง">
          {ISSUES.filter((i) => i !== "Other").map((i) => (
            <ChoicePill
              key={i}
              active={issues.includes(i)}
              onClick={() => toggle(issues, setIssues, i)}
            >
              {issueTh(i)}
            </ChoicePill>
          ))}
        </Section>

        <Section label="พลังที่เรามีให้">
          {POWERS.map((p) => (
            <ChoicePill
              key={p.key}
              active={have.includes(p.key)}
              onClick={() => toggle(have, setHave, p.key)}
            >
              <PowerIcon name={p.key} className="h-5 w-5 shrink-0" /> {p.th}
            </ChoicePill>
          ))}
        </Section>

        <Section
          label="พลังที่เรากำลังตามหา"
          hint="(เลือกอย่างน้อย 1)"
          error={errors.need}
          groupRef={needGroupRef}
        >
          {POWERS.map((p) => (
            <ChoicePill
              key={p.key}
              active={need.includes(p.key)}
              onClick={() => {
                if (!need.includes(p.key) && errors.need) {
                  setErrors((prev) => ({ ...prev, need: undefined }));
                }
                toggle(need, setNeed, p.key);
              }}
            >
              <PowerIcon name={p.key} className="h-5 w-5 shrink-0" /> {p.th}
            </ChoicePill>
          ))}
        </Section>

        <button
          type="button"
          onClick={submit}
          disabled={sending}
          className="meadow-btn-primary tap mt-5 w-full"
        >
          {idea ? "บันทึกการแก้ไข" : "ลงไอเดีย"}
        </button>
      </div>
    </div>
  );
}

function Section({
  label,
  hint,
  error,
  groupRef,
  children,
}: {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  groupRef?: React.Ref<HTMLDivElement>;
  children: React.ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-err`;
  return (
    <div
      ref={groupRef}
      role="group"
      aria-labelledby={id}
      aria-describedby={error ? errorId : undefined}
      className="mb-4"
    >
      <p id={id} className="mb-2 text-body font-semibold text-ink">
        {label}
        {hint && <span className="font-normal text-ink-soft"> {hint}</span>}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-body font-semibold text-[#B3261E]">
          {error}
        </p>
      )}
    </div>
  );
}
