import { POWERS, type ConnectionStatus, type Generation, type Region } from "./types";
import { PROVINCE_TH } from "./thailand-geo";

export const ISSUE_TH: Record<string, string> = {
  Youth: "เยาวชน",
  "Mental Health": "สุขภาพจิต",
  "LGBTQ+": "ความหลากหลายทางเพศ",
  "Gender Equality": "ความเท่าเทียมทางเพศ",
  "Gender-Based Violence": "ความรุนแรงทางเพศ",
  "Sexual Health": "สุขภาวะทางเพศ",
  "Silver Age": "ผู้สูงวัย",
  "Economic Inequality": "ความเหลื่อมล้ำ",
  "Community Health": "สุขภาวะชุมชน",
  Environment: "สิ่งแวดล้อม",
  "Human Rights": "สิทธิมนุษยชน",
  Policy: "นโยบาย",
  "Digital Innovation": "นวัตกรรมดิจิทัล",
  Other: "อื่น ๆ",
};

export const POWER_TH: Record<string, string> = Object.fromEntries(
  POWERS.map((p) => [p.key, p.th]),
);

export const REGION_LABEL: Record<Region, string> = {
  North: "ภาคเหนือ",
  Northeast: "ภาคอีสาน",
  Central: "ภาคกลาง",
  South: "ภาคใต้",
  Bangkok: "กรุงเทพฯ",
  Nationwide: "ทั่วประเทศ",
};

export const GENERATION_TH: Record<Generation, string> = {
  "Gen Z": "เจน Z",
  Millennial: "เจน Y",
  "Gen X": "เจน X",
  Boomer: "เบบี้บูมเมอร์",
};

export const STATUS_TH: Record<ConnectionStatus, string> = {
  Connected: "เชื่อมแล้ว",
  Planning: "กำลังวางแผน",
  "In Progress": "กำลังลงมือทำ",
  Completed: "สำเร็จแล้ว",
};

export const ACTION_TYPES_TH = [
  "แลกเปลี่ยนความรู้",
  "แบ่งปันทรัพยากร",
  "แนะนำให้รู้จักคนอื่น",
  "ชวนกันทำงานร่วม",
  "พัฒนาโครงการร่วมกัน",
  "นัดเจอกันอีกครั้ง",
  "ทำแคมเปญร่วมกัน",
];

export const issueTh = (i: string) => ISSUE_TH[i] ?? i;
export const powerTh = (p: string) => POWER_TH[p] ?? p;
export const provinceTh = (p: string) => PROVINCE_TH[p] ?? p;
