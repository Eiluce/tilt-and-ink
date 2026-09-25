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

**Implemented scoring (`src/scoring.js`), reworked for the incremental loop:**

- **Dormant start:** every scoring source (`SOURCES`) scores nothing until an Upgrade Tree node wakes it up. The first turn is one ball on which only the pops and slings score, 1 point each. Dormant elements are drawn faded (sprites at 30% opacity, printed features washed over with paper on the lamp layer) and give no points, popups, lamps or charge; the physics is unchanged. A newly woken element inks back in when the tree closes.
- **Base values in rough tiers:** contact 1–3 (pops, slings, flippers, walls, spinner turn, standups, lanes) · target 8–15 (drop target, UFO, kickout) · shot 40–60 (ramp, orbit, scoop) · feature 100–150 (drop bank, R·O·W, standup set, chapter × its number) · jackpot 500–2,500 (saucer jackpot, missions by tier, promotion × rank) · pickup 5.
- **Multipliers:** per-source +%, per-branch +% and global +% (including per table reached and per mission rank) each add up inside their group; the groups and every ×N multiplier from later tables multiply together. Over the full tree a turn goes from ~25 points to hundreds of billions; numbers display as K / M / B / T.
- **New point sources:** flipper hits, hard wall/rail hits, echo procs (a hit scores twice), chain reactions between pops, SUPER pop hits, and star **pickups** that appear at six open spots for 6 s and pay when the ball rolls through (golden ones pay 10×).
- **Combo:** unlocked by a node (×3), raised to ×5 on Rocket Row and further on later tables. Each aimed shot within the window raises it; it multiplies everything scored live except mission and rank rewards.
- **End-of-ball bonus:** unlocked by a node. Shots and features add a share of their value to a pool paid when the ball drains, times the bonus multiplier (raised by R·O·W once Bonus Multiplier is bought).
- **Tickets:** a turn's score banks 1:1 as Tickets. Saves use `.v2` localStorage keys; the pre-rework saves are wiped once.

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

### 4.3 Tables (8, an elemental climb ending in a boss table)

Each table is unlocked by buying its **pass** node in the Upgrade Tree, which needs a lifetime-Tickets threshold and then costs Tickets. Buying a pass counts as reaching the table: its ring of nodes opens even before the table itself is built. Every table keeps the same serial-poster print style (poster stock, black press ink, halftone) and swaps only its two spot inks, uses the same element vocabulary (pops, slings, spinner, drop bank, ramps, orbit, scoop, centerpiece), and adds **one physics twist** on top of gravity.

| # | Table | World | Spot inks | Centerpiece | Physics twist |
|---|---|---|---|---|---|
| 1 | **Rocket Row** *(built)* | Space | tomato red · serial teal | UFO with tractor-beam scoop | Gentle gravity, the tutorial |
| 2 | **Timber Hollow** — "The Woodsman's Curse" | Forest | moss green · rust orange | The Old Oak, owl-eye targets, mouth scoop | Gravity ×1.1, dense toadstool pops, moss inlanes briefly slow the ball |
| 3 | **Davy Jones' Deep** — "Terror of Twenty Fathoms" | Ocean | deep-sea blue · coral | The Kraken: tentacle ramps, blinking eye target | Water drag (weak flips don't make ramps), an upward current lane |
| 4 | **Mount Cinder** — "Fury of the Fire God" | Volcano | lava red · sulphur yellow | Tiki-faced volcano with a magma gauge | Gravity ×1.35, steam vents randomly kick the ball |
| 5 | **Frostbite Peak** — "The Abominable Expedition" | Arctic | glacier blue · berry | Yeti in an ice-cave scoop | Near-frictionless ice |
| 6 | **Tomb of Sekhmet** — "Curse of the Sand Pharaoh" | Desert | sandstone · scarab turquoise | Sarcophagus scoop | Sand traps, shifting orbit walls |
| 7 | **Ghost Train** — "Last Stop: Hollow Manor" | Haunted | midnight purple · ectoplasm green | Phantom organist | Ghost walls that fade in and out |
| 8 | **The Devil's Lounge** *(finale)* | Casino | devil red · gold | Devil mask, roulette spinner | The final boss table |

Sugar Rush Bakery and Boiler Room Big Band from the original list are dropped for now. Each new table is a genuine new layout (not a reskin).

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

**Implemented, incremental rework (`src/upgrades.js`):** 111 nodes of 1–5 levels in seven branches: the **Tables** spine (table passes and global multipliers), **Bumpers & Contact**, **Targets**, **Ramps & Lanes**, **Rules & Features** (combo, bonus, chapters, multiball, missions, pickups), **Ball Control** and **Charge & Skills**. Nodes are data: each grants stats (`awake.<source>`, `value.<source>` +%, `branch.<branch>` +%, `global` +%, `x.*` ×N, and mechanics like `balls`, `comboMax`, `echo`), and the game reads the summed stats. Rocket Row's nodes wake elements up and add +%; each later table's ring (gated by its pass) is mostly ×N multipliers, so each table reached lifts scoring about 10×.

- **Pacing** (`tools/pacing.js` simulates an average player buying the cheapest node each turn): Timber Hollow pass ≈ 1 h, Davy Jones' ≈ 2.5 h, Mount Cinder ≈ 4.4 h, Devil's Lounge ≈ 11.8 h, whole tree ≈ 14 h. Each table's prices come from one `TIER` scale, tuned with the simulator. The play model is a guess; retune after playtesting.
- **Screen (`src/upgradeScreen.js`, layout in `src/treeLayout.js`):** the tree is an art deco stepped tower in black and gold, a look that sits above every table theme (it replaced a first-pass radial "wiring board" that wasn't angular enough). Each upgrade is a diamond with a name plaque and a glyph; bought diamonds fill with their branch colour, affordable ones pulse. Each branch climbs its own vertical lanes, the Tables spine runs up the middle, and each table is one setback of the tower, narrower than the one below, with its pass on the spine at the top of the step. Every link is a single straight segment, straight up or exactly 45°: a node links to its first same-branch prerequisite, prerequisites from other branches show as small diamonds in that branch's colour, and root upgrades rise straight up from the gold plinth, where Second Reel, the first upgrade, stands as an ordinary diamond. The layout is computed from the data: a node with a child on a later table keeps its lane above it clear for that child, same-table siblings fan out at 45°, and a branch gets more lanes if a link can't be made straight. With the current 111 nodes that is 29 lanes and 20 rows, every link straight or 45°. Unreached steps are dimmed behind padlocks, table names stay pinned to the left of the view, and the detail card and per-branch counts sit in a column beside the tower. Drag to pan, wheel or buttons to zoom.
- **Tables tab:** a lobby card per table (emblem, spot inks, centerpiece, twist) showing Now playing, In production (pass bought, table not built yet) or Locked with what its pass needs, plus a button that finds the pass on the board. Table data lives in `src/tables.js`.
- **Skill loadout tab:** skills sit in 4 slots on keys 1–4; Fifth Slot (Davy Jones' Deep) and Sixth Slot (Tomb of Sekhmet) add keys 5 and 6. Newly unlocked skills drop into a free slot; the loadout is saved in localStorage.
- Still to come: effect nodes and one new themed skill per table pass.

Wider flippers were considered for Flipper Mastery and dropped: any extra length closes the centre drain gap entirely.

## 6. Active Skills

Powered by a **charge meter** that fills from active play (bumper hits, drop-target clears, combo milestones) — mirrors a Cuphead-style super meter. Skills are unlocked as specific nodes in the **Charge & Skills** branch.

**v1 roster (3–4 skills):**

1. **Ink Surge** — instant temporary score multiplier spike for a few seconds. Low charge cost, first skill unlocked.
2. **Slow Reels** — brief slow-motion window for precision shots on a hard target/ramp.
3. **Bounce House** — spawns 1–2 extra balls for a temporary multiball window.
4. *(capstone-tier)* **Magnet Mitt** — briefly pulls the ball toward the highest-value target on screen; highest charge cost, unlocked latest.

Each skill has its own charge cost (not a shared cooldown), so a fully-built player can eventually stack multiple skill uses within a single hot streak.

**Implemented (`src/skills.js`):** keys 1–4 or the panel buttons. Skills and their upgrades are stats granted by Charge & Skills nodes (later tables add Double and Triple Charge, a ×3 then ×5 Ink Surge, and longer skills). Charge costs 35 / 45 / 75 / 60 out of a 100-point meter that empties each turn. Charge comes from play: slings and spinner 0.5, pops/standups/lanes 1, aimed shots 4, completed features 8, missions 20. Ink Surge doubles live scoring for 8 s; Slow Reels runs the table at 45% speed for 5 s; Bounce House feeds two balls from the scoop; Magnet Mitt steers balls for 3 s toward the lit scoop, else the active mission's target, else the UFO. The Charge & Skills capstone was changed from "two skills chargeable simultaneously" to "the meter holds two charges", which gives the same stacking.

---

## 6b. Missions (added during the Rocket Row art/table pass)

In-turn objectives in the style of *3D Pinball Space Cadet*, implemented in `src/missions.js`:

- A mission is always **offered** in the HUD panel; hitting any standup target cycles to the next one, and landing in the **kickout saucer** accepts it.
- Each mission is one objective counted from table events (ramp shots, pop hits, drop-bank clears, orbits, R·O·W lanes, spinner turns, UFO hits, scoop shots), some with a time limit. The clock only runs while a ball is in play. The targets involved pulse with a dashed halo on the playfield.
- Completing missions pays a reward and promotes the player through **ranks** (Cadet → Ensign → Lieutenant → Captain → Commander → Admiral); each rank unlocks a harder tier of missions.
- Missions are locked until the **Mission Control** node; rewards now scale with the tree like any other source. Each rank earns +10% to all points (+10% more per level of Brass Buttons).
- Rank and completed missions persist across turns and reloads (localStorage key `tilt-and-ink.missions.v2`); a mission in progress ends with the turn. Open question: whether rank should reset on Prestige.

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
