import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { ISSUES, POWERS, REGIONS, REGION_TH, type Generation, type Region } from "@/lib/types";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Create Your Power Profile — Connecting Power" },
      {
        name: "description",
        content: "Tell us what power you bring and what you're looking for. Two minutes, tops.",
      },
      { property: "og:title", content: "Create Your Power Profile" },
      { property: "og:description", content: "คุณมีพลังอะไร และกำลังมองหาพลังแบบไหน" },
    ],
  }),
  component: Onboarding,
});

const PROVINCES: Record<Region, string[]> = {
  North: ["Chiang Mai", "Chiang Rai", "Nan", "Phitsanulok", "Lampang"],
  Northeast: ["Khon Kaen", "Ubon Ratchathani", "Roi Et", "Sakon Nakhon", "Nakhon Ratchasima"],
  Central: ["Nakhon Pathom", "Rayong", "Chonburi", "Samut Prakan", "Ayutthaya"],
  South: ["Songkhla", "Pattani", "Surat Thani", "Phuket", "Nakhon Si Thammarat"],
  Bangkok: ["Bangkok"],
  Nationwide: ["Working across Thailand"],
};

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
      province: province || (region ? PROVINCES[region][0]! : "Thailand"),
      region: region ?? "Nationwide",
      organization: organization.trim() || "Independent",
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
              aria-label="Back"
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
          <Section title="What should we call you?" th="เรียกคุณว่าอะไรดี">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name or nickname"
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
            <input
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="Group / organisation (optional)"
              className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex flex-wrap gap-2">
              {GENERATIONS.map((g) => (
                <Pill key={g} active={generation === g} onClick={() => setGeneration(g)}>
                  {g}
                </Pill>
              ))}
            </div>
          </Section>
        )}

        {step === 1 && (
          <Section title="Where are you based?" th="คุณทำงานอยู่ที่ไหน">
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
                  <span className="block text-sm font-extrabold">{r}</span>
                  <span className="block text-[12px] text-muted-foreground">{REGION_TH[r]}</span>
                </button>
              ))}
            </div>
            {region && (
              <div className="animate-rise flex flex-wrap gap-2">
                {PROVINCES[region].map((p) => (
                  <Pill key={p} active={province === p} onClick={() => setProvince(p)}>
                    {p}
                  </Pill>
                ))}
              </div>
            )}
          </Section>
        )}

        {step === 2 && (
          <Section title="What issues do you care about?" th="คุณสนใจเรื่องอะไร">
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
                  {i}
                </button>
              ))}
            </div>
          </Section>
        )}

        {step === 3 && (
          <Section title="What power do you bring?" th="คุณมีพลังอะไรมาแบ่งปัน">
            <PowerGrid selected={have} onToggle={(v) => toggle(have, setHave, v)} tone="lime" />
          </Section>
        )}

        {step === 4 && (
          <Section title="What power are you looking for?" th="คุณกำลังมองหาพลังแบบไหน">
            <PowerGrid selected={need} onToggle={(v) => toggle(need, setNeed, v)} tone="coral" />
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Tell us in one sentence what you are working on. e.g. I'm building a youth-friendly mental health support network in Chiang Mai."
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
          {step === STEPS - 1 ? "Find My Power Matches" : "Continue"}
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
            <span className="mt-1 block text-[13px] font-extrabold leading-tight">{p.key}</span>
            <span className="block text-[11px] text-muted-foreground">{p.th}</span>
          </button>
        );
      })}
    </div>
  );
}
