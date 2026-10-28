import { createServerFn } from "@tanstack/react-start";

import { requireAdmin } from "./admin-session";

/** สรุปค่าใช้จ่ายเป็นเงินบาทจากไฟล์การใช้เครดิตและใบแจ้งหนี้ (เฉพาะเจ้าของโปรเจกต์) */

export type CostFile = { name: string; mime: string; text?: string; dataUrl?: string };

type Input = {
  token: string;
  files: CostFile[];
  rate?: number | undefined;
  note?: string | undefined;
};

export type CostSummary = {
  currency: "THB";
  total_thb: number;
  period: string;
  items: {
    label: string;
    category: string;
    credits: number | null;
    amount_thb: number;
    source: string;
  }[];
  assumptions: string[];
  notes: string;
};

const MAX_FILES = 6;
const MAX_TEXT = 200_000;
const MAX_DATA_URL = 8_000_000;

function validate(input: Input): Input {
  if (typeof input?.token !== "string" || !input.token)
    throw new Error("ต้องเข้าสู่ระบบเจ้าของโปรเจกต์");
  if (!Array.isArray(input.files) || input.files.length === 0)
    throw new Error("กรุณาแนบไฟล์อย่างน้อย 1 ไฟล์");
  if (input.files.length > MAX_FILES) throw new Error(`แนบได้สูงสุด ${MAX_FILES} ไฟล์`);
  for (const f of input.files) {
    if (typeof f.name !== "string" || typeof f.mime !== "string") throw new Error("ไฟล์ไม่ถูกต้อง");
    if (f.text && f.text.length > MAX_TEXT) throw new Error(`ไฟล์ ${f.name} ใหญ่เกินไป`);
    if (f.dataUrl && (f.dataUrl.length > MAX_DATA_URL || !f.dataUrl.startsWith("data:")))
      throw new Error(`ไฟล์ ${f.name} ใหญ่เกินไปหรือรูปแบบไม่รองรับ`);
    if (!f.text && !f.dataUrl) throw new Error(`อ่านไฟล์ ${f.name} ไม่ได้`);
  }
  if (input.rate !== undefined && (typeof input.rate !== "number" || !(input.rate > 0)))
    throw new Error("อัตราไม่ถูกต้อง");
  return input;
}

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["currency", "total_thb", "period", "items", "assumptions", "notes"],
  properties: {
    currency: { type: "string", enum: ["THB"] },
    total_thb: { type: "number" },
    period: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "category", "credits", "amount_thb", "source"],
        properties: {
          label: { type: "string" },
          category: { type: "string" },
          credits: { type: ["number", "null"] },
          amount_thb: { type: "number" },
          source: { type: "string" },
        },
      },
    },
    assumptions: { type: "array", items: { type: "string" } },
    notes: { type: "string" },
  },
} as const;

export const summarizeCosts = createServerFn({ method: "POST" })
  .inputValidator((input: Input) => validate(input))
  .handler(
    async ({
      data,
    }): Promise<{ ok: true; summary: CostSummary } | { ok: false; error: string }> => {
      try {
        await requireAdmin(data.token);
      } catch {
        return { ok: false, error: "ไม่มีสิทธิ์ใช้งาน" };
      }

      const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");

      const rateLine = data.rate
        ? `ใช้อัตราแลกเปลี่ยน 1 USD = ${data.rate} บาท สำหรับรายการที่เป็นดอลลาร์`
        : "ถ้าไม่มีอัตราแลกเปลี่ยนในเอกสาร ให้ใช้ 1 USD ≈ 33 บาท และระบุเป็นสมมติฐาน";

      const content: Array<
        | { type: "input_text"; text: string }
        | { type: "input_image"; image_url: string; detail: "auto" }
        | { type: "input_file"; filename: string; file_data: string }
      > = [
        {
          type: "input_text",
          text: `สรุปค่าใช้จ่ายจากไฟล์ด้านล่างเป็นเงินบาท แจกแจงทุกรายการ (ค่าแพ็กเกจ ค่าเครดิตเติม ค่าสร้างเว็บ ฐานข้อมูล/เซิร์ฟเวอร์ AI โดเมน ภาษี ฯลฯ)
- ${rateLine}
- ถ้าใบแจ้งหนี้มียอดเงินจริง ให้ใช้ยอดเงินจริงก่อน แล้วใช้ราคาต่อเครดิตจากใบแจ้งหนี้คำนวณรายการเครดิต
- ห้ามนับซ้ำ ระหว่างยอดใบแจ้งหนี้กับยอดเครดิตที่ใช้
- ห้ามแต่งตัวเลขที่ไม่มีในเอกสาร ใส่สมมติฐานทุกข้อใน assumptions
- source ระบุชื่อไฟล์ที่มาของตัวเลข ตอบเป็นภาษาไทย
${data.note ? `หมายเหตุจากเจ้าของ: ${data.note.slice(0, 1000)}` : ""}`,
        },
      ];
      for (const f of data.files) {
        if (f.text)
          content.push({ type: "input_text", text: `--- ไฟล์: ${f.name} ---\n${f.text}` });
        else if (f.dataUrl && f.mime.startsWith("image/"))
          content.push({ type: "input_image", image_url: f.dataUrl, detail: "auto" });
        else if (f.dataUrl)
          content.push({ type: "input_file", filename: f.name, file_data: f.dataUrl });
      }

      try {
        const res = await generateResponse({
          model: "openai/gpt-6-astra",
          instructions:
            "คุณเป็นนักบัญชีที่สรุปค่าใช้จ่ายซอฟต์แวร์อย่างระมัดระวัง ตอบเป็น JSON ตาม schema เท่านั้น",
          input: [{ role: "user", content }],
          text: {
            format: { type: "json_schema", name: "cost_summary", strict: true, schema: SCHEMA },
          },
        });
        let text = "";
        for (const item of res.output ?? []) {
          if (item.type === "message") {
            for (const c of item.content) if (c.type === "output_text") text += c.text;
          }
        }
        if (!text) return { ok: false, error: "โมเดลไม่ได้ส่งผลสรุปกลับมา" };
        return { ok: true, summary: JSON.parse(text) as CostSummary };
      } catch (e) {
        if (e instanceof GatewayError) {
          console.error("cost summary gateway error", e.code, e.message);
          if (e.httpStatus === 402)
            return { ok: false, error: "เครดิต AI หมด กรุณาเติมเครดิตแล้วลองใหม่" };
          if (e.httpStatus === 429)
            return { ok: false, error: "มีคำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่" };
          return { ok: false, error: "สรุปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
        }
        console.error("cost summary error", e);
        return { ok: false, error: "อ่านผลสรุปไม่ได้ กรุณาลองใหม่" };
      }
    },
  );
