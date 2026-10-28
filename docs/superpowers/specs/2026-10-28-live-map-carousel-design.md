# Live screen: region carousel map (design)

Status: approved by Siripong via the interactive mockup ("C · เคลื่อนไหวน้อย"), 2026-10-28.

## Why

The big-screen view (`/dashboard?present=1`) feels static. Data updates arrive in
realtime, but numbers and lines change silently, and the map shows only about a third
of the pairs: of 121 live connections, 79 had an endpoint without a province.

## What it does

Replace the map card on the big screen with a calm, auto-playing tour:

1. For each region in order (เหนือ → อีสาน → กลาง + กรุงเทพฯ → ใต้), the camera
   eases to that region. People in the region show their name and place, and the
   region's own pairs draw in one at a time.
2. Then, for up to 2 cross-region pairs that "belong" to this region, the camera
   eases out to frame both ends and the line draws across.
3. The tour ends with the whole country and every line, then loops.

Placement covers every pair:
- **Province known:** inside that province, using the existing `buildPeopleNetwork` positions.
- **Region only** (empty province): a small ring around the region's centre, labelled
  "ไม่ระบุจังหวัด · <ภาค>", drawn as a hollow dot so it reads differently.
- **Nationwide** (no region either): one shared hub point in the Gulf of Thailand, labelled "ทั่วประเทศ".

## Goals / non-goals / anti-goals

- Goal: every recorded pair appears in the loop or the overview; it feels alive at a glance.
- Goal: low motion. Slow eased camera (about 2.5 s), lines draw over about 2.4 s, no
  travelling dots, ripples or bouncing; holds long enough to read.
- Non-goal: changing the rest of the big screen (stats, QR, bar panels) or the regular `/dashboard` view.
- Anti-goal: anything that looks like a precise location. Positions stay "within the
  stated province or region", never an address.
- Anti-goal: showing the generated `match_reason` or score. `people-network.ts`
  deliberately shows only exact shared interests, and this keeps that rule.

## Constraints

- Reuse `thailand-geo` shapes and `buildPeopleNetwork` (it already excludes demo
  profiles and dedupes pairs). No new dependencies.
- Respect `useMotionSettings()`: with reduced motion or a low-spec device, cut
  between views without camera tweening or line drawing.
- Must work when the screen is rotated (the present mode already rotates its container)
  and must keep updating as realtime data arrives. The tour re-plans at the start of each loop.

## Approaches considered

1. **SVG viewBox camera in a new React component with requestAnimationFrame.** (Chosen.)
   This is the same SVG and geometry as the current map, and the same technique the
   mockup used. It needs no dependencies and works server-side for the static frame.
2. GSAP timeline (already a dependency) driving the viewBox. This gives nicer
   sequencing, but adds a second animation system to a component that only needs a
   few tweens. It is also harder to keep in sync with realtime re-planning.
3. A map library (Leaflet/MapLibre) or WebGL. This is overkill. It would bring tiles
   and an attribution UI, and it would drop the existing editorial style and geometry.

## Decided details (claude's calls, flagged for review)

- Per region: at most 6 newest in-region pairs drawn one by one. A cross-region pair is
  flown once, in the region of its first endpoint that has a region, newest 2 per region.
  Everything else still shows in the final overview.
- Captions live inside the map card: a region chip at the top-left and a pair card along
  the bottom (names, places, shared interests translated with `issueTh`). This keeps
  the existing big-screen layout and QR.
- Regions with no people or pairs are skipped. Bangkok merges into the Central slide.
- Pure, unit-tested modules hold the logic: the layout (positions for every person,
  paths for every pair) and the tour plan (ordered steps). The component only plays
  the plan.

## Left to the builder

The exact easing curves, label collision handling (keep it simple; small offsets), and
the hub coordinates (it must sit in the sea, near (385, 900) in the 1000×1600 viewBox).
