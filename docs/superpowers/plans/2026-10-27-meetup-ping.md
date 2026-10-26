# Meetup Ping (ชวนเจอ & ส่งสัญญาณหากัน) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When someone connects, the other phone chimes with a "อยากเจอคุณตอนนี้" card; once accepted, both phones enter a full-screen find mode in the pair's colour + symbol and can ping each other.

**Architecture:** Invitations live in a new RLS-protected `meetups` table; delivery uses a contentless Supabase Realtime Broadcast "knock" to `inbox:<participantId>` plus a 20 s poll; pings travel over Broadcast on `meet:<signal_key>`. All IO sits behind a `MeetupTransport` interface with a Supabase implementation and a DEV-only local implementation (`?meetsim`, BroadcastChannel + localStorage) so two browser tabs can test the whole flow without touching production. A `MeetupProvider` context owns state and actions; UI is an invitation card host and a find-mode dialog.

**Tech Stack:** TanStack Start + React 19, Tailwind v4 meadow theme (`src/meadow.css`), Supabase JS (`src/lib/db.ts` for table IO with `x-device-id`, `src/integrations/supabase/client.ts` `supabase` for Realtime), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-27-meetup-ping-design.md`

## Global Constraints

- Branch `feature/meetup-ping`; never push `main` until the owner approves; no force-push (AGENTS.md / Lovable).
- Never write to production from this machine: no `meetups`/`connections` writes against the live project; the migration is NOT applied from here; use `?meetsim` (local transport) and `?dryrun` for all interactive testing.
- Invitation lifetime 30 minutes (`expires_at = created_at + 30 min`); poll every 20 s while visible + on `visibilitychange`; ping cooldown 2 s.
- Status values exactly `pending | accepted | declined | done | cancelled`; transitions: `pending→accepted|declined` (invitee), `pending→cancelled` (inviter), `accepted→done|cancelled` (either). Decline is silent to the inviter.
- Broadcast payloads: knock `{ type: "knock" }` only; ping `{ type: "ping", from: <participantId> }` only — never names, locations or profile data.
- Pair badge: 6 colours from `BLOCK_TAG` (src/lib/issue-colors.ts) × 6 symbols `star | heart | circle | triangle | square | windmill` = 36 combos, deterministic from `signal_key`.
- Motion: pulse ≈ 1 Hz; ping = 2 strong pulses; never more than 3 flashes/second; `prefers-reduced-motion` → steady colour + brief thick outline.
- UI: every visible text ≥ 20px (`text-body`/`text-lead`/`text-title`), targets ≥ 48px (find-mode buttons 56px), meadow tokens, Thai copy exactly as in spec §2/§5; cards/dialog never on `/admin`.
- Sound via `src/lib/notify.ts` (`playConnext({ speak: false })`, `unlockAudio`, `isSoundOn`); vibration only via `navigator.vibrate` when present; Screen Wake Lock in find mode when available.
- After every task: `npx vitest run`, `npx tsc --noEmit -p .`, eslint on changed files (0 non-prettier errors). Don't run `prettier --write` on files you didn't create.

## Review Focus

1. An invitation arrives while the receiver has a dialog open (quick-profile sheet, match celebration, find mode) — the card must queue, not steal focus or cover the dialog; pinned in Task 6 (`selectVisibleCard` test with `dialogOpen`).
2. Both people press "ชวนเจอกันตอนนี้" at once — the second insert hits the unique index; the UI should show the existing invitation, not an error; pinned in Task 4 (transport maps unique-violation to `{ ok: true, existing }`) and Task 5.
3. Accepting after expiry — must say "คำชวนนี้หมดเวลาแล้ว" and not enter find mode; pinned in Task 1 (`canTransition` with `now > expires_at`).
4. Realtime channel drops during find mode — must show "สัญญาณขาดหาย กำลังต่อใหม่…" and recover; pinned in Task 7 (status mapping test).
5. Sound off / iOS audio not yet unlocked — card still appears, no error; pinned in Task 6 (`notifyInvite` calls are guarded; test that card renders when `playConnext` throws).

---

### Task 1: Meetup rules (pure)

**Files:** Create `src/lib/meetup-rules.ts`, Test `src/lib/meetup-rules.test.ts`

**Interfaces — Produces:**
- `type MeetupStatus = "pending" | "accepted" | "declined" | "done" | "cancelled"`
- `type Meetup = { id: string; connectionId: string; inviter: string; invitee: string; status: MeetupStatus; signalKey: string; createdAt: string; respondedAt: string | null; expiresAt: string }` (participant ids, not `"me"`)
- `MEETUP_TTL_MS = 30 * 60_000`, `POLL_MS = 20_000`, `PING_GAP_MS = 2_000`
- `isActive(m: Meetup, now: number): boolean` — status `pending|accepted` and `now < Date.parse(expiresAt)`
- `canTransition(m: Meetup, actorId: string, to: MeetupStatus, now: number): { ok: true } | { ok: false; reason: "expired" | "not-allowed" }`
- `canInvite(meetups: Meetup[], connectionId: string, now: number): boolean` — no active meetup for that connection
- `incomingPending(meetups: Meetup[], meId: string, now: number): Meetup[]` — active `pending` where `invitee === meId`, oldest first
- `acceptedForInviter(meetups: Meetup[], meId: string, now: number, seen: Set<string>): Meetup[]` — active `accepted` where `inviter === meId` and id not in `seen`
- `tryPing(lastAt: number | null, now: number): boolean` — false if `lastAt !== null && now - lastAt < PING_GAP_MS`

- [ ] **Step 1: Failing tests** — every transition in Global Constraints allowed for the right actor and `not-allowed` for the wrong one; any transition at `now >= expiresAt` → `expired`; `isActive` false for declined/done/cancelled/expired; `canInvite` false with an active meetup, true when only expired/declined exist; `incomingPending` ordering and filtering; `acceptedForInviter` respects `seen`; `tryPing(null, t)` true, `(t, t+1999)` false, `(t, t+2000)` true.
- [ ] **Step 2: Run** `npx vitest run src/lib/meetup-rules.test.ts` → FAIL (module missing)
- [ ] **Step 3: Implement** · **Step 4: Run → PASS**
- [ ] **Step 5: Commit** — `feat: meetup state rules`

---

### Task 2: Pair badge + symbols

**Files:** Create `src/lib/pair-badge.ts`, `src/components/pair-symbol.tsx`, Test `src/lib/pair-badge.test.ts`

**Interfaces — Consumes:** `BLOCK_TAG`, `BlockColor`, `contrastRatio` (src/lib/issue-colors.ts). **Produces:**
- `type PairSymbol = "star" | "heart" | "circle" | "triangle" | "square" | "windmill"`
- `PAIR_SYMBOLS: readonly PairSymbol[]`, `PAIR_COLORS: readonly BlockColor[]` (the 6 `BLOCK_TAG` keys)
- `pairBadge(signalKey: string): { color: BlockColor; symbol: PairSymbol; bg: string; fg: string }` — FNV-1a 32-bit of `signalKey`; `color = PAIR_COLORS[h % 6]`, `symbol = PAIR_SYMBOLS[Math.floor(h / 6) % 6]`; `bg/fg` from `BLOCK_TAG[color]`
- `COLOR_TH: Record<BlockColor, string>` = ม่วง, ฟ้า, เหลือง, เขียว, เขียวน้ำทะเล, ส้ม; `SYMBOL_TH: Record<PairSymbol, string>` = ดาว, หัวใจ, วงกลม, สามเหลี่ยม, สี่เหลี่ยม, กังหัน
- `PairSymbol({ symbol, className }: { symbol: PairSymbol; className?: string })` — inline SVG, `aria-hidden`, fills `currentColor`

- [ ] **Step 1: Failing tests** — same key → same badge; 2,000 random uuid-like keys hit all 36 combos; every `bg/fg` ≥ 4.5:1; `COLOR_TH`/`SYMBOL_TH` cover all keys.
- [ ] **Step 2: Run → FAIL** · **Step 3: Implement** (SVGs simple, recognisable at 40% screen width; windmill = 3 blades + hub, like MeadowScene) · **Step 4: Run → PASS**
- [ ] **Step 5: Commit** — `feat: pair colour and symbol badge`

---

### Task 3: `meetups` migration

**Files:** Create `supabase/migrations/20261027120000_meetups.sql`

- [ ] **Step 1: Write SQL** implementing spec §3 exactly: table + column defaults/CHECKs (`status` set, `inviter <> invitee`); unique partial index `meetups_one_active_per_connection` on `(connection_id) WHERE status in ('pending','accepted')`; `private.meetups_before_insert()` SECURITY DEFINER trigger (verify `{inviter, invitee} = {user_a, user_b}` of the connection else `RAISE EXCEPTION`; cancel expired active rows of the same connection); `private.meetups_before_update()` trigger rejecting changes to any column except `status`/`responded_at`, enforcing the transition table and actor (use `private.is_my_participant(inviter|invitee)`) and `now() < expires_at`, setting `responded_at = now()` on `accepted|declined`; enable RLS; policies SELECT/INSERT/UPDATE per spec (no DELETE); `GRANT SELECT, INSERT, UPDATE ON public.meetups TO anon, authenticated`; `ALTER PUBLICATION supabase_realtime ADD TABLE public.meetups;`. Follow the style of `supabase/migrations/20260825070247_*.sql` (`SET search_path = public`, private schema helpers).
- [ ] **Step 2: Self-check** — re-read against spec §3; confirm idempotence guards (`IF NOT EXISTS` where valid) and that every function referenced exists in earlier migrations (`private.is_my_connection`, `private.is_my_participant`).
- [ ] **Step 3: Regenerate types only if the repo has a typed Database for tables** (`src/integrations/supabase/types.ts`): add the `meetups` Row/Insert/Update shape by hand matching the SQL so `db.from("meetups")` type-checks. `npx tsc --noEmit -p .` clean.
- [ ] **Step 4: Commit** — `feat: meetups table with RLS (not applied — owner applies via Lovable)`

---

### Task 4: Meetup transport (Supabase + DEV local) and Broadcast probe

**Files:** Create `src/lib/meetup-transport.ts`, `src/lib/meetup-transport-local.ts`, Test `src/lib/meetup-transport-local.test.ts`

**Interfaces — Consumes:** `Meetup`, `MeetupStatus` (Task 1); `db` (src/lib/db.ts), `supabase` (src/integrations/supabase/client.ts). **Produces:**
```ts
export type ChannelState = "connecting" | "open" | "lost";
export interface MeetupTransport {
  list(meId: string): Promise<Meetup[]>;                       // meetups where I am inviter or invitee
  create(input: { connectionId: string; inviter: string; invitee: string }): Promise<{ ok: true; meetup: Meetup; existing: boolean } | { ok: false }>;
  setStatus(id: string, to: MeetupStatus): Promise<{ ok: true; meetup: Meetup } | { ok: false; reason: "expired" | "not-allowed" | "network" }>;
  knock(participantId: string): Promise<void>;
  onKnock(meId: string, cb: () => void): () => void;           // returns unsubscribe
  joinSignal(signalKey: string, meId: string, onPing: (from: string) => void, onState: (s: ChannelState) => void): { ping(): Promise<void>; leave(): void };
}
export function getMeetupTransport(): MeetupTransport;           // local when import.meta.env.DEV && ?meetsim, else supabase
```
- Supabase impl: table IO via `db`; on unique violation (`23505`) in `create`, `list` and return the active meetup with `existing: true`; map RLS/trigger errors to `not-allowed`/`expired`; Broadcast via `supabase.channel(name, { config: { broadcast: { self: false } } })`, `send({ type: "broadcast", event: "knock"|"ping", payload })`; map channel status `SUBSCRIBED→open`, `CHANNEL_ERROR|TIMED_OUT|CLOSED→lost`.
- Local impl (`meetup-transport-local.ts`, DEV only): rows in `localStorage["meetsim:meetups"]` applying the same rules as `canTransition`; knocks/pings over `BroadcastChannel("meetsim")`; ids/keys via `crypto.randomUUID()`.

- [ ] **Step 1: Failing tests (local impl, jsdom-free — inject a fake storage + fake BroadcastChannel)** — create → list on both sides; duplicate active create returns `existing: true`; `setStatus` enforces actor/expiry like Task 1; knock reaches only the target participant's `onKnock`; ping reaches the other side only.
- [ ] **Step 2: Run → FAIL** · **Step 3: Implement both** · **Step 4: Run → PASS**
- [ ] **Step 5: Broadcast probe (record in report, no DB writes)** — on the dev server, open two tabs; in each run (console) a temporary subscription via the app's `supabase` client on channel `probe:<random>` and send one broadcast from one tab; record whether the other receives within 5 s. If it does not, report NEEDS_CONTEXT (the plan then falls back to poll-only delivery).
- [ ] **Step 6: Commit** — `feat: meetup transport (supabase + dev local)`

---

### Task 5: Store id + MeetupProvider

**Files:** Modify `src/lib/store.ts` (expose `myParticipantId: string | null` in the `Store` type/value = `myIdRef.current`, kept reactive); Create `src/lib/meetup-context.tsx`, Test `src/lib/meetup-context.test.ts` (pure reducer only)

**Interfaces — Consumes:** Tasks 1, 4; `useStore()` (`connections`, `users`, `me`, `connect`). **Produces:**
- `meetupReducer(state: MeetupState, action: MeetupAction): MeetupState` (pure; actions `loaded`, `upserted`, `seenAccepted`, `openFind`, `closeFind`)
- `MeetupProvider({ children })` mounted in `src/routes/__root.tsx` inside `StoreProvider` (not rendered when `themeClassFor(pathname)` is undefined, i.e. admin/print)
- `useMeetups(): { meetups: Meetup[]; incoming: Meetup[]; acceptedForMe: Meetup[]; findSession: Meetup | null; invite(connectionId: string): Promise<"sent" | "existing" | "failed">; accept(id: string): Promise<"ok" | "expired" | "failed">; decline(id: string): Promise<void>; finish(id: string): Promise<void>; cancel(id: string): Promise<void>; openFind(id: string): void; closeFind(): void; markAcceptedSeen(id: string): void; canInviteFor(connectionId: string): boolean }`
- `useConnectAndInvite(): (otherId: string, score: number, reason: string) => Promise<ConnectResult>` — calls `store.connect`; on `{ ok: true, existed: false }` fires `invite(connection.id)` without awaiting; in `?dryrun` never calls `connect`/`invite` (keep the existing dry-run behaviour of callers)
- `resolveMeId(storeId: string | null, search: string, dev: boolean): string | null` (pure, exported, tested) — in DEV with `meetsim` present, `?as=<id>` overrides the store id (two tabs share localStorage, so each tab needs its own identity); otherwise returns `storeId`. In meetsim, partner names fall back to "ผู้ทดสอบ" + first 4 chars of the id when the user isn't in the store, and `?meetsim&pair=<idA>,<idB>` seeds one local connection between the two ids so invites can be created.
- Behaviour: when the resolved me-id is set — load on mount, subscribe `onKnock(myParticipantId)` → reload, poll every `POLL_MS` while `document.visibilityState === "visible"`, reload on `visibilitychange`; after create/setStatus call `knock(otherParticipantId)`; `accept` success → `openFind(id)`; seen-accepted ids persisted in `localStorage["meetups:seen-accepted"]`.

- [ ] **Step 1: Failing reducer tests** — `resolveMeId` (dev+meetsim+as → override; prod → store id; no as → store id); loaded/upserted merge by id; `openFind` only for active accepted; `closeFind`; `seenAccepted` removes from `acceptedForMe`.
- [ ] **Step 2: Run → FAIL** · **Step 3: Implement reducer, provider, hooks, store field, root mount** · **Step 4: Run → PASS**
- [ ] **Step 5: Commit** — `feat: meetup provider and connect-and-invite`

---

### Task 6: Invitation card host

**Files:** Create `src/components/meetup-card-host.tsx`, `src/lib/meetup-cards.ts`, Test `src/lib/meetup-cards.test.ts`; Modify `src/routes/__root.tsx` (mount host next to `NotificationHost`, participant routes only)

**Interfaces — Consumes:** `useMeetups`, `useStore` (`users`, `connections` for names/avatars/reason via `scoreMatch` when `me`), `Avatar`, `playConnext`, `unlockAudio`. **Produces:**
- `selectVisibleCard(input: { incoming: Meetup[]; acceptedForMe: Meetup[]; dialogOpen: boolean }): { kind: "invite" | "accepted"; meetup: Meetup; moreCount: number } | null` — `null` while `dialogOpen`; invites before accepted; `moreCount` = remaining items
- `notifyInvite()` / `notifyAccepted()` — `playConnext({ speak: false })` wrapped in try/catch (sound respects `isSoundOn`)
- Card copy: invite "{ชื่อ} อยากเจอคุณตอนนี้" + reason line + buttons "ตกลง เจอกันเลย" / "ไว้ทีหลัง"; accepted "{ชื่อ} พร้อมเจอแล้ว!" + "เริ่มหากัน" / "ไว้ทีหลัง"; expired accept → inline "คำชวนนี้หมดเวลาแล้ว"; failure → "ตอบไม่สำเร็จ ลองอีกครั้ง"; more → "อีก N คำชวน"
- `dialogOpen` = any element `[role="dialog"][aria-modal="true"]` present (MutationObserver) or find mode open

- [ ] **Step 1: Failing tests** for `selectVisibleCard` (dialog open → null; ordering; moreCount) and that `notifyInvite` swallows a throwing `playConnext`.
- [ ] **Step 2: Run → FAIL** · **Step 3: Implement** — fixed top card under the safe area (`top: max(12px, env(safe-area-inset-top))`, z below dialogs/celebration), `role="region" aria-live="polite" aria-label="คำชวนเจอ"`, no focus stealing; chime once per newly seen meetup id; `unlockAudio` on first pointerdown anywhere (once).
- [ ] **Step 4: Run → PASS**; dev check with `?meetsim` in two tabs (tab A `?meetsim&pair=a1,b2&as=a1`, tab B `?meetsim&pair=a1,b2&as=b2` — see `resolveMeId` in Task 5) at 375px: card appears in B within 1 s of A inviting; 20px scan clean.
- [ ] **Step 5: Commit** — `feat: meetup invitation cards`

---

### Task 7: Find mode

**Files:** Create `src/components/find-mode.tsx`, `src/lib/find-mode-state.ts`, Test `src/lib/find-mode-state.test.ts`; Modify `src/meadow.css` (pulse keyframes)

**Interfaces — Consumes:** `useMeetups().findSession/closeFind/finish`, `getMeetupTransport().joinSignal`, `pairBadge`, `PairSymbol`, `COLOR_TH`, `SYMBOL_TH`, `tryPing`, `Avatar`. **Produces:**
- `channelBanner(state: ChannelState): string | null` — `"lost"` → "สัญญาณขาดหาย กำลังต่อใหม่…", else null
- `FindMode()` rendered by `MeetupProvider` when `findSession` is set: Radix-style modal dialog (focus trap, Esc = "ออก", restores focus), background = badge `bg`, white `PairSymbol` ≈ 40vw, partner Avatar + name (`text-title`), instruction "ชูมือถือขึ้น มองหาจอ{COLOR_TH}กับรูป{SYMBOL_TH}", buttons "ส่งสัญญาณ" (disabled visually via aria-disabled during 2 s gap) · "เจอกันแล้ว!" (→ `finish`, navigate `/connection/$id`) · "ออก" (→ `closeFind`); on received ping → strong pulse ×2 + `playConnext({ speak: false })`; expiry while open → close + toast "หมดเวลาหากันแล้ว ชวนใหม่ได้จากหน้าคู่"; Wake Lock request on open / release on close (ignore errors).
- CSS: `.meadow-find-pulse` 1 s ease-in-out infinite brightness pulse; `.meadow-find-strong` 2 × 350 ms; both disabled under `prefers-reduced-motion` and `html[data-lowspec]` (use a 4px white outline for 600 ms instead).

- [ ] **Step 1: Failing tests** — `channelBanner` mapping; a helper `pulsesPerSecond(animationMs: number, repeats: number)` (or assert constants) proving ≤ 3 Hz.
- [ ] **Step 2: Run → FAIL** · **Step 3: Implement** · **Step 4: Run → PASS**
- [ ] **Step 5: Dev check (`?meetsim`, two tabs, 375px):** accept → both tabs show the same colour+symbol; ping from A pulses B; reduced motion (CSSOM-forced) shows steady colour; Esc exits; 20px scan clean.
- [ ] **Step 6: Commit** — `feat: find-each-other mode with pair colour and ping`

---

### Task 8: Entry points

**Files:** Modify `src/components/discover-deck.tsx`, `src/routes/index.tsx`, `src/routes/people.$id.tsx`, `src/routes/marketplace.tsx` (use `useConnectAndInvite` instead of `store.connect`), `src/components/match-celebration.tsx` (optional prop `inviteNote?: string` rendered under the reason, `text-body`), `src/routes/commitments.tsx` (row button), `src/routes/connection.$id.tsx` (button)

**Interfaces — Consumes:** `useConnectAndInvite`, `useMeetups().invite/canInviteFor/openFind`.

- [ ] **Step 1: Replace connect calls** with `useConnectAndInvite()` (same `ConnectResult` handling as today); pass `inviteNote="ส่งคำชวนเจอแล้ว รอ {ชื่อ} ตอบ"` to `MatchCelebration` when a new connection was created.
- [ ] **Step 2: "ชวนเจอกันตอนนี้" buttons** (`meadow-btn-secondary`, ≥ 48px, aria-label includes the partner name) on each connection row in `/commitments` and on `/connection/$id`; shown when `canInviteFor(connectionId)`; when an accepted active meetup exists, show "เริ่มหากัน" (→ `openFind`) instead; result toasts: sent → "ส่งคำชวนเจอแล้ว", existing → "มีคำชวนที่รออยู่แล้ว", failed → "ยังส่งคำชวนเจอไม่สำเร็จ กดชวนใหม่ได้".
- [ ] **Step 3: Gates** + dev check with `?meetsim` (connect via deck in tab A → card in tab B; re-invite from `/commitments`).
- [ ] **Step 4: Commit** — `feat: meetup entry points`

---

### Task 9: QA

**Files:** fixes only, as needed

- [ ] **Step 1:** Full `?meetsim` two-tab flow at 375×812: connect → invite card → "ไว้ทีหลัง" (A gets nothing) → re-invite → accept → find mode both → ping both ways → "เจอกันแล้ว!" → `/connection/$id`; expiry (shorten TTL locally via the local transport's clock injection, not code changes); simultaneous invite from both tabs → one meetup, second sees "มีคำชวนที่รออยู่แล้ว".
- [ ] **Step 2:** `scripts/qa/font-scan.js` on card + find mode (0 small/clipped); reduced motion; keyboard path (Tab/Enter/Esc); `/admin` shows no card host.
- [ ] **Step 3:** Gates: `npx vitest run`, `npx tsc --noEmit -p .`, eslint changed files, `npx vite build`.
- [ ] **Step 4:** Commit fixes — `chore: meetup ping QA fixes`. Report the owner's pre-merge checklist: review/apply migration via Lovable preview, test with two real phones (iPhone + Android).
