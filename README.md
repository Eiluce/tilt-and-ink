# Tilt & Ink

A browser pinball game with 1930s pulp-serial art. You score by actually playing pinball, and your score feeds a long-term upgrade tree. The first table is **Rocket Row: The Saucer Men**.

The full game design is in [GAME_DESIGN.md](GAME_DESIGN.md).

## Run the game

The game is a static site: no build step, no dependencies to install. Serve the folder with any local web server and open it in a browser.

```sh
git clone https://github.com/Eiluce/tilt-and-ink.git
cd tilt-and-ink
python3 -m http.server 8000
```

Then open <http://localhost:8000/>.

Any other static server works too, for example `npx serve .`.

You need an internet connection the first time, because the page loads [Matter.js](https://brm.io/matter-js/) (physics) from cdnjs and its fonts from Google Fonts.

## Controls

| Key | Action |
|---|---|
| <kbd>Space</kbd> | Start a turn |
| Hold <kbd>Space</kbd>, release | Pull the plunger and launch. A longer pull launches harder. |
| <kbd>Z</kbd> or <kbd>←</kbd> | Left flipper |
| <kbd>/</kbd> or <kbd>→</kbd> | Right flipper and the small upper-right flipper |
| <kbd>1</kbd>–<kbd>6</kbd> | Fire the skill in that loadout slot (once unlocked in the Upgrade Tree) |
| <kbd>U</kbd> | Open or close the Upgrade Tree (pauses the game) |

<kbd>↓</kbd> and <kbd>Enter</kbd> also work as the plunger.

## How to play Rocket Row

The table starts **dormant**. Your first turn is a single ball, and only the pop bumpers and slingshots score, 1 point each. Everything else is printed faded and scores nothing until you wake it up in the Upgrade Tree: the inlanes, standups, drop targets, UFO, spinner, orbit, ramps, scoop, and rules like the combo, end-of-ball bonus, chapters, multiball and missions. Early turns are slow on purpose. By the end, points come from everywhere and turns score in the billions.

**Scoring**

- **Tickets:** when a turn ends, its score is banked 1:1 as Tickets, the currency the Upgrade Tree spends. Your Tickets and best turn are saved in the browser.
- **Combo** (once unlocked): chain aimed shots (ramps, orbit, scoop, kickout, UFO, drop targets) less than 3 seconds apart to raise the combo. It multiplies everything you score until play goes quiet.
- **End-of-ball bonus** (once unlocked): shots and features add to a bonus paid when the ball drains, times the bonus multiplier. Complete the R·O·W lanes to raise that multiplier.
- **Stars** (once unlocked): star pickups appear on the table for a few seconds. Roll through one to collect it. Golden stars pay 10×.
- **Everything else:** flipper and rail hits, SUPER pop hits, chain reactions between pops and echoes (a hit that scores twice) all come from the tree.

- **Chapters and saucer multiball:** see below.
- **R·O·W lanes** at the top: light all three letters to raise the end-of-ball bonus multiplier. Flipper buttons shift the lit letters.
- **Drop targets 1-2-3**: every second time you clear them lights an **extra ball**. Collect it at the yellow kickout hole.
- **Missions**: the side panel always offers one. Hit a standup target to switch to the next mission, and land in the kickout hole to accept it. Targets for the active mission pulse on the table. Completing missions promotes you from Cadet up to Admiral and unlocks harder missions. Your rank is saved in the browser and carries over between turns.

### Chapters and saucer multiball

Once the **Chapters** node is bought, Rocket Row is a movie serial in five chapters, shown by the I–V lights in the middle of the playfield. The next chapter's light blinks.

- **Advancing:** each ramp shot that reaches the top of either ramp advances one chapter. Lighting all six standup targets (three on each side wall) also advances one chapter, and the standups then reset.
- **Reward:** each new chapter scores its chapter value times its number (Chapter III pays triple), multiplied by your combo, and adds to the end-of-ball bonus.
- **Chapter V:** the UFO's tractor beam pulses and the scoop arrow blinks. Clear the 1-2-3 drop targets, then shoot the scoop under the UFO to start a three-ball **saucer multiball** with a jackpot. Until then, more ramps still score but don't add chapter points.
- **Resetting:** starting multiball sends the chapters back to 0, so the serial starts again. Chapters carry over when you lose a ball, and reset when a new turn starts.

## Upgrades and skills

Tickets you bank at the end of each turn buy permanent upgrades. Press <kbd>U</kbd> (or click **Upgrade Tree** in the side panel) to open the tree. The game pauses while it's open, and upgrades apply straight away.

The tree is drawn as the wiring board inside the machine's backbox. Every brass socket is an upgrade, wires lead to the upgrades it unlocks, and bought bulbs light up in their branch's colour. Bulbs you can afford now pulse. Drag to pan, use the mouse wheel to zoom, and click a bulb to see what it does and buy it. The screen has two more tabs: **Tables** shows a lobby card for each of the eight tables, and **Skill loadout** chooses which skill sits on which key.

The tree has seven branches: the **Tables** spine, **Bumpers & Contact**, **Targets**, **Ramps & Lanes**, **Rules & Features**, **Ball Control** and **Charge & Skills**. Rocket Row's nodes wake the table up and add percentage boosts. Each **table pass** (★) opens that table's ring of stronger nodes across every branch. The eight tables are Rocket Row, Timber Hollow, Davy Jones' Deep, Mount Cinder, Frostbite Peak, Tomb of Sekhmet, Ghost Train and The Devil's Lounge. Only Rocket Row is built so far, but buying a later table's pass still opens its nodes. Buying the whole tree takes roughly 14 hours of play.

The **Charge & Skills** branch unlocks four skills, powered by a charge meter that fills as you hit things (aimed shots and completed features fill it fastest) and empties at the start of each turn. Each unlocked skill goes into a free loadout slot on keys <kbd>1</kbd>–<kbd>4</kbd>. Later nodes add slots on <kbd>5</kbd> and <kbd>6</kbd>.

| Skill | Charge | Effect |
|---|---|---|
| Ink Surge | 35 | Double all scoring for 8 s (more with later upgrades) |
| Slow Reels | 45 | Slow motion for 5 s |
| Bounce House | 75 | Two extra balls from the scoop |
| Magnet Mitt | 60 | Pull the ball toward the best target for 3 s |

Tickets, upgrades, rank and your loadout are saved in the browser. **Reset all progress** at the bottom of the Upgrade Tree wipes them.

## Project layout

| Path | What it holds |
|---|---|
| `index.html`, `style.css` | Page and side panel |
| `src/layout.js` | Table geometry, shared by the art and the physics |
| `src/art.js` | Playfield and sprite art, generated as SVG |
| `src/main.js` | Table setup, rules, turns and input |
| `src/scoring.js` | Point values, combo, end-of-ball bonus and Tickets |
| `src/missions.js` | Missions and ranks |
| `src/upgrades.js`, `src/upgradeScreen.js` | Upgrade Tree data and purchases; the wiring-board screen, table picker and skill loadout |
| `src/tables.js` | The eight tables: names, spot inks, emblems |
| `src/skills.js` | Charge meter and active skills |
| `src/pickups.js` | Star pickups that appear on the playfield |
| `tools/pacing.js` | Pacing simulator for the tree's costs (`node tools/pacing.js`) |
| `src/lamps.js`, `src/effects.js` | Lit inserts, plunger, hit effects and title cards |
| `src/physics.js`, `src/ramp.js`, `src/hole.js`, `src/slingshot.js`, `src/standups.js`, `src/flipper.js`, `src/bumper.js`, `src/spinner.js`, `src/dropTargets.js` | Physics helpers and table elements |
