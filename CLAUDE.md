# Chair Buddy — Claude project context

This file is read automatically by Claude Code at the start of every session. It contains everything a fresh Claude (or a fresh you) needs to work on this project successfully.

---

## What this is

**Chair Buddy** is a touch-first iPad PWA used live by basketball scoretable chairpersons to log game events under FIBA rules. It is **not a scoreboard** — it's an event logger that produces a clean record at the end of the game.

- **User**: Jeff Richardson — Adelaide-based, basketball scoretable chair, technical, prefers milestone-by-milestone collaboration.
- **Live URL**: https://app.chairbuddy.com.au
- **GitHub**: https://github.com/richo1968/chair-buddy
- **Hosting**: Cloudflare Workers (static assets), auto-deploys on push to `main`
- **Domain**: `chairbuddy.com.au` (Cloudflare zone, auto-managed by `wrangler.toml`)

---

## Run / build / deploy

```bash
# Local dev
cd /Users/jeffrichardson/Documents/Claude/chairbuddy
npm run dev          # Vite dev server

# Production build
npm run build        # tsc -b && vite build → dist/

# Deploy
git push             # Cloudflare auto-builds and deploys to app.chairbuddy.com.au
```

If `node_modules` is missing on a fresh machine, run `npm install` — it'll write into the existing `node_modules.nosync` directory via the symlink (or create a fresh one if neither exists; in that case re-apply the `.nosync` trick after install).

`.env` is in the project root and contains the Supabase publishable key (designed to be public). `.env.example` documents what's required.

---

## Stack

- **Vite 5 + React 18 + TypeScript**
- **TailwindCSS** with HSL CSS variables for theming (dark mode default, light optional)
- **lucide-react** icons
- **useReducer** for state (no Redux/Zustand) — see `src/state/gameReducer.ts`
- **Supabase** for auth (OTP email via Resend SMTP, 8-digit codes) and cloud storage (Postgres JSONB with RLS)
- **localStorage** for offline persistence + sync to cloud on auth
- **Cloudflare Workers** static assets (`[assets]` block in `wrangler.toml`) — replaces Pages
- **Manual service worker** at `public/sw.js` (vite-plugin-pwa was dropped, requires Node 20+)

---

## Folder layout

```
/Users/jeffrichardson/Documents/Claude/chairbuddy   ← project root (in iCloud)
├── src/
│   ├── components/
│   │   ├── auth/            LoginModal (OTP)
│   │   ├── game/
│   │   │   ├── modals/      Foul, Possession, QuarterScore, Timeout, Warning,
│   │   │   │                Players, TeamColours, EditEvent, EndGame,
│   │   │   │                Officials, GameDetails, Protest
│   │   │   ├── PlayerTile, TeamPanel, TeamEventLog, StaffChip,
│   │   │   ├── PossessionArrow, QuarterScoresTable, TimeoutTimer,
│   │   │   ├── WarningsGrid, GamePrintView (the PDF view)
│   │   ├── ui/              Modal, Button, ConfirmDialog
│   │   ├── GameClockInput   keypad-style MM:SS input with overwrite-on-first-keystroke
│   │   ├── ColourSwatchPicker, JerseyPreview
│   ├── screens/
│   │   ├── HomeScreen       game list, login button
│   │   ├── NewGameScreen    setup wizard
│   │   ├── GameScreen       main live-game UI (3-col layout)
│   │   ├── ReviewScreen     post-game summary + Save PDF button
│   ├── state/
│   │   ├── AppProvider, gameReducer, AuthProvider
│   ├── lib/
│   │   ├── game.ts          score, foul stats, timeout status, sort helpers
│   │   ├── events.ts        describeEvent, foul/warning/possession labels
│   │   ├── storage.ts       localStorage + migrateGame (forward-compat)
│   │   ├── cloudStorage.ts  Supabase CRUD + mergeLocalAndCloud
│   │   ├── export.ts        text export
│   │   ├── colours.ts       contrast-text computation
│   │   ├── supabase.ts      Supabase client (publishable key as fallback)
│   ├── hooks/               useTheme, useLongPress
│   ├── types.ts             ALL types — Game, Team, GameEvent variants, etc.
│   ├── index.css            Tailwind + @page print CSS
├── public/                  manifest.webmanifest, sw.js, icons
├── wrangler.toml            name=chair-buddy, [assets] block, custom_domain route
├── .env                     Supabase URL + publishable anon key
├── package.json
├── node_modules → node_modules.nosync   (symlink, .nosync excluded from iCloud)
└── .claude/worktrees → worktrees.nosync (symlink, .nosync excluded from iCloud)
```

---

## FIBA rules baked into the app

These shape the data model and reducer logic — don't break them without checking with Jeff:

- **Game clock is a countdown** 10:00 → 0:00 per quarter (12:00 max for OT? — currently 12:00 max in `isValidGameClock`).
- **Event log sort**: by quarter ascending, then game clock **descending** within quarter (because clock counts down).
- **Possession arrow** is stored as `(team Side, ArrowDirection 'left' | 'right')` — independent of bench layout. After Q2 the system prompts to flip the arrow because teams swap ends in Q3.
- **Team fouls**: 5+ in a quarter → BONUS (every personal foul awards 2 FTs). Tile shows amber "NEXT" at 4 fouls, red "BONUS" at 5+.
- **Player ejection**: 5 personal fouls, 2 T/U, or 1 DQ.
- **Coach ejection**: 2 coach techs OR 3 combined coach+bench techs.
- **OT gating**: only advance Q4 → OT1 (or OT_n → OT_{n+1}) if scores are level. If not tied, the game ends on commit.
- **Coach/bench techs do NOT count toward team fouls** — only player fouls do.
- **Halftime arrow flip** is logged as its own event with `halftimeFlip: true`.

---

## UX conventions (decisions we've made)

These have all been deliberately chosen — re-litigate only if Jeff asks.

### Clocks
- Event-logging modals default the clock to `game.lastGameClock` (NOT 00:00, NOT a fresh blank).
- `PossessionModal`: when reason is `quarter-start` (FIBA period throw-in), clock defaults to `10:00`. Switching reasons inside the modal re-syncs the clock.
- Reducer resets `lastGameClock` to `10:00` (`DEFAULT_CLOCK`) whenever the quarter advances.
- `GameClockInput` is in **overwrite mode** when first shown: dimmed text + accent border = "your first keystroke replaces this". Subsequent keystrokes shift in from the right (4-digit buffer).

### Player tile borders
- Normal: `border-2 border-border`
- 4 fouls (warning) or ejected: `border-4 border-danger ring-2 ring-inset ring-white` — the white inset ring is a separator so the red border reads against red jerseys.
- TU warning (1 T or U accumulated): `border-4 border-warn ring-2 ring-inset ring-white`.

### Coach names
- Three places to edit:
  1. New Game setup screen (during initial team configuration)
  2. Team header pencil button → opens `TeamColoursModal` (which has name + colours + coach names)
  3. **Manage Players** modal → "Coaching staff" section at the top
- The team header shows `Coach: <name>` or `+ Tap to add coach name` prompt to make it discoverable.

### Foul modal (`FoulModal`)
- Player fouls: Personal (full-width), then a row of P1 / P2 / P3 quick buttons (commits Personal + N free throws awarded), then Technical / Unsportsmanlike / Disqualifying buttons.
- Coach/bench: only "Technical" button (DOES NOT count toward team fouls).
- **Inline timeout buttons** at bottom of modal: left/right per bench layout. Tapping starts the 1-minute timer immediately AND queues the TimeoutModal to open after the foul is committed/cancelled (via deferral: `{timeoutSide && !foulTarget && <TimeoutModal />}`).

### Free throws
- `FreeThrows = { awarded: number }` — the made/attempted distinction is **gone**, scoretable chairs don't track FT made/missed.
- P1/P2/P3 buttons commit `freeThrows: { awarded: 1 | 2 | 3 }`.
- Display: `· 2 FT` (not `· FT 0/2`).
- Migration in `storage.ts:migrateEvent` converts old `{ attempted, made }` saves to `{ awarded: attempted }`.

### Save PDF
- ReviewScreen has a "Save PDF" button → calls `window.print()`.
- `GamePrintView` component renders a 3-page A4 portrait layout using **explicit hex colours** (NOT CSS variables) so the output is correct in dark or light mode.
- `print:hidden` / `hidden print:block` Tailwind variants swap the screen vs. print views.

---

## Cloudflare deployment specifics

- **Account**: JR Digital Services (`433ecc1bf44932a1e44b180c244d2ee0`)
- **Worker name**: `chair-buddy`
- **Custom domain**: `app.chairbuddy.com.au` configured via `wrangler.toml` `[[routes]]` block with `custom_domain = true`. Cloudflare auto-creates the proxied DNS record + SSL cert on each deploy.
- **Auto-deploy**: GitHub push → Cloudflare Workers Builds → live in ~30–60s.
- **`wrangler.toml`** uses the `[assets]` block (Workers static assets, replaces Pages):
  ```toml
  name = "chair-buddy"
  compatibility_date = "2024-12-01"
  [assets]
  directory = "./dist"
  not_found_handling = "single-page-application"
  [[routes]]
  pattern = "app.chairbuddy.com.au"
  custom_domain = true
  ```

---

## Supabase auth + cloud sync

- **Auth flow**: OTP email (8-digit code via Resend SMTP). Magic link is also sent but user is told to ignore it on iPad (opens Safari outside PWA).
- **Site URL** in Supabase dashboard: `https://app.chairbuddy.com.au`
- **Redirect URLs** must include `https://app.chairbuddy.com.au/**`
- **Code length**: configurable in Supabase. App's verify input accepts 4–12 digits. UI wording is neutral ("Enter the code from the email") so it stays correct if length changes.
- **Schema**: single `games` table, JSONB body, `user_id` column with RLS so users only see their own.
- **Schema migration**: `migrateGame()` in `storage.ts` (exported, applied at BOTH localStorage load AND `loadGamesFromCloud`). Critical — older saved games can lack newer fields like `outcome`, and missing them crashes the renderer.

---

## State model essentials

`Game` shape (see `src/types.ts` for full):
- `id, date, division, competition?, venue?, tipTime?, officials?`
- `teamA, teamB: Team` — each with `name, jerseyColour, numberColour, players[], captainId?, coachName?, assistantCoachName?`
- `currentQuarter: 'Q1'|'Q2'|'Q3'|'Q4'|'OT1'|'OT2'|...`
- `possessionArrow: Side | null` + `arrowDirection: 'left'|'right'|null` — both null pre-game
- `layout: 'A-left' | 'A-right'` — bench layout, swappable mid-game
- `outcome: { kind: 'live' | 'final' | 'forfeit' | 'default'; winner?: Side }`
- `finished: boolean` — derived legacy field, kept for backward compat
- `lastGameClock: string` — used as default for next event modal
- `events: GameEvent[]` — discriminated union (`foul | warning | possessionChange | quarterScoreRecorded | timeout | protest`)
- `quarterScores: QuarterScore[]`

`GameEvent` is a discriminated union — see `eventBelongsToTeam` in `lib/game.ts` for how events attach to a side for the per-team event log.

---

## Things we've changed (chronological highlights)

A condensed log of decisions in case the rationale is needed:

1. **Renamed app** Scoretable → Chair Buddy across HomeScreen, browser title, PWA manifest, export header.
2. **Free throws simplified** to `{ awarded }` only — chairs don't track made/missed.
3. **Save PDF** added via `window.print()` + `GamePrintView` (no library dependency).
4. **Custom domain** `app.chairbuddy.com.au` attached via `wrangler.toml` (no manual DNS work needed).
5. **Login wording** moved from "6-digit code" to "Enter the code" — Supabase OTP is 8 digits.
6. **Coach name discoverability**: pencil icon on team header, "+ Tap to add coach name" prompt, plus new Coaching Staff section in Manage Players modal.
7. **Inline timeout buttons** in the foul modal — start timer immediately, queue the TimeoutModal for after foul commits.
8. **Player tile alert borders**: white inset ring added so red border reads against red jerseys.
9. **Smart clock defaults**: `lastGameClock` for most modals, `10:00` for `quarter-start` possession; reducer resets `lastGameClock` to 10:00 on every quarter advance.
10. **GameClockInput overwrite mode**: first keystroke replaces the pre-fill (no need to backspace away the default).
11. **Captain badge** wired up in the in-game player tile (was implemented but not passed `isCaptain` from `TeamPanel`).
12. **Team-foul bonus indicator**: amber "NEXT" at 4, red "BONUS" at 5+ (was just amber for both).
13. **Project moved** to iCloud-backed `/Users/jeffrichardson/Documents/Claude/chairbuddy` with `.nosync` trick on `node_modules` and `.claude/worktrees`.

---

## Working preferences (Jeff)

- Prefers **milestone-by-milestone** collaboration. Land a thing, push, verify, move on.
- Wants speed and reliability over polish — this is used live during games.
- Default touch-target size: 60px+. Modals are the standard event-entry pattern (not inline forms) — confirmed preference for muscle-memory consistency.
- Commits use Co-Authored-By trailer:
  ```
  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  ```
- Don't add emojis unless asked.
- Don't write extra docs/READMEs unless asked.
- Always run `npm run build` before committing UI changes — TypeScript errors are not silent.

---

## Gotchas / non-obvious things

- **Service worker** is hand-rolled in `public/sw.js`. If you change anything cached, bump `CACHE` constant or users get stale assets.
- **Cloudflare deploy** picks up `wrangler.toml` changes on every push. To add another route or env, edit `wrangler.toml` and push.
- **Migration tests**: `migrateGame` must handle ALL legacy shapes — when adding a new field to `Game`, write a migration path in `migrateEvent` / `migrateGame` and verify cloud-loaded older games still render.
- **iCloud + git**: occasionally iCloud touches `.git` mtimes. If git status acts weird, it's not a code bug. Worst case: `mv .git .git.nosync && ln -s .git.nosync .git`.
- **node_modules.nosync**: when running `npm install`, it writes into `node_modules.nosync` via the symlink. iCloud ignores `.nosync`. If the symlink ever breaks, recreate: `mv node_modules node_modules.nosync && ln -s node_modules.nosync node_modules`.
- **Active Claude session vs. moved folder**: this conversation started before the iCloud move, so the harness keeps writing this transcript to the OLD memory path key. After this session ends, run the cleanup commands at the bottom of the previous chat (delete the old stub and the old empty memory folder).
- **`.claude/settings.local.json`** is NOT in git (`.gitignore` excludes it) — keeps allowed commands per-machine.

---

## When in doubt

- Read `src/types.ts` first — the data model tells you everything.
- Then `src/state/gameReducer.ts` — that's the source of truth for state transitions.
- Then `src/screens/GameScreen.tsx` — the orchestrator that wires every modal.

Most of the codebase is small (~3MB of source). A fresh Claude can read the whole thing in a few `Read` calls.
