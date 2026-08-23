import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Camera, Check, QrCode, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useStore } from "@/lib/store";
import { ISSUES, POWERS, REGIONS, type Generation, type Region } from "@/lib/types";
import { GENERATION_TH, issueTh, REGION_LABEL } from "@/lib/i18n";
import { PROVINCES_BY_REGION } from "@/lib/thailand-geo";

export const Route = createFileRoute("/update")({
  head: () => ({
    meta: [
      { title: "อัปเดตข้อมูลของฉัน — คนส. Connect" },
      {
        name: "description",
        content:
          "สแกน QR แล้วแก้ไขข้อมูลผู้เข้าร่วมของตัวเองได้ทันที ทั้งรูป ประเด็นที่ทำ พลังที่มี และสิ่งที่ต้องการ พร้อมดูสถานะการอัปเดตล่าสุด",
      },
      { property: "og:title", content: "อัปเดตข้อมูลผู้เข้าร่วม" },
      {
        property: "og:description",
        content: "แก้ไขข้อมูลของคุณเองได้ง่าย พร้อมแสดงเวลาอัปเดตล่าสุด",
      },
    ],
  }),
  component: UpdateMe,
});

const GENERATIONS: Generation[] = ["Gen Z", "Millennial", "Gen X", "Boomer"];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "เมื่อสักครู่";
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} วันที่แล้ว`;
  return new Date(iso).toLocaleDateString("th-TH", { dateStyle: "medium" });
}

function Chip({
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
      className={`tap rounded-full border px-3 py-2 text-[13px] font-semibold ${
        active
          ? "border-transparent gradient-power text-primary-foreground"
          : "border-border bg-card text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function UpdateMe() {
  const { me, hydrated, saveProfile } = useStore();

  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [generation, setGeneration] = useState<Generation>("Millennial");
  const [region, setRegion] = useState<Region>("Nationwide");
  const [province, setProvince] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [have, setHave] = useState<string[]>([]);
  const [need, setNeed] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [saved, setSaved] = useState(false);
  const [qrUrl, setQrUrl] = useState("/update");

  useEffect(() => {
    setQrUrl(`${window.location.origin}/update`);
  }, []);

  useEffect(() => {
    if (!me) return;
    setName(me.name);
    setOrganization(me.organization);
    setGeneration(me.generation);
    setRegion(me.region);
    setProvince(me.province);
    setInterests(me.interests);
    setHave(me.powers_have);
    setNeed(me.powers_need);
    setBio(me.bio);
    setPhoto(me.photo);
  }, [me]);

  const provinces = useMemo(() => PROVINCES_BY_REGION(region), [region]);

  const lastUpdate = me?.updated_at ?? me?.created_at ?? null;

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const onPhoto = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result));
    reader.readAsDataURL(file);
  };

  const submit = () => {
    if (!me || !name.trim()) return;
    saveProfile({
      name: name.trim(),
      avatar: me.avatar,
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
    setSaved(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => setSaved(false), 4000);
  };

  if (hydrated && !me) {
    return (
      <AppShell title="อัปเดตข้อมูลของฉัน" subtitle="ยังไม่พบโปรไฟล์ในเครื่องนี้">
        <div className="px-5 py-8">
          <div className="card-soft rounded-3xl bg-card p-6 text-center">
            <QrCode className="mx-auto h-9 w-9 text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">
              คุณยังไม่มีโปรไฟล์ในเครื่องนี้ สร้างโปรไฟล์ก่อนแล้วกลับมาอัปเดตได้ทุกเมื่อ
            </p>
            <Link
              to="/onboarding"
              className="tap mt-5 inline-flex h-13 items-center justify-center rounded-3xl gradient-power px-6 py-3 text-sm font-extrabold text-primary-foreground"
            >
              สร้างโปรไฟล์ของฉัน
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="อัปเดตข้อมูลของฉัน" subtitle="แก้ไขได้ตลอดงาน แล้วกดบันทึก">
      <div className="space-y-5 px-5 py-5">
        <div className="card-soft rounded-3xl bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                สถานะข้อมูล
              </p>
              <p className="mt-1 text-sm font-extrabold">
                {saved
                  ? "บันทึกเรียบร้อย ✨"
                  : lastUpdate
                    ? `อัปเดตล่าสุด ${timeAgo(lastUpdate)}`
                    : "ยังไม่เคยอัปเดต"}
              </p>
              {lastUpdate && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(lastUpdate).toLocaleString("th-TH", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              )}
            </div>
            <span
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${
                saved ? "gradient-power text-primary-foreground" : "bg-accent text-primary"
              }`}
            >
              <Check className="h-5 w-5" strokeWidth={2.6} />
            </span>
          </div>
        </div>

        <section className="card-soft space-y-4 rounded-3xl bg-card p-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-3xl bg-accent text-3xl">
                {photo ? (
                  <img src={photo} alt="รูปโปรไฟล์ของฉัน" className="h-full w-full object-cover" />
                ) : (
                  <span>{me?.avatar ?? "✨"}</span>
                )}
              </div>
              {photo && (
                <button
                  type="button"
                  onClick={() => setPhoto(undefined)}
                  aria-label="ลบรูป"
                  className="tap absolute -right-1 -top-1 grid h-7 w-7 place-items-center rounded-full bg-foreground text-background"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <label className="tap inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-border px-4 py-2.5 text-[13px] font-bold">
              <Camera className="h-4 w-4" />
              {photo ? "เปลี่ยนรูป" : "แนบรูป (ไม่บังคับ)"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPhoto(e.target.files?.[0])}
              />
            </label>
          </div>

          <label className="block">
            <span className="text-[13px] font-bold">ชื่อ</span>
            <input
              className="input-line mt-1 w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ชื่อที่อยากให้เพื่อนเรียก"
            />
          </label>
          <label className="block">
            <span className="text-[13px] font-bold">องค์กร / กลุ่ม</span>
            <input
              className="input-line mt-1 w-full"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="เช่น กลุ่มเยาวชนน่าน"
            />
          </label>

          <div>
            <span className="text-[13px] font-bold">รุ่นอายุ</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {GENERATIONS.map((g) => (
                <Chip key={g} active={generation === g} onClick={() => setGeneration(g)}>
                  {GENERATION_TH[g]}
                </Chip>
              ))}
            </div>
          </div>
        </section>

        <section className="card-soft space-y-4 rounded-3xl bg-card p-4">
          <div>
            <span className="text-[13px] font-bold">ภาค</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {REGIONS.map((r) => (
                <Chip
                  key={r}
                  active={region === r}
                  onClick={() => {
                    setRegion(r);
                    setProvince("");
                  }}
                >
                  {REGION_LABEL[r]}
                </Chip>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="text-[13px] font-bold">จังหวัด</span>
            <select
              className="input-line mt-1 w-full bg-transparent"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
            >
              <option value="">เลือกจังหวัด</option>
              {provinces.map((p) => (
                <option key={p.en} value={p.en}>
                  {p.th}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="card-soft space-y-4 rounded-3xl bg-card p-4">
          <div>
            <span className="text-[13px] font-bold">ประเด็นที่สนใจ</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {ISSUES.map((i) => (
                <Chip
                  key={i}
                  active={interests.includes(i)}
                  onClick={() => toggle(interests, setInterests, i)}
                >
                  {issueTh(i)}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <span className="text-[13px] font-bold">พลังที่ฉันมี</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {POWERS.map((p) => (
                <Chip
                  key={p.key}
                  active={have.includes(p.key)}
                  onClick={() => toggle(have, setHave, p.key)}
                >
                  {p.emoji} {p.th}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <span className="text-[13px] font-bold">พลังที่ฉันต้องการ</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {POWERS.map((p) => (
                <Chip
                  key={p.key}
                  active={need.includes(p.key)}
                  onClick={() => toggle(need, setNeed, p.key)}
                >
                  {p.emoji} {p.th}
                </Chip>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="text-[13px] font-bold">แนะนำตัวสั้น ๆ</span>
            <textarea
              className="input-line mt-1 h-24 w-full resize-none"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="ทำงานอะไรอยู่ และอยากเจอใครในงานนี้"
            />
          </label>
        </section>

        <div className="card-soft flex items-center gap-4 rounded-3xl bg-card p-4">
          <div className="rounded-2xl bg-background p-2">
            <QRCodeSVG value={qrUrl} size={84} level="M" bgColor="transparent" fgColor="#3b0f78" />
          </div>
          <div className="min-w-0 text-[13px] text-muted-foreground">
            <p className="font-extrabold text-foreground">QR อัปเดตข้อมูลของฉัน</p>
            <p className="mt-1">สแกนจากบอร์ดหรือการ์ดในห้อง เพื่อกลับมาแก้ไขข้อมูลนี้ได้ทุกเมื่อ</p>
          </div>
        </div>

        <div className="sticky bottom-24 z-10">
          <button
            type="button"
            onClick={submit}
            disabled={!name.trim()}
            className="tap flex h-14 w-full items-center justify-center rounded-3xl gradient-power text-sm font-extrabold text-primary-foreground disabled:opacity-40"
          >
            บันทึกการอัปเดต
          </button>
        </div>
      </div>
    </AppShell>
  );
}
