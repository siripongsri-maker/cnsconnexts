# Live Map Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the big-screen map with a calm region-by-region tour that places every recorded pair.

**Architecture:** Two pure modules decide what is drawn: the layout gives a position for every connected person and a path for every pair, and the tour gives the ordered steps. A React component plays the steps by easing the SVG viewBox. It reuses `thailand-geo` and `buildPeopleNetwork`.

**Tech Stack:** React 19, TypeScript, SVG, Vitest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-28-live-map-carousel-design.md`

## Global Constraints

- Timings for normal motion: camera 2600 ms, line draw 2400 ms, region hold 3000 ms, cross camera 2400 ms, cross hold 3200 ms, overview hold 8000 ms. Use no travelling dots, ripples or bounces.
- When `useMotionSettings()` reports `reducedMotion || lowSpec`, camera and line-draw durations are 0. The holds stay the same.
- Limits: 6 newest in-region pairs per region, 2 newest cross-region pairs flown per region.
- The tour order is north → northeast → central (Central + Bangkok) → south → overview.
- The hub point is `{ x: 385, y: 900 }`, labelled "ทั่วประเทศ". Region-only people are labelled `ไม่ระบุจังหวัด · ${REGION_LABEL[region]}`.
- Never display `match_reason` or `match_score`. Show only exact shared interests, via `issueTh`.

## Review Focus

- Realtime update mid-tour removes a person or pair: playback skips missing ids and doesn't throw (Task 3 guard + manual check).
- Screen rotated 90°: label and line sizes are computed from `svg.clientWidth/clientHeight`, not the rotated bounding rect (Task 3).
- Many region-only people in one region, for example 18 in Central: no two share identical coordinates (Task 1 test).
- Province given as a Thai name or the "Bangkok" alias resolves to the right group (Task 1 test).
- Empty or unknown `region` with no province goes to the hub, not a crash (Task 1 test).

---

### Task 1: Layout for every connected person

**Files:**
- Modify: `src/lib/people-network.ts`: export `pairPath(source: {x:number;y:number}, target: {x:number;y:number}, id: string): string`. This is the existing `edgePath` body taking points. Also export `provinceAt(point: {x:number;y:number}): ProvinceShape | null`, which uses the existing `inRing`.
- Create: `src/lib/live-map-layout.ts`
- Test: `src/lib/live-map-layout.test.ts`

**Interfaces:**
- Produces:
  - `type TourGroupKey = "north" | "northeast" | "central" | "south"`
  - `const HUB_POINT: { x: 385; y: 900 }`
  - `type LiveMapNode = { id: string; name: string; x: number; y: number; group: TourGroupKey | null; placeLabel: string; box: [number, number, number, number]; kind: "province" | "region" | "hub" }`. `box` is the province bbox, or ±30 around the point for region and hub.
  - `type LiveMapEdge = { id: string; sourceId: string; targetId: string; path: string; sharedInterests: string[]; createdAt: string }`
  - `type LiveMapLayout = { nodes: LiveMapNode[]; nodesById: Map<string, LiveMapNode>; edges: LiveMapEdge[] }`
  - `function buildLiveMapLayout(users: readonly NetworkPerson[], connections: readonly NetworkConnection[]): LiveMapLayout`
  - `function groupBox(group: TourGroupKey): [number, number, number, number]`, the union of province bboxes in that group.

- [ ] **Step 1: Write failing tests** in `live-map-layout.test.ts`:
  - `places every pair`: A (Chiang Mai), B (`province: ""`, `region: "South"`), C (`province: ""`, `region: "Nationwide"`), with connections A–B and B–C. Expect `edges.length === 2`, every `path` starts with `"M "`, and nodes exist for A, B and C.
  - `labels region-only and hub people`: `nodesById.get(B).placeLabel === "ไม่ระบุจังหวัด · ภาคใต้"`, `kind === "region"`, `group === "south"`. For C: `placeLabel === "ทั่วประเทศ"`, `kind === "hub"`, `group === null`, and `{x,y}` equals `HUB_POINT`.
  - `hub sits in the sea`: `provinceAt(HUB_POINT) === null`.
  - `no stacked region-only dots`: 18 Central region-only users, each connected to one Chiang Mai user. Expect 18 distinct `x,y` strings.
  - `aliases and Bangkok`: `province: "กรุงเทพฯ"` → `group === "central"`, `kind === "province"`.
  - `unknown region falls back to hub`: `province: ""`, `region: ""` → `kind === "hub"`.
  - `shared interests are the exact intersection`: A has `["Youth","Policy"]` and B has `["Policy"]`, so the edge's `sharedInterests` is `["Policy"]`.
- [ ] **Step 2:** Run `npx vitest run src/lib/live-map-layout.test.ts`. It should fail because the module is missing.
- [ ] **Step 3: Implement** `buildLiveMapLayout`. Start from `buildPeopleNetwork(users, connections).edges`, which already dedupes pairs and drops demo profiles. Province nodes come from `network.nodes`. Every other endpoint gets a region ring point, sorted by id per region, at radius `24 + 9 * Math.sqrt(i)` and angle `i * 2.399963` around the mean `cx,cy` of that region's provinces. If it has no usable region, it gets `HUB_POINT`. Paths use `pairPath`. `createdAt` is the edge's newest `connections[0].created_at ?? ""`. Group mapping is North→north, Northeast→northeast, Central/Bangkok→central, South→south.
- [ ] **Step 4:** Run the same test. It should pass, and `npx vitest run` should show all suites green.
- [ ] **Step 5: Commit** `feat(live): layout places every pair on the live map`

### Task 2: Tour plan

**Files:**
- Create: `src/lib/live-map-tour.ts`
- Test: `src/lib/live-map-tour.test.ts`

**Interfaces:**
- Consumes: `LiveMapLayout`, `TourGroupKey` (Task 1)
- Produces:
  - `const TOUR_ORDER: TourGroupKey[] = ["north", "northeast", "central", "south"]`
  - `const TOUR_LIMITS = { intraPerRegion: 6, crossPerRegion: 2 }`
  - `const GROUP_LABEL: Record<TourGroupKey, string>` = เหนือ "ภาคเหนือ", อีสาน "ภาคอีสาน", กลาง "ภาคกลางและกรุงเทพฯ", ใต้ "ภาคใต้"
  - `type TourStep = { kind: "region"; group: TourGroupKey; nodeIds: string[]; edgeIds: string[]; intraCount: number; crossCount: number } | { kind: "cross"; group: TourGroupKey; edgeId: string; fromId: string; toId: string } | { kind: "overview"; edgeIds: string[] }`
  - `function buildTour(layout: LiveMapLayout): TourStep[]`

- [ ] **Step 1: Write failing tests:**
  - `follows region order and skips empty regions`: people only in north and south. Step kinds and groups should be region:north, …, region:south, …, overview, with no northeast or central steps.
  - `caps in-region pairs at 6 newest`: 8 central pairs with increasing `created_at`. The central region step's `edgeIds` should equal the 6 newest ids, newest first, and `intraCount === 8`.
  - `flies a cross pair once`: one north–south pair produces exactly one cross step, in group north, with `fromId` being the north person.
  - `hub pairs fly from the region side`: a hub–south pair produces a cross step in group south, `fromId` is the south person and `toId` is the hub person.
  - `caps cross flights at 2 per region`: 3 north–south pairs produce 2 cross steps in north. The 3rd is not flown in south either, and `crossCount === 3` on north's region step.
  - `overview lists every edge`: `edgeIds` covers all layout edge ids.
  - `empty layout → []`.
- [ ] **Step 2:** Run `npx vitest run src/lib/live-map-tour.test.ts`. It should fail.
- [ ] **Step 3: Implement** `buildTour`. A pair's home group is the source's group, or the target's when the source is the hub. A pair is in-region when both ends have the same group. Sort newest first by `createdAt`, falling back to id.
- [ ] **Step 4:** Run the tests. They should pass.
- [ ] **Step 5: Commit** `feat(live): tour plan for region carousel`

### Task 3: Carousel component on the big screen

**Files:**
- Create: `src/components/live-map-carousel.tsx`
- Modify: `src/routes/dashboard.tsx:34,567`. Replace the `LiveThailandMap` import and usage with `LiveMapCarousel` and the same props. Keep `live-thailand-map.tsx`.

**Interfaces:**
- Consumes: `buildLiveMapLayout`, `groupBox`, `HUB_POINT` (Task 1); `buildTour`, `GROUP_LABEL` (Task 2); `useMotionSettings` from `@/lib/motion`; `issueTh` from `@/lib/i18n`
- Produces: `export function LiveMapCarousel(props: { users: User[]; connections: Connection[] }): JSX.Element`

- [ ] **Step 1: Implement the component.**
  - Province shading and fills come from `live-thailand-map.tsx` (`REGION_FILL`). Active groups get fill-opacity 0.38, others 0.07, and 0.22 in the overview.
  - Camera: ease the `viewBox` with requestAnimationFrame using easeInOutCubic. `fit(box, pad)` pads 0.14 for regions and 0.3 for cross, with a minimum size of 280.
  - Labels show the name at 17 px and the place at 12.5 px. Dots are 7 px. Line width is 5 px. These are on-screen sizes, divided by `min(svg.clientWidth / vb.w, svg.clientHeight / vb.h)`.
  - Lines draw with strokeDashoffset. Region-only dots are hollow, and the hub is filled ink.
  - The plan is read from a ref holding the latest `buildTour(layout)` at the start of each loop. Each step looks up ids, and skips them if missing.
  - The overlay has a top-left chip with `GROUP_LABEL` (or "ทั่วประเทศ") and `${intraCount} คู่ในภาค · ${crossCount} คู่ข้ามภาค`. On cross steps, a bottom card shows both names and `placeLabel`s plus `sharedInterests.map(issueTh).join(" · ")`.
  - With an empty tour, render the full map with the same empty-state copy `LiveThailandMap` uses.
  - Cancel the rAF loop and timers on unmount.
- [ ] **Step 2: Wire it** into `dashboard.tsx` as listed above.
- [ ] **Step 3: Verify.** Run `npx tsc --noEmit -p .`, `npx eslint src/components/live-map-carousel.tsx src/lib/live-map-*.ts src/routes/dashboard.tsx`, `npx vitest run` and `npx vite build`. All should pass.
- [ ] **Step 4: Check in the browser** at `/dashboard?present=1` on the dev server, which reads live data. Over 60 s, the chip text should advance through at least two regions, `#edges path` count should be > 0, and there should be no console errors. Then click "หมุนจอ" once: labels should stay readable and there should be no errors.
- [ ] **Step 5: Commit** `feat(live): calm region carousel map on the big screen`
