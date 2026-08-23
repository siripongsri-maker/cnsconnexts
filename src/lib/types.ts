export type Region = "North" | "Northeast" | "Central" | "South" | "Bangkok" | "Nationwide";

export const REGIONS: Region[] = [
  "North",
  "Northeast",
  "Central",
  "South",
  "Bangkok",
  "Nationwide",
];

export const REGION_TH: Record<Region, string> = {
  North: "เหนือ",
  Northeast: "อีสาน",
  Central: "กลาง",
  South: "ใต้",
  Bangkok: "กรุงเทพฯ",
  Nationwide: "ทั่วประเทศ",
};

export const ISSUES = [
  "Youth",
  "Mental Health",
  "LGBTQ+",
  "Gender Equality",
  "Gender-Based Violence",
  "Sexual Health",
  "Silver Age",
  "Economic Inequality",
  "Community Health",
  "Environment",
  "Human Rights",
  "Policy",
  "Digital Innovation",
  "Other",
] as const;
export type Issue = (typeof ISSUES)[number];

export const POWERS = [
  { key: "Ideas", emoji: "💡", th: "ไอเดีย" },
  { key: "Community Network", emoji: "👥", th: "เครือข่ายชุมชน" },
  { key: "Communication", emoji: "📣", th: "การสื่อสาร" },
  { key: "Policy Connection", emoji: "🏛", th: "สายนโยบาย" },
  { key: "Funding / Resources", emoji: "💰", th: "ทุน/ทรัพยากร" },
  { key: "Knowledge", emoji: "🧠", th: "ความรู้" },
  { key: "Creativity", emoji: "🎨", th: "ความคิดสร้างสรรค์" },
  { key: "Technology", emoji: "💻", th: "เทคโนโลยี" },
  { key: "Partnership", emoji: "🤝", th: "พาร์ตเนอร์" },
  { key: "Local Knowledge", emoji: "📍", th: "ความรู้ท้องถิ่น" },
] as const;
export type Power = (typeof POWERS)[number]["key"];

export const POWER_EMOJI: Record<string, string> = Object.fromEntries(
  POWERS.map((p) => [p.key, p.emoji]),
);

export type Generation = "Gen Z" | "Millennial" | "Gen X" | "Boomer";

export type User = {
  id: string;
  name: string;
  avatar: string;
  /** Optional profile photo as a data URL (uploaded in onboarding). */
  photo?: string | undefined;
  province: string;
  region: Region;
  organization: string;
  generation: Generation;
  bio: string;
  interests: string[];
  powers_have: string[];
  powers_need: string[];
  created_at: string;
  /** Last time the participant updated their own profile. */
  updated_at?: string | undefined;
};

/** A detail/update someone posts about a specific province on the Power Map. */
export type ProvinceNote = {
  id: string;
  province: string;
  author_id: string;
  author_name: string;
  title: string;
  detail: string;
  issues: string[];
  created_at: string;
};

export type Idea = {
  id: string;
  title: string;
  description: string;
  owner_id: string;
  region: Region;
  issues: string[];
  resources_have: string[];
  resources_need: string[];
  created_at: string;
};

export type ConnectionStatus = "Connected" | "Planning" | "In Progress" | "Completed";

export type Connection = {
  id: string;
  user_a: string;
  user_b: string;
  match_score: number;
  match_reason: string;
  status: ConnectionStatus;
  created_at: string;
};

export type Commitment = {
  id: string;
  connection_id: string;
  action_type: string;
  description: string;
  status: ConnectionStatus;
  follow_up_date: string | null;
  created_at: string;
};

export const COURSES = ["คนส.", "นนส.", "คศน."] as const;
export type Course = (typeof COURSES)[number];

/** ผลงานที่สมาชิกส่งเข้ามา (สำหรับ e-book และบอร์ดนิทรรศการ) */
export type Submission = {
  id: string;
  name: string;
  course: Course;
  batch: string;
  region: Region;
  /** province key (english, ตรงกับ thailand-geo) */
  province: string;
  policy_issues: string[];
  summary: string;
  highlight: string;
  wanted: string;
  photo?: string | undefined;
  /** ยินดีขึ้นเวทีนำเสนอสั้น ๆ */
  stage_ready: boolean;
  /** ถูก mark เป็นกรณีศึกษาที่จะยกขึ้นเวที */
  showcase: boolean;
  created_at: string;
};

/** In-app notification shown to the participant (client-side prototype). */
export type AppNotification = {
  id: string;
  kind: "connect_sent" | "connect_received" | "accepted" | "commitment";
  title: string;
  body: string;
  from_id: string;
  from_name: string;
  connection_id?: string | undefined;
  read: boolean;
  created_at: string;
};
