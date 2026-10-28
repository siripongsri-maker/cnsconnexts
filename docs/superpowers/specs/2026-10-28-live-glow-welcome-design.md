# Live screen: Morning-light look + "just registered" welcome pin (design)

Status: approved by Siripong, 2026-10-28. The look was switched from A (night glow)
to B (morning light) after approval; the rest is unchanged. Follows
`2026-10-28-live-map-carousel-design.md` (already live).

## Why

The big screen (`/dashboard?present=1`) now tours the map calmly, but the
organiser wants it to feel grand all the time ("อลังการตลอดเวลา") through
imagery, light and colour, and wants the screen to react the moment someone
registers. Registration should immediately point at that person's province.
Today that is impossible for most people: the quick registration form asks for
a region only, which is why 52 of 102 participants have no province.

## What it does

### 1. Morning-light look for the whole big screen (mockup "B · แสงเช้าแบรนด์")

The organiser first chose "A · ราตรีเรืองแสง", then switched to B. B keeps the
brand's own colours, so the screen still looks like คนส.

- **Scope:** only the present-mode screen. The normal `/dashboard` page and
  every other page keep the existing meadow theme.
- **Background:** the warm paper colour `#fffdf8`, with four large soft colour
  blobs behind everything, blurred 70 px at 45% opacity and drifting slowly
  (about 30 s each way): purple `#b07ad6`, sky blue `#7cc4f2`, warm yellow
  `#ffd36b` and fresh green `#9bd47a`. There are no stars.
- **Map:** provinces are filled in brand colours. North is `#6a2c91`, Northeast
  `#f47b20`, Central and Bangkok `#1488d8`, South `#5da130`. They keep the existing
  opacity logic (active, dim and overview). Province borders are the paper colour.
- **Lines and dots:** no glow filter. Lines cycle through purple `#6a2c91`, blue
  `#1488d8`, orange `#f47b20`, green `#5da130`, teal `#129e8c` and yellow `#f2b21b`.
  Labels use the brand ink `#2b2878` with a paper halo, and place text is
  `#5d5a73`.
- **The rest of the screen:** cards and panels (the 4 number cards, the 4 bar
  panels, the map card and the pair or welcome card) become frosted white
  (`#ffffffcc`, 8 px backdrop blur) over the blobs. The page title and region titles
  use a purple-to-blue gradient (`#6a2c91` → `#1488d8`). The "สด" badge is brand
  purple `#6a2c91`. The number cards and bars keep their existing brand tones.
- **QR code:** stays black on a white tile so phones scan it reliably, with a
  soft purple-tinted shadow around the tile.
- **Motion stays calm:** only the blobs drift. The map tour's timings are unchanged.

### 2. "Just registered" welcome pin

- **Trigger:** a participant who was not in the data when the screen loaded
  appears in the data (via the existing realtime refresh). Seed and demo
  profiles never trigger it. People who were already there at load never
  trigger it, so reloading the screen does not replay everyone.
- **Interrupting the tour:** the screen pauses the tour at the next step
  boundary, or immediately if it is inside a hold.
- **The pin:**
  1. The camera eases (2600 ms) to the person's province, framed like a
     cross-step, with the other provinces dimmed.
  2. A pin in brand purple appears at their position: the dot grows in, then one slow
     halo expands and fades once.
  3. A welcome card shows "ยินดีต้อนรับ <ชื่อ>" with the province name.
  4. Hold for 5000 ms.
- **Where the pin lands:**
  - **Province chosen:** a position inside that province, using the same
    placement as the map (`buildPeopleNetwork` province positions).
  - **Region "ทั่วประเทศ" or no province:** the existing hub point in the Gulf,
    with the card reading "ทั่วประเทศ".
- **Several registrations arriving together:** everyone who arrived before the
  pin starts shares one welcome. The camera frames all their provinces, every
  pin appears at once, and the card lists up to 3 names plus "และอีก N คน".
  People who arrive during a welcome are queued for the next one.
- **Afterwards:** the tour resumes by replaying the step that was interrupted.
  The new person then appears in the normal tour once they have a pair; until
  then the tour does not draw them (unchanged rule).
- **Reduced motion or low-spec:** the camera cuts instead of easing. The pin
  appears without the halo. Holds are unchanged.

### 3. Required province in the quick registration form

- **Placement:** in step 1 of `QuickProfileForm`, after the region is chosen, a
  province picker appears and lists only the provinces of that region. This
  makes the list short, at most about 20, and quick to tap. It works like
  `ProfileForm`, which already filters with `PROVINCES_BY_REGION(region)`.
- **Validation:** step 1 is valid only with a name, a region, and a province.
  - **Region "Bangkok":** the province is set to "Bangkok Metropolis"
    automatically. Nothing to pick.
  - **Region "Nationwide" ("ทั่วประเทศ"):** no province is required, and it
    is stored as "". This is the "ทำงานหลายจังหวัด / ทั่วประเทศ" choice
    agreed with the organiser.
  - **Changing region** clears a province that no longer belongs to it.
- **Hint text** when blocked: "ใส่ชื่อ เลือกภาค และจังหวัดก่อนนะ".
- **A one-line nudge** under the picker: "จังหวัดของคุณจะขึ้นบนจอใหญ่ในงาน".
- **Saving:** `toProfileInput` writes the chosen province's English key, the same
  format `ProfileForm` stores, instead of `""`.
- **Existing participants** are not prompted. They can still add a province at `/update`.

## Goals / non-goals / anti-goals

- **Goal:** someone who registers on their phone sees their name pinned on the big screen within a few seconds.
- **Goal:** the screen reads as one coherent, bright and colourful scene that stays lively in a well-lit hall.
- **Non-goal:** changing the tour order or timings, or the light theme anywhere outside present mode.
- **Non-goal:** count-up animations, sounds, confetti or other new effects.
- **Anti-goal:** fast or flashy motion. There are no bounces, travelling dots or
  repeated ripples. The welcome halo plays once, slowly. This keeps the
  organiser's earlier "motion น้อยๆ" request.
- **Anti-goal:** an unscannable QR.
- **Anti-goal:** showing anything beyond name and province in the welcome. No
  organisation and no contact details.
- **Anti-goal:** a registration form that gets noticeably slower. One extra tap at most.

## Constraints

- Use only the data the screen already has. New registrations come from the
  existing store refresh, approach 1 below. Add no new realtime channel, no
  server or database changes, and no new dependencies.
- The respect for `useMotionSettings()` stays as built. With `lowSpec`, also
  freeze the drifting blobs and drop the backdrop blur for performance.
- The look must hold when the screen is rotated (present mode rotates its container).
- Keep the quick-profile unit tests in `src/lib/quick-profile.test.ts` green,
  updating them for the new province rule.

## Approaches considered (detecting new registrations)

1. **Diff the participant list the screen already receives.** (Chosen by the organiser.)
   The store refetches on every database change, debounced. The screen
   remembers the ids it has seen and queues new ones. There are no backend
   changes. The cost is about 1–3 s of delay from the existing debounce.
2. A dedicated realtime subscription to participant inserts. It is faster, but
   it adds a second channel next to the store's and needs a fresh check of
   read permissions for new rows. More ways to fail.
3. The registration flow signals the screen directly. This needs server work.
   Dropped as overkill.

For the look, a theme scoped to the present-mode container (CSS tokens and
classes under one wrapper class) was the only sensible choice. A separate
route would duplicate the screen.

## Decided details (claude's calls, flagged for review)

- **Visual source of truth:** the approved mockup is committed at
  `docs/superpowers/specs/assets/2026-10-28-live-looks-mockup.html`. Open it and
  pick the "B · แสงเช้าแบรนด์" tab. Its CSS rules prefixed `.t-dawn`, its
  `THEME.dawn` line colours and its `paintBg()` dawn branch (blob colours,
  positions and sizes) are the reference values. The app version should match them.
  It does not need to copy the mockup's structure.
- **Welcome hold** is 5000 ms, with at most 3 names per welcome.
- **Who gets a welcome:** only self-registrations, meaning a source of `qr`,
  `link`, `invite`, `direct` or `auth`. `demo` and `admin` (seed and bulk import)
  never trigger it.
- **Cap for big batches:** if a single refresh brings more than 10 new people at
  once (for example a reconnect after a network drop, or an import), the screen
  does not run a welcome for that batch. It marks them seen and moves on.
- **Baseline for "new":** the ids present when the store's first participants
  fetch completes, even if that list is empty. Anyone appearing after that is
  new. So on an empty database at the start of the event, the first registrants
  are welcomed. Ids are per screen session and are never persisted.
- **Interrupting:** a welcome cancels the current step at its next await, which
  may cut off a hold or a cross card. After the welcome, that whole step
  restarts from its beginning.
- **Works without a tour:** the welcome also runs when the tour is empty (the
  `LiveThailandMap` fallback today, fewer than one pair). Build the welcome as a
  layer that does not depend on the tour runner, or on the layout's
  connected-only nodes. It places the pin from the person's province through
  `buildPeopleNetwork` node positions, or at `HUB_POINT`, and owns its own
  camera move on the same SVG.
- **Card position:** the welcome card uses the cross-pair card's spot, at the
  bottom of the map card.

## Left to the builder

How the theme tokens are structured, and how the blobs are placed (use the
mockup's fixed positions, so the server and first render stay deterministic).
Also where the "seen ids" memory lives. It must be per screen session, not persisted.
