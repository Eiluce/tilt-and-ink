# Tilt & Ink

A browser pinball game with 1930s pulp-serial art. You score by actually playing pinball, and your score feeds a long-term upgrade tree. Five tables are built: **Rocket Row: The Saucer Men**, **Timber Hollow: The Woodsman's Curse**, **Davy Jones' Deep: Terror of Twenty Fathoms**, **Mount Cinder: Fury of the Fire God** and **Frostbite Peak: The Abominable Expedition**.

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

**Debug tickets:** in the browser console, `__setTickets(5e6)` sets your Tickets balance to that number and `__addTickets(1e6)` adds to it. Both are saved. Lifetime Tickets, which gate the table passes, rise to match (setting a lower balance never lowers them).

## Controls

| Key | Action |
|---|---|
| <kbd>Space</kbd> | Start a turn |
| Hold <kbd>Space</kbd>, release | Pull the plunger and launch. A longer pull launches harder. |
| <kbd>Z</kbd> or <kbd>←</kbd> | Left flipper |
| <kbd>/</kbd> or <kbd>→</kbd> | Right flipper and the small upper-right flipper |
| <kbd>1</kbd>–<kbd>6</kbd> | Fire the skill in that loadout slot (once unlocked in the Upgrade Tree) |
| <kbd>U</kbd> | Open or close the Upgrade Tree (pauses the game) |

The side panel shows only what matters mid-ball: score, ball, combo and bonus, your skills and the current mission. The **?** button opens your rank, best turn, the Tables screen and these controls.

<kbd>↓</kbd> and <kbd>Enter</kbd> also work as the plunger.

## How to play Rocket Row

The table starts **dormant**. Your first turn is a single ball, and only the pop bumpers and slingshots score, 1 point each. Everything else is printed faded, and the ball passes straight through it, until you wake it up in the Upgrade Tree: the inlanes, standups, drop targets, UFO, spinner, orbit, ramps, scoop, and rules like the combo, end-of-ball bonus, chapters, multiball and missions. Early turns are slow on purpose. By the end, points come from everywhere and turns score in the billions.

**Scoring**

- **Tickets:** when a turn ends, its score is banked 1:1 as Tickets, the currency the Upgrade Tree spends. Your Tickets and best turn are saved in the browser.
- **Combo** (once unlocked): chain aimed shots (ramps, orbit, scoop, kickout, UFO, drop targets) less than 3 seconds apart to raise the combo. It multiplies everything you score until play goes quiet.
- **End-of-ball bonus** (once unlocked): shots and features add to a bonus paid when the ball drains, times the bonus multiplier. Complete the R·O·W lanes to raise that multiplier.
- **Stars** (once unlocked): star pickups appear on the table for a few seconds. Roll through one to collect it. Golden stars pay 10×.
- **Everything else:** flipper and rail hits, SUPER pop hits, chain reactions between pops and echoes (a hit that scores twice) all come from the tree.

- **Chapters and saucer multiball:** see below.
- **R·O·W lanes** at the top: light all three letters to raise the end-of-ball bonus multiplier. Flipper buttons shift the lit letters.
- **Drop targets 1-2-3**: once the Extra Ball upgrade is bought, the third time you clear them in a turn lights an **extra ball** (one per turn). Collect it at the yellow kickout hole.
- **Ball saver**: a ball that drains soon after launch comes back once ("Shoot Again"); the ball it gives back has no saver of its own.
- **Left orbit**: the lane along the left wall, past the spinner. Shoot it from the **right flipper**, across the table, aiming just left of the three standups; the yellow arrow points into it. It only counts going up (a full plunge that comes down it doesn't).
- **Missions**: the side panel always offers one. Hit a standup target to switch to the next mission, and land in the kickout hole to accept it. Only missions the table can currently complete are offered: ramp missions appear once the ramps are awake, and so on. Targets for the active mission pulse on the table. The panel shows what each mission pays (harder missions pay more), and the points appear when you complete it. Completing missions promotes you from Cadet up to Admiral and unlocks harder missions; each promotion pays a bonus and adds a permanent percentage to all your points (shown next to your rank in the **?** panel). Your rank is saved in the browser and carries over between turns.

### Chapters and saucer multiball

Once the **Chapters** node is bought, Rocket Row is a movie serial in five chapters, shown by the I–V lights in the middle of the playfield. The next chapter's light blinks.

- **Advancing:** each ramp shot that reaches the top of either ramp advances one chapter. Lighting all six standup targets (three on each side wall) also advances one chapter, and the standups then reset.
- **Reward:** each new chapter scores its chapter value times its number (Chapter III pays triple), multiplied by your combo, and adds to the end-of-ball bonus.
- **Chapter V:** the UFO's tractor beam pulses and the scoop arrow blinks. Clear the 1-2-3 drop targets, then shoot the scoop under the UFO to start a three-ball **saucer multiball** with a jackpot. Until then, more ramps still score but don't add chapter points.
- **Resetting:** starting multiball sends the chapters back to 0, so the serial starts again. Chapters carry over when you lose a ball, and reset when a new turn starts.

## Timber Hollow

The second table, reached with the Timber Hollow pass. Same rules as Rocket Row (chapters, multiball at the centrepiece, missions), on its own layout and with its own mode:

- **Layout:** five pop bumpers in a ring, each a cluster of three red toadstools, the felled **Old Oak** in the middle as a roped woodpile (its hollow is the scoop), Rocket Row's pair of side ramps, a kickout left of the oak and three oak-leaf drop targets. No small upper flipper. Printed on a russet autumn board with tree rings, green pines and falling leaves; the ramps are pine-green trails with bone markers, and the slingshots are stamped with a small pine.
- **Twist:** gravity is a little stronger, and **moss** on the inlanes slows the ball as it rolls through.
- **Timber!:** spinning the log spinner fills the **SAW** meter (five teeth on the left). When it's full the oak wakes and its hollow lights: shoot it for 20 seconds where every toadstool hit also **chops** the oak for extra points. Chapter V multiball (Pinecone Multiball) takes priority at the hollow.
- Its missions are forest-themed (Log Rolling, Toadstool Stomp, Owl Watch, Sawmill Shift, …) on the same kinds of shots.

## Davy Jones' Deep

The third table, reached with the Davy Jones' Deep pass. Same rules again, under the sea:

- **Layout:** three moon-jellyfish pop bumpers, the **Kraken** in a whirlpool in the middle (its maw is the scoop), Rocket Row's pair of side ramps, a kickout left of the Kraken, three yellow-fish drop targets and a swordfish spinner. No small upper flipper. Printed on a dark blue-black board with light falling from the surface, kelp, glowing specks and bubbles; the ramps are glass tubes with bubbles inside, and the slingshots are scallop shells.
- **Twist:** **water drag** slows the ball everywhere, so weak flips fall short of the ramps, and a **current** (the chevrons) carries a ball that is already heading up the left orbit.
- **Release the Kraken:** each Kraken hit opens its **EYE** a step (five lamps on the left). A full eye lights the maw: shoot it for 20 seconds of **Kraken Attack**, where the fish stand straight back up and every cleared bank is a **kraken feast**. Chapter V multiball (Kraken Multiball) takes priority at the maw.
- Its missions are sea-themed (Man the Rigging, Jellyfish Bloom, Staring Contest, Full Nets, …) on the same kinds of shots.

## Mount Cinder

The fourth table, reached with the Mount Cinder pass, and the fastest so far:

- **Layout:** three fire-pit pop bumpers, a **lava lake** in the middle (its **lava tube** is the scoop), Rocket Row's pair of side ramps as lava channels, a kickout left of the lake, three pumice-stone drop targets and a tiki-torch spinner. Printed on charcoal rock with lava cracks spreading from the lake, embers and smoke; the slingshots are lava rock.
- **Twist:** the heaviest gravity yet, and three **steam vents** (the round grates). Each one glows blue for a moment, then blasts any ball rolling over it in a random direction (never straight down at the drain). Wait for the glow to pass.
- **Eruption:** each ramp pours magma into the **MAGMA** gauge (five lamps on the left). The fifth ramp erupts the volcano: a jackpot appears over the lava lake and drains second by second for 15 seconds. Shoot the lava tube to collect what's left. Chapter V multiball (Fire God Multiball) takes priority at the tube.
- Its missions are volcano-themed (Lava Run, Stoke the Fires, Pumice Toss, Wake the Mountain, …) on the same kinds of shots.

## Frostbite Peak

The fifth table, reached with the Frostbite Peak pass:

- **Layout:** three penguin pop bumpers, the **Yeti** glaring out of an ice mound in the middle (its **ice cave** is the scoop), Rocket Row's pair of side ramps as ski slopes with slalom flags, a kickout left of the Yeti, three snowflake drop targets and a ski for the spinner. Printed on pale glacier ice with layered mountain ranges and falling snow; the slingshots are ice shards.
- **Twist: ice.** The ball has no grip, keeps its speed and bounces more, so it skids and ricochets instead of settling. Catching it on a raised flipper and aiming are harder than anywhere else.
- **Yeti Hunt:** the Yeti's **footprints** light up at one shot at a time (either ramp, the left orbit or the kickout). Hit that shot to follow the tracks, and the next footprints light somewhere else; unfollowed footprints move on after 15 seconds. Three tracks (the **TRACKS** lamps on the left) light the ice cave: shoot it to photograph the Yeti for a big award. Chapter V multiball (Avalanche Multiball) takes priority at the cave.
- Its missions are snowy (Slalom, Penguin Colony, Catch the Flakes, The Abominable, …) on the same kinds of shots.

## Upgrades and skills

Tickets you bank at the end of each turn buy permanent upgrades. Between turns, press <kbd>U</kbd> (or click **Upgrade Tree** at the top right of the page) to open the tree. It can't be opened mid-turn: the button greys out until the turn ends. Upgrades apply straight away.

The tree is drawn as an art deco tower in black and gold. Every diamond is an upgrade, and a straight line leads up from it to the upgrades it unlocks. Bought diamonds fill with their branch's colour, and diamonds you can afford now pulse. Each branch climbs its own lanes, and each table is one step of the tower: buy a table's pass on the centre line to open the next step. A stepped line in another branch's colour means an upgrade also needs something from that branch, and hovering an upgrade lights up everything it needs. Drag to pan, use the mouse wheel to zoom, and click a diamond to see what it does and buy it. The screen has two more tabs: **Tables** shows a lobby card for each of the eight tables, and **Skill loadout** chooses which skill sits on which key.

The tree has seven branches: the **Tables** spine, **Bumpers & Contact**, **Targets**, **Ramps & Lanes**, **Rules & Features**, **Ball Control** and **Charge & Skills**. Rocket Row's nodes wake the table up and add percentage boosts. Each **table pass** (★) opens that table's ring of stronger nodes across every branch. The eight tables are Rocket Row, Timber Hollow, Davy Jones' Deep, Mount Cinder, Frostbite Peak, Tomb of Sekhmet, Ghost Train and The Devil's Lounge. Rocket Row and Timber Hollow are built: once you've bought a built table's pass, pick it with **Play this table** on the Tables tab (between turns). Tickets and upgrades are shared across tables. Buying a later table's pass opens its nodes even before the table is built. Buying the whole tree takes roughly 14 hours of play.

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
| `src/layout.js` | The cabinet every table shares (walls, arch, shooter lane, left orbit, inlanes, slings, flippers) |
| `src/tableDefs/` | One file per built table: its playfield geometry, inks, art pieces, wording, missions and own rules |
| `src/tableSelect.js` | Picks the table to play and merges its layout with the cabinet |
| `src/art.js` | Playfield and sprite art, generated as SVG |
| `src/main.js` | Table setup, rules, turns and input |
| `src/scoring.js` | Point values, combo, end-of-ball bonus and Tickets |
| `src/missions.js` | Missions and ranks |
| `src/upgrades.js`, `src/upgradeScreen.js`, `src/treeLayout.js` | Upgrade Tree data and purchases; the tower screen, table picker and skill loadout; the tower's layout |
| `src/tables.js` | The eight tables: names, spot inks, emblems |
| `src/skills.js` | Charge meter and active skills |
| `src/pickups.js` | Star pickups that appear on the playfield |
| `tools/pacing.js` | Pacing simulator for the tree's costs (`node tools/pacing.js`) |
| `src/lamps.js`, `src/effects.js` | Lit inserts, plunger, hit effects and title cards |
| `src/physics.js`, `src/ramp.js`, `src/hole.js`, `src/slingshot.js`, `src/standups.js`, `src/flipper.js`, `src/bumper.js`, `src/spinner.js`, `src/dropTargets.js` | Physics helpers and table elements |
