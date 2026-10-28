# Whole-site EnduroSat visual renewal

- [x] Inspect reference and shared page patterns.
- [x] Rebuild homepage composition and navigation to closely match the reference using Connexts content.
- [x] Apply the same editorial visual system across public pages and admin, without changing data or flows.
- [x] Verify homepage, map, marketplace, guide, menu, authenticated admin, reduced motion and small-screen layouts.
- [ ] Verify swipe interactions with the requesting user's profile — blocked: signed-in account has no uniquely accessible linked participant profile; no sample profile was created or another person's identity selected.

# Live dashboard: 90° rotation + Thailand map

- [x] Add 90° screen rotation to the big-screen (present) mode — auto on portrait screens, manual toggle + direction flip in the header.
- [x] Build `LiveThailandMap`: Thailand map on the live screen with real connection lines between matched people (plotted from province geometry).
- [ ] Wire the map into the present-mode panel and verify via Playwright (landscape + rotated portrait).
