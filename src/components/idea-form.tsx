import { useState } from "react";
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

  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);

  const submit = () => {
    if (!title.trim()) {
      toast.error("ใส่ชื่อไอเดียก่อนนะ");
      return;
    }
    if (need.length === 0) {
      toast.error("เลือกอย่างน้อย 1 พลังที่คุณกำลังต้องการ");
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card p-5 sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">{idea ? "แก้ไขไอเดีย" : "ลงไอเดียใหม่"}</h2>
          <button onClick={onClose} aria-label="ปิด" className="tap grid h-9 w-9 place-items-center rounded-full bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="mb-1 block text-[12px] font-bold">ชื่อไอเดีย</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="เช่น ห้องเรียนสุขภาพจิตวัยรุ่น"
          className="mb-3 h-12 w-full rounded-xl border border-border bg-background px-3 text-sm"
        />

        <label className="mb-1 block text-[12px] font-bold">เล่าให้ฟังสั้น ๆ</label>
        <textarea
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

        <Section label="พลังที่เรากำลังตามหา">
          {POWERS.map((p) => (
            <Pill key={p.key} active={need.includes(p.key)} onClick={() => toggle(need, setNeed, p.key)}>
              {p.emoji} {p.th}
            </Pill>
          ))}
        </Section>

        <button
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

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="mb-1.5 text-[12px] font-bold">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
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
      onClick={onClick}
      className={`tap rounded-full border px-3 py-1.5 text-xs font-bold ${
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
      }`}
    >
      {children}
    </button>
  );
}
