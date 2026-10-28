# Live Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the operator on a laptop steer the big live screen: speed, region-only view, whole-country view with 3–4 concurrent pairs, issue filter, still/moving mode, and larger pair bubbles.

**Architecture:** Pure modules hold the state, the timing scale, the issue filter, the country slot schedule and the message codec. A `/live-control` admin page posts state over a same-origin `BroadcastChannel` (with a `localStorage` fallback). The carousel reads that state as a prop, applies it at step boundaries, and draws bubbles.

**Tech Stack:** React 19, TypeScript, SVG, Vitest. No new dependencies, no SQL, no server changes.

**Spec:** `docs/superpowers/specs/2026-10-28-live-controls-design.md`

## Global Constraints

- Speed factors: slow = ×1.5, normal = ×1, fast = ×0.6. Scaled: camera, line draw, hold of the tour. NOT scaled: welcome camera 2600 ms, welcome hold 5000 ms.
- Region view: loops pairs inside the region; each loop ends with the cross pairs for that region (cap 2); no overview in between.
- Country view: map never zooms; at most 4 pairs run at once; each pair draws its line then holds 3 s before its slot is reused; pairs newest-first, rotated so every pair gets a turn.
- Issue filter applies to both views. A pair matches if either person's `interests` contains the chosen issue. If nothing matches, show the empty-state text, not a blank map.
- Still mode: no camera moves and no line-draw animation; pairs are drawn at once. With reduced motion or low-spec, "moving" behaves as "still".
- Bubbles: rounded white bubble at the pair midpoint with both names and both province names, about 2× the current label size on screen. Off = the existing small labels.
- Settings live in memory only. A reload resets to: speed normal, view country, issue none, moving, bubbles on.
- `/live-control` is admin-only (reuse the existing admin session gate). Not linked from any public page.
- Channel name `kns-live-control`. Fallback key `kns-live-control` in localStorage.
- Change applies at the next step boundary; the screen never goes blank.

## Review Focus

- Issue filter matches nothing: the screen shows the empty-state text (Task 2 test).
- `BroadcastChannel` unavailable: the control still reaches the screen through `localStorage` (Task 3 test).
- A malformed or unknown message on the channel is ignored and does not change the screen (Task 3 test).
- Country view with fewer than 4 pairs: runs with the pairs it has, no empty slots spinning (Task 2 test).
- Country view with zero pairs: shows the empty-state text, no crash (Task 4 browser check).
- Reload resets state to defaults (Task 4 test on the state hook/initial state).
- Welcome timings are unchanged at fast speed (Task 1 test).

---

### Task 1: Control state, speed scale and issue filter (pure)

**Files:**
- Create: `src/lib/live-controls.ts`
- Test: `src/lib/live-controls.test.ts`

**Interfaces:**
- Produces:
  - `type Speed = "slow" | "normal" | "fast"`
  - `type ViewMode = { kind: "country" } | { kind: "region"; group: TourGroupKey }` (import `TourGroupKey` from `src/lib/live-map-layout.ts`)
  - `type LiveControlState = { speed: Speed; view: ViewMode; issue: string | null; motion: "moving" | "still"; bubbles: boolean }`
  - `const DEFAULT_CONTROL_STATE: LiveControlState` = `{ speed: "normal", view: { kind: "country" }, issue: null, motion: "moving", bubbles: true }`
  - `const SPEED_FACTOR: Record<Speed, number>` = `{ slow: 1.5, normal: 1, fast: 0.6 }`
  - `function scaleTiming(ms: number, speed: Speed): number` = `Math.round(ms * SPEED_FACTOR[speed])`
  - `function edgeMatchesIssue(edge: { sourceId: string; targetId: string }, issuesById: ReadonlyMap<string, readonly string[]>, issue: string | null): boolean` — true when `issue` is null, or either endpoint's issues include `issue`.

- [ ] **Step 1: Write failing tests** in `src/lib/live-controls.test.ts`:
  - `default state is country, normal, no issue, moving, bubbles on` — assert `DEFAULT_CONTROL_STATE` deep-equals the literal above.
  - `scaleTiming: fast shortens and slow lengthens` — `scaleTiming(2400,"fast") === 1440`, `scaleTiming(2400,"slow") === 3600`, `scaleTiming(2400,"normal") === 2400`.
  - `edgeMatchesIssue: null matches everything`.
  - `edgeMatchesIssue: either endpoint matches` — issuesById maps `a: ["Youth"]`, `b: []`; edge a–b matches "Youth", not "Policy".
  - `edgeMatchesIssue: neither endpoint matches → false`.
- [ ] **Step 2:** Run `npx vitest run src/lib/live-controls.test.ts` — expect failure (module missing).
- [ ] **Step 3:** Implement the module exactly as the Produces list.
- [ ] **Step 4:** Run the focused test, then `npx vitest run`, `npx tsc --noEmit -p .`, eslint on the two files. All pass.
- [ ] **Step 5: Commit** `feat(live): control state, speed scale and issue filter` with `Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>`.

### Task 2: Country slot schedule (pure)

**Files:**
- Create: `src/lib/live-country-slots.ts`
- Test: `src/lib/live-country-slots.test.ts`

**Interfaces:**
- Consumes: `LiveMapEdge` (`id`, `createdAt`) from `src/lib/live-map-layout.ts`.
- Produces:
  - `const COUNTRY_SLOTS = 4`
  - `function orderCountryPairs(edges: readonly LiveMapEdge[]): LiveMapEdge[]` — sorted newest-first by `createdAt` desc, tie-break `id` asc.
  - `function countrySlotPlan(edges: readonly LiveMapEdge[], round: number): string[]` — returns up to `COUNTRY_SLOTS` edge ids for round `round` (0-based): take the ordered list, start at index `(round * COUNTRY_SLOTS) % n`, wrap around, take `min(COUNTRY_SLOTS, n)` distinct ids. Empty input → `[]`.

- [ ] **Step 1: Write failing tests:**
  - `empty edges → []`.
  - `fewer than 4 pairs → all of them, no duplicates` (3 pairs → 3 ids, distinct).
  - `at most 4 ids per round`.
  - `rotation covers every pair` — with 10 pairs, union of `countrySlotPlan(edges, r)` for r = 0..4 equals all 10 ids.
  - `newest first in round 0` — with created dates 1..10 (later date = newer), round 0 starts with the newest pair.
- [ ] **Step 2:** Run focused test — expect failure.
- [ ] **Step 3:** Implement the two functions as specified.
- [ ] **Step 4:** Focused test, full suite, tsc, eslint. Pass.
- [ ] **Step 5: Commit** `feat(live): country view slot schedule (up to 4 pairs)` with the Haiku attribution line.

### Task 3: Control message codec and channel adapter

**Files:**
- Create: `src/lib/live-control-channel.ts`
- Test: `src/lib/live-control-channel.test.ts`

**Interfaces:**
- Consumes: `LiveControlState`, `DEFAULT_CONTROL_STATE` (Task 1).
- Produces:
  - `const CONTROL_CHANNEL = "kns-live-control"`
  - `function encodeControl(state: LiveControlState): string` — JSON string.
  - `function decodeControl(raw: unknown): LiveControlState | null` — returns null for non-strings, bad JSON, or any field outside its allowed values (speed ∈ slow|normal|fast; view.kind ∈ country|region and region group ∈ north|northeast|central|south; issue null or string; motion ∈ moving|still; bubbles boolean). Missing fields fall back to the default for that field.
  - `function publishControl(state: LiveControlState): void` — posts to `BroadcastChannel` if available; always also writes `localStorage[CONTROL_CHANNEL] = encodeControl(state)` inside try/catch.
  - `function subscribeControl(onState: (s: LiveControlState) => void): () => void` — listens on `BroadcastChannel` if available AND on `window` `storage` events for key `CONTROL_CHANNEL`; decodes each message and calls `onState` only when decode is non-null; returns an unsubscribe that closes the channel and removes the listener. Guard every `window`/`localStorage` access with `typeof window !== "undefined"` and try/catch.

- [ ] **Step 1: Write failing tests:**
  - `round-trips a valid state` (`decodeControl(JSON.parse(encodeControl(s)))`… use the string form: `decodeControl(encodeControl(s))` deep-equals `s`).
  - `rejects non-string and bad JSON` → null for `42`, `"{"`.
  - `rejects out-of-range speed` → `decodeControl('{"speed":"warp"}')` is null.
  - `missing fields take defaults` → `decodeControl('{"speed":"fast"}')` equals `{...DEFAULT_CONTROL_STATE, speed:"fast"}`.
  - `subscribe ignores a malformed storage event`: simulate with `window.dispatchEvent(new StorageEvent("storage",{key:CONTROL_CHANNEL,newValue:"garbage"}))` (use jsdom/vitest environment as existing tests do; if the project's tests run in node, test `decodeControl` only and leave the listener to the browser check, and say so in the report).
  - `publish falls back to localStorage when BroadcastChannel is missing` — stub `globalThis.BroadcastChannel = undefined` and assert localStorage key written.
- [ ] **Step 2:** Run focused test — expect failure.
- [ ] **Step 3:** Implement the functions as specified.
- [ ] **Step 4:** Focused test, full suite, tsc, eslint. Pass.
- [ ] **Step 5: Commit** `feat(live): control message codec and channel adapter` with the Haiku attribution line.

### Task 4: Carousel reads control state, applies speed, still mode, filter, country view, bubbles

**Files:**
- Modify: `src/components/live-map-carousel.tsx` (the `TIMING` constant around line 74 and the `LiveMapCarousel` component starting around line 291)

**Interfaces:**
- Consumes: `LiveControlState`, `DEFAULT_CONTROL_STATE`, `scaleTiming`, `edgeMatchesIssue` (Task 1); `countrySlotPlan` (Task 2); `subscribeControl` (Task 3); `buildTour`, `TOUR_LIMITS` from `src/lib/live-map-tour.ts`; `groupBox`, `HUB_POINT` from `src/lib/live-map-layout.ts`.
- Produces: `LiveMapCarousel` gains an optional prop `control?: LiveControlState` (default `DEFAULT_CONTROL_STATE`). When `control` is not passed, the component subscribes to the channel itself via `subscribeControl` in an effect, so the dashboard needs no change beyond rendering it. Props are otherwise unchanged.

Implementation notes (the implementer decides the details inside these rules):
- Speed: every tour `TIMING` value used by the region tour and the cross/overview steps goes through `scaleTiming(value, speed)`. The welcome camera and welcome hold keep their unscaled values.
- Region view: build the tour from the layout as now, but keep only steps whose group equals `view.group` (region steps and cross steps where that group is the home group). Loop them; no overview step.
- Country view: no zoom (camera stays on `FULL_VIEWBOX`). On each round, `countrySlotPlan(edges, round)` gives the pair ids; draw them in parallel (each draws its line, holds 3 s, then the slot is free for the next round's pair). Keep the full-country shading (no region dim).
- Issue filter: applied to the edge list before either view, using `edgeMatchesIssue` and the people's `interests` (build `issuesById` from the unfiltered `allUsers`). If the filtered list is empty, render the empty-state text centred on the map card.
- Still mode: when `motion === "still"` or reduced motion or lowSpec: camera moves are skipped (set the view directly) and line draws are not animated (full path shown). The chip, cards and welcome layer still work.
- Bubbles: when `bubbles` is true, each drawn pair gets a rounded white bubble at the midpoint of its path (use the path's `getPointAtLength(getTotalLength()/2)` or the mid of source and target nodes) with both names and both province labels, font about 2× the existing label size on screen. When false, keep the existing small labels.
- Settings change: the new `control` value is read at the next step boundary (store it in a ref; the runner reads the ref when starting each step). Never clear the map during the change.

- [ ] **Step 1: Write the test for the pure part.** Put the decision of "which steps are in view" in a small exported pure function `regionViewSteps(steps: TourStep[], group: TourGroupKey): TourStep[]` in `src/lib/live-map-tour.ts`, with tests: keeps only steps whose group is `group`, drops overview steps, keeps cross steps whose home group is `group`. Run it, see it fail.
- [ ] **Step 2:** Implement `regionViewSteps`; focused test passes.
- [ ] **Step 3:** Implement the component changes listed above. Keep `TIMING` values unchanged; only the call sites scale them.
- [ ] **Step 4: Verify.** `npx vitest run`, `npx tsc --noEmit -p .`, eslint on the carousel and tour files, `npx vite build`. All pass. Browser check (dev server on port 5174 via preview tools; the launch config is in the session folder): `/dashboard?present=1` loads; the default country view shows at most 4 pairs moving at once; no console errors.
- [ ] **Step 5: Commit** `feat(live): carousel honours speed, region/country views, issue filter, still mode and bubbles` with the Haiku attribution line.

### Task 5: `/live-control` operator page

**Files:**
- Create: `src/routes/live-control.tsx` (TanStack route file, same pattern as other routes such as `src/routes/admin.tsx`)
- Modify: `src/routeTree.gen.ts` is regenerated by the build; do not hand-edit it.

**Interfaces:**
- Consumes: `LiveControlState`, `DEFAULT_CONTROL_STATE`, `ISSUES` (`src/lib/types.ts`), `REGION_LABEL` (`src/lib/i18n.ts`), `publishControl` (Task 3), the existing admin session gate (see `src/lib/admin-auth.ts` `useAdminAuth`).
- Produces: route `/live-control`.

Rules:
- Admin only: if not signed in, show the same login prompt the admin pages show (reuse `useAdminAuth`); do not render the controls.
- Controls, large touch targets: speed (ช้า/ปกติ/เร็ว); view (ทั้งประเทศ, or one of the four regions); issue (ทั้งหมด or one of `ISSUES`); motion (เคลื่อนไหว/นิ่ง); bubbles (ฟองชื่อ เปิด/ปิด).
- Every change calls `publishControl` with the whole new state. Keep the state in component state, starting from `DEFAULT_CONTROL_STATE`.
- Not linked from any public navigation.

- [ ] **Step 1: Test.** No component test (Ruling 2 applies). Verify through the browser check in Step 3.
- [ ] **Step 2:** Implement the route.
- [ ] **Step 3: Verify.** `npx vite build` regenerates the route tree; `npx tsc --noEmit -p .`; eslint on the new file. Browser check: open `/live-control` in one tab and `/dashboard?present=1` in another; change speed, view and issue on the control page and see the screen change at the next step boundary.
- [ ] **Step 4: Commit** `feat(live): operator control page for the live screen` with the Haiku attribution line.

## Final

- Run the full suite, `npx tsc --noEmit -p .`, `npx vite build`. Then the whole-branch review and finish with the user (merge or push decision is theirs).
