import { useId, type ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

export type MissionVariant = "network" | "signal" | "profile" | "action" | "archive" | "control";

/** Decorative route artwork. All numbers and activity indicators elsewhere come from real data. */
export function MissionVisual({
  variant = "network",
  className = "",
}: {
  variant?: MissionVariant;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <div className={`mission-visual mission-visual--${variant} ${className}`} aria-hidden="true">
      <svg viewBox="0 0 480 320" fill="none" focusable="false">
        <defs>
          <radialGradient id={`glow-${id}`}>
            <stop stopColor="#159fff" stopOpacity=".28" />
            <stop offset="1" stopColor="#159fff" stopOpacity="0" />
          </radialGradient>
          <linearGradient
            id={`line-${id}`}
            x1="90"
            y1="280"
            x2="390"
            y2="40"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#159fff" stopOpacity=".12" />
            <stop offset=".55" stopColor="#83d2ff" />
            <stop offset="1" stopColor="#159fff" stopOpacity=".2" />
          </linearGradient>
        </defs>
        <ellipse cx="260" cy="164" rx="200" ry="146" fill={`url(#glow-${id})`} />
        <g stroke="#159fff" opacity=".16">
          <path d="M24 80H456M24 160H456M24 240H456M80 24V296M160 24V296M240 24V296M320 24V296M400 24V296" />
          <path
            d="M24 24H42M24 24V42M456 24H438M456 24V42M24 296H42M24 296V278M456 296H438M456 296V278"
            strokeOpacity="1"
          />
        </g>
        <g stroke={`url(#line-${id})`} strokeWidth="1.1">
          <ellipse cx="244" cy="160" rx="164" ry="78" transform="rotate(-24 244 160)" />
          <ellipse
            cx="244"
            cy="160"
            rx="150"
            ry="121"
            transform="rotate(18 244 160)"
            strokeDasharray="3 8"
          />
          {variant === "profile" ? (
            <>
              <circle cx="244" cy="128" r="34" />
              <path d="M171 228V211C171 172 203 160 244 160C285 160 317 172 317 211V228" />
              <circle cx="244" cy="160" r="112" strokeOpacity=".4" />
            </>
          ) : variant === "signal" ? (
            <>
              <circle cx="244" cy="160" r="22" />
              <circle cx="244" cy="160" r="59" />
              <circle cx="244" cy="160" r="98" />
              <path d="M244 160L334 83M244 160L352 207M244 160L145 225" />
            </>
          ) : variant === "action" ? (
            <>
              <path d="M138 198L238 108L350 199L138 198Z" />
              <circle cx="138" cy="198" r="30" />
              <circle cx="238" cy="108" r="30" />
              <circle cx="350" cy="199" r="30" />
              <path d="M202 159L216 159L217 145M288 157L303 157L303 143M251 197L264 207L250 217" />
            </>
          ) : variant === "archive" ? (
            <>
              <path d="M163 75L322 99L303 252L144 228L163 75Z" />
              <path d="M177 60L336 84L317 237M191 46L350 70L332 219M188 117L290 132M183 146L273 160M179 176L281 191" />
            </>
          ) : variant === "control" ? (
            <>
              <rect x="131" y="83" width="225" height="155" rx="1" />
              <path d="M131 118H356M242 118V238M148 153H217M148 174H205M148 195H217M263 206L281 175L303 190L335 140" />
              <circle cx="148" cy="101" r="2" />
              <circle cx="159" cy="101" r="2" />
              <circle cx="170" cy="101" r="2" />
            </>
          ) : (
            <>
              <circle cx="244" cy="160" r="101" />
              <ellipse cx="244" cy="160" rx="45" ry="101" transform="rotate(22 244 160)" />
              <ellipse cx="244" cy="160" rx="101" ry="32" transform="rotate(22 244 160)" />
              <path d="M150 123L320 214M181 69L278 251M142 180L332 107" />
            </>
          )}
        </g>
        <g fill="#70caff">
          <circle cx="124" cy="214" r="4" />
          <circle cx="349" cy="81" r="4" />
          <circle cx="393" cy="173" r="3" />
          <circle cx="194" cy="56" r="3" />
        </g>
        <g stroke="#159fff" strokeWidth="1">
          <circle cx="124" cy="214" r="10" opacity=".5" />
          <circle cx="349" cy="81" r="10" opacity=".5" />
          <path d="M244 26V38M238 32H250M72 160H84M78 154V166M402 260H414M408 254V266" />
        </g>
      </svg>
    </div>
  );
}

export function MissionHeader({
  kicker,
  title,
  description,
  number = "01",
  variant = "network",
  compact = false,
  children,
}: {
  kicker: string;
  title: ReactNode;
  description?: ReactNode;
  number?: string;
  variant?: MissionVariant;
  compact?: boolean;
  children?: ReactNode;
}) {
  return (
    <header className={`mission-page-hero${compact ? " mission-page-hero--compact" : ""}`}>
      <div className="mission-page-hero-copy">
        <p className="mission-kicker">
          <span className="mission-index" lang="en">
            {number}
          </span>
          <span lang="en">{kicker}</span>
        </p>
        <h1>{title}</h1>
        {description && <p className="mission-page-description">{description}</p>}
        {children && <div className="mission-page-actions">{children}</div>}
      </div>
      <MissionVisual variant={variant} />
      <span className="mission-hero-edge" aria-hidden="true" />
    </header>
  );
}

export function MissionEmpty({
  title,
  description,
  children,
  variant = "network",
  className = "",
}: {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  variant?: MissionVariant;
  className?: string;
}) {
  return (
    <section className={`mission-empty ${className}`}>
      <MissionVisual variant={variant} />
      <div className="mission-empty-copy">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
        {children && <div className="mission-page-actions">{children}</div>}
      </div>
    </section>
  );
}

export function MissionState({
  code = "CONNEXTS",
  title,
  description,
  children,
}: {
  code?: string;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <main className="mission-state">
      <Link to="/" className="mission-state-home">
        คนส. Connexts <ArrowUpRight size={16} aria-hidden="true" />
      </Link>
      <div className="mission-state-inner">
        <MissionHeader kicker={code} title={title} description={description} variant="signal">
          {children}
        </MissionHeader>
      </div>
    </main>
  );
}
