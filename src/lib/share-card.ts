import logoUrl from "@/assets/cns-logo.png";
import { issueTh, powerTh, REGION_LABEL } from "./i18n";
import type { MatchResult } from "./matching";
import type { User } from "./types";

const W = 1080;
const H = 1350;

const FONT = '"Prompt", "Noto Sans Thai", system-ui, sans-serif';

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function ensureFonts() {
  try {
    if (document.fonts) {
      await Promise.all([
        document.fonts.load(`700 60px ${FONT}`),
        document.fonts.load(`400 32px ${FONT}`),
      ]);
      await document.fonts.ready;
    }
  } catch {
    /* fonts are best-effort */
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.split(/(\s+)/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line + w;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line.trim());
      line = w.trim();
      if (lines.length === maxLines) break;
    } else {
      line = next;
    }
  }
  if (lines.length < maxLines && line.trim()) lines.push(line.trim());
  // Hard-break very long unbroken Thai strings
  return lines.map((l) => {
    let s = l;
    while (ctx.measureText(s).width > maxWidth && s.length > 2) s = s.slice(0, -2);
    return s === l ? l : `${s}…`;
  });
}

function chip(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  bg: string,
  fg: string,
) {
  ctx.font = `600 30px ${FONT}`;
  const w = ctx.measureText(label).width + 44;
  ctx.fillStyle = bg;
  roundRect(ctx, x, y, w, 60, 30);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + 22, y + 32);
  ctx.textBaseline = "alphabetic";
  return w + 14;
}

function chipRow(
  ctx: CanvasRenderingContext2D,
  labels: string[],
  x: number,
  y: number,
  maxX: number,
  bg: string,
  fg: string,
) {
  let cx = x;
  for (const l of labels) {
    ctx.font = `600 30px ${FONT}`;
    const w = ctx.measureText(l).width + 44;
    if (cx + w > maxX) break;
    cx += chip(ctx, l, cx, y, bg, fg);
  }
}

export type ShareKind = "profile" | "matches";

/** Render a branded 1080×1350 share card for the user's profile or top matches. */
export async function renderShareCard(
  me: User,
  matches: MatchResult[],
  kind: ShareKind,
): Promise<Blob> {
  await ensureFonts();
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background — brand gradient
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#3b0d6b");
  bg.addColorStop(0.55, "#6d28d9");
  bg.addColorStop(1, "#0f172a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Dashed connection motif
  ctx.save();
  ctx.setLineDash([10, 16]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  const nodes = [
    [120, 260],
    [420, 150],
    [880, 300],
    [700, 620],
    [200, 700],
    [960, 980],
    [300, 1120],
  ] as const;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if ((i + j) % 3) continue;
      ctx.beginPath();
      ctx.moveTo(nodes[i]![0], nodes[i]![1]);
      ctx.lineTo(nodes[j]![0], nodes[j]![1]);
      ctx.stroke();
    }
  }
  ctx.setLineDash([]);
  for (const [x, y] of nodes) {
    ctx.beginPath();
    ctx.fillStyle = "rgba(163,230,53,0.5)";
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Header — logo + wordmark
  const logo = await loadImage(logoUrl);
  if (logo) ctx.drawImage(logo, 72, 70, 96, 96);
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 46px ${FONT}`;
  ctx.fillText("คนส. Connexts", logo ? 190 : 72, 118);
  ctx.font = `400 26px ${FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.fillText("พื้นที่เชื่อมพลังคนสร้างสุข", logo ? 190 : 72, 158);

  // Card
  const cardY = 220;
  const cardH = kind === "profile" ? 700 : 900;
  ctx.fillStyle = "rgba(255,255,255,0.97)";
  roundRect(ctx, 64, cardY, W - 128, cardH, 48);
  ctx.fill();

  const px = 112;
  let y = cardY + 96;

  // Avatar circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(px + 60, y + 10, 60, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = "#f1e7ff";
  ctx.fill();
  ctx.clip();
  if (me.photo) {
    const photo = await loadImage(me.photo);
    if (photo) ctx.drawImage(photo, px, y - 50, 120, 120);
  } else {
    ctx.fillStyle = "#4c1d95";
    ctx.font = `400 62px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(me.avatar || "🙂", px + 60, y + 12);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
  ctx.restore();

  ctx.fillStyle = "#12091f";
  ctx.font = `800 52px ${FONT}`;
  const nameLines = wrap(ctx, me.name, W - px - 200 - 112, 1);
  ctx.fillText(nameLines[0] ?? me.name, px + 148, y + 2);
  ctx.font = `400 30px ${FONT}`;
  ctx.fillStyle = "#6b6480";
  const meta = [me.organization, me.province || REGION_LABEL[me.region]].filter(Boolean).join(" · ");
  ctx.fillText(wrap(ctx, meta, W - px - 200 - 112, 1)[0] ?? "", px + 148, y + 48);

  y += 130;

  if (kind === "profile") {
    ctx.fillStyle = "#12091f";
    ctx.font = `400 34px ${FONT}`;
    for (const line of wrap(ctx, me.bio || "เชื่อมพลังกันที่สมัชชาสุขภาพแห่งชาติ", W - px * 2, 3)) {
      ctx.fillText(line, px, y);
      y += 50;
    }
    y += 34;

    ctx.font = `700 30px ${FONT}`;
    ctx.fillStyle = "#7c3aed";
    ctx.fillText("พลังที่ฉันมี", px, y);
    y += 26;
    chipRow(ctx, me.powers_have.slice(0, 3).map(powerTh), px, y, W - px, "#efe7ff", "#4c1d95");
    y += 96;

    ctx.font = `700 30px ${FONT}`;
    ctx.fillStyle = "#f43f5e";
    ctx.fillText("พลังที่ฉันตามหา", px, y);
    y += 26;
    chipRow(ctx, me.powers_need.slice(0, 3).map(powerTh), px, y, W - px, "#ffe8ec", "#9f1239");
    y += 96;

    ctx.font = `700 30px ${FONT}`;
    ctx.fillStyle = "#0284c7";
    ctx.fillText("ประเด็นที่สนใจ", px, y);
    y += 26;
    chipRow(ctx, me.interests.slice(0, 3).map(issueTh), px, y, W - px, "#e2f2ff", "#075985");
  } else {
    ctx.fillStyle = "#7c3aed";
    ctx.font = `800 36px ${FONT}`;
    ctx.fillText("คู่เชื่อมพลังของฉัน", px, y);
    y += 60;

    for (const m of matches.slice(0, 4)) {
      ctx.fillStyle = "#f7f4ff";
      roundRect(ctx, px - 24, y - 44, W - (px - 24) * 2, 140, 28);
      ctx.fill();

      ctx.fillStyle = "#12091f";
      ctx.font = `700 38px ${FONT}`;
      ctx.fillText(wrap(ctx, `${m.user.avatar} ${m.user.name}`, 560, 1)[0] ?? m.user.name, px, y);

      ctx.fillStyle = "#6b6480";
      ctx.font = `400 27px ${FONT}`;
      const hl = m.highlights.slice(0, 2).join(" · ") || m.reason;
      ctx.fillText(wrap(ctx, hl, 620, 1)[0] ?? "", px, y + 44);

      // score badge
      ctx.fillStyle = "#7c3aed";
      roundRect(ctx, W - px - 128, y - 34, 128, 76, 24);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = `800 40px ${FONT}`;
      ctx.textAlign = "center";
      ctx.fillText(`${m.score}%`, W - px - 64, y + 18);
      ctx.textAlign = "left";

      y += 172;
    }
  }

  // Footer
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = `700 32px ${FONT}`;
  ctx.fillText("มาเชื่อมพลังกันที่ คนส. Connexts", 72, H - 108);
  ctx.font = `400 27px ${FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.fillText("สมัชชาสุขภาพแห่งชาติ · สแกน QR เพื่อเข้าร่วม", 72, H - 62);

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("สร้างภาพไม่สำเร็จ"))), "image/png", 0.95),
  );
}

/** Share the blob via the Web Share API, falling back to a download. */
export async function shareOrDownload(blob: Blob, filename: string, title: string) {
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title, text: title });
      return "shared" as const;
    } catch (e) {
      if ((e as Error).name === "AbortError") return "cancelled" as const;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "downloaded" as const;
}
