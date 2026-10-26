/**
 * Choose which of their issues to show on a card: issues you share come first
 * (in their order), then the rest. `more` is how many were left out.
 */
export function pickTags(
  theirIssues: string[],
  myIssues: string[],
  max = 2,
): { shown: string[]; more: number } {
  const mine = new Set(myIssues);
  const shared = theirIssues.filter((i) => mine.has(i));
  const rest = theirIssues.filter((i) => !mine.has(i));
  const ordered = [...shared, ...rest];
  const shown = ordered.slice(0, Math.max(0, max));
  return { shown, more: ordered.length - shown.length };
}

/**
 * พลังทั้งหมดของเขา เรียงอันที่เกี่ยวกับเรามากที่สุดก่อน (ตามลำดับใน `relevant`) แล้วต่อด้วยที่เหลือ
 * การ์ดโชว์อันแรก + "+N" — N ต้องนับจากรายการเต็ม ไม่ใช่จาก theyBring/theyNeed ที่ scoreMatch ตัดเหลือ 2
 */
export function orderPowers(all: readonly string[], relevant: readonly string[]): string[] {
  const owned = new Set(all);
  const first = [...new Set(relevant)].filter((p) => owned.has(p));
  return [...first, ...all.filter((p) => !first.includes(p))];
}
