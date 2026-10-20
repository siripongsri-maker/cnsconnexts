import { useMemo, useState } from "react";
import { Camera, Check, X } from "lucide-react";

import { GENERATION_TH, issueTh, REGION_LABEL } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { PROVINCES_BY_REGION } from "@/lib/thailand-geo";
import { ISSUES, POWERS, REGIONS, type Generation, type Region, type User } from "@/lib/types";

const GENERATIONS: Generation[] = ["Gen Z", "Millennial", "Gen X", "Boomer"];
const AVATARS = ["✨", "🧑🏻‍🎤", "👩🏽‍🌾", "🧑🏽‍💼", "👩🏻‍💻", "🧕🏽", "👴🏽", "🏳️‍🌈", "🧑🏻‍🌾", "👩🏽‍⚕️"];
const BIO_MAX = 160;
const PHOTO_MAX = 512;

export type ProfileDraft = Omit<User, "id" | "created_at">;

type Missing = { id: string; label: string };

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
  const { users } = useStore();
  const [name, setName] = useState(initial?.name ?? "");
  const [avatar, setAvatar] = useState(initial?.avatar ?? "✨");
  const [photo, setPhoto] = useState<string | undefined>(initial?.photo);
  const [photoState, setPhotoState] = useState<"idle" | "busy" | "error">("idle");
  const [organization, setOrganization] = useState(initial?.organization ?? "");
  const [generation, setGeneration] = useState<Generation>(initial?.generation ?? "Millennial");
  const [region, setRegion] = useState<Region>(initial?.region ?? "Central");
  const [province, setProvince] = useState(initial?.province ?? "");
  const [interests, setInterests] = useState<string[]>(initial?.interests ?? []);
  const [have, setHave] = useState<string[]>(initial?.powers_have ?? []);
  const [need, setNeed] = useState<string[]>(initial?.powers_need ?? []);
  const [bio, setBio] = useState((initial?.bio ?? "").slice(0, BIO_MAX));
  const [sending, setSending] = useState(false);

  const provinces = useMemo(() => PROVINCES_BY_REGION(region), [region]);
  const showProvince = region !== "Nationwide" && region !== "Bangkok";

  const missing: Missing[] = [
    !name.trim() && { id: "pf-name", label: "ชื่อ" },
    !interests.length && { id: "pf-step-3", label: "ประเด็นที่ใส่ใจ" },
    !have.length && { id: "pf-step-4", label: "พลังที่คุณมี" },
  ].filter((m): m is Missing => Boolean(m));
  const valid = missing.length === 0;
  const answered = 3 - missing.length;

  // คนในงานที่ "น่าจะเจอกัน" — โชว์ก่อนกดส่ง เพื่อให้เห็นว่าใครรออยู่
  const peers = useMemo(() => users.filter((u) => u.id !== "me"), [users]);
  const sameIssue = useMemo(
    () =>
      interests.length
        ? peers.filter((u) => u.interests.some((i) => interests.includes(i))).length
        : 0,
    [peers, interests],
  );
  const canHelp = useMemo(
    () =>
      need.length ? peers.filter((u) => u.powers_have.some((p) => need.includes(p))).length : 0,
    [peers, need],
  );

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  // ย่อรูปในเครื่องก่อนเก็บ (สูงสุด ~512px, JPEG) ให้โหลดเร็วบน Wi-Fi ในงาน
  const onPhoto = (input: HTMLInputElement) => {
    const file = input.files?.[0];
    input.value = ""; // allow re-picking the same file
    if (!file) return;
    setPhotoState("busy");
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, PHOTO_MAX / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * s));
      const h = Math.max(1, Math.round(img.naturalHeight * s));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        setPhoto(c.toDataURL("image/jpeg", 0.8));
        setPhotoState("idle");
      } else {
        setPhotoState("error");
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setPhotoState("error");
    };
    img.src = url;
  };

  const submit = async () => {
    if (sending) return;
    if (!valid) {
      const first = missing[0];
      const el = first ? document.getElementById(first.id) : null;
      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      el?.focus({ preventScroll: true });
      return;
    }
    setSending(true);
    try {
      await onSubmit({
        name: name.trim(),

        avatar,
        photo,
        province:
          region === "Bangkok" ? "Bangkok Metropolis" : region === "Nationwide" ? "" : province,
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

  const countHint = (base: string, n: number) => (n ? `${base} · เลือกแล้ว ${n}` : base);

  return (
    <div className="space-y-7 pb-44">
      <Block id="pf-step-1" step={1} title="ชื่อของคุณ" hint="ต้องกรอก">
        <label htmlFor="pf-name" className="block text-[13px] font-bold">
          ชื่อที่ใช้ในงาน <span className="text-primary">*</span>
        </label>
        <input
          id="pf-name"
          autoComplete="nickname"
          required
          aria-describedby="pf-name-hint"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="เช่น ต้น, มายด์"
          className="h-13 w-full rounded-2xl border border-border bg-card px-4 py-3 text-base font-semibold outline-none focus:ring-2 focus:ring-ring"
        />
        <p id="pf-name-hint" className="text-[12px] text-muted-foreground">
          ใช้ชื่อเล่นหรือนามแฝงได้
        </p>

        <details
          open={Boolean(
            initial?.photo || (initial?.organization && initial.organization !== "อิสระ"),
          )}
          className="rounded-2xl border border-border bg-card/60 p-3"
        >
          <summary className="min-h-11 cursor-pointer py-2.5 text-[13px] font-bold">
            เพิ่มรูป กลุ่ม และช่วงวัย (ไม่บังคับ)
          </summary>
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-3xl bg-accent text-3xl">
                  {photo ? (
                    <img
                      src={photo}
                      alt="รูปโปรไฟล์ของฉัน"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span aria-hidden>{avatar}</span>
                  )}
                </div>
                {photo && (
                  <button
                    type="button"
                    onClick={() => setPhoto(undefined)}
                    aria-label="ลบรูป"
                    className="tap absolute -right-2 -top-2 grid h-9 w-9 place-items-center rounded-full bg-foreground text-background after:absolute after:-inset-1 after:content-['']"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                )}
              </div>
              <label
                aria-busy={photoState === "busy"}
                className="tap inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl border border-border px-4 py-2.5 text-[13px] font-bold focus-within:ring-2 focus-within:ring-ring"
              >
                <Camera className="h-4 w-4" aria-hidden />
                {photoState === "busy"
                  ? "กำลังเตรียมรูป…"
                  : photo
                    ? "เปลี่ยนรูป"
                    : "แนบรูป (ไม่บังคับ)"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={photoState === "busy"}
                  onChange={(e) => onPhoto(e.currentTarget)}
                />
              </label>
            </div>
            <p role="status" aria-live="polite" className="text-[12px] text-muted-foreground">
              {photoState === "error" ? <>เปิดรูปไม่ได้ ลองเลือก JPG หรือ PNG</> : ""}
            </p>

            {!photo && (
              <div className="flex flex-wrap gap-2" role="group" aria-label="เลือกไอคอนแทนตัว">
                {AVATARS.map((a, idx) => (
                  <button
                    key={a}
                    type="button"
                    aria-label={`ไอคอนแทนตัวแบบที่ ${idx + 1}`}
                    aria-pressed={avatar === a}
                    onClick={() => setAvatar(a)}
                    className={`tap grid h-11 w-11 place-items-center rounded-2xl border-2 text-xl ${
                      avatar === a ? "border-primary bg-primary/10" : "border-border bg-card"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            )}

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

            <p id="pf-gen" className="block text-[13px] font-bold">
              ช่วงวัยของคุณ
            </p>
            <div className="flex flex-wrap gap-2" role="group" aria-labelledby="pf-gen">
              {GENERATIONS.map((g) => (
                <Pill key={g} active={generation === g} onClick={() => setGeneration(g)}>
                  {GENERATION_TH[g]}
                </Pill>
              ))}
            </div>
          </div>
        </details>
      </Block>

      <Block
        id="pf-step-2"
        step={2}
        title="คุณอยู่ที่ไหน?"
        hint="ระบุจังหวัดเพื่อให้คนในพื้นที่เจอคุณง่ายขึ้น"
      >
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
        {showProvince && (
          <>
            <label htmlFor="pf-province" className="block text-[13px] font-bold">
              จังหวัด <span className="font-medium text-muted-foreground">(ไม่บังคับ)</span>
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
          </>
        )}
      </Block>

      <Block
        id="pf-step-3"
        step={3}
        required
        title="ประเด็นที่คุณใส่ใจ"
        hint={countHint("เลือกได้หลายข้อ", interests.length)}
      >
        <div className="flex flex-wrap gap-2" role="group" aria-label="ประเด็นที่คุณใส่ใจ">
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

      <Block
        id="pf-step-4"
        step={4}
        required
        title="พลังที่พร้อมแบ่งปัน"
        hint={countHint("เลือกได้หลายข้อ", have.length)}
      >
        <PowerGrid
          label="พลังที่คุณมี"
          selected={have}
          onToggle={(v) => toggle(have, setHave, v)}
          tone="lime"
        />
      </Block>

      <Block
        id="pf-step-5"
        step={5}
        title="พลังที่กำลังมองหา"
        hint={countHint("เลือกได้หลายข้อ · ไม่บังคับ", need.length)}
      >
        <PowerGrid
          label="พลังที่คุณกำลังมองหา"
          selected={need}
          onToggle={(v) => toggle(need, setNeed, v)}
          tone="coral"
        />
      </Block>

      <Block
        id="pf-step-6"
        step={6}
        title="ตอนนี้กำลังทำอะไร?"
        hint="เล่า 1 ประโยคให้เพื่อนรู้จัก · ไม่บังคับ"
      >
        <label htmlFor="pf-bio" className="sr-only">
          เล่าสั้น ๆ ว่าคุณกำลังทำอะไรอยู่ (ไม่บังคับ)
        </label>
        <textarea
          id="pf-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          maxLength={BIO_MAX}
          aria-describedby="pf-bio-count"
          placeholder="เช่น กำลังสร้างเครือข่ายดูแลใจวัยรุ่นที่เชียงใหม่"
          className="w-full rounded-2xl border border-border bg-card p-4 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <p id="pf-bio-count" className="text-right text-[12px] text-muted-foreground font-tech">
          {bio.length}/{BIO_MAX}
        </p>
      </Block>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/92 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
        <div className="mx-auto mb-2 max-w-xl">
          <div
            role="progressbar"
            aria-label="ความคืบหน้าข้อที่ต้องตอบ"
            aria-valuemin={0}
            aria-valuemax={3}
            aria-valuenow={answered}
            className="h-1 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${(answered / 3) * 100}%` }}
            />
          </div>
        </div>
        {valid && (sameIssue > 0 || canHelp > 0) && (
          <p
            aria-live="polite"
            className="mx-auto mb-2 max-w-xl text-center text-[13px] font-bold text-primary"
          >
            <span aria-hidden>✨ </span>
            {[
              sameIssue > 0 && `${sameIssue} คนสนใจเรื่องเดียวกัน`,
              canHelp > 0 && `${canHelp} คนมีพลังที่คุณหา`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
        <button
          type="button"
          disabled={sending}
          aria-disabled={!valid || undefined}
          aria-describedby="pf-hint"
          onClick={submit}
          className="tap mx-auto flex h-14 w-full max-w-xl items-center justify-center rounded-2xl cta-holo text-base font-extrabold text-primary-foreground disabled:bg-none disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none aria-disabled:bg-none aria-disabled:bg-muted aria-disabled:text-muted-foreground aria-disabled:shadow-none"
        >
          {sending ? "กำลังบันทึก…" : submitLabel}
        </button>
        <p
          id="pf-hint"
          aria-live="polite"
          className="mx-auto mt-1.5 min-h-4 max-w-xl text-center text-xs text-muted-foreground"
        >
          {valid
            ? "ครบแล้ว พร้อมไปต่อ"
            : `ตอบแล้ว ${answered}/3 · ยังขาด: ${missing.map((m) => m.label).join(" · ")}`}
        </p>
      </div>
    </div>
  );
}

function Block({
  id,
  step,
  title,
  hint,
  required,
  children,
}: {
  id: string;
  step: number;
  title: string;
  hint: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      tabIndex={-1}
      aria-labelledby={`${id}-title`}
      className="animate-rise scroll-mt-24 space-y-3 outline-none"
    >
      <div className="flex items-baseline gap-2">
        <span
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/12 text-xs font-extrabold text-primary"
          aria-hidden
        >
          {step}
        </span>
        <div>
          <h2 id={`${id}-title`} className="text-lg font-extrabold leading-tight">
            {title}
            {required && (
              <span className="ml-1.5 inline-block rounded-full bg-primary/12 px-2 py-0.5 align-middle text-xs font-bold text-primary">
                ต้องเลือก
              </span>
            )}
          </h2>
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
      className={`tap inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-bold ${
        active ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"
      }`}
    >
      {active && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />}
      {children}
    </button>
  );
}

function PowerGrid({
  label,
  selected,
  onToggle,
  tone,
}: {
  label: string;
  selected: string[];
  onToggle: (v: string) => void;
  tone: "lime" | "coral";
}) {
  return (
    <div className="grid grid-cols-2 gap-2" role="group" aria-label={label}>
      {POWERS.map((p) => {
        const active = selected.includes(p.key);
        return (
          <button
            key={p.key}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(p.key)}
            className={`tap relative rounded-2xl border-2 p-3 pr-8 text-left ${
              active
                ? tone === "lime"
                  ? "border-lime-foreground/70 bg-lime/30"
                  : "border-coral bg-coral/15"
                : "border-border bg-card"
            }`}
          >
            {active && (
              <span
                className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-foreground text-background"
                aria-hidden
              >
                <Check className="h-3 w-3" />
              </span>
            )}
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
