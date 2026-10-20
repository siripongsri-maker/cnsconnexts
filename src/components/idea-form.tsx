import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
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
  const [errors, setErrors] = useState<{ title?: string | undefined; need?: string | undefined }>({});
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
        needGroupRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
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
      toast.success("แก้ไขไอเดียแล้ว ✨");
    } else {
      addIdea(payload);
      toast.success("ลงไอเดียในตลาดพลังแล้ว 🎉", { description: "รอเพื่อน ๆ มาขอเชื่อมต่อได้เลย" });
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6"
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
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] outline-none sm:rounded-3xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="idea-form-title" className="text-lg font-extrabold">
            {idea ? "แก้ไขไอเดีย" : "ลงไอเดียใหม่"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="tap grid h-11 w-11 place-items-center rounded-full bg-muted"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <label htmlFor="idea-title" className="mb-1 block text-[12px] font-bold">
          ชื่อไอเดีย <span className="font-normal text-muted-foreground">(จำเป็น)</span>
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
          className={`h-12 w-full rounded-xl border bg-background px-3 text-sm ${
            errors.title ? "border-destructive" : "border-border"
          }`}
        />
        {errors.title ? (
          <p id="idea-title-err" role="alert" className="mt-1 mb-3 text-[12px] font-semibold text-destructive">
            {errors.title}
          </p>
        ) : (
          <div className="mb-3" />
        )}

        <label htmlFor="idea-desc" className="mb-1 block text-[12px] font-bold">
          เล่าให้ฟังสั้น ๆ
        </label>
        <textarea
          id="idea-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="อยากทำอะไร กับใคร ที่ไหน"
          className="mb-3 w-full rounded-xl border border-border bg-background p-3 text-sm"
        />

        <Section label="พื้นที่">
          {REGIONS.map((r) => (
            <Pill key={r} active={region === r} onClick={() => setRegion(r)}>
              {REGION_LABEL[r]}
            </Pill>
          ))}
        </Section>

        <Section label="ประเด็นที่เกี่ยวข้อง">
          {ISSUES.filter((i) => i !== "Other").map((i) => (
            <Pill key={i} active={issues.includes(i)} onClick={() => toggle(issues, setIssues, i)}>
              {issueTh(i)}
            </Pill>
          ))}
        </Section>

        <Section label="พลังที่เรามีให้">
          {POWERS.map((p) => (
            <Pill key={p.key} active={have.includes(p.key)} onClick={() => toggle(have, setHave, p.key)}>
              {p.emoji} {p.th}
            </Pill>
          ))}
        </Section>

        <Section
          label="พลังที่เรากำลังตามหา"
          hint="(เลือกอย่างน้อย 1)"
          error={errors.need}
          groupRef={needGroupRef}
        >
          {POWERS.map((p) => (
            <Pill
              key={p.key}
              active={need.includes(p.key)}
              onClick={() => {
                if (!need.includes(p.key) && errors.need) {
                  setErrors((prev) => ({ ...prev, need: undefined }));
                }
                toggle(need, setNeed, p.key);
              }}
            >
              {p.emoji} {p.th}
            </Pill>
          ))}
        </Section>

        <button
          type="button"
          onClick={submit}
          disabled={sending}
          className="tap mt-5 h-12 w-full rounded-xl gradient-power text-sm font-extrabold text-primary-foreground disabled:opacity-60"
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
      className="mb-3"
    >
      <p id={id} className="mb-1.5 text-[12px] font-bold">
        {label}
        {hint && <span className="font-normal text-muted-foreground"> {hint}</span>}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-[12px] font-semibold text-destructive">
          {error}
        </p>
      )}
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
      className={`tap inline-flex min-h-10 items-center rounded-full border px-3 text-xs font-bold ${
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
      }`}
    >
      {children}
    </button>
  );
}
