/**
 * ทางลัดทดสอบผ่าน query string ใช้ได้เฉพาะตอน dev — import.meta.env.DEV เป็นค่าคงที่ตอน build
 * จึงเป็นโค้ดตายใน production build เสมอ (ไม่มีผลกับเว็บจริง)
 *
 * - `?dryrun`    ฟอร์มโปรไฟล์ด่วนไม่บันทึกจริง และหน้าแรก / หน้าโปรไฟล์ (/people/$id) ไม่เรียก connect หลังกรอกเสร็จ
 * - `?celebrate` หน้าแรกแสดงจอฉลองตัวอย่างจากรายชื่อที่โหลดมา (ไม่เขียนข้อมูล)
 */
export type DevPreview = "dryrun" | "celebrate";

export function isDevPreview(flag: DevPreview): boolean {
  return (
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has(flag)
  );
}
