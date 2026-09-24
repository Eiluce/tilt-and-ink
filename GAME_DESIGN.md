# Pinball Incremental — Game Design Specification

**Working title:** *Tilt & Ink* (placeholder — revisit later)
**Status:** v1 design spec, pre-implementation
**Platform:** Browser (desktop-first, keyboard + mouse)

---

## 1. Vision & Pillars

A single-player browser game where **real, actively-played pinball** is the entire scoring engine, and a **persistent upgrade tree** is the entire progression engine. There is no idle/offline earning — the player must be at the table to score — but every point ever scored banks permanently, making each session build directly on the last.

Visual and tonal direction borrows from **Cuphead**: 1930s rubber-hose cartoon linework, a sepia/cream base palette with bold spot colors, bouncy squash-and-stretch animation. This is an **art-style and tone influence only** — no characters, plot, or narrative are part of the design. Each table has a themed "centerpiece" target for personality, not a story beat.

**Pillars:**
1. **Skill scores, upgrades amplify.** Flipper timing and shot placement always matter; the tree makes a skilled turn hit harder, it never replaces skill.
2. **Nothing is ever lost.** No permadeath, no punishing resets, no pay-to-continue. Draining your balls ends a turn, not your progress.
3. **Every table stays alive.** Unlocking table 2 doesn't retire table 1 — all unlocked tables remain playable and feed the same economy.

---

## 2. Core Loop

```
┌─────────────────────────────────────────────────────────┐
│  Press Play → spawn a turn's worth of balls (upgradeable)│
│       ↓                                                   │
│  Actively play: flip, aim, build combos, spend charge     │
│  meter on active skills                                   │
│       ↓                                                   │
│  Last ball drains → turn ends, score banks as currency     │
│       ↓                                                   │
│  Spend banked currency on the Upgrade Tree (any time,      │
│  between or instead of turns)                              │
│       ↓                                                   │
│  Stronger flippers/bumpers/skills → next turn scores more  │
│       ↓  (repeat)                                          │
│  Lifetime score crosses a milestone → new table unlocks    │
│       ↓  (repeat across all tables, shared currency/tree)  │
│  Tree fully upgraded + all tables unlocked → Prestige       │
│  available                                                  │
└─────────────────────────────────────────────────────────┘
```

**Turn structure:**
- A turn starts with N balls (base 3, upgradeable via the tree).
- Balls in play behave like real pinball: gravity, flippers, bumpers, drains.
- The turn ends when the last ball drains. There is no other end condition (no timer, no tilt in v1).
- Starting a new turn is **always free** — it is the core mechanism for earning, not something currency gates.
- The table itself is **never reset**. Any upgrades purchased (stronger flippers, more bumper power, etc.) are visible and active immediately, including mid-session on the next ball.

---

## 3. Scoring & Currency

Two currencies, deliberately simple:

| Currency | Name | Earned by | Spent on | Resets? |
|---|---|---|---|---|
| Primary | **Tickets** | Every point scored during turns, across all unlocked tables | Upgrade Tree nodes | Never (except on Prestige) |
| Prestige | **Contracts** | Converting your Ticket total when you Prestige | A small, separate tier of global multiplier nodes | Never (this is the thing that persists Prestige-to-Prestige) |

- Tickets are a **single shared pool** across every unlocked table — a bumper hit on Table 3 and a bumper hit on Table 1 both pay into the same bank. This keeps balancing simple and every upgrade universally useful, per the "shared currency, unified tree" decision.
- In-turn scoring uses a **combo multiplier** that rises with consecutive successful shots (bumpers/targets/ramps in quick succession) and decays if the ball goes quiet — rewards active, connected play without needing a tilt-risk mechanic.

**Implemented scoring (`src/scoring.js`, all values in one place so upgrades can scale them):**

- **Base values in 10× tiers:** contact 10–50 (slings, spinner turn, pops, standups, lanes) · target 100–250 (drop target, UFO, kickout) · shot 500–750 (ramp, orbit, scoop) · feature 1,000–5,000 (drop bank, R·O·W, standup set, chapter × its number) · jackpot 10,000–50,000 (saucer jackpot, missions by tier, promotion × rank).
- **Combo ×1–×5:** each aimed shot (drop target, UFO, kickout, ramp, orbit, scoop) within 3 s of the previous one raises it; it falls back to ×1 after 3 quiet seconds. It multiplies everything scored live except mission and rank rewards. Bumpers and slings never raise it.
- **End-of-ball bonus:** shots and features also add to a bonus pool, paid when the ball drains times the bonus multiplier (×1–×5, raised by completing R·O·W, reset each ball), as on a real machine.
- **Tickets:** at the end of a turn its score banks as Tickets at 100 points = 1 Ticket, saved in localStorage with the best turn score.

---

## 4. The Table

### 4.1 Orientation & Viewport
- Classic **vertical/portrait pinball proportions**, rendered at fixed aspect ratio and scaled/letterboxed to fit the browser viewport.
- Upgrade Tree, currency totals, and active-skill bar live in **side/bottom HUD panels** outside the table viewport itself, so the play area is never obstructed.

### 4.2 Core Scoring Elements (4–6 types, present on every table in some themed form)

| Element | Behavior | Design role |
|---|---|---|
| **Flippers** | Player-controlled (bottom of table), primary skill input | Aiming, saves, skill shots |
| **Bumpers** | Passive, bounce the ball, fixed points per hit | Baseline passive scoring, satisfying feedback |
| **Spinners** | Free-spinning element, points per rotation while ball passes through | Rewards ball speed/momentum |
| **Drop Targets** (bank of 3–5) | Must be cleared in sequence; clearing the bank grants a bonus and resets | Combo/objective scoring, mid-skill shots |
| **Ramp / Orbit Lane** | Skill-shot lane; successful shot grants bonus + feeds the combo multiplier | High-skill, high-reward shot |
| **Centerpiece Target** ("boss target") | One signature, high-value target unique to each table's theme | Table identity, jackpot-style spike scoring |

### 4.3 Proposed v1 Tables (4 total, themed like Cuphead "worlds" without borrowing IP)

Unlocked in order via **lifetime cumulative Ticket** milestones:

1. **Rocket Row** *(starting table, revised from the original "Carnival Row" carnival concept)* — 1930s pulp-serial space voyage theme (Buck Rogers/Flash Gordon era, which pairs naturally with Cuphead's own period), starfield/nebula backdrop, planet-with-rings bumpers, a UFO centerpiece with a glassy cockpit dome and tractor beam, thruster-nozzle flippers, a satellite spinner, mini-rocket-pennant drop targets.
2. **The Devil's Lounge** — smoky nightclub/casino theme, roulette-wheel spinner, devil-mask centerpiece.
3. **Sugar Rush Bakery** — candy/pastry theme, gumball bumpers, giant-cake centerpiece.
4. **Boiler Room Big Band** — industrial jazz-band theme, brass-instrument ramps, steam-whistle centerpiece.

Each new table is a genuine new layout (not a reskin) so element placement/difficulty can escalate, but all four use the same 4–6 element vocabulary above for consistency.

### 4.4 Difficulty Scaling Across Tables

Beyond new layouts, each successive table should tune the physics itself to feel harder, not just look different — found during prototyping that ball fall speed (gravity) is a strong, cheap difficulty lever on its own:

- **Ball fall speed (gravity):** Carnival Row (table 1) uses a deliberately gentle, readable fall speed as a soft tutorial. Later tables raise it, demanding faster reaction/flipper timing.
- Other candidate per-table knobs (not yet tuned, just flagged so they're not lost): ball restitution/bounciness, flipper speed, element density/spacing. Keep these as *table-level constants*, not global, so each world can have its own feel.

---

## 5. Upgrade Tree

**Shape:** Branching tree with prerequisites — a handful of top-level branches, each with a short chain of nodes, occasionally converging on a capstone node.

**Branches (v1 proposal):**

- **Flipper Mastery** — flipper strength, flipper speed, wider flipper reach, capstone: "Perfect Flip" (brief auto-aim assist window on precise timing).
- **Bumper Power** — flat points-per-hit increases, chance for bonus "super bumper" pulses, capstone: bumpers occasionally chain bonus hits.
- **Combo & Multiplier** — higher combo cap, slower combo decay, bigger multiplier steps, capstone: multiplier no longer resets between turns' first shot.
- **Ball Control** — extra starting balls, ball-saver window at turn start, chance to save a drain, capstone: one guaranteed extra ball per turn.
- **Charge & Skills** — faster charge meter fill, cheaper skill activation cost, unlocks the active skills themselves (see §6), capstone: two skills chargeable simultaneously.

Branches are mostly independent (build variety: a "combo rusher" vs. a "tanky ball-control" playstyle), but each branch's capstone requires a minimum spend elsewhere in the tree, keeping the design "branching with prerequisites" rather than five isolated silos.

---

**Implemented (`src/upgrades.js`, applied by `applyUpgrades()` in `src/main.js`):** 21 upgrades, 1–3 levels each, opened with U or the panel button (the game pauses; purchases apply immediately). Capstones need every other upgrade in their branch at level 1+ and 3,000 Tickets spent in other branches. Total cost ~40,000 Tickets, tuned for 2–3 hours on one table (first pass, needs playtesting).

| Branch | Upgrades | Capstone |
|---|---|---|
| Flipper Mastery | Stronger Flippers (+10%/level swing speed), Springy Rubbers (bouncier resting flippers) | Perfect Flip: flip as the ball lands for a 25% faster shot |
| Bumper Power | Loud Bumpers (+50%/level on pops, slings, standups), Super Pulse (10–20% SUPER hits worth 5×) | Chain Reaction: 30% chance a pop also fires another |
| Combo & Multiplier | Longer Fuse (+0.75 s window/level), Higher Cap (×6, ×7), Bonus Head Start (bonus starts 2×/3×) | Hot Streak: combo never below ×2 |
| Ball Control | Ball Saver (+4 s/level), Extra Balls (4, 5 per turn), Saved by the Bell (10–20% drain save) | Guardian Angel: first drain each turn always saved |
| Charge & Skills | Ink Surge, Fast Charge (+25%/level), Slow Reels, Cheap Tricks (−15%/level cost), Bounce House, Magnet Mitt | Double Charge: meter holds two charges |

Wider flippers were considered for Flipper Mastery and dropped: any extra length closes the centre drain gap entirely.

## 6. Active Skills

Powered by a **charge meter** that fills from active play (bumper hits, drop-target clears, combo milestones) — mirrors a Cuphead-style super meter. Skills are unlocked as specific nodes in the **Charge & Skills** branch.

**v1 roster (3–4 skills):**

1. **Ink Surge** — instant temporary score multiplier spike for a few seconds. Low charge cost, first skill unlocked.
2. **Slow Reels** — brief slow-motion window for precision shots on a hard target/ramp.
3. **Bounce House** — spawns 1–2 extra balls for a temporary multiball window.
4. *(capstone-tier)* **Magnet Mitt** — briefly pulls the ball toward the highest-value target on screen; highest charge cost, unlocked latest.

Each skill has its own charge cost (not a shared cooldown), so a fully-built player can eventually stack multiple skill uses within a single hot streak.

**Implemented (`src/skills.js`):** keys 1–4 or the panel buttons. Charge costs 35 / 45 / 75 / 60 out of a 100-point meter that empties each turn. Charge comes from play: slings and spinner 0.5, pops/standups/lanes 1, aimed shots 4, completed features 8, missions 20. Ink Surge doubles live scoring for 8 s; Slow Reels runs the table at 45% speed for 5 s; Bounce House feeds two balls from the scoop; Magnet Mitt steers balls for 3 s toward the lit scoop, else the active mission's target, else the UFO. The Charge & Skills capstone was changed from "two skills chargeable simultaneously" to "the meter holds two charges", which gives the same stacking.

---

## 6b. Missions (added during the Rocket Row art/table pass)

In-turn objectives in the style of *3D Pinball Space Cadet*, implemented in `src/missions.js`:

- A mission is always **offered** in the HUD panel; hitting any standup target cycles to the next one, and landing in the **kickout saucer** accepts it.
- Each mission is one objective counted from table events (ramp shots, pop hits, drop-bank clears, orbits, R·O·W lanes, spinner turns, UFO hits, scoop shots), some with a time limit. The clock only runs while a ball is in play. The targets involved pulse with a dashed halo on the playfield.
- Completing missions pays a reward and promotes the player through **ranks** (Cadet → Ensign → Lieutenant → Captain → Commander → Admiral); each rank unlocks a harder tier of missions.
- Rank and completed missions persist across turns and reloads (localStorage key `tilt-and-ink.missions`); a mission in progress ends with the turn. Open question: whether rank should feed the Upgrade Tree or reset on Prestige.

## 7. Prestige

Available once **all tables are unlocked and the Upgrade Tree is fully purchased**.

- Prestiging converts your total Tickets spent into **Contracts**, a separate permanent currency.
- Contracts buy a small, capped set of **global multiplier nodes** (e.g. "+X% Tickets earned," "+X% charge fill rate") — deliberately few nodes, so Prestige is a periodic milestone, not a new grind layer.
- **Tables remain unlocked** and the Ticket-spending Upgrade Tree **resets to empty** — the player re-climbs it, but faster and harder thanks to Contract multipliers.
- No limit on number of Prestiges; each one still requires re-maxing the full tree, so pacing is self-limiting rather than needing a decay curve.

---

## 8. Art Direction

- **Style:** Cuphead-inspired 1930s rubber-hose cartoon — bold black ink outlines, warm sepia/cream base palette with saturated spot colors per table theme, hand-inked textures on backgrounds.
- **Production approach (revised during implementation):** the original plan assumed externally-sourced illustrated art (AI-generated or commissioned). No image-generation tool was available during implementation, so table 1's elements were built instead as **hand-coded SVG vector illustrations** (`assets/*.svg`) — ink outlines, gradient fills, simple cartoon shapes — wired onto the Matter.js physics bodies as sprite textures (`render.sprite`). This is closer to the "stylized vector approximation" option than the original choice, but is what's actually achievable without external art tools. If real illustrated/commissioned art becomes available later, it drops in as a straight texture swap — the sprite-based rendering approach doesn't need to change.
- **Table 1 art pass ("Pulp Serial Poster"):** Rocket Row was redrawn as a 1930s matinee-serial poster: cream poster stock, black press ink, two spot inks (tomato red, serial teal) and mustard for rewards, typeset in Rye and Special Elite. The art is now generated in code (`src/art.js`) from the same geometry the physics uses (`src/layout.js`), so art and hitboxes can't drift apart: the printed playfield is an inline SVG, moving parts are data-URI SVG sprites, and lit lamp inserts are drawn on a canvas layer between the two. The older hand-coded `assets/*.svg` sprites were retired.
- **Animation:** since rendering is Matter.js Canvas (not DOM/CSS), "animation via CSS transforms" from the original plan doesn't directly apply — implemented instead as small per-frame JS state changes (e.g. bumpers ease their sprite scale up then back down on hit, a "pow" pulse). Same visual intent, different mechanism.
- **UI chrome** (HUD, upgrade tree panel, buttons) should carry the same ink-line/cream-paper look so the meta-game doesn't visually break from the table. The HUD currently uses Alfa Slab One (score) and Fredoka (body text) from Google Fonts for a vintage poster feel.
- **Audio (light-touch direction, not a full spec):** upbeat 1930s big-band/jazz-inspired music per table theme; bright, "boop"-style SFX for bumpers/targets consistent with the cartoon tone.

---

## 9. Controls

- **Flippers:** dedicated keys (e.g. `Z` / `?` or arrow keys), left/right independently.
- **Active skills:** number keys or on-screen buttons, spendable whenever enough charge is banked.
- **Launch ball / start turn:** dedicated key or on-screen button.
- Mouse is used for menu/tree navigation, not for real-time play — keeps flipper timing purely keyboard-driven for consistency.
- Mobile/touch is **not** in the v1 scope; note it as a possible future pass (on-screen flipper buttons) without designing it now.

---

## 10. Technical Approach (recommendation)

**Recommended stack:** Vanilla JavaScript (or TypeScript) + HTML5 Canvas for rendering, **Matter.js** for 2D physics, plain HTML/CSS for the surrounding UI (HUD, upgrade tree panel).

**Why:**
- A single-table pinball simulation is squarely within Matter.js's strengths (rigid bodies, restitution/bounce tuning for bumpers, collision events for scoring) without needing a full game-framework's scene/asset pipeline.
- The upgrade tree, currency displays, and menus are naturally DOM/CSS UI, not canvas content — no benefit from a framework like Phaser that assumes everything lives in the game canvas.
- No backend is needed (localStorage persistence), so the whole game ships as a static site — deployable anywhere (GitHub Pages, Netlify, etc.) with zero infrastructure.
- Keeps the dependency footprint to one physics library, which matters for a solo/small project maintaining hand-illustrated art assets alongside code.

**Persistence:** `localStorage` only — serialize currency totals, tree purchase state, unlocked tables, and prestige state as JSON on an interval and on key events (turn end, purchase, prestige). No accounts, no server.

---

## 11. Scope Notes / Phasing

This document specs the **full v1 vision**. Suggested build order for an actual implementation pass (not required now, just a sane sequence):

1. Single table (Carnival Row) with all 4–6 element types and real physics, no upgrades yet — prove the core play feel.
2. Ticket currency + minimal Upgrade Tree (one branch) wired to live table changes.
3. Remaining tree branches + all 3–4 active skills + charge meter.
4. Remaining 3 tables + lifetime-score unlock gating.
5. Prestige layer.
6. Art pass: replace placeholder shapes with illustrated assets + CSS animation.

---

## 12. Open Items (intentionally deferred, not blocking)

- Exact numeric balancing (costs, point values, milestone thresholds) — needs playtesting data, not a design-time decision.
- Specific illustration asset list and production plan.
- Whether a lightweight tutorial/onboarding flow is needed for first-time players.
- Mobile/touch control scheme, if revisited later.
