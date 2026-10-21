import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useState } from "react";
import type { MatchResult } from "@/lib/matching";
import { useStore } from "@/lib/store";
import { issueTh, provinceTh, REGION_LABEL } from "@/lib/i18n";
import { Heart } from "lucide-react";
import { Avatar, Chip, ConnectBurst, PowerChip, ScoreRing } from "./power-bits";

export function MatchCard({ match, index = 0 }: { match: MatchResult; index?: number }) {
  const { connect, connections, likedUsers, toggleLikeUser } = useStore();
  const u = match.user;
  const existing = connections.find(
    (c) => (c.user_a === "me" && c.user_b === u.id) || (c.user_b === "me" && c.user_a === u.id),
  );
  const navigate = useNavigate();
  const [burst, setBurst] = useState(false);
  const liked = likedUsers.includes(u.id);

  return (
    <article
      className="core-match-card card-soft animate-rise relative overflow-hidden p-4"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start gap-3">
        <Avatar user={u} size={54} />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 break-words text-base font-extrabold leading-snug">
            {u.name}
          </h3>
          <p className="line-clamp-2 break-words text-[12px] leading-snug text-muted-foreground">
            {provinceTh(u.province) || REGION_LABEL[u.region]} · {u.organization}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {u.interests.slice(0, 3).map((i) => (
              <Chip key={i} tone="primary">
                {issueTh(i)}
              </Chip>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-2">
          <ScoreRing score={match.score} />
          <button
            aria-label={liked ? "เอาออกจากถูกใจ" : "ถูกใจ"}
            aria-pressed={liked}
            onClick={() => toggleLikeUser(u.id)}
            type="button"
            className={`tap grid h-11 w-11 place-items-center rounded-xl border ${
              liked ? "border-coral/40 bg-coral/15" : "border-border bg-card"
            }`}
          >
            <Heart
              aria-hidden
              className={`h-4.5 w-4.5 ${liked ? "fill-coral text-coral-ink" : "text-muted-foreground"}`}
            />
          </button>
        </div>
      </div>

      <p className="mt-3 rounded-xl bg-accent/60 p-3 text-[12.5px] leading-relaxed text-accent-foreground">
        {match.reason}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1.5 text-xs font-extrabold text-muted-foreground">เขามีให้</p>
          <div className="flex flex-wrap gap-1.5">
            {match.theyBring.map((p) => (
              <PowerChip key={p} name={p} tone="lime" />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-extrabold text-muted-foreground">เขากำลังหา</p>
          <div className="flex flex-wrap gap-1.5">
            {match.theyNeed.map((p) => (
              <PowerChip key={p} name={p} tone="coral" canHelp={match.youCanGive.includes(p)} />
            ))}
          </div>
          {match.youCanGive.length > 0 && (
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              ✓ = เรื่องที่คุณช่วยเขาได้
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {existing ? (
          <Link
            to="/connection/$id"
            params={{ id: existing.id }}
            className="tap inline-flex h-11 items-center justify-center rounded-xl bg-lime px-4 text-sm font-bold text-lime-foreground"
          >
            เชื่อมกันแล้ว ✨
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => {
              const c = connect(u.id, match.score, match.reason);
              setBurst(true);
              setTimeout(() => setBurst(false), 1200);
              toast.success("เชื่อมกันแล้ว! ✨", {
                description: `คุณกับ ${u.name} เป็นคอนเนกชันใหม่ · New connection created`,
                action: {
                  label: "ก้าวต่อไป",
                  onClick: () => navigate({ to: "/connection/$id", params: { id: c.id } }),
                },
              });
            }}
            className="tap inline-flex h-11 items-center justify-center rounded-xl cta-holo px-4 text-sm font-bold text-primary-foreground"
          >
            เชื่อมต่อ
          </button>
        )}
        <Link
          to="/people/$id"
          params={{ id: u.id }}
          className="tap inline-flex h-11 items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-bold"
        >
          ดูโปรไฟล์
        </Link>
      </div>

      {burst && <ConnectBurst name={u.name} />}
    </article>
  );
}
