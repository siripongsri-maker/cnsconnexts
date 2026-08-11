import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Camera, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { ISSUES, POWERS, REGIONS, type Generation, type Region } from "@/lib/types";
import { GENERATION_TH, issueTh, REGION_LABEL } from "@/lib/i18n";
import { PROVINCES_BY_REGION } from "@/lib/thailand-geo";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "สร้างโปรไฟล์พลังของคุณ — Connecting Power" },
      {
        name: "description",
        content: "บอกเราหน่อยว่าคุณมีพลังอะไร และกำลังมองหาพลังแบบไหน ใช้เวลาไม่ถึง 2 นาที",
      },
      { property: "og:title", content: "สร้างโปรไฟล์พลังของคุณ" },
      { property: "og:description", content: "คุณมีพลังอะไร และกำลังมองหาพลังแบบไหน" },
    ],
  }),
  component: Onboarding,
});

const GENERATIONS: Generation[] = ["Gen Z", "Millennial", "Gen X", "Boomer"];
const AVATARS = ["✨", "🧑🏻‍🎤", "👩🏽‍🌾", "🧑🏽‍💼", "👩🏻‍💻", "🧕🏽", "👴🏽", "🏳️‍🌈", "🧑🏻‍🌾", "👩🏽‍⚕️"];

const STEPS = 5;

function Onboarding() {
  const navigate = useNavigate();
  const { saveProfile } = useStore();
  const [step, setStep] = useState(0);

  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("✨");
  const [organization, setOrganization] = useState("");
  const [generation, setGeneration] = useState<Generation>("Millennial");
  const [region, setRegion] = useState<Region | null>(null);
  const [province, setProvince] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [have, setHave] = useState<string[]>([]);
  const [need, setNeed] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [photo, setPhoto] = useState<string | undefined>(undefined);

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const canNext =
    (step === 0 && name.trim().length > 0) ||
    (step === 1 && !!region) ||
    (step === 2 && interests.length > 0) ||
    (step === 3 && have.length > 0) ||
    step === 4;

  const finish = () => {
    saveProfile({
      name: name.trim(),
      avatar,
      photo,
      province: province || (region ? (PROVINCES_BY_REGION(region)[0]?.en ?? "Bangkok") : "Bangkok"),
      region: region ?? "Nationwide",
      organization: organization.trim() || "อิสระ",
      generation,
      bio: bio.trim(),
      interests,
      powers_have: have,
      powers_need: need,
    });
    navigate({ to: "/matches" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 bg-background/90 px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          {step === 0 ? (
            <Link to="/" className="tap grid h-9 w-9 place-items-center rounded-full bg-muted">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          ) : (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="tap grid h-9 w-9 place-items-center rounded-full bg-muted"
              aria-label="ย้อนกลับ"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full gradient-power transition-all duration-500"
              style={{ width: `${((step + 1) / STEPS) * 100}%` }}
            />
          </div>
          <span className="text-[11px] font-bold text-muted-foreground">
            {step + 1}/{STEPS}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl px-5 pb-40 pt-4">
        {step === 0 && (
          <Section title="เรียกคุณว่าอะไรดี" th="Tell us your name">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ชื่อหรือชื่อเล่นของคุณ"
              className="h-14 w-full rounded-2xl border border-border bg-card px-4 text-lg font-semibold outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex flex-wrap gap-2">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAvatar(a)}
                  className={`tap grid h-12 w-12 place-items-center rounded-2xl border text-2xl ${
                    avatar === a ? "border-primary bg-primary/10" : "border-border bg-card"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-3">
              {photo ? (
                <img src={photo} alt="รูปโปรไฟล์" className="h-16 w-16 rounded-2xl object-cover" />
              ) : (
                <span className="grid h-16 w-16 place-items-center rounded-2xl bg-muted text-2xl" aria-hidden>
                  {avatar}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-extrabold">แนบรูปโปรไฟล์ (ไม่บังคับ)</p>
                <p className="text-[11px] text-muted-foreground">ถ้าไม่แนบ เราจะใช้อีโมจิที่คุณเลือก</p>
                <div className="mt-2 flex gap-2">
                  <label className="tap inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground">
                    <Camera className="h-3.5 w-3.5" />
                    เลือกรูป
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => setPhoto(String(reader.result));
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                  {photo && (
                    <button
                      onClick={() => setPhoto(undefined)}
                      className="tap inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-[11px] font-bold"
                    >
                      <X className="h-3.5 w-3.5" />
                      ลบรูป
                    </button>
                  )}
                </div>
              </div>
            </div>
            <input
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="กลุ่ม / องค์กร (ไม่บังคับ)"
              className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex flex-wrap gap-2">
              {GENERATIONS.map((g) => (
                <Pill key={g} active={generation === g} onClick={() => setGeneration(g)}>
                  {GENERATION_TH[g]}
                </Pill>
              ))}
            </div>
          </Section>
        )}

        {step === 1 && (
          <Section title="คุณทำงานอยู่ที่ไหน" th="เลือกภาคและจังหวัดของคุณ">
            <div className="grid grid-cols-2 gap-2">
              {REGIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRegion(r);
                    setProvince("");
                  }}
                  className={`tap rounded-2xl border p-4 text-left ${
                    region === r ? "border-primary bg-primary/10" : "border-border bg-card"
                  }`}
                >
                  <span className="block text-sm font-extrabold">{REGION_LABEL[r]}</span>
                  <span className="block text-[12px] text-muted-foreground">{r}</span>
                </button>
              ))}
            </div>
            {region && (
              <div className="animate-rise max-h-64 overflow-y-auto rounded-2xl border border-border bg-card p-2">
                <p className="px-2 pb-2 pt-1 text-[11px] font-bold text-muted-foreground">
                  เลือกจังหวัดของคุณ
                </p>
                <div className="flex flex-wrap gap-2">
                  {PROVINCES_BY_REGION(region).map((p) => (
                    <Pill key={p.en} active={province === p.en} onClick={() => setProvince(p.en)}>
                      {p.th}
                    </Pill>
                  ))}
                </div>
              </div>
            )}
          </Section>
        )}

        {step === 2 && (
          <Section title="คุณสนใจประเด็นอะไร" th="เลือกได้มากกว่า 1 ข้อ">
            <div className="grid grid-cols-2 gap-2">
              {ISSUES.map((i) => (
                <button
                  key={i}
                  onClick={() => toggle(interests, setInterests, i)}
                  className={`tap rounded-2xl border px-3 py-4 text-sm font-bold ${
                    interests.includes(i)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card"
                  }`}
                >
                  {issueTh(i)}
                </button>
              ))}
            </div>
          </Section>
        )}

        {step === 3 && (
          <Section title="คุณมีพลังอะไรมาแบ่งปัน" th="สิ่งที่คุณให้คนอื่นได้">
            <PowerGrid selected={have} onToggle={(v) => toggle(have, setHave, v)} tone="lime" />
          </Section>
        )}

        {step === 4 && (
          <Section title="คุณกำลังมองหาพลังแบบไหน" th="สิ่งที่คุณอยากได้จากคนอื่น">
            <PowerGrid selected={need} onToggle={(v) => toggle(need, setNeed, v)} tone="coral" />
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="เล่าสั้น ๆ ว่าคุณกำลังทำอะไรอยู่ เช่น กำลังสร้างเครือข่ายดูแลสุขภาพจิตสำหรับเยาวชนในเชียงใหม่"
              className="w-full rounded-2xl border border-border bg-card p-4 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </Section>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/60 bg-background/90 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
        <button
          disabled={!canNext}
          onClick={() => (step === STEPS - 1 ? finish() : setStep((s) => s + 1))}
          className="tap mx-auto flex h-14 w-full max-w-xl items-center justify-center gap-2 rounded-2xl gradient-power text-base font-extrabold text-primary-foreground disabled:opacity-40"
        >
          {step === STEPS - 1 ? "ค้นหาคู่พลังของฉัน" : "ถัดไป"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  th,
  children,
}: {
  title: string;
  th: string;
  children: React.ReactNode;
}) {
  return (
    <section className="animate-rise space-y-4">
      <div>
        <h2 className="text-2xl font-extrabold leading-tight">{title}</h2>
        <p className="mt-1 text-sm font-semibold text-primary">{th}</p>
      </div>
      {children}
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
      onClick={onClick}
      className={`tap rounded-full border px-4 py-2 text-[13px] font-bold ${
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
            onClick={() => onToggle(p.key)}
            className={`tap rounded-2xl border p-3 text-left ${
              active
                ? tone === "lime"
                  ? "border-lime bg-lime/25"
                  : "border-coral bg-coral/12"
                : "border-border bg-card"
            }`}
          >
            <span className="text-xl">{p.emoji}</span>
            <span className="mt-1 block text-[13px] font-extrabold leading-tight">{p.th}</span>
            <span className="block text-[11px] text-muted-foreground">{p.key}</span>
          </button>
        );
      })}
    </div>
  );
}
