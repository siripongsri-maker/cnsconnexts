# Live Morning-Light Look + Welcome Pin Implementation Plan

> Look changed from A (night glow) to B (morning light) on 2026-10-28 after approval; the spec and this plan are updated.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the big screen a morning-light look, pin new registrants on their province, and make province required in quick registration.

**Architecture:** The quick-profile change is self-contained. The welcome logic is a pure, tested module that detects arrivals and places pins. A scoped theme wrapper applies the morning-light look to the present-mode container only. The carousel gains a welcome layer that interrupts the tour runner and also works when the tour is empty.

**Tech Stack:** React 19, TypeScript, Tailwind/CSS, SVG, Vitest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-28-live-glow-welcome-design.md`. The visual reference is `docs/superpowers/specs/assets/2026-10-28-live-looks-mockup.html`, tab "B · แสงเช้าแบรนด์": its `.t-dawn` CSS, `THEME.dawn` colours and the `paintBg()` dawn branch.

## Global Constraints

- **Scope:** only the present-mode screen (`/dashboard?present=1`). Every other page keeps the meadow light theme.
- **Region fills:** North `#6a2c91`, Northeast `#f47b20`, Central and Bangkok `#1488d8`, South `#5da130`. Province borders `#fffdf8`.
- **Line colours:** `["#6a2c91","#1488d8","#f47b20","#5da130","#129e8c","#f2b21b"]`. No glow filter. Labels `#2b2878` with a paper halo; place text `#5d5a73`.
- **Background:** paper `#fffdf8` plus 4 blurred blobs (70 px blur, 45% opacity, drifting over about 30 s): purple `#b07ad6`, sky `#7cc4f2`, yellow `#ffd36b`, green `#9bd47a`. Positions and sizes from the mockup's dawn branch. No stars.
- **Surfaces:** cards and panels `#ffffffcc` with an 8 px backdrop blur. Page and region titles use a `#6a2c91` → `#1488d8` gradient. The "สด" badge is `#6a2c91`.
- **QR:** stays black on a white tile, with a soft purple-tinted shadow around it.
- **Welcome:** camera 2600 ms, hold 5000 ms, at most 3 names, then "และอีก N คน". Card text is "ยินดีต้อนรับ <ชื่อ>" plus the province's Thai name, or "ทั่วประเทศ" for the hub.
- **Welcome triggers:** only sources `qr | link | invite | direct | auth`. A refresh bringing more than 10 new people runs no welcome; mark them seen instead.
- **Baseline:** the ids present when `useStore().hydrated` first becomes true, even if the list is empty. Kept per screen session and never persisted.
- **Reduced motion or low-spec:** the camera cuts with no easing and there is no halo. With `lowSpec`, also freeze the blobs and drop the backdrop blur. Holds stay unchanged.
- **Calm motion:** no bounces, no travelling dots, no repeated ripples. One slow halo per welcome pin.
- **Quick form:** province is required unless the region is `Nationwide` (store `""`). Region `Bangkok` sets "Bangkok Metropolis" automatically. Hint text: "ใส่ชื่อ เลือกภาค และจังหวัดก่อนนะ". Nudge text: "จังหวัดของคุณจะขึ้นบนจอใหญ่ในงาน".

## Review Focus

- **The first data load fails** (offline boot): `hydrated` turns true with an empty list. When the data then arrives all at once, it must not welcome 100 people. This is covered by the >10 cap test in Task 2.
- **The same person arrives in two refreshes**, for example because a pending record is later confirmed. They must be welcomed once (Task 2 test).
- **A registrant whose province string doesn't resolve:** the pin goes to `HUB_POINT`, labelled "ทั่วประเทศ", without crashing (Task 2 test).
- **A welcome while the tour is empty:** the pin still shows (Task 4 browser check).
- **A user switches region after picking a province:** the province is cleared and step 1 becomes invalid again (Task 1 test).

---

### Task 1: Required province in quick registration

**Files:**
- Modify: `src/lib/quick-profile.ts`. Add `province: string` to `QuickDraft` and `EMPTY_QUICK_DRAFT`. In `quickStepValid` step 1, require a province unless the region is `Nationwide`. Update the step-1 `quickStepHint`. `toProfileInput` writes the province: "Bangkok Metropolis" for Bangkok, `""` for Nationwide, otherwise the draft's province.
- Modify: `src/components/quick-profile-form.tsx` step 1. After the region choices, add a province picker listing `PROVINCES_BY_REGION(region)` with their `th` names and `en` keys as values, using the same choice/select styling as the form. It is hidden for Bangkok and Nationwide. Show the nudge line. Changing region clears the province, and choosing Bangkok sets "Bangkok Metropolis".
- Test: `src/lib/quick-profile.test.ts`

**Interfaces:** Produces `QuickDraft.province: string` (an English province key or "").

- [ ] **Step 1: Write the failing tests**
  - Step 1 is invalid with name and region North but no province. It is valid once `province: "Nan"` is set.
  - With region `Nationwide` and no province, step 1 is valid.
  - With region `Bangkok`, step 1 is valid, and `toProfileInput(...).province === "Bangkok Metropolis"`.
  - `toProfileInput({...region:"South", province:"Songkhla"}).province === "Songkhla"`, and `toProfileInput({...region:"Nationwide"}).province === ""`.
  - `quickStepHint(1) === "ใส่ชื่อ เลือกภาค และจังหวัดก่อนนะ"`.
  - Update existing tests that built drafts without a province.
- [ ] **Step 2:** Run `npx vitest run src/lib/quick-profile.test.ts`. The new cases should fail.
- [ ] **Step 3:** Implement the `quick-profile.ts` changes, then the form UI. The form's region click handler must clear a province from another region and auto-set Bangkok.
- [ ] **Step 4:** Run `npx vitest run src/lib/quick-profile.test.ts`, then `npx vitest run`, `npx tsc --noEmit -p .`, and eslint on the touched files. All should pass.
- [ ] **Step 5: Commit** `feat(join): ถามจังหวัดในหน้าลงทะเบียนแบบเร็ว`

### Task 2: Welcome arrival tracker and pin placement (pure)

**Files:**
- Create: `src/lib/live-welcome.ts`
- Test: `src/lib/live-welcome.test.ts`

**Interfaces:**
- Consumes: `NetworkPerson` and `buildPeopleNetwork` from `src/lib/people-network.ts`, `HUB_POINT` from `src/lib/live-map-layout.ts`, and `PROVINCES` from `src/lib/thailand-geo.ts`.
- Produces:
  - `const WELCOME_SOURCES: ReadonlySet<string>`, containing qr, link, invite, direct and auth.
  - `const WELCOME_BATCH_CAP = 10`
  - `type ArrivalResult = { seen: Set<string>; arrivals: NetworkPerson[] }`
  - `function trackArrivals(seen: Set<string> | null, users: readonly NetworkPerson[]): ArrivalResult`. With `seen === null` it sets the baseline: every current id is seen and there are no arrivals. Otherwise arrivals are users whose id is not in `seen` and whose source is in `WELCOME_SOURCES`, sorted by `created_at` then id. Every current id is added to the returned `seen`. If there are more than `WELCOME_BATCH_CAP` arrivals, it returns `arrivals: []`. It never mutates its input.
  - `type WelcomePin = { id: string; name: string; x: number; y: number; box: [number, number, number, number]; placeLabel: string; hub: boolean }`
  - `function placeWelcomePins(people: readonly NetworkPerson[], allUsers: readonly NetworkPerson[]): WelcomePin[]`. A resolvable province uses that person's node position from `buildPeopleNetwork(allUsers, [])`. The box is the province outline bbox, and `placeLabel` is the province's Thai name. Anything else goes to `HUB_POINT` with a box of ±30, `placeLabel` "ทั่วประเทศ" and `hub: true`.

- [ ] **Step 1: Write failing tests**
  - `baseline yields no arrivals`
  - `new self-registered user is an arrival`
  - `admin and demo sources never arrive`, which also checks they are still added to `seen`.
  - `more than 10 at once yields none but marks seen`: 11 new users give `arrivals.length === 0`, and the next call with the same users also gives 0.
  - `a user is welcomed once across refreshes`
  - `arrivals are ordered by created_at then id`
  - `pin sits inside the stated province`: `provinceAt(pin) ?.en === "Nan"` (`provinceAt` from people-network).
  - `unresolvable or empty province goes to the hub labelled ทั่วประเทศ`
  - `Bangkok alias resolves to Bangkok Metropolis`
- [ ] **Step 2:** Run `npx vitest run src/lib/live-welcome.test.ts`. It should fail because the module is missing.
- [ ] **Step 3:** Implement both functions.
- [ ] **Step 4:** Run the focused test and then the full suite, `tsc` and eslint on the new files. All should pass.
- [ ] **Step 5: Commit** `feat(live): detect new registrants and place welcome pins`

### Task 3: Morning-light look for the present screen

**Files:**
- Create: `src/styles/live-morning.css`. It holds every rule scoped under `.live-morning`: surfaces for cards, panels, bars, chip, badge and prompt; title gradients; the QR shadow; the blob keyframes; and the `@media (prefers-reduced-motion: reduce)` stop. Import it the way other `src/styles/*.css` files are imported. Check `src/styles.css`.
- Create: `src/components/live-morning-backdrop.tsx`, `export function LiveMorningBackdrop(): JSX.Element`. It is an absolutely positioned, `aria-hidden` layer with the 4 blobs at the mockup's fixed positions and sizes, so the server and first render are identical. With `lowSpec` the blobs do not animate.
- Modify: `src/routes/dashboard.tsx`, present branch only (the `<main>` around line 490). Add the `live-morning` class and render `<LiveMorningBackdrop />` as the first child, behind the content.
- Modify: `src/components/live-map-carousel.tsx`. When it is inside `.live-morning`, region fills and edge colours come from the Global Constraints values. Prefer CSS for fills (`[data-region]` selectors on province paths, adding the attribute if missing) and a palette constant for edges. Add no glow filter. Labels use `#2b2878` and place text `#5d5a73`.

**Interfaces:** Produces the `.live-morning` wrapper class and `LiveMorningBackdrop`. Task 4 uses the same carousel file.

- [ ] **Step 1:** Implement. Values come from the mockup's `.t-dawn` rules and the Global Constraints.
- [ ] **Step 2:** Run `npx tsc --noEmit -p .`, eslint on the touched and created files (dashboard.tsx has about 109 old prettier errors, so add none), `npx vitest run` and `npx vite build`. All should pass.
- [ ] **Step 3: Browser check** on a dev server you start (`npx vite dev --port 5175 --strictPort`), at `/dashboard?present=1`:
  - The paper background has soft colour blobs drifting behind the content.
  - Cards, bars and the header are frosted white.
  - The map uses the brand region colours.
  - The QR is on a white tile.
  - Text stays readable over the blobs.
  - Plain `/dashboard` looks the same as before.
  - Stop the server afterwards.
- [ ] **Step 4: Commit** `feat(live): morning-light look for the big screen`

### Task 4: Welcome layer on the big screen

**Files:**
- Modify: `src/components/live-map-carousel.tsx`

**Interfaces:**
- Consumes: `trackArrivals`, `placeWelcomePins`, `WelcomePin` (Task 2); `.live-morning` styling (Task 3); `useStore().hydrated`.
- Produces: no new exports.

- [ ] **Step 1: Implement.**
  - **Baseline:** keep `seen` in a ref. Call `trackArrivals(null, users)` the first time `hydrated` is true, and `trackArrivals(seen, users)` on every later users change. Append arrivals to a queue ref.
  - **Interrupting the tour:** the runner checks the queue at every await. If the queue is non-empty, it cancels the current step and runs `playWelcome(batch)`, where the batch is everyone queued at that moment. It then restarts the interrupted step from its beginning.
  - **`playWelcome`:**
    - Shading goes to dim.
    - The camera eases over 2600 ms to `fit(union of pin boxes, 0.3)`.
    - Pins render in brand purple `#6a2c91` with a white ring; the dot grows in over 600 ms, plus one halo expanding and fading over 1800 ms.
    - The card "ยินดีต้อนรับ <names>" shows up to 3 names plus "และอีก N คน", with each person's `placeLabel`, at the bottom of the map card.
    - Hold 5000 ms, then clear the pins.
  - **Empty tour:** when the tour is empty, render the carousel's own SVG map, with no `LiveThailandMap` fallback, so welcomes can still play. Keep the existing empty-state copy as text.
  - **Reduced motion or low-spec:** the camera cuts, the pin appears without the halo, and the hold is unchanged.
- [ ] **Step 2:** Run `npx tsc --noEmit -p .`, eslint on the file, `npx vitest run` and `npx vite build`. All should pass.
- [ ] **Step 3: Browser check** on a dev server (port 5175), at `/dashboard?present=1`. Simulate an arrival without writing to the database. In dev only, run a temporary console hook or local patch that appends a fake user with `source: "qr"` and province "Nan" to the users passed in. Do not commit that hook.
  - The tour pauses.
  - The camera moves to Nan.
  - The pin and the card "ยินดีต้อนรับ …" appear.
  - After about 5 s the tour resumes.
  - Repeat with no province. The pin should land in the Gulf with "ทั่วประเทศ".
  - Stop the server afterwards.
- [ ] **Step 4: Commit** `feat(live): welcome pin for new registrants on the big screen`
