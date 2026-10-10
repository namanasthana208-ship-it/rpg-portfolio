// Palette swap: replace [158,85,94] (hair dark) and [199,129,137] (hair/outfit mid)
// in the base character01-Sheet.png for each NPC.
export const NPC_PALETTES = {
  npc_siddhant: { h1: [45, 80, 158],  h2: [80, 136, 221] },
  npc_ayushi:   { h1: [160, 40, 80],  h2: [224, 80, 140], body: [230, 140, 190], hi: [255, 215, 240] },
  npc_suramya:  { h1: [25, 105, 115], h2: [55, 165, 170] },
  npc_aditya:   { h1: [158, 88, 20],  h2: [221, 145, 55] },
  npc_atharva:  { h1: [20, 110, 55],  h2: [40, 185, 100] },
  npc_udayan:   { h1: [100, 30, 160], h2: [155, 70, 220] },
  npc_raunak:   { h1: [155, 140, 20], h2: [220, 195, 45] },
  npc_ronit:    { h1: [110, 20, 45],  h2: [35, 70, 170] },
  npc_naman:    { h1: [15, 45, 110],  h2: [35, 90, 200], body: [60, 80, 180], hi: [120, 150, 240] },
}

// Each page must fit the smallest dialogue box (portrait phone): ~21 chars × 3 lines.
export const EXTERIOR_NPCS = [
  {
    key: 'npc_siddhant',
    name: 'SIDDHANT',
    gx: 23, gy: 15,
    facing: 'left',
    pages: [
      "You're looking for Naman? He's not out here.",
      "A few of us out here know him. The rest are inside.",
      "Talk to everyone first, then go find him.",
    ],
  },
  {
    key: 'npc_suramya',
    name: 'SURAMYA',
    gx: 12, gy: 18,
    facing: 'right',
    pages: [
      "He does street photography. Mostly black and white.",
      "Workers, quiet waiting rooms, night streets, beaches.",
      "He ran a street photography session at IIT Bhubaneswar.",
      "Wanna see his Instagram?",
    ],
    choice: {
      yes: { url: 'https://www.instagram.com/deewanaasthana/' },
      no:  { text: ':( okay. Next time then.' },
    },
  },
  {
    key: 'npc_ronit',
    name: 'RONIT',
    gx: 22, gy: 18,
    facing: 'left',
    pages: [
      "He's a Barça fan. Messi, obviously.",
      "Ask him for the greatest match ever. It's Rome, 2009.",
      "Champions League final, against United.",
      "Messi scored with a header that night.",
      "He doesn't play himself, though.",
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
      "He practically lives at the movie theatre. His words.",
      "His top four on Letterboxd:",
      "Return of the King, Back to the Future, About Time and Piku.",
      "He'll also defend Superman (2025) against anyone.",
      "Don't test that.",
      "Wanna see his Letterboxd?",
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
      "He actually knows music theory. Sings too.",
      "He'll tell you he's \"not that proficient\" though.",
      "Pink Floyd and Daft Punk, then ghazals and retro Bollywood.",
      "One of his playlists is called \"My old man music taste\".",
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
      "Don't offer him espresso.",
      "He doesn't own a machine, on purpose.",
      "It's the V60 or the Kalita Wave. Go-to is an iced pour-over.",
      "Light roasts, and a new coffee every two weeks.",
      "He's even looking at jobs in coffee. Not as a barista.",
    ],
  },
  {
    key: 'npc_udayan',
    name: 'UDAYAN',
    gx: 22, gy: 13,
    facing: 'up',
    pages: [
      "He's really into comics. Mostly DC and manga.",
      "Superman's been his guy since he was ten.",
      "His picks: All-Star Superman, Court of Owls,",
      "Emerald Twilight and Bleach.",
      "He thinks Bleach is the best of the big three. Don't start.",
    ],
  },
  {
    key: 'npc_raunak',
    name: 'RAUNAK',
    gx: 14, gy: 4,
    facing: 'down',
    pages: [
      "Seen his Lego shelf?",
      "Gotham skyline, the Balrog, the Millennium Falcon,",
      "and more Batmobiles than anyone needs.",
      "Gotham's his favourite.",
      "Anyway, he's in the back room. I'll move.",
    ],
  },
]

export const NAMAN_LINES = {
  before: ['Therefore I am.'],
  after: ["If you're hiring for growth,", "or you work in coffee, let's talk."],
}

export const SIGN_PAGES = [
  "NAMAN'S HOUSE",
  'Growth marketer from Lucknow. Open to Bengaluru and Mumbai.',
]

export const GBA_PAGES = [
  "It's a GBA.",
  "He played a lot of Pokémon on this. Kind of why you're here.",
]
