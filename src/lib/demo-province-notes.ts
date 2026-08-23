import type { ProvinceNote } from "./types";

const now = "2026-08-05T09:00:00.000Z";

export const DEMO_PROVINCE_NOTES: ProvinceNote[] = [
  {
    id: "pn1",
    province: "Chiang Mai",
    author_id: "u1",
    author_name: "อาร์ม ภูมิรพี",
    title: "พื้นที่ปลอดภัยสำหรับวัยรุ่น",
    detail:
      "มีกลุ่มเยาวชน 3 กลุ่มในเมืองเชียงใหม่ที่เปิดพื้นที่พูดคุยเรื่องสุขภาพจิตทุกวันเสาร์ กำลังหาคนช่วยเรื่องทุนและการสื่อสาร",
    issues: ["Youth", "Mental Health"],
    created_at: now,
  },
  {
    id: "pn2",
    province: "Khon Kaen",
    author_id: "u3",
    author_name: "เมย์ ประไพ",
    title: "อสม. 12 อำเภอ",
    detail: "เครือข่าย อสม. พร้อมทดลองใช้เครื่องมือดิจิทัลติดตามผู้สูงวัยติดบ้านติดเตียง",
    issues: ["Community Health", "Silver Age"],
    created_at: now,
  },
  {
    id: "pn3",
    province: "Songkhla",
    author_id: "u4",
    author_name: "ต้น อิสมาแอล",
    title: "ค่ายเยาวชนชายแดนใต้",
    detail: "ทำค่ายร่วมกับปัตตานี ยะลา นราธิวาส ปีละ 4 ครั้ง ต้องการวิทยากรด้านสุขภาพจิตเพิ่ม",
    issues: ["Youth", "Human Rights"],
    created_at: now,
  },
];
