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
