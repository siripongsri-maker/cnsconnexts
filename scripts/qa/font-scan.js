/*
 * font-scan.js — QA สแกนตัวอักษรเล็ก / ข้อความถูกตัด / เลื่อนแนวนอน บนหน้าผู้เข้าร่วม
 *
 * วิธีใช้: วางทั้งไฟล์ลงในเครื่องมือ javascript ของเบราว์เซอร์ (หรือ DevTools console) ขณะเปิดหน้าที่ต้องการ
 * แล้วอ่านค่าที่คืนกลับมา. ตั้งขนาดจอ 375×812 และ 1440×900 แล้วสแกนซ้ำ รวมถึงตอนเปิด sheet/ตัวกรอง
 *
 * คืนค่า:
 *   small    — ข้อความที่มองเห็นแต่ขนาดจริง < 20px  ({ text (≤40 ตัวอักษร), px, selector })
 *   overflowX — หน้าเลื่อนแนวนอนได้ (scrollWidth > innerWidth)
 *   clipped  — กล่องที่ overflow hidden/clip แต่เนื้อหาล้น และมีข้อความ ({ text, selector })
 *
 * ข้ามข้อความที่ซ่อนจากผู้ใช้ทั่วไป: [aria-hidden="true"], .sr-only (และกล่องกว้าง/สูง ≤ 1px), svg, <title>, องค์ประกอบกว้าง/สูง 0
 */
(() => {
  const MIN_PX = 20;

  const isHidden = (el) => {
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      if (n.getAttribute("aria-hidden") === "true") return true;
      if (n.classList.contains("sr-only")) return true;
      const tag = n.tagName.toLowerCase();
      if (tag === "svg" || tag === "title" || tag === "script" || tag === "style") return true;
    }
    return false;
  };

  const hasBox = (el) => {
    const r = el.getBoundingClientRect();
    // กล่อง ≤ 1px = ข้อความซ่อนแบบ sr-only (รวมคลาสแบบมี variant เช่น max-[359px]:sr-only)
    if (r.width <= 1 || r.height <= 1) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none";
  };

  const selectorOf = (el) => {
    const parts = [];
    for (let n = el, depth = 0; n && n.nodeType === 1 && depth < 3; n = n.parentElement, depth++) {
      let s = n.tagName.toLowerCase();
      if (n.id) s += "#" + n.id;
      const cls = [...n.classList].slice(0, 2).join(".");
      if (cls) s += "." + cls;
      parts.unshift(s);
    }
    return parts.join(" > ");
  };

  const small = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = (node.nodeValue || "").trim();
    if (!text) continue;
    const el = node.parentElement;
    if (!el || isHidden(el) || !hasBox(el)) continue;
    const px = parseFloat(getComputedStyle(el).fontSize);
    if (px < MIN_PX) {
      small.push({
        text: text.slice(0, 40),
        px: Math.round(px * 100) / 100,
        selector: selectorOf(el),
      });
    }
  }

  const clipped = [];
  for (const el of document.body.querySelectorAll("*")) {
    if (isHidden(el) || !hasBox(el)) continue;
    const cs = getComputedStyle(el);
    const clips = (v) => v === "hidden" || v === "clip";
    if (!(clips(cs.overflowX) || clips(cs.overflow))) continue;
    if (el.scrollWidth <= el.clientWidth + 1) continue;
    const text = (el.textContent || "").trim();
    if (!text) continue;
    clipped.push({ text: text.slice(0, 40), selector: selectorOf(el) });
  }

  return {
    small,
    overflowX: document.documentElement.scrollWidth > window.innerWidth,
    clipped,
  };
})();
