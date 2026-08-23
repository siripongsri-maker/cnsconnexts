/** ยูทิลิตี้ส่งออกข้อมูลกิจกรรมเป็นไฟล์ CSV / JSON ฝั่งเบราว์เซอร์ */

export type Row = Record<string, string | number | boolean | null | undefined>;

const escapeCell = (v: Row[string]) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCSV(rows: Row[]): string {
  if (!rows.length) return "";
  const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escapeCell(r[h])).join(",")),
  ];
  // BOM ให้ Excel อ่านภาษาไทยได้ถูกต้อง
  return `\uFEFF${lines.join("\n")}`;
}

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const stamp = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
};

export function downloadCSV(name: string, rows: Row[]) {
  downloadFile(`${name}-${stamp()}.csv`, toCSV(rows), "text/csv");
}

export function downloadJSON(name: string, data: unknown) {
  downloadFile(`${name}-${stamp()}.json`, JSON.stringify(data, null, 2), "application/json");
}
