import { useMemo, useState } from "react";
import { ArrowRight, Camera, Check, CheckCircle2, X } from "lucide-react";

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
    <div className="profile-form space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-title font-bold text-ink">
          {initial ? "ปรับพลังให้เป็นปัจจุบัน" : "บอกตัวตน สร้างการเชื่อมต่อ"}
        </h2>
        <span
          className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-body font-semibold ${
            valid ? "bg-[#3D7A1C] text-white" : "bg-sky text-ink"
          }`}
        >
          <CheckCircle2 className="h-5 w-5" aria-hidden />
          {answered}/3 ข้อสำคัญ
        </span>
      </div>
      <Block id="pf-step-1" step={1} title="ตัวตนของคุณ" hint="ชื่อที่อยากให้คนในงานเรียก" required>
        <label htmlFor="pf-name" className="block text-body font-semibold text-ink">
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
          className="h-14 w-full rounded-2xl border border-[#C9C6E0] bg-white px-4 text-body text-ink outline-none placeholder:text-ink-soft/70 focus:ring-2 focus:ring-ring font-semibold"
        />
        <p id="pf-name-hint" className="text-body text-ink-soft">
          ใช้ชื่อเล่นหรือนามแฝงได้
        </p>

        <details
          open={Boolean(
            initial?.photo || (initial?.organization && initial.organization !== "อิสระ"),
          )}
          className="rounded-2xl border border-[#E6E3F2] bg-sky-soft p-3"
        >
          <summary className="min-h-12 cursor-pointer py-2.5 text-body font-semibold text-ink">
            เพิ่มรูป กลุ่ม และช่วงวัย (ไม่บังคับ)
          </summary>
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-3xl bg-sky text-3xl">
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
                    className="tap absolute -right-3 -top-3 grid h-12 w-12 place-items-center rounded-full bg-ink text-white"
                  >
                    <X className="h-5 w-5" aria-hidden />
                  </button>
                )}
              </div>
              <label
                aria-busy={photoState === "busy"}
                className="tap inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl border border-[#C9C6E0] bg-white px-4 py-2.5 text-body font-semibold text-ink focus-within:ring-2 focus-within:ring-ring"
              >
                <Camera className="h-5 w-5" aria-hidden />
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
            <p role="status" aria-live="polite" className="text-body text-ink-soft">
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
                    className={`tap grid h-12 w-12 place-items-center rounded-2xl border-2 text-xl ${
                      avatar === a ? "border-primary bg-sky" : "border-[#E6E3F2] bg-white"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            )}

            <label htmlFor="pf-org" className="block text-body font-semibold text-ink">
              กลุ่ม / องค์กร <span className="font-normal text-ink-soft">(ไม่บังคับ)</span>
            </label>
            <input
              id="pf-org"
              autoComplete="organization"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="เช่น เครือข่ายเยาวชนภาคใต้"
              className="h-14 w-full rounded-2xl border border-[#C9C6E0] bg-white px-4 text-body text-ink outline-none placeholder:text-ink-soft/70 focus:ring-2 focus:ring-ring"
            />

            <p id="pf-gen" className="block text-body font-semibold text-ink">
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
        title="พื้นที่ของคุณ"
        hint="ให้คนในพื้นที่เดียวกันพบคุณง่ายขึ้น"
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
            <label htmlFor="pf-province" className="block text-body font-semibold text-ink">
              จังหวัด <span className="font-normal text-ink-soft">(ไม่บังคับ)</span>
            </label>
            <select
              id="pf-province"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className="h-14 w-full rounded-2xl border border-[#C9C6E0] bg-white px-4 text-body text-ink outline-none placeholder:text-ink-soft/70 focus:ring-2 focus:ring-ring font-semibold"
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
        hint="แนะนำงานที่ทำใน 1 ประโยค · ไม่บังคับ"
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
          className="min-h-28 w-full rounded-2xl border border-[#C9C6E0] bg-white px-4 text-body text-ink outline-none placeholder:text-ink-soft/70 focus:ring-2 focus:ring-ring py-3"
        />
        <p id="pf-bio-count" className="text-right text-body text-ink-soft">
          {bio.length}/{BIO_MAX}
        </p>
      </Block>

      <div className="sticky bottom-[calc(var(--bottom-nav-height,77px)+var(--pdpa-height,0px)+0.5rem)] z-20 rounded-3xl border border-[#E6E3F2] bg-white p-4 shadow-[0_8px_24px_-12px_rgba(43,40,120,0.35)]">
        <div
          role="progressbar"
          aria-label="ความคืบหน้าข้อที่ต้องตอบ"
          aria-valuemin={0}
          aria-valuemax={3}
          aria-valuenow={answered}
          className="h-2 overflow-hidden rounded-full bg-sky"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${(answered / 3) * 100}%` }}
          />
        </div>
        <p id="pf-hint" aria-live="polite" className="mt-2 text-body text-ink-soft">
          {valid ? "ครบแล้ว พร้อมไปต่อ" : `ยังขาด: ${missing.map((m) => m.label).join(" · ")}`}
        </p>
        {valid && (sameIssue > 0 || canHelp > 0) && (
          <p aria-live="polite" className="mt-1 text-body font-semibold text-primary">
            {[
              sameIssue > 0 && `${sameIssue} คนใส่ใจเรื่องเดียวกัน`,
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
          className={`tap mt-3 flex min-h-16 w-full items-center justify-center gap-2 rounded-[18px] px-6 text-body font-semibold ${
            valid ? "bg-primary text-white" : "bg-sky text-ink"
          }`}
        >
          <span>{sending ? "กำลังบันทึก…" : submitLabel}</span>
          <ArrowRight className="h-6 w-6" aria-hidden />
        </button>
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
      className="scroll-mt-24 rounded-3xl border border-[#E6E3F2] bg-white p-5 shadow-[0_8px_24px_-12px_rgba(43,40,120,0.25)] outline-none"
    >
      <div className="mb-4 flex items-start gap-3">
        <span
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sky font-heading text-body font-bold text-ink"
          aria-hidden
        >
          {step}
        </span>
        <div className="min-w-0">
          <h2
            id={`${id}-title`}
            className="flex flex-wrap items-center gap-2 font-heading text-title font-bold text-ink"
          >
            {title}
            {required && (
              <span className="rounded-lg bg-primary px-2 py-0.5 text-body font-semibold text-white">
                จำเป็น
              </span>
            )}
          </h2>
          <p className="text-body text-ink-soft">{hint}</p>
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
      className={`tap inline-flex min-h-12 items-center gap-2 rounded-full border-2 px-4 py-2 text-body font-semibold ${
        active ? "border-primary bg-primary text-white" : "border-[#C9C6E0] bg-white text-ink"
      }`}
    >
      {active && <Check className="h-5 w-5 shrink-0" aria-hidden />}
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
            className={`tap relative min-h-24 rounded-2xl border-2 p-3 pr-10 text-left ${
              active
                ? tone === "lime"
                  ? "border-[#3D7A1C] bg-[#EAF4E2]"
                  : "border-[#B8520F] bg-[#FDEBDD]"
                : "border-[#E6E3F2] bg-white"
            }`}
          >
            {active && (
              <span
                className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-ink text-white"
                aria-hidden
              >
                <Check className="h-4 w-4" />
              </span>
            )}
            <span className="text-xl" aria-hidden>
              {p.emoji}
            </span>
            <span className="mt-1 block text-body font-semibold leading-tight text-ink">
              {p.th}
            </span>
          </button>
        );
      })}
    </div>
  );
}
