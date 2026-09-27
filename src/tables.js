// The eight tables (GAME_DESIGN.md section 4.3), in unlock order. Each one
// is reached by buying its pass in the Upgrade Tree. Only `built` tables can
// be played; the others show an "in production" lobby card, but their pass
// still opens their ring of Upgrade Tree nodes.
//
// inks: the table's two spot inks (every table shares the poster stock,
// black press ink and mustard for rewards). emblem: the inside of an
// 88 x 88 SVG lobby-card badge.
const TABLES = [
  {
    n: 1, name: 'Rocket Row', world: 'Space', serial: 'The Saucer Men', built: true,
    inks: ['#2e7f86', '#d2452f'],
    centerpiece: 'A UFO with a tractor-beam scoop',
    twist: 'Gentle gravity: the tutorial table',
    emblem: '<circle cx="44" cy="44" r="41" fill="#efe2c4" stroke="#1e1a16" stroke-width="3"/><path d="M30 42 C30 26 58 26 58 42 Z" fill="#9fd0d4" stroke="#1e1a16" stroke-width="3"/><ellipse cx="44" cy="46" rx="28" ry="9" fill="#2e7f86" stroke="#1e1a16" stroke-width="3"/><circle cx="32" cy="46" r="2.5" fill="#e3a92b"/><circle cx="44" cy="48" r="2.5" fill="#e3a92b"/><circle cx="56" cy="46" r="2.5" fill="#e3a92b"/><path d="M36 56 L30 74 H58 L52 56 Z" fill="#d2452f" opacity="0.35"/>',
  },
  {
    n: 2, name: 'Timber Hollow', world: 'Forest', serial: "The Woodsman's Curse", built: true,
    inks: ['#7fa33a', '#e3862c'],
    centerpiece: 'The felled Old Oak: a roped woodpile over a hollow scoop',
    twist: 'Dense toadstool pops; moss inlanes briefly slow the ball',
    emblem: '<circle cx="44" cy="44" r="41" fill="#efe2c4" stroke="#1e1a16" stroke-width="3"/><path d="M44 14 L26 42 H34 L22 60 H66 L54 42 H62 Z" fill="#4d7a35" stroke="#1e1a16" stroke-width="3" stroke-linejoin="round"/><rect x="39" y="60" width="10" height="14" fill="#8a5a2b" stroke="#1e1a16" stroke-width="3"/><circle cx="38" cy="36" r="4" fill="#efe2c4" stroke="#1e1a16" stroke-width="2"/><circle cx="50" cy="36" r="4" fill="#efe2c4" stroke="#1e1a16" stroke-width="2"/><circle cx="38" cy="36" r="1.6" fill="#1e1a16"/><circle cx="50" cy="36" r="1.6" fill="#1e1a16"/><path d="M42 42 L44 45 L46 42" fill="#d9772e" stroke="#1e1a16" stroke-width="1.5"/>',
  },
  {
    n: 3, name: "Davy Jones' Deep", world: 'Ocean', serial: 'Terror of Twenty Fathoms', built: true,
    inks: ['#5cc8b2', '#e2674a'],
    centerpiece: "The Kraken, whose eye opens over its maw",
    twist: "Water drag: weak flips don't make the ramps; a current up the left orbit",
    emblem: '<circle cx="44" cy="44" r="41" fill="#0f2a3b" stroke="#1e1a16" stroke-width="3"/><path d="M28 46 C24 58 32 62 28 72 M38 46 C36 58 42 62 38 74 M50 46 C52 58 46 62 50 74 M60 46 C64 58 56 62 60 72" fill="none" stroke="#1e1a16" stroke-width="6" stroke-linecap="round"/><path d="M28 46 C24 58 32 62 28 72 M38 46 C36 58 42 62 38 74 M50 46 C52 58 46 62 50 74 M60 46 C64 58 56 62 60 72" fill="none" stroke="#e2674a" stroke-width="3" stroke-linecap="round"/><path d="M24 46 C24 24 64 24 64 46 Z" fill="#e2674a" stroke="#1e1a16" stroke-width="3" stroke-linejoin="round"/><ellipse cx="44" cy="38" rx="8" ry="5.5" fill="#efe2c4" stroke="#1e1a16" stroke-width="2"/><circle cx="44" cy="38" r="3" fill="#e3a92b"/><ellipse cx="44" cy="38" rx="0.9" ry="2.6" fill="#1e1a16"/><circle cx="68" cy="22" r="4" fill="none" stroke="#5cc8b2" stroke-width="2"/><circle cx="72" cy="32" r="2.5" fill="none" stroke="#5cc8b2" stroke-width="2"/>',
  },
  {
    n: 4, name: 'Mount Cinder', world: 'Volcano', serial: 'Fury of the Fire God', built: true,
    inks: ['#9fd8ff', '#ff7a1a'],
    centerpiece: 'A lava lake over a lava-tube scoop',
    twist: 'The heaviest gravity; steam vents blast the ball',
    emblem: '<circle cx="44" cy="44" r="41" fill="#2a2220" stroke="#1e1a16" stroke-width="3"/><path d="M14 72 L34 36 H54 L74 72 Z" fill="#4a3c36" stroke="#1e1a16" stroke-width="3" stroke-linejoin="round"/><path d="M34 36 L40 48 L44 40 L48 50 L54 36 Z" fill="#ff7a1a" stroke="#1e1a16" stroke-width="2.5" stroke-linejoin="round"/><path d="M42 42 L44 40 L46 44" fill="none" stroke="#f2d024" stroke-width="1.5"/><circle cx="38" cy="24" r="6" fill="#9fd8ff" opacity=".8"/><circle cx="48" cy="18" r="7" fill="#9fd8ff" opacity=".6"/><circle cx="56" cy="26" r="5" fill="#9fd8ff" opacity=".5"/>',
  },
  {
    n: 5, name: 'Frostbite Peak', world: 'Arctic', serial: 'The Abominable Expedition',
    inks: ['#3f7fae', '#b23a6b'],
    centerpiece: 'A yeti in an ice-cave scoop',
    twist: 'Near-frictionless ice',
    emblem: '<circle cx="44" cy="44" r="41" fill="#efe2c4" stroke="#1e1a16" stroke-width="3"/><path d="M12 70 L36 26 L46 42 L54 32 L76 70 Z" fill="#9fc6dd" stroke="#1e1a16" stroke-width="3" stroke-linejoin="round"/><path d="M30 37 L36 26 L42 37 L38 34 L36 38 L33 34 Z" fill="#efe2c4" stroke="#1e1a16" stroke-width="2" stroke-linejoin="round"/><g stroke="#b23a6b" stroke-width="2.5" stroke-linecap="round"><path d="M62 14 V28 M55 21 H69 M57 16 L67 26 M67 16 L57 26"/></g>',
  },
  {
    n: 6, name: 'Tomb of Sekhmet', world: 'Desert', serial: 'Curse of the Sand Pharaoh',
    inks: ['#b8862f', '#2a6f73'],
    centerpiece: 'A sarcophagus whose lid opens as a scoop',
    twist: 'Sand traps and shifting orbit walls',
    emblem: '<circle cx="44" cy="44" r="41" fill="#efe2c4" stroke="#1e1a16" stroke-width="3"/><path d="M16 68 L44 20 L72 68 Z" fill="#e3b862" stroke="#1e1a16" stroke-width="3" stroke-linejoin="round"/><path d="M30 44 H58 M24 56 H64" stroke="#1e1a16" stroke-width="2"/><path d="M36 50 C40 46 48 46 52 50 C48 54 40 54 36 50 Z" fill="#efe2c4" stroke="#1e1a16" stroke-width="2"/><circle cx="44" cy="50" r="2.4" fill="#2a6f73"/>',
  },
  {
    n: 7, name: 'Ghost Train', world: 'Haunted', serial: 'Last Stop: Hollow Manor',
    inks: ['#5b3f78', '#8fbf3f'],
    centerpiece: 'A phantom organist whose pipes are targets',
    twist: 'Ghost walls fade in and out',
    emblem: '<circle cx="44" cy="44" r="41" fill="#efe2c4" stroke="#1e1a16" stroke-width="3"/><path d="M26 72 V40 C26 22 62 22 62 40 V72 L56 66 L50 72 L44 66 L38 72 L32 66 Z" fill="#efe2c4" stroke="#1e1a16" stroke-width="3" stroke-linejoin="round"/><ellipse cx="37" cy="42" rx="4" ry="6" fill="#1e1a16"/><ellipse cx="51" cy="42" rx="4" ry="6" fill="#1e1a16"/><ellipse cx="44" cy="56" rx="4" ry="5" fill="#5b3f78"/>',
  },
  {
    n: 8, name: "The Devil's Lounge", world: 'Finale', serial: 'The House Always Wins',
    inks: ['#8c2f2a', '#e3a92b'],
    centerpiece: 'A devil mask over a roulette spinner',
    twist: 'The final boss table',
    emblem: '<circle cx="44" cy="44" r="41" fill="#efe2c4" stroke="#1e1a16" stroke-width="3"/><path d="M22 30 L30 16 L36 32 M66 30 L58 16 L52 32" fill="#8c2f2a" stroke="#1e1a16" stroke-width="3" stroke-linejoin="round"/><path d="M24 34 C24 70 64 70 64 34 C56 28 32 28 24 34 Z" fill="#8c2f2a" stroke="#1e1a16" stroke-width="3" stroke-linejoin="round"/><path d="M32 42 L40 46 M56 42 L48 46" stroke="#efe2c4" stroke-width="3" stroke-linecap="round"/><path d="M34 56 C40 62 48 62 54 56" fill="none" stroke="#e3a92b" stroke-width="3" stroke-linecap="round"/>',
  },
];
