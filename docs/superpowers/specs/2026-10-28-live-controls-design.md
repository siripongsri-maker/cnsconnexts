# Live screen: operator controls, view modes and bubble labels (design)

Status: draft for approval, 2026-10-28. Builds on the live map carousel and
the welcome layer (both on main).

## Why

The live screen works well, but the organiser needs to steer what the audience
sees from the operator's laptop, which is connected to the screen. Three things
are missing: speed control, focused views (by region and by issue), and a way to
switch between a moving view and a still view. The connected pairs' names are
also too small to read from the back of the hall.

## What it does

### 1. Operator control panel (laptop only)

- A separate page at `/live-control`, opened in its own window on the operator's
  laptop next to the screen. It is not shown on the big screen.
- It is only reachable for signed-in admins. (Admin auth is already server-side,
  so the control page reads the same admin session. See the admin-auth work on main.)
- Controls, each a large touch target sized for a laptop:
  - **Speed:** Slow / Normal / Fast (three steps, see section 2).
  - **View:** ทั้งประเทศ · ตามภาค (then pick one of the 4 regions).
  - **Issue filter:** All, or one policy issue from the existing `ISSUES` list.
  - **Motion:** Moving / Still.
  - **Bubble labels:** On / Off.
- Changes take effect on the big screen immediately. The control page sends a
  message on a `BroadcastChannel` named `kns-live-control`, which the big-screen
  page listens to. If the channel is unavailable (old browser), the control page
  falls back to `localStorage` events on key `kns-live-control`. Both are
  same-origin, so no server or database is involved.
- The big screen keeps its last settings in memory only. A reload resets it to
  the defaults (Normal speed, ทั้งประเทศ, All issues, Moving, Bubbles on).

### 2. Speed

- Speed scales every tour timing (camera, line draw, hold) by one factor:
  Slow = ×1.5, Normal = ×1, Fast = ×0.6.
- The welcome layer's timings (camera 2600 ms, hold 5000 ms) are NOT scaled.
  Arrivals must stay readable at any speed.

### 3. View modes

- **ตามภาค (by region):** the existing region tour, restricted to one region.
  - Loops the pairs inside that region continuously. When it reaches the end of
    the region's pairs, it starts again from the first pair (no overview in between).
  - Ends each loop with 1–2 cross-region pairs that involve this region (the
    existing cap of 2 per region), then loops again.
  - The region chip shows the region name; the bottom card shows pair details.
- **ทั้งประเทศ (whole country):** the map stays on the full country and never
  zooms. Up to **4 pairs run at the same time**, each drawing its line and then
  holding briefly before a new pair takes its slot. Pairs are chosen newest-first
  and rotated so every pair gets a turn over time. Cross-region and in-region
  pairs both count.
- **Issue filter:** applies to both modes. Only pairs whose shared-interest or
  policy issue matches the chosen issue are shown. The chosen issue is written
  on the chip. If no pair matches, the screen shows the empty-state text instead
  of a blank map.

### 4. Motion vs still

- **Moving:** the current behaviour (camera moves, lines draw, pins as now).
- **Still:** the map and the chosen view are drawn in full and do not move.
  Pairs are shown as lines and bubbles without camera moves or line-draw
  animation. The chip, the card and the welcome layer still work. Still mode is
  for when the operator wants a fixed picture to talk over.

### 5. Bubble labels for connected pairs

- Each connected pair gets a **bubble** at its midpoint: a rounded white bubble
  with the two names and the two province names. It is larger than the current
  labels, sized to be readable from the back of the hall (about 2× the current
  label size on screen).
- Bubbles appear with the line in Moving mode and at once in Still mode.
- When bubbles are off, the previous small labels are used, as now.

## Goals / non-goals / anti-goals

- **Goal:** the operator can change what the audience sees in one tap, from the laptop.
- **Goal:** bubbles are readable from far away.
- **Non-goal:** controls on the big screen itself. The operator uses the laptop only.
- **Non-goal:** saving the settings to the database or across reloads.
- **Anti-goal:** the control page must never be publicly reachable. Admin-only.
- **Anti-goal:** the big screen must never go blank while settings change. A
  change applies at the next step boundary.

## Constraints

- No new dependencies. No database or server changes. No new SQL.
- Keep the existing tour logic, welcome layer, and morning-light look.
- Respect `useMotionSettings()`: with reduced motion or low-spec, "Moving" behaves
  like "Still".
- Keep SSR deterministic; the control page reads admin session in the browser.

## Approaches considered

1. **Separate control page + BroadcastChannel (chosen).** The laptop window is
   independent, the big screen only listens. Simple and robust on one machine.
2. Buttons drawn on the big screen. Rejected: the operator is on a laptop, and
   buttons on the screen would be visible to the audience.
3. Keyboard shortcuts on the big screen. Rejected for now: they need the big
   screen window focused, and there is no visible help for the operator.

## Decided details (claude's calls, flagged for review)

- Speed factors ×1.5 / ×1 / ×0.6.
- At most 4 concurrent pairs in ทั้งประเทศ mode; each pair holds 3 s after its line draws.
- The issue filter matches on `policy_issues` of the pair's people (both people
  included; a pair matches if either person has the issue). This is a judgement call.
- Bubble text size about 2× the current label size.
- Settings are not persisted; a reload resets to defaults.

## Left to the builder

The exact layout of the control page, the visual style of bubbles (kept within the
morning-light look), how the concurrent-pair slots are scheduled, and the
`BroadcastChannel` message shape.
