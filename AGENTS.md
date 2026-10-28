<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Homepage scroll reveals use the browser-only `useScrollReveal` hook and CSS opacity/transform animations; keep content visible without JavaScript and bypass motion for reduced-motion/low-spec users to preserve accessibility and scrolling performance.
- Initialize the homepage orbit scene independently of the scroll timeline, within a viewport-sized visual; keep the fallback visible until the first successful frame to avoid a sequential loading delay.
- Public app pages share `SpaceNav` and the editorial `AppShell`; site-wide visual tokens and surface rules live in `src/styles.css`, while interactive decks, maps, forms, data and authorization retain their existing domain behavior.
- Participant pages use the `html.meadow` theme (tokens in `src/meadow.css`). `/admin` uses `html.meadow.meadow-work`: the same light theme with work density (16px minimum text, 17px body, 44px controls), admin styles in `src/styles/admin-pages.css` and motion in `src/styles/admin-motion.css`. `/print`, `/journey` and `/brand-preview` stay outside the theme (`src/lib/theme.ts`). Meetup UI (invite cards, find mode, meetup network requests) is participant-only and guarded by `isParticipantRoute()` in `src/lib/theme.ts`, so it never runs on `/admin`.
- Focused onboarding, authentication, chat and profile flows keep their dedicated navigation with shared editorial styling; print sheets use scoped light paper tokens so QR codes remain readable independently of the site theme.
- Individual project pages use an unnested `/projects_/$id` route with a public server read and Query loader; contacts are opt-in project fields, never inferred from account data, to support direct sharing without exposing private identities.
- Notification relative timestamps use a browser clock with periodic, focus and visibility refreshes; clean up listeners on unmount so idle pages do not retain timers.
- The homepage generates a fresh browser-only random seed on each mount and passes it to `buildDeck`; keep the seed stable during interaction to avoid jumping cards, while preserving the participant top-30 match cut and match details.
- Google admin grants are claimed only from verified Google identities into protected user_roles; signed admin sessions must revalidate the bearer and role on every privileged request. Legacy password superadmin sessions are rejected to prevent bypassing the account transfer.
- Admin login results are persisted server-side in admin_login_history before granting access; only owner/superadmin can read history and clients cannot modify or delete audit rows.
