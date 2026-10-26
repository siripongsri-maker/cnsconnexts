import { Link } from "@tanstack/react-router";
import { guestBlurb, type DeckEntry } from "@/lib/matching";
import { pickTags } from "@/lib/card-tags";
import { provinceTh } from "@/lib/i18n";
import type { User } from "@/lib/types";
import { Avatar, IssueBlock, MoreBlock, PowerLine, ScoreRing } from "./power-bits";

/** การ์ดจับคู่ — แสดงอย่างเดียว ปุ่มข้าม/เชื่อมต่อ/เก็บไว้อยู่ที่สำรับ */
export function MatchCard({ entry, me }: { entry: DeckEntry; me: User | null }) {
  const { user, match } = entry;
  const { shown, more } = pickTags(user.interests, me?.interests ?? [], 2);
  const place = [provinceTh(user.province), user.organization].filter(Boolean).join(" · ");
  // guestBlurb อาจคืนข้อความว่าง — ไม่แสดงกล่องเหตุผลเปล่า ๆ
  const reason = match?.reason ?? guestBlurb(user);

  return (
    <article className="meadow-card p-5" aria-label={user.name}>
      <div className="flex items-center justify-between gap-3">
        <Avatar user={user} size={72} />
        {match && <ScoreRing score={match.score} size={84} />}
      </div>

      <h3 className="mt-3 line-clamp-2 break-words font-heading text-title text-ink">
        {user.name}
      </h3>
      {place && <p className="line-clamp-2 break-words text-body text-ink-soft">{place}</p>}

      {reason.trim() && (
        <p className="mt-3 rounded-2xl bg-sky-soft p-4 text-lead text-ink">{reason}</p>
      )}

      {(shown.length > 0 || more > 0) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {shown.map((i) => (
            <IssueBlock key={i} issue={i} />
          ))}
          {more > 0 && <MoreBlock count={more} />}
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2">
        <PowerLine label="เขามีให้" powers={match?.theyBring ?? user.powers_have} />
        <PowerLine label="เขากำลังหา" powers={match?.theyNeed ?? user.powers_need} />
      </div>

      <Link
        to="/people/$id"
        params={{ id: user.id }}
        className="mt-3 inline-flex min-h-12 items-center text-body font-semibold text-primary underline underline-offset-4"
      >
        ดูโปรไฟล์เต็ม
      </Link>
    </article>
  );
}
