export const PROJECT_CONTACT_FIELDS = [
  ["contact_name", "ชื่อผู้รับผิดชอบ", "text"],
  ["contact_organization", "หน่วยงาน / ทีม", "text"],
  ["contact_phone", "เบอร์โทรศัพท์", "tel"],
  ["contact_email", "อีเมลติดต่อ", "email"],
  ["contact_url", "ลิงก์ติดต่อ (เว็บไซต์ / LINE / Facebook)", "url"],
] as const;

export type ProjectContacts = Partial<Record<(typeof PROJECT_CONTACT_FIELDS)[number][0], string>>;

export function contactLinks(contact: ProjectContacts) {
  const links: { label: string; href: string; kind: "phone" | "email" | "url" }[] = [];
  const phone = contact.contact_phone?.trim() ?? "";
  if (/^\+?[\d\s().-]{6,}$/.test(phone)) links.push({ label: phone, href: `tel:${phone.replace(/[\s().-]/g, "")}`, kind: "phone" });
  const email = contact.contact_email?.trim() ?? "";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) links.push({ label: email, href: `mailto:${email}`, kind: "email" });
  try {
    const url = new URL(contact.contact_url?.trim() ?? "");
    if (url.protocol === "https:" || url.protocol === "http:") links.push({ label: "เปิดช่องทางติดต่อ", href: url.href, kind: "url" });
  } catch { /* ไม่สร้างลิงก์จากค่าที่ไม่ใช่ URL */ }
  return links;
}