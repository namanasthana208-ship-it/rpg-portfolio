// Palette swap: replace [158,85,94] (hair dark) and [199,129,137] (hair/outfit mid)
// in the base character01-Sheet.png for each NPC.
export const NPC_PALETTES = {
  npc_siddhant: { h1: [45, 80, 158],  h2: [80, 136, 221] },
  npc_ayushi:   { h1: [160, 40, 80],  h2: [224, 80, 140], body: [230, 140, 190], hi: [255, 215, 240] },
  npc_aditya:   { h1: [158, 88, 20],  h2: [221, 145, 55] },
  npc_atharva:  { h1: [20, 110, 55],  h2: [40, 185, 100] },
  npc_udayan:   { h1: [100, 30, 160], h2: [155, 70, 220] },
  npc_raunak:   { h1: [155, 140, 20], h2: [220, 195, 45] },
  npc_naman:    { h1: [15, 45, 110],  h2: [35, 90, 200], body: [60, 80, 180], hi: [120, 150, 240] },
}

export const EXTERIOR_NPCS = [
  {
    key: 'npc_siddhant',
    name: 'SIDDHANT',
    gx: 23, gy: 15,
    facing: 'left',
    pages: [
      "Hey! You there!",
      "There are some people inside who know a lot about Naman.",
      "You should go in and talk to them.",
      "Seriously. Go inside.",
    ],
  },
]

export const INTERIOR_NPCS = [
  {
    key: 'npc_ayushi',
    name: 'AYUSHI',
    gx: 6, gy: 8,
    facing: 'down',
    pages: [
      "His Letterboxd is genuinely elite.",
      "Not 'I watch movies' elite. Actually has taste.",
      "Wanna see his profile?",
    ],
    choice: {
      yes: { url: 'https://boxd.it/gp58J' },
      no:  { text: ':( okay then. Your loss.' },
    },
  },
  {
    key: 'npc_aditya',
    name: 'ADITYA',
    gx: 22, gy: 8,
    facing: 'down',
    pages: [
      "His Spotify Wrapped breaks people every year.",
      "The range is unhinged. In a good way.",
      "Wanna check his Spotify?",
    ],
    choice: {
      yes: { url: 'https://open.spotify.com/user/gzikp28q8jgnfhlx96z8uj5o0' },
      no:  { text: ':( fine. Your loss.' },
    },
  },
  {
    key: 'npc_atharva',
    name: 'ATHARVA',
    gx: 6, gy: 13,
    facing: 'up',
    pages: [
      "That guy doesn't touch espresso machines.",
      "V60, Aeropress, Kalita Wave.",
      "Manual brews only. Dialled in every time.",
      "Genuinely great coffee though.",
    ],
  },
  {
    key: 'npc_udayan',
    name: 'UDAYAN',
    gx: 22, gy: 13,
    facing: 'up',
    pages: [
      "He reads comics. Seriously.",
      "Not just the big superhero stuff either.",
      "Has opinions. Strong ones. Don't get him started.",
    ],
  },
  {
    key: 'npc_raunak',
    name: 'RAUNAK',
    gx: 14, gy: 4,
    facing: 'down',
    pages: [
      "The man builds Lego sets.",
      "Not the little ones. The big architectural ones.",
      "Has them displayed. Proudly.",
      "Anyway — you should head to the back room.",
      "Naman's in there. He's been waiting.",
      "Door's right behind me. Go ahead.",
    ],
  },
]
