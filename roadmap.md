# Whole-site EnduroSat visual renewal

- [x] Inspect reference and shared page patterns.
- [x] Rebuild homepage composition and navigation to closely match the reference using Connexts content.
- [x] Apply the same editorial visual system across public pages and admin, without changing data or flows.
- [x] Verify homepage, map, marketplace, guide, menu, authenticated admin, reduced motion and small-screen layouts.
- [ ] Verify swipe interactions with the requesting user's profile — blocked: signed-in account has no uniquely accessible linked participant profile; no sample profile was created or another person's identity selected.

# Live dashboard: 90° rotation + Thailand map

- [x] Add 90° screen rotation to the big-screen (present) mode — auto on portrait screens, manual toggle + direction flip in the header.
- [x] Build `LiveThailandMap`: Thailand map on the live screen with real connection lines between matched people (plotted from province geometry).
- [x] Wire the map into the present-mode panel and verify via Playwright (landscape + rotated portrait).


# Projects board: seed data + discoverability

- [x] Add individual project pages with complete details, documents and optional public contacts.
- [x] Allow public contact entry on submission/admin forms and verify detail navigation with an existing project, direct reload, documents, image and missing-project state.

- [x] Applied the 11 คนส. project rows from the exhibition board (runs 1–4); database now holds 12 projects across runs 1–4.
- [x] Confirmed /projects lists all 12 under runs 1–4 (2/2/3/5) on desktop and phone.
- [x] Added "โปรเจกต์" (FolderOpen) as the 4th item in the bottom nav — verified it opens /projects directly and shows the active state, labels fit at 390/360px and drop to icons-only below 360px.
