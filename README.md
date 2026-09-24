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

<kbd>↓</kbd> and <kbd>Enter</kbd> also work as the plunger.

## How to play Rocket Row

You get 3 balls per turn. A ball that drains in the first 8 seconds after launch is given back ("Shoot Again").

- **Ramps** advance the serial's chapter. At **Chapter V**, shoot the scoop under the UFO for a three-ball **saucer multiball**.
- **Left then right ramp** (or right then left) within 4 seconds pays double.
- **R·O·W lanes** at the top: light all three letters to raise the bonus multiplier, up to 5×. Flipper buttons shift the lit letters.
- **Drop targets 1-2-3**: every second time you clear them lights an **extra ball**. Collect it at the yellow kickout hole.
- **Missions**: the side panel always offers one. Hit a standup target to switch to the next mission, and land in the kickout hole to accept it. Targets for the active mission pulse on the table. Completing missions promotes you from Cadet up to Admiral and unlocks harder missions.

The score shown is a test counter for now, not the game's real currency.

## Project layout

| Path | What it holds |
|---|---|
| `index.html`, `style.css` | Page and side panel |
| `src/layout.js` | Table geometry, shared by the art and the physics |
| `src/art.js` | Playfield and sprite art, generated as SVG |
| `src/main.js` | Table setup, rules, turns and input |
| `src/missions.js` | Missions and ranks |
| `src/lamps.js`, `src/effects.js` | Lit inserts, plunger, hit effects and title cards |
| `src/physics.js`, `src/ramp.js`, `src/hole.js`, `src/slingshot.js`, `src/standups.js`, `src/flipper.js`, `src/bumper.js`, `src/spinner.js`, `src/dropTargets.js` | Physics helpers and table elements |

The files in `assets/` are the earlier hand-drawn sprites and are no longer used by the game.
