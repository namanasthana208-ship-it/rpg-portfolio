import { NPC_PALETTES } from '../data/npcs.js'

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene') }

  preload() {
    // Loading screen
    const W = 480, H = 320, FONT = "'Press Start 2P', monospace"
    this.add.rectangle(W / 2, H / 2, W, H, 0x080818, 1)
    this.add.text(W / 2, H / 2 - 24, 'NAMAN ASTHANA', {
      fontFamily: FONT, fontSize: '9px', color: '#FFD700',
    }).setOrigin(0.5)
    const loadText = this.add.text(W / 2, H / 2 + 10, 'Loading...', {
      fontFamily: FONT, fontSize: '7px', color: '#888899',
    }).setOrigin(0.5)
    let dots = 0
    this.time.addEvent({
      delay: 380, loop: true,
      callback: () => { dots = (dots + 1) % 4; loadText.setText('Loading' + '.'.repeat(dots || 1)) },
    })

    // --- debug overlay (visible even if Phaser renderer freezes) ---
    const dbg = document.createElement('div')
    dbg.id = 'boot-dbg'
    dbg.style.cssText = 'position:fixed;bottom:4px;left:4px;right:4px;color:#0f0;font:9px monospace;z-index:9999;white-space:pre-wrap;pointer-events:none;line-height:1.4'
    document.body.appendChild(dbg)
    const _log = msg => { dbg.textContent = msg; console.log('[boot]', msg) }
    _log('preload start')

    this.load.on('progress', v => {
      const pct = Math.round(v * 100)
      _log(`loading: ${pct}%`)
      loadText.setText('Loading ' + pct + '%')
    })
    this.load.on('loaderror', file => {
      _log(`WARN: failed ${file.key} (${file.src || file.url})`)
    })
    this.load.on('complete', () => {
      _log('assets done → create()')
    })

    window.onerror = (msg, src, line) => {
      _log(`JS ERROR: ${msg} (${src}:${line})`)
    }

    const PCT = 'assets/pocket_creature_tamer/Pocket Creature Tamer DEMO/'
    const GBS = 'assets/gb_studio_tileset/Free/'

    // Terrain tiles — GB Studio (clear naming, correct colors)
    this.load.image('src_grass',      GBS + 'Nature/Grass_16x16.png')
    this.load.image('src_grass_tall', GBS + 'Nature/Grass_Tall_16x16.png')

    // Terrain tiles — Pocket Creature Tamer
    this.load.image('src_path',         PCT + 'Tilesets/path_05alt.png')   // brown earth path
    this.load.image('src_path_stone',   PCT + 'Tilesets/path_02.png')      // stone path (unused but loaded)
    this.load.image('src_plaza',        PCT + 'Tilesets/path_01alt.png')   // cream stone plaza
    this.load.image('src_flower_grass', PCT + 'Tilesets/path_04.png')
    this.load.image('src_flowers',      PCT + 'Enviroment/Vegetation/Flowers/flowers.png')
    this.load.image('src_tree',       GBS + 'Nature/Tree_Pine_4_16x32.png')
    this.load.image('src_rock',       GBS + 'Nature/Rock_big_1_16x16.png')
    this.load.image('src_sign',       GBS + 'Man made/Signs_16x16.png')

    // Buildings (Pocket Creature Tamer pre-made sprites)
    this.load.image('buildings', PCT + 'Enviroment/Buildings/premade_builds.png')

    // NPC base spritesheet (palette-swapped per NPC)
    this.load.spritesheet('player_npc_src', PCT + 'Characters/character01-Sheet.png', {
      frameWidth: 32,
      frameHeight: 32,
    })

    // Naman's overworld (non-battle) sprite
    this.load.image('naman_ow_raw', 'assets/naman_overworld.png')

    // Naman battle portrait
    this.load.image('naman_battle_raw', 'assets/naman_battle.png')
  }

  create() {
    const dbg = document.getElementById('boot-dbg')
    const _log = msg => { if (dbg) dbg.textContent = msg; console.log('[boot]', msg) }
    try {
      _log('create: tileset')
      this.buildTileset()
      _log('create: building frames')
      this.registerBuildingFrames()
      _log('create: player frames')
      this.registerPlayerFrames()
      _log('create: NPC textures (13)')
      this.createNPCTextures()
      _log('create: battle texture')
      this.createNamanBattleTexture()
      _log('create: done')
    } catch (e) {
      if (dbg) dbg.textContent = 'ERROR: ' + e.message
      console.error('BootScene create error:', e)
    }
    // Hide debug overlay a moment after transition (keep visible long enough to screenshot)
    setTimeout(() => {
      const el = document.getElementById('boot-dbg')
      if (el) el.remove()
    }, 4000)
    this.scene.launch('UIScene')
    this.scene.start('TitleScene')
  }

  createNamanBattleTexture() {
    const raw = this.textures.get('naman_battle_raw').getSourceImage()
    if (!raw) return

    // Pre-scale to display size first (132×170) — small canvas is fast for flood fill
    const TARGET_H = 170
    const scale = TARGET_H / raw.height
    const w = Math.round(raw.width * scale)
    const c = document.createElement('canvas')
    c.width = w; c.height = TARGET_H
    const ctx = c.getContext('2d')
    ctx.drawImage(raw, 0, 0, w, TARGET_H)

    // Flood-fill black background from all 4 edges → transparent.
    // Safe on mobile: operates on ~22K pixels (132×170), not the original large image.
    const id = ctx.getImageData(0, 0, w, TARGET_H)
    const d = id.data
    const visited = new Uint8Array(w * TARGET_H)
    const stack = []
    const push = px => {
      if (!visited[px] && d[px * 4] < 30 && d[px * 4 + 1] < 30 && d[px * 4 + 2] < 30) {
        visited[px] = 1
        stack.push(px)
      }
    }
    for (let x = 0; x < w; x++) { push(x); push((TARGET_H - 1) * w + x) }
    for (let y = 0; y < TARGET_H; y++) { push(y * w); push(y * w + w - 1) }
    while (stack.length > 0) {
      const px = stack.pop()
      d[px * 4 + 3] = 0
      const x = px % w, y = Math.floor(px / w)
      if (x > 0)            push(px - 1)
      if (x < w - 1)        push(px + 1)
      if (y > 0)            push(px - w)
      if (y < TARGET_H - 1) push(px + w)
    }
    ctx.putImageData(id, 0, 0)

    this.textures.addCanvas('naman_battle', c)
  }

  // Assemble the 8-col tileset atlas by copying 16×16 regions from real PNG sources.
  // No procedural pixel drawing — only ctx.drawImage from loaded textures.
  buildTileset() {
    const S = 16, COLS = 8, ROWS = 8
    const canvas = this.textures.createCanvas('tileset', COLS * S, ROWS * S)
    const ctx = canvas.getContext('2d')

    const stamp = (tileId, srcKey, srcX, srcY, srcW = S, srcH = S) => {
      const col = tileId % COLS
      const row = Math.floor(tileId / COLS)
      const img = this.textures.get(srcKey).getSourceImage()
      ctx.drawImage(img, srcX, srcY, srcW, srcH, col * S, row * S, S, S)
    }

    // Terrain (IDs 0-3, 15)
    stamp(0,  'src_grass',        0, 0)
    stamp(1,  'src_path',         0, 0)
    stamp(2,  'src_plaza',       80, 16)
    stamp(3,  'src_grass_tall',   0, 0)
    stamp(15, 'src_flower_grass', 0, 0)

    // Trees: 16×32 pine split into top (ID 16) and bottom (ID 18)
    stamp(16, 'src_tree', 0, 0,  S, S)   // top half
    stamp(18, 'src_tree', 0, S,  S, S)   // bottom half

    // Objects (IDs 20-23)
    stamp(20, 'src_grass_tall', 0, 0)    // bush = tall grass tile
    stamp(21, 'src_flowers',    0, 0)    // flower
    stamp(22, 'src_rock',       0, 0)
    stamp(23, 'src_sign',       0, 0)

    canvas.refresh()
  }

  // Register named sub-frames for each building sprite within premade_builds.png
  registerBuildingFrames() {
    const tex = this.textures.get('buildings')
    // Measured pixel boundaries: see premade_builds.png analysis
    tex.add('bldg_gray',  0, 24,  31, 80, 81)
    tex.add('bldg_red',   0, 120, 31, 96, 81)
    tex.add('bldg_brown', 0, 22, 132, 83, 77)
  }

  // Create palette-swapped NPC textures from the character01 base spritesheet.
  // Replaces hair-dark [158,85,94] and hair/outfit-mid [199,129,137] per NPC.
  createNPCTextures() {
    const src = this.textures.get('player_npc_src').getSourceImage()
    const srcC = document.createElement('canvas')
    srcC.width = src.width; srcC.height = src.height
    const sCtx = srcC.getContext('2d')
    sCtx.drawImage(src, 0, 0)
    const srcData = sCtx.getImageData(0, 0, srcC.width, srcC.height)

    for (const [key, pal] of Object.entries(NPC_PALETTES)) {
      const [r1, g1, b1] = pal.h1
      const [r2, g2, b2] = pal.h2
      const pixels = new Uint8ClampedArray(srcData.data)

      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2]
        if (r === 158 && g === 85  && b === 94)  { pixels[i]=r1; pixels[i+1]=g1; pixels[i+2]=b1 }
        if (r === 199 && g === 129 && b === 137) { pixels[i]=r2; pixels[i+1]=g2; pixels[i+2]=b2 }
        if (pal.body && r === 219 && g === 169 && b === 162) { pixels[i]=pal.body[0]; pixels[i+1]=pal.body[1]; pixels[i+2]=pal.body[2] }
        if (pal.hi   && r === 240 && g === 228 && b === 225) { pixels[i]=pal.hi[0];   pixels[i+1]=pal.hi[1];   pixels[i+2]=pal.hi[2]   }
      }

      const c = document.createElement('canvas')
      c.width = srcC.width; c.height = srcC.height
      c.getContext('2d').putImageData(new ImageData(pixels, c.width, c.height), 0, 0)
      this.textures.addCanvas(key, c)

      // Register frames identical to player layout
      const tex = this.textures.get(key)
      const rowMap = { down: 0, right: 1, up: 2 }
      for (const [dir, row] of Object.entries(rowMap)) {
        for (let f = 0; f < 4; f++) tex.add(`${dir}_${f}`, 0, f * 32, row * 32, 32, 32)
      }
      for (let f = 0; f < 4; f++) tex.add(`left_${f}`, 0, f * 32, 32, 32, 32)
    }
  }

  registerPlayerFrames() {
    const S   = 32
    const src = this.textures.get('player_npc_src').getSourceImage()
    const canvas = document.createElement('canvas')
    canvas.width = src.width; canvas.height = src.height
    canvas.getContext('2d').drawImage(src, 0, 0)

    if (this.textures.exists('player')) this.textures.remove('player')
    this.textures.addCanvas('player', canvas)

    const tex    = this.textures.get('player')
    const rowMap = { down: 0, left: 1, up: 2 }
    for (const [dir, row] of Object.entries(rowMap)) {
      for (let frame = 0; frame < 4; frame++) {
        tex.add(`${dir}_${frame}`, 0, frame * S, row * S, S, S)
      }
    }
    for (let frame = 0; frame < 4; frame++) {
      tex.add(`right_${frame}`, 0, frame * S, S, S, S)
    }
  }

}
