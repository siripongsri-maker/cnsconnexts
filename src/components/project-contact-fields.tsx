import { PROJECT_CONTACT_FIELDS, type ProjectContacts } from "@/lib/project-contact";

export function ProjectContactFields({ value, onChange }: { value: ProjectContacts; onChange: (value: ProjectContacts) => void }) {
  return <div className="space-y-3">
    <p className="text-body text-muted-foreground">ไม่บังคับ · กรอกเฉพาะข้อมูลที่ยินดีเผยแพร่ให้ทุกคนติดต่อได้</p>
    {PROJECT_CONTACT_FIELDS.map(([key, label, type]) => <label key={key} className="block space-y-1">
      <span className="text-body font-semibold">{label}</span>
      <input type={type} value={value[key] ?? ""} onChange={e => onChange({ ...value, [key]: e.target.value })} className="min-h-12 w-full rounded-md border border-border bg-background px-3 text-body text-foreground" placeholder={type === "url" ? "https://…" : undefined} />
    </label>)}
  </div>;
}