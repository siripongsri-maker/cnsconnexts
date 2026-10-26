import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Send } from "lucide-react";

import { Avatar } from "@/components/power-bits";
import { useStore } from "@/lib/store";

const QUICK = [
  "สวัสดี ดีใจที่ได้เชื่อมกันนะ",
  "ว่างคุยสั้น ๆ สัก 15 นาทีไหม",
  "เจอกันที่โซนเครือข่ายสะดวกไหม",
  "ขอดูข้อมูลโครงการเพิ่มหน่อยได้ไหม",
];

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

/** ห้องแชทสั้นแบบเรียลไทม์ของคู่เชื่อมต่อ */
export function ChatRoom({
  connectionId,
  compact = false,
  hideHeader = false,
}: {
  connectionId: string;
  compact?: boolean;
  hideHeader?: boolean;
}) {
  const { messages, connections, users, me, sendMessage, markRoomRead } = useStore();
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const stickRef = useRef(true);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const conn = connections.find((c) => c.id === connectionId);
  const otherId = conn ? (conn.user_a === "me" ? conn.user_b : conn.user_a) : "";
  const other = users.find((u) => u.id === otherId);

  const thread = useMemo(
    () => messages.filter((m) => m.connection_id === connectionId),
    [messages, connectionId],
  );

  useEffect(() => {
    markRoomRead(connectionId);
  }, [connectionId, markRoomRead, thread.length]);

  useEffect(() => {
    // เลื่อนเฉพาะกล่องข้อความ ไม่ดึงทั้งหน้า และไม่ดึงถ้าคนกำลังเลื่อนอ่านข้อความเก่าอยู่
    const el = listRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [thread.length]);

  const send = (value: string) => {
    if (!value.trim()) return;
    stickRef.current = true;
    sendMessage(connectionId, value);
    setText("");
  };

  return (
    <div className="meadow-card p-4">
      {!hideHeader && (
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sky text-ink"
          >
            <MessageCircle className="h-6 w-6" strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <h2 className="font-heading text-lead font-semibold text-ink [overflow-wrap:anywhere]">
              แชทกับ {other?.name ?? "เพื่อนร่วมงาน"}
            </h2>
            <p className="text-body text-ink-soft">คุยสั้น ๆ แล้วนัดหมายการลงมือทำ</p>
          </div>
        </div>
      )}

      <div
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
        }}
        role="log"
        aria-live="polite"
        tabIndex={0}
        aria-label={`ข้อความกับ ${other?.name ?? "เพื่อนร่วมงาน"}`}
        className={`${hideHeader ? "" : "mt-3"} space-y-3 overflow-y-auto rounded-2xl pr-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${compact ? "max-h-80" : "max-h-[52vh]"}`}
      >
        {thread.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-2 py-6 text-center text-ink-soft">
            <MessageCircle className="h-9 w-9" aria-hidden="true" />
            <p className="text-body">เริ่มด้วยคำทักทาย แล้วเล่าสิ่งที่อยากทำร่วมกัน</p>
          </div>
        )}
        {thread.map((m) => {
          const mine = m.from_id === "me";
          const author = mine ? me : other;
          return (
            <div key={m.id} className={`flex items-end gap-2 ${mine ? "justify-end" : ""}`}>
              {!mine && author && <Avatar user={author} size={40} />}
              <div
                className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-body ${
                  mine ? "bg-primary text-white" : "bg-sky-soft text-ink"
                }`}
              >
                <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{m.text}</p>
                <p className={`mt-1 text-body ${mine ? "text-white/90" : "text-ink-soft"}`}>
                  {clock(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => {
              setText(q);
              inputRef.current?.focus();
            }}
            className="tap inline-flex min-h-12 max-w-full items-center rounded-full border-2 border-[#C9C6E0] bg-white px-4 py-1 text-left text-body font-semibold text-ink"
          >
            {q}
          </button>
        ))}
      </div>

      <form
        className="mt-3 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="พิมพ์ข้อความ…"
          aria-label="ข้อความ"
          className="min-w-0 flex-1 rounded-2xl border-2 bg-white px-4 text-body text-ink outline-none placeholder:text-ink-soft/70"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="meadow-btn-primary tap min-h-14 shrink-0 px-4"
        >
          <Send className="h-6 w-6" aria-hidden="true" /> ส่ง
        </button>
      </form>
    </div>
  );
}
