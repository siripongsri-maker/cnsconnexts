# Admin Meadow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-theme every `/admin` page from the dark "Mission control" space theme to the Meadow theme with a denser work layer, without changing any admin behaviour.

**Architecture:** `/admin` gets `html.meadow.meadow-work`. Meadow tokens give colour. A `meadow-work` layer in `src/meadow.css` resets the participant-side 20px/56px sizing to work density (16px minimum, 17px body, 44px controls). `src/styles/admin-pages.css` is rewritten onto meadow tokens. The sidebar, login and `/admin/live` get bespoke layouts. The other 15 pages get a class sweep. Participant-only systems (meetup) switch to a new `isParticipantRoute()` guard.

**Tech Stack:** TanStack Start, React 19, Tailwind v4 (`@theme` tokens), lucide-react, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-27-admin-meadow-design.md`

## Global Constraints

- **Branch:** `feature/admin-meadow` (cut from local `main` at aac386c, which includes meetup ping). Never push `main` without owner approval. No force-push (AGENTS.md / Lovable).
- **Behaviour is frozen:** no change to handlers, queries, permissions, role gating, confirm dialogs, export file names or routes. Diffs in `src/routes/admin*.tsx` touch only `className`, layout wrappers, copy and icons.
- **Sizes:** visible text ≥ 16px on every `/admin` page. Body 17px. Tables 16px. Headings 22–28px. Buttons, inputs and selects ≥ 44px tall. Table rows ≥ 48px. Contrast ≥ 4.5:1.
- **`/admin/live`:** stat numbers ≥ 64px, labels and feed text ≥ 28px. Fits 1920×1080 and 1280×720 with no scroll.
- **Colour:** existing meadow tokens and `BLOCK_TAG` (`src/lib/issue-colors.ts`) only. No new hex in admin CSS or TSX. Exception: QR modules stay black on white.
- **Status:** never shown by colour alone. Always pair it with a lucide icon or text.
- **Motion:** fades or short translates only. None under `prefers-reduced-motion` or `html[data-lowspec]`.
- **Copy:** Thai, warm and plain. No "mission" or "operations" language. Keep CSV, QR and Backup as is.
- **Untouched:** participant pages (`html.meadow` without `meadow-work`) and `/print`, `/journey`, `/brand-preview` must not change.
- **Testing data:** browse production data read-only. Never press import, delete, backup, restore or save-settings. Use local fixtures (never committed) to see those states.
- **After every task:**
  - Run `npx vitest run`, `npx tsc --noEmit -p .`, and eslint on changed files (0 non-prettier errors).
  - Never run `prettier --write` on files you didn't create.

## Review Focus

1. **Meetup systems leak into /admin.** Once admin carries the `meadow` class, the meetup provider network, the cards and find mode must stay off. Pinned in Task 1 (`isParticipantRoute` tests, plus a grep that no consumer still compares `themeClassFor`).
2. **Participant pages lose their 20px.** A `meadow-work` rule written without the `.meadow-work` qualifier would shrink participant text. Pinned in Task 1 and Task 8 (font-scan `min 20` on `/`, `/commitments`, `/update`).
3. **Portals in admin still get participant sizes.** Toasts, dialogs and selects render outside `.admin-experience`. Pinned in Task 1 (density layer keyed on `html.meadow-work`, not on a wrapper) and Task 7 (scan with a dialog open).
4. **Wide tables push the page sideways at 375px.** Pinned in Tasks 6 and 7 (`overflowX: false` per page at 375).
5. **QR codes become unscannable** if their colours are tokenised. Pinned in Task 7 (QR stays `#000` on `#fff`; scan the rendered QR with the browser's BarcodeDetector if available, otherwise check that the colours are computed).

---

### Task 1: Theme plumbing, participant guard, work density

**Files:**
- Modify: `src/lib/theme.ts`, `src/lib/theme.test.ts`
- Modify: `src/lib/meetup-context.tsx:108`, `src/components/meetup-card-host.tsx:57`, `src/components/find-mode.tsx:36`
- Modify: `src/meadow.css` (append `meadow-work` section)
- Modify: `scripts/qa/font-scan.js`


**Interfaces — Produces:**
- `themeClassFor(pathname: string): "meadow" | "meadow meadow-work" | undefined`
- `isParticipantRoute(pathname: string): boolean`: true exactly when `themeClassFor(pathname) === "meadow"`.
- `font-scan.js` reads `window.__FONT_SCAN_MIN ?? 20` as its minimum. Usage: set `window.__FONT_SCAN_MIN = 16` before pasting.

- [ ] **Step 1: Failing tests** in `src/lib/theme.test.ts`:
  - `themeClassFor("/admin")` and `themeClassFor("/admin/people")` → `"meadow meadow-work"`
  - `themeClassFor("/administrator")` → `"meadow"`
  - `/print`, `/print/a4`, `/journey`, `/brand-preview` → `undefined`
  - `isParticipantRoute("/")` → true
  - `isParticipantRoute("/admin/live")` → false
  - `isParticipantRoute("/print")` → false
- [ ] **Step 2: Run** `npx vitest run src/lib/theme.test.ts` → FAIL.
- [ ] **Step 3: Implement** both functions. Switch the three meetup consumers to `isParticipantRoute(pathname)`. In `meetup-context.tsx` the guard becomes `enabled = isParticipantRoute(pathname)`, and its header comment is updated to match.
- [ ] **Step 4: Density layer** in `src/meadow.css`, scoped on `html.meadow.meadow-work`:
  - Tokens: `--text-xs: 16px; --text-sm: 16px; --text-base: 17px; --text-lg: 19px; --text-body: 17px; --text-lead: 19px; --text-title: 24px; --text-display: 28px`, each with line-height 1.5.
  - Body: `font-size: 17px; line-height: 1.55`.
  - Inputs, selects and textareas: `font-size: 17px; min-height: 44px`.
  - Sonner toast text: 17px.
  - Every later rule that hard-codes 20px or 56px under `html.meadow` must be beaten by a `html.meadow.meadow-work` rule with equal or higher specificity placed after it. Grep `20px\|56px` in `meadow.css` and cover each one.
- [ ] **Step 5: font-scan option.** `const MIN_PX = window.__FONT_SCAN_MIN ?? 20;` and update the header comment.
- [ ] **Step 6: Run** the tests → PASS. Then `grep -rn "themeClassFor(pathname) ===\|themeClassFor(pathname) !==" src` must return nothing.
- [ ] **Step 7: Dev check** (`npx vite dev`, built-in browser):
  - `/admin` login at 1440: `<html>` has both classes and body computes 17px.
  - `/` still computes 20px, and font-scan with min 20 on `/` gives `small: []`.
  - On `/admin`, no request is made to the `meetups` table (check network requests).
- [ ] **Step 8: Commit** `feat: meadow work theme for admin and participant-route guard`

### Task 2: Admin stylesheet onto meadow tokens

**Files:** Modify `src/styles/admin-pages.css`, `src/styles/admin-motion.css`. Create `.superpowers/sdd/<plan>/baseline/` (git-ignored).

- [ ] **Step 1: Baseline screenshots** at 1440×900 and 375×812:
  - Every route in the admin nav (Task 3 lists them), the login screen, and `/print`.
  - Take them on the branch at the Task 1 commit. Admin is meadow-coloured at that point but not yet restyled; that is the "before" for layout. Also take a `main` worktree pass for the login and `/print` if the controller wants a true "before" (`git worktree add`, removed afterwards).
- [ ] **Step 2: Rewrite `admin-pages.css`:**
  - Every colour becomes a meadow token (`var(--sky-soft)`, `var(--card)`, `var(--ink)`, `var(--ink-soft)`, `var(--border)`, `var(--primary)`), or a `BLOCK_TAG`-matching CSS variable defined once at the top of the file from the meadow palette.
  - Dark gradients, glows, star fields and grid backdrops are removed.
  - `.admin-workspace`, `.admin-records`, `.card-soft` (admin scope), `.admin-section-meta`: white card, 1px `var(--border)`, `rounded-2xl` radius, no glow.
  - Wide tables: the container gets `overflow-x: auto`, and `thead th` gets `position: sticky; top: 0; background: var(--card)`.
- [ ] **Step 3: Trim `admin-motion.css`** to opacity/translate ≤ 8px, ≤ 200 ms, with `prefers-reduced-motion` and `html[data-lowspec]` giving `animation: none; transition: none`.
- [ ] **Step 4: Check.** `grep -nE "#[0-9a-fA-F]{3,8}\b|rgba?\(" src/styles/admin-pages.css` → only the documented palette block at the top, if any. Then compare 3 pages against the baseline (overview, people, logs) at 1440: layout unchanged, colours meadow.
- [ ] **Step 5: Commit** `style: admin stylesheet on meadow tokens`

### Task 3: Sidebar and admin shell

**Files:**
- Modify `src/routes/admin.tsx` (nav data, sidebar markup, `MissionVisual`/"Mission control" removal in the shell).
- Create `src/lib/admin-nav.ts` and `src/lib/admin-nav.test.ts`.

**Interfaces — Produces:**
- `ADMIN_NAV_GROUPS: { label: string; items: { to: string; label: string; icon: LucideIcon; exact?: boolean }[] }[]`
- Group labels, exactly: `ภาพรวม`, `ผู้คนและคู่`, `ข้อมูลและไฟล์`, `ระบบ`.
- Items, exactly as in spec §2:
  - ภาพรวม: `/admin` ภาพรวม (exact), `/admin/live` จอสด, `/admin/map` แผนที่
  - ผู้คนและคู่: `/admin/people` สมาชิก, `/admin/connections` คู่เชื่อม, `/admin/commitments` คำมั่น/ปฏิทิน, `/admin/ideas` ไอเดีย, `/admin/submissions` ผลงาน
  - ข้อมูลและไฟล์: `/admin/import` นำเข้า CSV, `/admin/export` ส่งออกข้อมูล, `/admin/qr` QR/ป้าย, `/admin/backups` สำรองข้อมูล, `/admin/backup-policy` นโยบายสำรอง
  - ระบบ: `/admin/logs` บันทึกการใช้งาน, `/admin/audit` ประวัติการแก้ไข, `/admin/costs` สรุปค่าใช้จ่าย, `/admin/settings` ตั้งค่า, `/journey` เส้นทางทุกหน้า
  - Icons are the ones the current list uses for each route.

- [ ] **Step 1: Failing tests:**
  - 4 groups with the exact labels.
  - The flattened `to` list equals the current admin.tsx list (18 routes, each once).
  - No label matches `/[A-Za-z]{4,}/` except `CSV`, `QR`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `admin-nav.ts`, and render the sidebar from it. Keep any role-based hiding exactly as admin.tsx does today: read it before replacing the list, and if items are filtered by role, keep that filter applied to `items`.
- [ ] **Step 4: Sidebar markup:**
  - White panel and logo.
  - A 4-segment colour bar using the สังคม/อยู่/ดี/มี พลัง block colours, `aria-hidden`.
  - Group headings as `<p>` at 16px, bold, `--ink-soft`.
  - The active item gets `aria-current="page"`, a 4px left bar in `var(--primary)`, and bold text.
  - Items ≥ 44px.
  - Keep the mobile open/close behaviour and the skip link.
- [ ] **Step 5: Run** → PASS. Dev check:
  - Keyboard Tab through the sidebar: focus is visible.
  - At 375, the menu opens and closes.
  - font-scan min 16 on `/admin` (logged-in shell; log in with the owner's existing credentials only if the owner is driving, otherwise check the shell markup via a local fixture route that is not committed): `small: []`.
- [ ] **Step 6: Commit** `feat: meadow admin sidebar with Thai groups`

### Task 4: Login screen

**Files:** Modify `src/routes/admin.tsx` (`AdminLogin` block, ~lines 230–335) and `src/styles/admin-pages.css` (`.admin-login*`).

- [ ] **Step 1: Layout.**
  - ≥ 1024px: two columns. The left one has `<MeadowScene />` (`src/components/meadow-scene.tsx`) with the `h1` "หลังบ้าน คนส. CoNnextS" and one line "ดูแลข้อมูลและผู้เข้าร่วมของงานสมัชชาสุขภาพครั้งที่ 19". The right one is the white form card.
  - < 1024px: one column, with the scene as a 160px band on top.
- [ ] **Step 2: Remove** `MissionVisual`, "Network operations / 01" and "Authorized access". The form card heading becomes "เข้าสู่ระบบผู้ดูแล".
- [ ] **Step 3: Form sizes:**
  - Labels `text-body`.
  - Inputs 44px+.
  - The error `<p role="alert">` uses `text-body` in `text-destructive`.
  - The submit button is 48px tall.
  - The "กลับหน้าแรก" link is ≥ 44px tall.
  - `admin-role-note` text is ≥ 16px.
- [ ] **Step 4: Logic untouched.** `git diff` of the `AdminLogin` handlers must be empty apart from JSX and class changes.
- [ ] **Step 5: Dev check** at 1440 and 375:
  - font-scan min 16: `small: []`, `overflowX: false`.
  - Submitting empty fields shows the existing validation (no network login attempt with fake credentials against production).
  - Reduced motion: the windmills are still.
- [ ] **Step 6: Commit** `feat: meadow admin login`

### Task 5: `/admin/live` projection screen

**Files:** Modify `src/routes/admin.live.tsx`. Possibly `src/styles/admin-pages.css` (`.admin-live*`).

- [ ] **Step 1: Layout.**
  - Full-viewport `<MeadowScene />` background.
  - A top row of 3 white stat cards: ผู้เข้าร่วม = `users.length`, คู่ที่เชื่อมแล้ว = `connections.length`, ความตั้งใจ = `commitments.length`. Use the current page's counts if it already computes them differently.
  - Each card has a block-colour top strip. The number is `font-size: clamp(64px, 7vw, 120px)`, and the label is ≥ 28px.
  - Below: the anonymous feed from the existing `buildFeed` as up to 5 white cards, text ≥ 28px.
  - `RotatingPrompt` sits at the bottom at ≥ 28px.
- [ ] **Step 2: No scroll.** The layout fits 1920×1080 and 1280×720 with no scroll (`document.documentElement.scrollHeight <= innerHeight`). Long feed text clamps to 2 lines.
- [ ] **Step 3: Privacy.** The feed stays anonymous. No new data fields are read.
- [ ] **Step 4: Dev check** at 1920×1080 and 1280×720:
  - No scroll.
  - font-scan min 28 on the feed and labels. Set `__FONT_SCAN_MIN = 28` and scope the review to `main`; report anything under 28 that is not decorative.
  - Reduced motion: the scene is still.
  - Screenshot both sizes.
- [ ] **Step 5: Commit** `feat: meadow live screen for projection`

### Task 6: Page sweep A (people and content)

**Files:** Modify `src/routes/admin.index.tsx`, `admin.people.tsx`, `admin.connections.tsx`, `admin.commitments.tsx`, `admin.ideas.tsx`, `admin.submissions.tsx`, `admin.map.tsx`.

- [ ] **Step 1: Baseline scan.** For each page at 1440 and 375, with `__FONT_SCAN_MIN = 16`, record the counts.
- [ ] **Step 2: Fix at the source:**
  - `text-xs`, `text-sm` and `text-[10–14px]` become `text-body`, or are dropped where the density layer already lifts them.
  - Dark utility colours (`bg-black/…`, `text-white/…` on cards, `bg-slate-9xx`) become meadow tokens.
  - Status chips get a block colour plus a lucide icon or text.
  - English kickers and labels become Thai.
  - Charts on the overview page use the block palette and keep their legend and labels.
- [ ] **Step 3: Re-scan** until `small: []`, `clipped: []` and `overflowX: false` on every page at both sizes, including opened states (dialogs, filters, the people editor). A screenshot of each page at 1440.
- [ ] **Step 4: Behaviour check.** In the per-file diff, only `className`, wrappers, copy and icons changed. List any exception with its reason.
- [ ] **Step 5: Commit** `style: meadow sweep for admin people and content pages`

### Task 7: Page sweep B (data and system)

**Files:** Modify `src/routes/admin.import.tsx`, `admin.export.tsx`, `admin.qr.tsx`, `admin.backups.tsx`, `admin.backup-policy.tsx`, `admin.logs.tsx`, `admin.audit.tsx`, `admin.costs.tsx`, `admin.settings.tsx`.

- [ ] **Steps 1–4:** as Task 6. Also:
  - The QR (`admin.qr.tsx`) keeps black modules on a white background. Confirm the computed colours, and decode the code with `BarcodeDetector` if the browser has it.
  - The logs chart uses the block palette with its legend.
  - Destructive and confirm flows keep their confirm step and button order. Inspect them visually with a local fixture or by opening the dialog without confirming.
  - Scan with one dialog open per page that has one.
- [ ] **Step 5: Commit** `style: meadow sweep for admin data and system pages`

### Task 8: QA, review and docs

**Files:** fixes only. Modify `AGENTS.md` (the admin line only).

- [ ] **Step 1: Every admin route** at 1440 and 375 with font-scan min 16: `small: []`, `clipped: []`, `overflowX: false`. Keyboard path through the sidebar, login and one table page. Reduced motion.
- [ ] **Step 2: Participant pages unchanged.**
  - `/`, `/commitments` and `/update` with min 20 give `small: []`.
  - Meetup cards and find mode never render on `/admin`, and no `meetups` request is made there.
  - `/print` matches `main` (temporary worktree, removed afterwards).
- [ ] **Step 3: /oil-ui review.** Run an independent visual review of login, overview and live (fresh reviewer, screenshots only). Fix Critical/Important findings, and record the score.
- [ ] **Step 4: AGENTS.md.** Update the bullet that describes admin or SpaceNav styling so it says admin uses `html.meadow.meadow-work` with tokens in `src/meadow.css` and `src/styles/admin-pages.css`. Don't touch other bullets.
- [ ] **Step 5: Gates.** `npx vitest run`, `npx tsc --noEmit -p .`, eslint on every file changed on the branch (0 non-prettier errors), `npx vite build`.
- [ ] **Step 6: Commit** `chore: admin meadow QA fixes`. Report the owner checklist: look at `/admin` and `/admin/live` on the projector before the event.
