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
| <kbd>1</kbd>–<kbd>4</kbd> | Fire a skill (once unlocked in the Upgrade Tree) |
| <kbd>U</kbd> | Open or close the Upgrade Tree (pauses the game) |

<kbd>↓</kbd> and <kbd>Enter</kbd> also work as the plunger.

## How to play Rocket Row

You get 3 balls per turn. A ball that drains in the first 8 seconds after launch is given back ("Shoot Again").

**Scoring**

- **Combo:** chain aimed shots (ramps, orbit, scoop, kickout, UFO, drop targets) less than 3 seconds apart to raise the combo up to ×5. It multiplies everything you score until play goes quiet. Bumpers and slingshots keep scoring but don't raise it.
- **End-of-ball bonus:** shots and features also add to a bonus that is paid when the ball drains, times the bonus multiplier. Complete the R·O·W lanes to raise that multiplier, up to 5×.
- **Tickets:** when a turn ends, its score is banked as Tickets (100 points = 1 Ticket), the currency the upgrade tree will spend. Your Tickets and best turn are saved in the browser.

- **Chapters and saucer multiball:** see below.
- **R·O·W lanes** at the top: light all three letters to raise the end-of-ball bonus multiplier. Flipper buttons shift the lit letters.
- **Drop targets 1-2-3**: every second time you clear them lights an **extra ball**. Collect it at the yellow kickout hole.
- **Missions**: the side panel always offers one. Hit a standup target to switch to the next mission, and land in the kickout hole to accept it. Targets for the active mission pulse on the table. Completing missions promotes you from Cadet up to Admiral and unlocks harder missions. Your rank is saved in the browser and carries over between turns.

### Chapters and saucer multiball

Rocket Row is a movie serial in five chapters, shown by the I–V lights in the middle of the playfield. The next chapter's light blinks.

- **Advancing:** each ramp shot that reaches the top of either ramp advances one chapter. Lighting all six standup targets (three on each side wall) also advances one chapter, and the standups then reset.
- **Reward:** each new chapter scores 1,000 × its number (Chapter III pays 3,000, multiplied by your combo) and adds 1,000 to the end-of-ball bonus.
- **Chapter V:** the UFO's tractor beam pulses and the scoop arrow blinks. Clear the 1-2-3 drop targets, then shoot the scoop under the UFO to start a three-ball **saucer multiball** worth a 10,000 jackpot. Until then, more ramps still score but don't add chapter points.
- **Resetting:** starting multiball sends the chapters back to 0, so the serial starts again. Chapters carry over when you lose a ball, and reset when a new turn starts.

## Upgrades and skills

Tickets you bank at the end of each turn buy permanent upgrades. Press <kbd>U</kbd> (or click **Upgrade Tree** in the side panel) to open the tree. The game pauses while it's open, and upgrades apply straight away.

The tree has five branches: **Flipper Mastery**, **Bumper Power**, **Combo & Multiplier**, **Ball Control** and **Charge & Skills**. Each ends in a ★ capstone that needs every other upgrade in its branch plus 3,000 Tickets spent in the other branches. Buying the whole tree costs about 40,000 Tickets, roughly 2–3 hours of play.

The **Charge & Skills** branch unlocks four skills, powered by a charge meter that fills as you hit things (aimed shots and completed features fill it fastest) and empties at the start of each turn:

| Key | Skill | Charge | Effect |
|---|---|---|---|
| <kbd>1</kbd> | Ink Surge | 35 | Double all scoring for 8 s |
| <kbd>2</kbd> | Slow Reels | 45 | Slow motion for 5 s |
| <kbd>3</kbd> | Bounce House | 75 | Two extra balls from the scoop |
| <kbd>4</kbd> | Magnet Mitt | 60 | Pull the ball toward the best target for 3 s |

Tickets, upgrades and rank are saved in the browser. **Reset all progress** at the bottom of the Upgrade Tree wipes them.

## Project layout

| Path | What it holds |
|---|---|
| `index.html`, `style.css` | Page and side panel |
| `src/layout.js` | Table geometry, shared by the art and the physics |
| `src/art.js` | Playfield and sprite art, generated as SVG |
| `src/main.js` | Table setup, rules, turns and input |
| `src/scoring.js` | Point values, combo, end-of-ball bonus and Tickets |
| `src/missions.js` | Missions and ranks |
| `src/upgrades.js`, `src/upgradeScreen.js` | Upgrade Tree data, purchases and its screen |
| `src/skills.js` | Charge meter and active skills |
| `src/lamps.js`, `src/effects.js` | Lit inserts, plunger, hit effects and title cards |
| `src/physics.js`, `src/ramp.js`, `src/hole.js`, `src/slingshot.js`, `src/standups.js`, `src/flipper.js`, `src/bumper.js`, `src/spinner.js`, `src/dropTargets.js` | Physics helpers and table elements |
