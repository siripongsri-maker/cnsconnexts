# Meadow Match (ทุ่งจับคู่) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the participant side of คนส. CoNnextS into a light, NHA19-themed ("สังคม อยู่ ดี มี พลัง") matching-first app where `/` shows the first person to meet immediately and all text is ≥ 20px.

**Architecture:** A new light theme lives in `src/meadow.css` and only applies when `<html>` has class `meadow` (every route except `/admin*`), so admin keeps the current space theme untouched. Pure logic (issue colours, guest ranking, swipe/step rules, nav matching) goes in small tested modules; UI components (MeadowScene, MatchCard, DiscoverDeck, QuickProfileSheet, MatchCelebration) consume them. The store API gains only `refresh`.

**Tech Stack:** TanStack Start + React 19, Tailwind v4 (`@theme` tokens), shadcn `Drawer` (vaul), lucide-react icons, Supabase via existing `useStore()`; Vitest (new dev dependency) for unit tests.

**Spec:** `docs/superpowers/specs/2026-10-26-meadow-match-design.md`

## Global Constraints

- Branch `redesign/meadow-match`. Never push `main` until the owner approves; never force-push or rewrite pushed history (AGENTS.md — Lovable sync).
- Never create real data while testing: do not submit the profile sheet or press ขอเชื่อมต่อ while a profile exists on the local dev server (it writes to production Supabase). The dev-only preview hooks in Tasks 9–10 exist for this.
- Out of scope: `/admin/*` look, DB/migrations, `*.functions.ts`, `scoreMatch` formula, deleting space components (`space-nav`, `mission-*`, `orbit-scene`, `people-network`).
- Every visible text node on participant pages ≥ 20px. Scale: `text-body` 20px/1.6 · `text-lead` 22px/1.55 · `text-title` 28px/1.35 · `text-display` 34px/1.25 · `text-score` 30px/1.1.
- Colours (exact): `--sky #CFEAFB`, `--sky-soft #EAF6FD`, `--paper #FFFDF8`, `--meadow #A9CC93`, `--ink #2B2878`, `--ink-soft #4A4870`, `--primary #6A2C91`; decor blocks purple `#6A2C91` blue `#1488D8` yellow `#F2B21B` green `#5DA130` teal `#129E8C` orange `#F47B20`; tag pairs purple `#6A2C91`/white, blue `#0F6DB0`/white, yellow `#F2B21B`/`#2B2878`, green `#3D7A1C`/white, teal `#0C7568`/white, orange `#B8520F`/white.
- Fonts: headings Kanit 600/700, body Noto Sans Thai 400/600; no letter-spacing on Thai, no uppercase decorative labels, no emoji as icons.
- Targets ≥ 48px; primary button 64px tall radius 18px; card radius 24px, shadow `0 8px 24px -12px rgba(43,40,120,.25)`, border `1px #E6E3F2`; inputs 20px text, ≥ 56px tall.
- Motion respects `prefers-reduced-motion` (windmills stop, celebration shows final state).
- After every task: `npx tsc --noEmit -p .` clean, `npx eslint <changed files>` has no non-prettier errors, `npx vitest run` green. Do not run `prettier --write` on files you did not change.

## Review Focus

1. Long Thai names/organisations at 20px on a 375px screen — must wrap to max 2 lines (no overlap, no horizontal scroll); pinned by the long-name fixture in Task 6 and the font/overflow scan in Task 15.
2. Returning participant whose id is in `localStorage("connexts-participant-id")` but the store has not hydrated — must not see the guest banner flash or get the profile sheet; pinned in Task 11 (`isGuest` test).
3. Pressing ขอเชื่อมต่อ on someone already connected — must show "เชื่อมกันแล้ว · คุยต่อ" and open the connection, never create a second connection; pinned in Task 8 (`deckPrimaryAction` test).
4. Network read fails (`networkAvailable === false`) or pool is empty — must show the retry state / empty meadow, not a blank card; pinned in Task 8.
5. Admin routes after the theme switch — `/admin*` must render with no `meadow` class and unchanged colours; pinned in Task 2 (`themeClassFor` test) and checked in Task 15.

---

### Task 1: Test harness + issue colours and power icons

**Files:**
- Modify: `package.json` (devDependency + `test` script), `package-lock.json` (via npm)
- Create: `vitest.config.ts`
- Create: `src/lib/issue-colors.ts`
- Test: `src/lib/issue-colors.test.ts`

**Interfaces:**
- Produces:
  - `type BlockColor = "purple" | "blue" | "yellow" | "green" | "teal" | "orange"`
  - `ISSUE_BLOCK: Record<Issue, BlockColor>` (table in spec §3)
  - `BLOCK_TAG: Record<BlockColor, { bg: string; fg: string }>` (tag pairs from Global Constraints)
  - `blockFor(issue: string): BlockColor` (unknown → `"orange"`)
  - `POWER_ICON: Record<Power, LucideIcon>` (spec §3 mapping)
  - `contrastRatio(hexA: string, hexB: string): number` (WCAG relative luminance)

- [ ] **Step 1: Install Vitest and config**

Run: `npm install -D vitest@3.2.4` (do not hand-edit `bun.lock`; Lovable regenerates it).
Add script `"test": "vitest run"`. `vitest.config.ts` must NOT import `vite.config.ts` (the Lovable config pulls in TanStack/nitro plugins): use `defineConfig` from `vitest/config` with `resolve.alias["@"] = <repo>/src`, `test.environment = "node"`, `test.include = ["src/**/*.test.ts"]`.

- [ ] **Step 2: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { ISSUES, POWERS } from "@/lib/types";
import { BLOCK_TAG, ISSUE_BLOCK, POWER_ICON, blockFor, contrastRatio } from "@/lib/issue-colors";

describe("issue-colors", () => {
  it("maps every issue to a block colour", () => {
    for (const i of ISSUES) expect(ISSUE_BLOCK[i]).toBeTruthy();
    expect(ISSUE_BLOCK["LGBTQ+"]).toBe("purple");
    expect(ISSUE_BLOCK["Policy"]).toBe("blue");
    expect(ISSUE_BLOCK["Silver Age"]).toBe("yellow");
    expect(ISSUE_BLOCK["Environment"]).toBe("green");
    expect(ISSUE_BLOCK["Mental Health"]).toBe("teal");
    expect(ISSUE_BLOCK["Youth"]).toBe("orange");
  });
  it("falls back to orange for unknown issues", () => {
    expect(blockFor("Something new")).toBe("orange");
  });
  it("every tag pair passes WCAG AA 4.5:1", () => {
    for (const { bg, fg } of Object.values(BLOCK_TAG)) expect(contrastRatio(bg, fg)).toBeGreaterThanOrEqual(4.5);
  });
  it("has an icon for every power", () => {
    for (const p of POWERS) expect(POWER_ICON[p.key]).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run to verify failure** — Run: `npx vitest run src/lib/issue-colors.test.ts` · Expected: FAIL (module not found)

- [ ] **Step 4: Implement `src/lib/issue-colors.ts`** with the interfaces above; import types from `./types` (relative).

- [ ] **Step 5: Run to verify pass** — Expected: 4 passed

- [ ] **Step 6: Commit** — `git add package.json package-lock.json vitest.config.ts src/lib/issue-colors.ts src/lib/issue-colors.test.ts && git commit -m "feat: issue colour blocks, power icons and vitest harness"`

---

### Task 2: Meadow theme layer (tokens, type scale, scope)

**Files:**
- Create: `src/meadow.css`, `src/lib/theme.ts`
- Modify: `src/styles.css` (one `@import "./meadow.css";` after the existing `@import` lines), `src/routes/__root.tsx` (RootShell `<html>` class, Google Fonts URL)
- Test: `src/lib/theme.test.ts`

**Interfaces:**
- Produces: `themeClassFor(pathname: string): "meadow" | undefined` (`undefined` for `/admin` and `/admin/...`); CSS utilities `text-body|lead|title|display|score`, colours `bg-sky`, `bg-sky-soft`, `bg-paper`, `text-ink`, `text-ink-soft`, `bg-block-{purple|blue|yellow|green|teal|orange}`; class `.meadow-card`, `.meadow-btn-primary`, `.meadow-btn-secondary`.

- [ ] **Step 1: Failing test** — `themeClassFor("/")` → `"meadow"`, `("/map")` → `"meadow"`, `("/admin")` → `undefined`, `("/admin/people")` → `undefined`, `("/administrator")` → `"meadow"`.
- [ ] **Step 2: Run** `npx vitest run src/lib/theme.test.ts` → FAIL
- [ ] **Step 3: Implement `themeClassFor`**; in `RootShell` read `useRouterState({ select: s => s.location.pathname })` and render `<html lang="th" className={themeClassFor(pathname)}>` (SSR-safe; portals such as Drawer/Toaster inherit tokens). Replace the fonts URL with `family=Noto+Sans+Thai:wght@400;600;700&family=Kanit:wght@600;700&display=swap` after grepping that `Prompt`/`Space Grotesk` are only referenced from admin or removed classes; if admin uses them, keep them in the URL.
- [ ] **Step 4: Write `src/meadow.css`**
  - `@theme` block: `--text-body: 20px; --text-body--line-height: 1.6;` … through `text-score`; `--color-sky`, `--color-sky-soft`, `--color-paper`, `--color-meadow`, `--color-ink-soft`, `--color-block-*` (decor hexes) and `--font-heading: "Kanit", "Noto Sans Thai", sans-serif`.
  - `html.meadow { color-scheme: light; … }` overriding the shadcn tokens: `--background: var(--paper)`, `--foreground: #2B2878`, `--ink: #2B2878`, `--card: #FFFFFF`, `--card-foreground: #2B2878`, `--popover: #FFFFFF`, `--primary: #6A2C91`, `--primary-foreground: #FFFFFF`, `--muted: #F1EFF8`, `--muted-foreground: #4A4870`, `--accent: #EAF6FD`, `--accent-foreground: #2B2878`, `--border: #E6E3F2`, `--input: #D9D5EA`, `--ring: #6A2C91`, and raise Tailwind's small sizes so every existing `text-xs/sm/base` becomes ≥ 20px: `--text-xs: 20px; --text-sm: 20px; --text-base: 20px;` (each `--line-height` 1.6), `--text-lg: 22px`.
  - `html.meadow body { background: linear-gradient(var(--sky-soft), var(--paper) 420px); font-size: 20px; line-height: 1.6 }`; `html.meadow [data-sonner-toast] { font-size: 20px; line-height: 1.6 }` (and its title/description children) so toasts meet the 20px rule; `html.meadow :is(h1,h2,h3,.font-heading) { font-family: var(--font-heading); color: var(--ink) }`.
  - Neutralise space decor only under `html.meadow`: `body::before, body::after { display:none }`; reset the `.site-experience :is(.rounded-…)` square-corner rules and `.site-experience .gradient-power`; `.meadow-card` (radius 24px, white, border, shadow from Global Constraints), `.meadow-btn-primary` (64px, radius 18px, `--primary`, white, Kanit 600, `text-lead`), `.meadow-btn-secondary` (≥ 56px, white, 2px `--ink` border, `text-body`); inputs/select/textarea inside `html.meadow`: 20px, min-height 56px.
- [ ] **Step 5: Verify** — `npx vitest run` pass; start dev server (`.claude/launch.json` → `npx vite dev --port 5173`), open `/map` at 375×812 and run in the page: `getComputedStyle(document.querySelector('.text-xs, .text-sm') ?? document.body).fontSize` → `"20px"`; open `/admin` → `document.documentElement.className` has no `meadow` and the page still looks dark.
- [ ] **Step 6: Commit** — `feat: meadow theme layer scoped to participant routes`

---

### Task 3: Bottom nav — 4 tabs

**Files:**
- Modify: `src/components/bottom-nav.tsx`
- Test: `src/components/bottom-nav.test.ts` (imports only the exported data/function, not JSX rendering)

**Interfaces:**
- Produces: `NAV_ITEMS` (4 entries from spec §2 table: `{ to, label, icon, match }`), `isNavActive(pathname: string, match: readonly string[]): boolean` — `"/"` matches only exactly `/`; other prefixes match `p === pathname || pathname.startsWith(p + "/")` or the exact segment (e.g. `/people/abc` → จับคู่).

- [ ] **Step 1: Failing tests** — `NAV_ITEMS.map(n => n.label)` equals `["จับคู่","คู่ของฉัน","สำรวจ","ฉัน"]`; `isNavActive("/", ["/","/matches","/people"])` true; `isNavActive("/map", ["/","/matches","/people"])` false; `isNavActive("/people/x", …)` true; `isNavActive("/marketplace", ["/map","/marketplace"])` true; `isNavActive("/dashboard", ["/update","/notifications","/dashboard"])` true.
- [ ] **Step 2: Run → FAIL**
- [ ] **Step 3: Implement** — keep `aria-label="เมนูหลัก"`, `aria-current="page"` on active; 4 equal columns; icon 26px; label `text-body`; active = `--primary` text + 4px top bar; container `bg-paper/95` with top border; under 360px hide the visible label (`max-[359px]:sr-only`) so the link keeps its accessible name; remove `lg:hidden` so desktop also has the nav (SpaceNav no longer used on participant pages after Task 12).
- [ ] **Step 4: Run → PASS**; screenshot 375×812 and 320×640.
- [ ] **Step 5: Commit** — `feat: four-tab matching-first bottom nav`

---

### Task 4: MeadowScene

**Files:**
- Create: `src/components/meadow-scene.tsx`
- Modify: `src/meadow.css` (windmill keyframes)

**Interfaces:**
- Produces: `MeadowScene({ variant, className }: { variant: "header" | "celebrate" | "empty"; className?: string })` — inline SVG, `aria-hidden`, `focusable="false"`.

- [ ] **Step 1: Implement** — one `viewBox="0 0 400 160"` scene: sky rect `#CFEAFB`, 3 cream clouds, 2 brick-red mountains `#B65A4E` with white caps, 3–4 round trees (`#3F7D3A`, trunks `#B23A3A`), 3 white windmills (rotor group with class `meadow-rotor`, `transform-origin` at hub), meadow `#A9CC93` with a lighter path. `header` 140px tall full-width; `celebrate` taller (240px) with all 3 windmills; `empty` 180px with 1 windmill. No text, no logos. CSS: `.meadow-rotor { animation: meadow-spin 12s linear infinite; transform-box: fill-box; transform-origin: center }`, stopped under `@media (prefers-reduced-motion: reduce)` and `html[data-lowspec]`.
- [ ] **Step 2: Verify** — render temporarily on `/` (Task 11 will place it) or via dev preview; screenshot 375px; with reduced motion emulated, rotor `getAnimations().length === 0`.
- [ ] **Step 3: Commit** — `feat: illustrated meadow scene with windmills`

---

### Task 5: Shared card bits (IssueBlock, PowerLine, ScoreRing)

**Files:**
- Modify: `src/components/power-bits.tsx`
- Create: `src/lib/card-tags.ts`
- Test: `src/lib/card-tags.test.ts`

**Interfaces:**
- Consumes: `blockFor`, `BLOCK_TAG`, `POWER_ICON` (Task 1)
- Produces:
  - `pickTags(theirIssues: string[], myIssues: string[], max = 2): { shown: string[]; more: number }` — shared issues first (in their order), then the rest; `more = total - shown.length`.
  - `IssueBlock({ issue }: { issue: string })` — solid tag, radius 12px, `text-body` bold, min-height 40px, wraps (no ellipsis), colours from `BLOCK_TAG[blockFor(issue)]`, label `issueTh(issue)`.
  - `MoreBlock({ count }: { count: number })` — grey block "+N".
  - `PowerLine({ label, powers }: { label: string; powers: string[] })` — one line: 24px icon of `powers[0]` + `powerTh(powers[0])` + " +N" when `powers.length > 1`; renders nothing when empty.
  - `ScoreRing({ score, size = 84 })` — restyled: conic ring in `--primary` on `#E6E3F2`, number `text-score` Kanit 700, label "แมตช์" `text-body`; `role="img" aria-label={`แมตช์ ${score}%`}`. Existing callers keep compiling.
- [ ] **Step 1: Failing tests** — `pickTags(["Policy","Youth","Environment"], ["Youth"])` → `{ shown: ["Youth","Policy"], more: 1 }`; `pickTags([], ["Youth"])` → `{ shown: [], more: 0 }`; `pickTags(["A","B"], [], 2)` → `{ shown: ["A","B"], more: 0 }`.
- [ ] **Step 2: Run → FAIL** · **Step 3: Implement** · **Step 4: Run → PASS**
- [ ] **Step 5: Commit** — `feat: colour issue blocks, power line and score ring`

---

### Task 6: Guest ranking + match-card view model

**Files:**
- Modify: `src/lib/matching.ts` (add only; `scoreMatch`/`rankMatches` unchanged)
- Test: `src/lib/matching.test.ts`

**Interfaces:**
- Produces:
  - `type DeckEntry = { user: User; match: MatchResult | null }` (`match` null for guests)
  - `rankForGuest(pool: User[], dayKey: string, limit = 30): DeckEntry[]` — excludes users with empty `name`; "complete" profiles first (has ≥1 interest AND ≥1 power_have AND organization not empty), then a stable shuffle seeded by `dayKey + user.id` (string hash, e.g. FNV-1a 32-bit) so order is fixed for a day and differs across days.
  - `buildDeck(me: User | null, pool: User[], dayKey: string): DeckEntry[]` — `me` ? `rankMatches(me, pool, 30).map(m => ({ user: m.user, match: m }))` : `rankForGuest(pool, dayKey)`.
  - `guestBlurb(u: User): string` — `"ทำเรื่อง" + issueTh(first interest)` and `" · มี" + powerTh(first power)` when present; `""` when neither.
  - `dayKey(d: Date): string` → `YYYY-MM-DD` in Asia/Bangkok.
- [ ] **Step 1: Failing tests**
  - complete profiles precede incomplete ones;
  - same `dayKey` → identical order; different `dayKey` → order differs for a 10-user fixture;
  - `buildDeck(null, …)` entries have `match === null`; `buildDeck(me, …)` excludes `me.id`;
  - long-name fixture (`"นางสาวกัญญารัตน์ ศรีสวัสดิ์วัฒนาพงษ์ มูลนิธิเครือข่ายสุขภาวะชุมชนภาคตะวันออกเฉียงเหนือ"`) survives ranking unchanged (used later in Task 15 QA);
  - `guestBlurb({interests:["Youth"], powers_have:["Ideas"]…})` → `"ทำเรื่องเยาวชน · มีไอเดีย"` (use the actual `issueTh`/`powerTh` output);
  - `dayKey(new Date("2026-10-28T20:00:00Z"))` → `"2026-10-29"`.
- [ ] **Step 2: Run → FAIL** · **Step 3: Implement** · **Step 4: Run → PASS**
- [ ] **Step 5: Commit** — `feat: guest deck ranking and day-stable order`

---

### Task 7: MatchCard rewrite

**Files:**
- Modify: `src/components/match-card.tsx`

**Interfaces:**
- Consumes: `DeckEntry` (Task 6), `IssueBlock`, `MoreBlock`, `PowerLine`, `ScoreRing`, `pickTags` (Task 5), `Avatar`
- Produces: `MatchCard({ entry, me }: { entry: DeckEntry; me: User | null })` — presentational only (no buttons except the profile link). Old `{ match, index }` callers: only `src/routes/matches.tsx`, which Task 11 replaces with a redirect.

- [ ] **Step 1: Implement per spec §4** in this order: top row Avatar 72px + `ScoreRing size={84}` (only when `entry.match`); name `text-title` `line-clamp-2`; province · organization `text-body text-ink-soft line-clamp-2`; reason box (`bg-sky-soft`, radius 16px, `text-lead`) showing `entry.match?.reason ?? guestBlurb(user)`; issue blocks via `pickTags(user.interests, me?.interests ?? [], 2)`; `PowerLine label="เขามีให้" powers={match?.theyBring ?? user.powers_have}`; `PowerLine label="เขากำลังหา" powers={match?.theyNeed ?? user.powers_need}`; link "ดูโปรไฟล์เต็ม" → `/people/$id`, underline, ≥ 48px. Root `<article className="meadow-card p-5" aria-label={user.name}>`.
- [ ] **Step 2: Verify** — tsc; screenshot at 375px with the long-name fixture user injected via React DevTools or a temporary story route that is NOT committed; no horizontal scroll.
- [ ] **Step 3: Commit** — `feat: readable 20px match card with colour issue blocks`

---

### Task 8: DiscoverDeck rewrite

**Files:**
- Modify: `src/components/discover-deck.tsx`
- Create: `src/lib/deck-rules.ts`
- Test: `src/lib/deck-rules.test.ts`

**Interfaces:**
- Consumes: `MatchCard`, `DeckEntry`, store `connect`, `connections`, `toggleLikeUser`, `likedUsers`, `skipUser`, `undoSkip`, `skippedUsers`, `networkAvailable`, `hydrated`, `refresh`
- Modify also: `src/lib/store.ts` — add `refresh: () => Promise<void>` to the `Store` type and the context value (the internal `refresh` at `store.ts:333`; add it to the `useMemo` deps list). No other store changes.
- Produces:
  - `swipeOutcome(dx: number): "skip" | "save" | "snap"` — `dx <= -90` skip, `dx >= 90` save, else snap.
  - `swipeRotation(dx: number): number` — `clamp(dx / 10, -12, 12)` degrees.
  - `deckPrimaryAction({ hasProfile, connected }: { hasProfile: boolean; connected: boolean }): "open-profile-sheet" | "connect" | "open-connection"`.
  - `deckState({ hydrated, networkAvailable, total, remaining }: { hydrated: boolean; networkAvailable: boolean; total: number; remaining: number }): "loading" | "error" | "empty" | "ready"` — `!hydrated && total === 0` loading; `hydrated && !networkAvailable && total === 0` error; `total > 0 && remaining === 0` or (`hydrated && networkAvailable && total === 0`) empty; else ready.
  - `DiscoverDeck({ entries, me, onNeedProfile, onConnected }: { entries: DeckEntry[]; me: User | null; onNeedProfile: (target: User) => void; onConnected: (c: Connection, entry: DeckEntry) => void })`
- [ ] **Step 1: Failing tests** — `swipeOutcome(-90)` skip, `(-89)` snap, `(90)` save, `(0)` snap; `swipeRotation(500)` 12, `(-500)` -12, `(50)` 5; `deckPrimaryAction({hasProfile:false, connected:false})` open-profile-sheet; `({hasProfile:true, connected:true})` open-connection; `({hasProfile:true, connected:false})` connect; `deckState` — `{hydrated:false,networkAvailable:true,total:0,remaining:0}` loading, `{hydrated:true,networkAvailable:false,total:0,remaining:0}` error, `{hydrated:true,networkAvailable:true,total:5,remaining:0}` empty, `{hydrated:true,networkAvailable:true,total:0,remaining:0}` empty, `{hydrated:false,networkAvailable:true,total:3,remaining:3}` ready.
- [ ] **Step 2: Run → FAIL** · **Step 3: Implement rules**
- [ ] **Step 4: Implement the deck UI**
  - Top card = `entries` filtered by not skipped/liked; card drag via pointer events using `swipeRotation`/`swipeOutcome`; skip → `skipUser` + toast "ข้าม {name} แล้ว" with action "ย้อน" (`undoSkip`); save → `toggleLikeUser`.
  - Sticky action bar (`position: sticky; bottom: calc(nav height + safe-area)`): `ข้าม` 64px circle `X` icon `aria-label="ข้าม {name}"`; primary `meadow-btn-primary` label by action: "ขอเชื่อมต่อ" / "เชื่อมกันแล้ว · คุยต่อ"; `เก็บไว้` 64px circle `Bookmark` `aria-label`, `aria-pressed`.
  - Primary: `open-profile-sheet` → `onNeedProfile(user)`; `connect` → `connect(user.id, match.score, match.reason)` once (disable while busy) → `onConnected`; `open-connection` → navigate `/connection/$id`.
  - "↶ ย้อนการ์ดที่ข้าม" text button (≥ 48px) when `skippedUsers.length > 0`.
  - States driven by `deckState(...)`: loading → one skeleton card (`role="status"`, "กำลังหาคนที่ควรเจอ…"); error → "ยังโหลดรายชื่อไม่ได้" + `meadow-btn-secondary` "ลองอีกครั้ง" (calls `refresh()`); empty → `MeadowScene variant="empty"` + "คุณดูครบทุกคนแล้ว" + buttons "ดูคนที่เก็บไว้" (`/commitments#saved`) and "สำรวจแผนที่" (`/map`).
  - Remove `SwipeCoach`, `MissionVisual`, `ConnectBurst` usage from the deck.
- [ ] **Step 5: Run tests → PASS**; on dev server without a profile: drag a card left → skipped + undo works; press primary → `onNeedProfile` fires (no network write).
- [ ] **Step 6: Commit** — `feat: matching deck with big buttons, swipe shortcuts and recovery states`

---

### Task 9: Quick profile (3 steps) — sheet and onboarding page

**Files:**
- Create: `src/lib/quick-profile.ts`, `src/components/quick-profile-form.tsx`, `src/components/quick-profile-sheet.tsx`
- Modify: `src/routes/onboarding.tsx`
- Test: `src/lib/quick-profile.test.ts`

**Interfaces:**
- Consumes: store `saveProfile(u: ProfileInput): Promise<User>`, `pendingProfile`; `REGIONS`, `ISSUES`, `POWERS`, `IssueBlock`, `POWER_ICON`
- Produces:
  - `type QuickDraft = { name: string; region: Region | null; interests: string[]; powers_have: string[]; powers_need: string[] }`
  - `quickStepValid(step: 1 | 2 | 3, d: QuickDraft): boolean` — 1: `name.trim().length >= 1 && region !== null`; 2: `interests.length >= 1`; 3: `powers_have.length >= 1`.
  - `toProfileInput(d: QuickDraft)` → ProfileInput with the existing ProfileForm defaults: `province: ""`, `organization: "อิสระ"`, `generation: "Millennial"`, `bio: ""`, `source: "qr"` only if the current session is QR (reuse `session.ts`), else omit.
  - `QuickProfileForm({ onSaved }: { onSaved: (me: User) => void })` — step header "ขั้นที่ n จาก 3", Back/Next (`meadow-btn-secondary`/`meadow-btn-primary`), copy: step1 "เราเรียกคุณว่าอะไรดี?" + label "ชื่อที่อยากให้เพื่อนเรียก" + "คุณทำงานอยู่ภาคไหน?" (6 region buttons, `aria-pressed`); step2 "คุณสนใจเรื่องอะไร?" (IssueBlock toggles, selected shows check icon, `aria-pressed`); step3 "คุณมีพลังอะไรให้เพื่อน?" (required) + "อยากได้พลังอะไรเพิ่ม? (ไม่บังคับ)"; final button "เริ่มจับคู่"; on save failure show `role="alert"` "บันทึกยังไม่สำเร็จ ข้อมูลที่กรอกยังอยู่ ลองกดอีกครั้ง" and keep the draft.
  - `QuickProfileSheet({ open, onOpenChange, onSaved })` — shadcn `Drawer` with title "บอกเราสั้น ๆ 3 ข้อ" and the form.
  - Dev-only test hook: when `import.meta.env.DEV && new URLSearchParams(location.search).has("dryrun")`, `QuickProfileForm` calls `onSaved` with a fake `User` built from the draft instead of `saveProfile` (never in production builds).
- [ ] **Step 1: Failing tests** for `quickStepValid` (each boundary: empty name, whitespace name, null region, 0/1 interests, 0/1 powers_have) and `toProfileInput` defaults.
- [ ] **Step 2: Run → FAIL** · **Step 3: Implement lib** · **Step 4: Run → PASS**
- [ ] **Step 5: Implement form + sheet**; `/onboarding` renders `QuickProfileForm` full-page (keep its head meta; remove `IntroGuide`), `onSaved` → `navigate({ to: "/", replace: true })`; when `me` already exists, keep the existing redirect but target `/`.
- [ ] **Step 6: Verify** on `/onboarding?dryrun` at 375px: Next disabled-state messaging, all 3 steps, keyboard only path, 20px everywhere.
- [ ] **Step 7: Commit** — `feat: three-step quick profile sheet and onboarding`

---

### Task 10: MatchCelebration

**Files:**
- Create: `src/components/match-celebration.tsx`
- Modify: `src/meadow.css` (float-in keyframes)

**Interfaces:**
- Consumes: `MeadowScene`, `Avatar`
- Produces: `MatchCelebration({ me, other, reason, connectionId, onClose }: { me: User; other: User; reason: string; connectionId: string; onClose: () => void })`
- [ ] **Step 1: Implement per spec §4** — fixed overlay `bg-sky-soft`, `role="dialog" aria-modal="true" aria-labelledby`, focus moves to the heading on open and returns on close, Esc closes; avatars 96px float in from left/right (transform/opacity, 600ms ease-out) with a dashed line drawn between; heading "เชื่อมกันแล้ว!" `text-display`; "คุณกับ {other.name}" `text-lead`; reason `text-body` max 2 lines; buttons "คุยกันเลย" → `/connection/$connectionId`, "ไว้ทีหลัง" → `onClose`. Reduced motion: final layout, no animation.
- [ ] **Step 2: Dev preview** — on `/` (Task 11), when `import.meta.env.DEV` and `?celebrate` is present, render the overlay with the first two loaded users and a dummy id (no writes).
- [ ] **Step 3: Verify** at 375px and with reduced motion; Tab cycles only inside; Esc closes.
- [ ] **Step 4: Commit** — `feat: match celebration overlay over the meadow`

---

### Task 11: Home `/` becomes the matching page; `/matches` redirects; store `refresh`

**Files:**
- Modify: `src/routes/index.tsx`, `src/routes/matches.tsx`
- Create: `src/lib/guest.ts`
- Test: `src/lib/guest.test.ts`

**Interfaces:**
- Consumes: `buildDeck`, `dayKey`, `DiscoverDeck`, `QuickProfileSheet`, `MatchCelebration`, `MeadowScene`, `scoreMatch`, `BottomNav`, `PdpaConsent`
- Produces:
  - `isGuest({ me, hasLocalId, hydrated }: { me: User | null; hasLocalId: boolean; hydrated: boolean }): boolean` — true only when `!me && !hasLocalId`; when `hasLocalId && !me` → false regardless of `hydrated`.
- [ ] **Step 1: Failing tests** for `isGuest` (4 combinations, incl. returning participant mid-hydration → false).
- [ ] **Step 2: Run → FAIL** · **Step 3: Implement** · **Step 4: Run → PASS**
- [ ] **Step 5: Rewrite `index.tsx`** — remove `loader`, `SpaceNav`, `MissionStory`, `PeopleNetwork`, `useScrollReveal`, react-query network polling. Layout per spec §2 ASCII: header row (logo `Wordmark` + bell link to `/notifications` with unread count, both ≥ 48px) on `bg-sky`; `MeadowScene variant="header"`; H1 "คนที่ควรเจอวันนี้" `text-display` + "เหลือ {n} คน" `text-body`; guest banner (only when `isGuest`) "บอกเรื่องที่คุณสนใจ 3 ข้อ แมตช์จะแม่นขึ้น" + button "เริ่มเลย"; when `!me && hasLocalId` (returning participant still loading) render the deck in its loading state and never open the sheet; otherwise `DiscoverDeck entries={buildDeck(me, users, dayKey(new Date()))} me={me} onNeedProfile={openSheetFor} onConnected={(c, e) => showCelebration(c, e)}`; `QuickProfileSheet` — after `onSaved(newMe)`, if it was opened from a card, call `connect(target.id, scoreMatch(newMe, target).score, scoreMatch(newMe, target).reason)` and show `MatchCelebration`; `PdpaConsent`; `BottomNav`; `SponsorFooter` at the bottom. Keep the head meta.
- [ ] **Step 6: `/matches`** — replace the component with `beforeLoad: ({ location }) => { throw redirect({ to: "/", search: location.search, replace: true }) }`.
- [ ] **Step 7: Verify** — fresh browser profile (no localStorage) on `/` at 375×812: first card visible with zero taps; `/matches?x=1` lands on `/?x=1`; returning id in localStorage → no banner flash.
- [ ] **Step 8: Commit** — `feat: matching-first home and /matches redirect`

---

### Task 12: AppShell for participant pages; tour/intro/PDPA quieting

**Files:**
- Modify: `src/components/app-shell.tsx`, `src/components/guided-tour.tsx`, `src/components/pdpa-consent.tsx`

**Interfaces:**
- Produces: `AppShell` props unchanged (`title`, `titleEn` now ignored visually, `subtitle`, `action`). Admin branch unchanged.
- [ ] **Step 1: AppShell (non-admin)** — remove `SpaceNav`, `MissionHeader`, `mission-route-rail`, mission footer. New header on `bg-sky-soft`: `Wordmark` (link `/`) left; bell (unread count, ≥ 48px) + my avatar/profile link right; below: `<h1 class="text-display">` title, optional subtitle `text-body text-ink-soft`, optional `action` row. Main `max-w-xl` (mobile-first; ≥ 1024px centre at `max-w-3xl`). Footer: `SponsorFooter` + "คู่มือใช้งาน" link. Keep `PendingSyncBanner`, `BottomNav`, `id="main-content"`.
- [ ] **Step 2: Guided tour** — delete the auto-open effect (keep `TOUR_EVENT` listener so it can be opened from `/update`).
- [ ] **Step 3: PDPA** — single bar above the nav: one sentence `text-body` + two buttons (≥ 48px) "ได้เลย" / "ไม่เป็นไร" + details toggle; no other copy changes.
- [ ] **Step 4: Verify** `/map`, `/marketplace`, `/notifications`, `/guide` at 375px (header correct, no space visuals), `/admin` unchanged.
- [ ] **Step 5: Commit** — `feat: light participant app shell; tour no longer auto-opens`

---

### Task 13: คู่ของฉัน (`/commitments`)

**Files:**
- Modify: `src/routes/commitments.tsx`

**Interfaces:**
- Consumes: store `connections`, `commitments`, `users`, `likedUsers`, `me`; `Avatar`, `STATUS_TH`

- [ ] **Step 1: Implement per spec §5** — `AppShell title="คู่ของฉัน"`. Section 1 "คนที่เชื่อมแล้ว": one `meadow-card` row per connection (Avatar 56px, partner name `text-lead`, status `text-body`, buttons "คุย" → `/chat/$id` and "ทำอะไรต่อ" → `/connection/$id`, each ≥ 48px). Section 2 (`id="saved"`) "คนที่เก็บไว้": rows from `likedUsers` with "ดูโปรไฟล์". Section 3 "สิ่งที่ตกลงจะทำ": existing commitment logic/actions unchanged, restyled with meadow classes. Empty states use `MeadowScene variant="empty"` + one button "ไปจับคู่" → `/`.
- [ ] **Step 2: Verify** at 375px with the current account's data (read-only) and an empty account.
- [ ] **Step 3: Commit** — `feat: my connections hub`

---

### Task 14: ฉัน (`/update`) and Explore tabs (`/map`, `/marketplace`)

**Files:**
- Modify: `src/routes/update.tsx`, `src/routes/map.tsx`, `src/routes/marketplace.tsx`
- Create: `src/components/explore-tabs.tsx`

**Interfaces:**
- Produces: `ExploreTabs({ current }: { current: "map" | "ideas" })` — two links "แผนที่" (`/map`) / "ไอเดีย" (`/marketplace`), `role="tablist"` semantics via links with `aria-current="page"`, each ≥ 48px, `text-body`.
- [ ] **Step 1: `/update`** — `AppShell title="ฉัน"`; profile card (Avatar 72px, name `text-title`, up to 3 `IssueBlock`); quick links row (≥ 48px each): "การแจ้งเตือน" `/notifications`, "สดในงาน" `/dashboard`, "คู่มือ" `/guide`, plus button "ดูทัวร์แนะนำ" dispatching `TOUR_EVENT`; then the existing `ProfileForm` (no logic changes; its tiny classes are already lifted to 20px by Task 2 tokens — fix any remaining arbitrary `text-[Npx]` < 20 inside `profile-form.tsx`).
- [ ] **Step 2: Explore tabs** — render `<ExploreTabs current="map" />` / `"ideas"` as the first child inside each page's `AppShell`; set both titles to "สำรวจ" and keep their existing content.
- [ ] **Step 3: Verify** 375px screenshots of the three pages; tab focus order.
- [ ] **Step 4: Commit** — `feat: me page and explore tabs`

---

### Task 15: 20px sweep, accessibility QA, owner review

**Files:**
- Create: `scripts/qa/font-scan.js`
- Modify: any participant file the scan flags (only to raise sizes / fix wrapping)

**Interfaces:**
- Produces: `scripts/qa/font-scan.js` — a self-contained snippet to paste into the browser tool that returns `{ small: Array<{ text, px, selector }>, overflowX: boolean, clipped: Array<{ text, selector }> }`; "small" = visible text nodes (non-empty trimmed text, element has width/height > 0, not `aria-hidden`, not `.sr-only`) whose computed font-size < 20px; "clipped" = elements with `scrollWidth > clientWidth + 1` and `overflow` hidden/clip containing text.

- [ ] **Step 1: Write the scan script.**
- [ ] **Step 2: Run it at 375×812 and again at 1440×900** on: `/` (guest), `/` (returning — set a known test id in localStorage only if one exists for a test account; otherwise skip and note), `/onboarding?dryrun` steps 1–3, `/?celebrate`, deck exhausted (skip all via buttons — skips are local-only), `/commitments`, `/update`, `/map`, `/marketplace`, `/people/<any id>`, `/notifications`, `/guide`, `/connection/<own connection id if any>`.
- [ ] **Step 3: Fix every `small` / `clipped` result** at its source (arbitrary `text-[Npx]`, CSS classes in `styles.css` with px font sizes under `html.meadow`, badges with fixed heights). Re-run until `small` and `clipped` are empty and `overflowX` is false on every page above.
- [ ] **Step 4: Accessibility checks** — `npx vitest run` (contrast pairs); keyboard-only path: `/` → open sheet → complete 3 steps (dryrun) → celebration → "คุยกันเลย"; emulate reduced motion (windmills still, celebration static); 320px width (nav labels hidden but named).
- [ ] **Step 5: Regression** — `/admin` login screen and one admin page look exactly as before (compare against a screenshot taken before Task 2; take it now from `main` via `git stash`/second worktree if not already saved).
- [ ] **Step 6: Final gates** — `npx tsc --noEmit -p .`, `npx eslint` on all changed files (non-prettier errors = 0), `npx vitest run`, `npx vite build` succeeds.
- [ ] **Step 7: Commit** — `chore: 20px sweep and QA fixes`
- [ ] **Step 8: Owner review** — `git push -u origin redesign/meadow-match` (branch only), share screenshots (375px: home guest, card, sheet steps, celebration, คู่ของฉัน, ฉัน, สำรวจ). Merge to `main` only after the owner says yes (merge commit or fast-forward; no force-push). Remind the owner to press Publish in Lovable if it does not auto-publish.
