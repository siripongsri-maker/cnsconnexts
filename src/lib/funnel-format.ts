/**
 * Overview funnel, "from the previous step" phrase. Display only.
 * A step can count more people than the one before it (people join mid-way); a percentage over 100
 * reads like an error, so that case says so in words instead.
 */
export function stepChangeLabel(value: number, prev: number): string {
  if (value > prev) return "มากกว่าขั้นก่อน";
  const pct = prev > 0 ? Math.round((value / prev) * 100) : 0;
  return `${pct}% จากขั้นก่อน`;
}
