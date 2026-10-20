import { useMemo, useState } from "react";
import { Camera, X } from "lucide-react";

import { GENERATION_TH, issueTh, REGION_LABEL } from "@/lib/i18n";
import { PROVINCES_BY_REGION } from "@/lib/thailand-geo";
import { ISSUES, POWERS, REGIONS, type Generation, type Region, type User } from "@/lib/types";

const GENERATIONS: Generation[] = ["Gen Z", "Millennial", "Gen X", "Boomer"];
const AVATARS = ["✨", "🧑🏻‍🎤", "👩🏽‍🌾", "🧑🏽‍💼", "👩🏻‍💻", "🧕🏽", "👴🏽", "🏳️‍🌈", "🧑🏻‍🌾", "👩🏽‍⚕️"];

export type ProfileDraft = Omit<User, "id" | "created_at">;

/**
 * One linear profile form used everywhere (สร้างโปรไฟล์ / อัปเดตข้อมูล)
 * so participants never fill the same information twice.
 */
export function ProfileForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: User | null;
  submitLabel: string;
  onSubmit: (draft: ProfileDraft) => void | Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [avatar, setAvatar] = useState(initial?.avatar ?? "✨");
  const [photo, setPhoto] = useState<string | undefined>(initial?.photo);
  const [organization, setOrganization] = useState(initial?.organization ?? "");
  const [generation, setGeneration] = useState<Generation>(initial?.generation ?? "Millennial");
  const [region, setRegion] = useState<Region>(initial?.region ?? "Central");
  const [province, setProvince] = useState(initial?.province ?? "");
  const [interests, setInterests] = useState<string[]>(initial?.interests ?? []);
  const [have, setHave] = useState<string[]>(initial?.powers_have ?? []);
  const [need, setNeed] = useState<string[]>(initial?.powers_need ?? []);
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [sending, setSending] = useState(false);

  const provinces = useMemo(() => PROVINCES_BY_REGION(region), [region]);
  const valid = name.trim().length > 0 && interests.length > 0 && have.length > 0;

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const onPhoto = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result));
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (!valid || sending) return;
    setSending(true);
    try {
      await onSubmit({
        name: name.trim(),

        avatar,
        photo,
        province: province || (provinces[0]?.en ?? "Bangkok"),
        region,
        organization: organization.trim() || "อิสระ",
        generation,
        bio: bio.trim(),
        interests,
        powers_have: have,
        powers_need: need,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-7 pb-32">
      <Block step={1} title="คุณคือใคร" hint="ชื่อ รูป และกลุ่มที่สังกัด">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-3xl bg-accent text-3xl">
              {photo ? (
                <img src={photo} alt="รูปโปรไฟล์ของฉัน" className="h-full w-full object-cover" />
              ) : (
                <span aria-hidden>{avatar}</span>
              )}
            </div>
            {photo && (
              <button
                type="button"
                onClick={() => setPhoto(undefined)}
                aria-label="ลบรูป"
                className="tap absolute -right-2 -top-2 grid h-9 w-9 place-items-center rounded-full bg-foreground text-background"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <label className="tap inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl border border-border px-4 py-2.5 text-[13px] font-bold focus-within:ring-2 focus-within:ring-ring">
            <Camera className="h-4 w-4" aria-hidden />
            {photo ? "เปลี่ยนรูป" : "แนบรูป (ไม่บังคับ)"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => onPhoto(e.target.files?.[0])}
            />
          </label>
        </div>

        <label htmlFor="pf-name" className="block text-[13px] font-bold">
          ชื่อที่อยากให้เพื่อนเรียก <span className="text-primary">*</span>
        </label>
        <input
          id="pf-name"
          autoComplete="nickname"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="เช่น ต้น, มายด์"
          className="h-13 w-full rounded-2xl border border-border bg-card px-4 py-3 text-base font-semibold outline-none focus:ring-2 focus:ring-ring"
        />
        <label htmlFor="pf-org" className="block text-[13px] font-bold">
          กลุ่ม / องค์กร <span className="font-medium text-muted-foreground">(ไม่บังคับ)</span>
        </label>
        <input
          id="pf-org"
          autoComplete="organization"
          value={organization}
          onChange={(e) => setOrganization(e.target.value)}
          placeholder="เช่น เครือข่ายเยาวชนภาคใต้"
          className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
        />

        {!photo && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="เลือกไอคอนแทนตัว">
            {AVATARS.map((a, idx) => (
              <button
                key={a}
                type="button"
                aria-label={`ไอคอนแทนตัวแบบที่ ${idx + 1}`}
                aria-pressed={avatar === a}
                onClick={() => setAvatar(a)}
                className={`tap grid h-11 w-11 place-items-center rounded-2xl border text-xl ${
                  avatar === a ? "border-primary bg-primary/10" : "border-border bg-card"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2" role="group" aria-label="ช่วงวัย">
          {GENERATIONS.map((g) => (
            <Pill key={g} active={generation === g} onClick={() => setGeneration(g)}>
              {GENERATION_TH[g]}
            </Pill>
          ))}
        </div>
      </Block>

      <Block step={2} title="คุณทำงานอยู่ที่ไหน" hint="เลือกภาคแล้วเลือกจังหวัด">
        <div className="flex flex-wrap gap-2" role="group" aria-label="ภูมิภาค">
          {REGIONS.map((r) => (
            <Pill
              key={r}
              active={region === r}
              onClick={() => {
                setRegion(r);
                setProvince("");
              }}
            >
              {REGION_LABEL[r]}
            </Pill>
          ))}
        </div>
        <label htmlFor="pf-province" className="sr-only">
          จังหวัด
        </label>
        <select
          id="pf-province"
          value={province}
          onChange={(e) => setProvince(e.target.value)}
          className="h-12 w-full rounded-2xl border border-border bg-card px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">เลือกจังหวัด</option>
          {provinces.map((p) => (
            <option key={p.en} value={p.en}>
              {p.th}
            </option>
          ))}
        </select>
      </Block>

      <Block step={3} title="ประเด็นที่คุณทำ" hint="เลือกได้มากกว่า 1 ข้อ">
        <div className="flex flex-wrap gap-2" role="group" aria-label="ประเด็นที่คุณทำ">
          {ISSUES.map((i) => (
            <Pill
              key={i}
              active={interests.includes(i)}
              onClick={() => toggle(interests, setInterests, i)}
            >
              {issueTh(i)}
            </Pill>
          ))}
        </div>
      </Block>

      <Block step={4} title="พลังที่คุณมี" hint="สิ่งที่คุณแบ่งปันให้เพื่อนได้">
        <PowerGrid selected={have} onToggle={(v) => toggle(have, setHave, v)} tone="lime" />
      </Block>

      <Block step={5} title="พลังที่คุณต้องการ" hint="สิ่งที่อยากได้จากเพื่อนในเครือข่าย">
        <PowerGrid selected={need} onToggle={(v) => toggle(need, setNeed, v)} tone="coral" />
        <label htmlFor="pf-bio" className="block text-[13px] font-bold">
          เล่าสั้น ๆ ว่าคุณกำลังทำอะไรอยู่{" "}
          <span className="font-medium text-muted-foreground">(ไม่บังคับ)</span>
        </label>
        <textarea
          id="pf-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          placeholder="เช่น ทำงานเรื่องพื้นที่ปลอดภัยให้เยาวชน"
          className="w-full rounded-2xl border border-border bg-card p-4 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </Block>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/92 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
        <button
          type="button"
          disabled={!valid || sending}
          aria-describedby={!valid ? "pf-hint" : undefined}
          onClick={submit}
          className="tap mx-auto flex h-14 w-full max-w-xl items-center justify-center rounded-2xl gradient-power text-base font-extrabold text-primary-foreground disabled:opacity-40"
        >
          {sending ? "กำลังบันทึก…" : submitLabel}
        </button>
        {!valid && (
          <p
            id="pf-hint"
            className="mx-auto mt-1.5 max-w-xl text-center text-xs text-muted-foreground"
          >
            กรอกชื่อ เลือกประเด็นอย่างน้อย 1 ข้อ และพลังที่มีอย่างน้อย 1 ข้อ
          </p>
        )}
      </div>
    </div>
  );
}

function Block({
  step,
  title,
  hint,
  children,
}: {
  step: number;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="animate-rise space-y-3">
      <div className="flex items-baseline gap-2">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/12 text-xs font-extrabold text-primary">
          {step}
        </span>
        <div>
          <h2 className="text-lg font-extrabold leading-tight">{title}</h2>
          <p className="text-[12px] text-muted-foreground">{hint}</p>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
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
      className={`tap min-h-11 rounded-full border px-4 py-2 text-[13px] font-bold ${
        active ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"
      }`}
    >
      {children}
    </button>
  );
}

function PowerGrid({
  selected,
  onToggle,
  tone,
}: {
  selected: string[];
  onToggle: (v: string) => void;
  tone: "lime" | "coral";
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {POWERS.map((p) => {
        const active = selected.includes(p.key);
        return (
          <button
            key={p.key}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(p.key)}
            className={`tap rounded-2xl border p-3 text-left ${
              active
                ? tone === "lime"
                  ? "border-lime bg-lime/25"
                  : "border-coral bg-coral/12"
                : "border-border bg-card"
            }`}
          >
            <span className="text-xl" aria-hidden>
              {p.emoji}
            </span>
            <span className="mt-1 block text-[13px] font-extrabold leading-tight">{p.th}</span>
          </button>
        );
      })}
    </div>
  );
}
