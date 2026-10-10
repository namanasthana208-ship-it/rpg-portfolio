import { INTERIOR_NPCS, GBA_PAGES } from '../data/npcs.js'
import { WorldScene } from './WorldScene.js'
import { TILE } from '../layout.js'

// 30×20 tiles. On wide phone screens the room sits centred in black, like Fire Red.
const IW = 30
const IH = 20

const TI = { WOOD: 0, WALL: 1, TRIM: 2, EXIT: 3, TABLE: 4, CHAIR: 5 }

export class InteriorScene extends WorldScene {
  constructor() { super('InteriorScene') }

  create() {
    if (!this.textures.exists('tileset_int')) this._buildTileset()

    const spawn = this.game.registry.get('interiorEntryPoint') ?? { gx: 14, gy: 15, dir: 'up' }
    this.game.registry.remove('interiorEntryPoint')

    const ground  = this._buildGroundMap()
    const objects = this._buildObjectsMap()
    const collision = this._buildCollisionMap(ground, objects)

    this._renderLayer('int_ground', ground)
    this._renderLayer('int_objects', objects)
    this.add.image(0, 0, 'int_ground').setOrigin(0, 0).setDepth(0)
    this._addDecor(collision)
    this.add.image(0, 0, 'int_objects').setOrigin(0, 0).setDepth(5)

    this.setupWorld({ cols: IW, rows: IH, collision, spawn, fadeMs: 300 })

    this.chamberOpen = !!this.game.registry.get('raunak_talked')
    for (const def of INTERIOR_NPCS) {
      const raunak = def.key === 'npc_raunak'
      const d = raunak && this.chamberOpen ? { ...def, gx: 11, facing: 'down' } : def
      const npc = this.addNPC(d, { wander: !raunak })
      if (raunak) this.raunak = npc
    }
    this.addInspectable({ ...this._gbaTile, pages: GBA_PAGES })

    window.audioMgr?.playTown()
  }

  // Rug, windows and plants so the room feels lived in.
  _addDecor(collision) {
    const T = TILE, g = this.add.graphics().setDepth(1)
    const rx = 8 * T + 4, ry = 8 * T + 4, rw = 14 * T - 8, rh = 6 * T - 8
    g.fillStyle(0x5a1e24, 1).fillRect(rx, ry, rw, rh)
    g.fillStyle(0x8a2c34, 1).fillRect(rx + 3, ry + 3, rw - 6, rh - 6)
    g.lineStyle(2, 0xd4a040, 1).strokeRect(rx + 7, ry + 7, rw - 14, rh - 14)
    g.fillStyle(0xd4a040, 1)
    for (let x = rx + 14; x < rx + rw - 10; x += 12) { g.fillRect(x, ry + 1, 4, 2); g.fillRect(x, ry + rh - 3, 4, 2) }

    for (const wx of [3, 25]) {
      const x = wx * T, y = 4
      g.fillStyle(0x2a1a10, 1).fillRect(x - 2, y - 2, 2 * T + 4, T + 12)
      g.fillStyle(0x9fd4f0, 1).fillRect(x, y, 2 * T, T + 8)
      g.fillStyle(0xd8f0ff, 1).fillRect(x + 3, y + 2, 6, T + 4)
      g.fillStyle(0x2a1a10, 1).fillRect(x + T - 1, y, 2, T + 8).fillRect(x, y + 11, 2 * T, 2)
      g.fillStyle(0x8a6040, 1).fillRect(x - 4, y + T + 8, 2 * T + 8, 3)
    }

    // A GBA on the side table — press A on it
    const gx = 2 * T, gy = 6 * T
    const gba = this.add.graphics().setDepth(6)
    gba.fillStyle(0x000000, 0.25).fillRoundedRect(gx + 2, gy + 6, 13, 7, 2)
    gba.fillStyle(0x4a3c8c, 1).fillRoundedRect(gx + 1, gy + 4, 14, 8, 3)
    gba.fillStyle(0x1a1a28, 1).fillRect(gx + 5, gy + 5, 6, 5)
    gba.fillStyle(0x9ad08a, 1).fillRect(gx + 6, gy + 6, 4, 3)
    gba.fillStyle(0x2a2050, 1).fillRect(gx + 2, gy + 7, 2, 1).fillRect(gx + 2.5, gy + 6.5, 1, 2)
    gba.fillStyle(0xd84848, 1).fillCircle(gx + 13, gy + 7, 0.9).fillCircle(gx + 12, gy + 9, 0.9)
    this._gbaTile = { gx: 2, gy: 6 }

    for (const [px, py] of [[2, 4], [27, 4], [2, 15], [27, 15]]) {
      const x = px * T, y = py * T
      const p = this.add.graphics().setDepth(5)
      p.fillStyle(0x000000, 0.2).fillEllipse(x + 8, y + 15, 14, 4)
      p.fillStyle(0xa0522d, 1).fillRect(x + 4, y + 9, 8, 6)
      p.fillStyle(0xc06838, 1).fillRect(x + 3, y + 8, 10, 2)
      p.fillStyle(0x2f7a3a, 1).fillCircle(x + 8, y + 3, 5).fillCircle(x + 4, y + 6, 4).fillCircle(x + 12, y + 6, 4)
      p.fillStyle(0x4aa458, 1).fillCircle(x + 7, y + 2, 2.5).fillCircle(x + 11, y + 5, 2)
      collision[py][px] = true
    }
  }

  onTeardown() {
    if (this.textures.exists('int_ground'))  this.textures.remove('int_ground')
    if (this.textures.exists('int_objects')) this.textures.remove('int_objects')
  }

  onStep() {
    const inDoorCols = this.gridX >= 13 && this.gridX <= 16
    if (inDoorCols && this.gridY >= IH - 4) {
      this.game.registry.set('fromInterior', true)
      this.doorTransition({ x: 13 * TILE, y: (IH - 4) * TILE, w: 4 * TILE, h: 3 * TILE, color: 0x5a2e0e, dir: 'down', to: 'GameScene' })
      return true
    }
    if (inDoorCols && this.gridY <= 3 && this.chamberOpen) {
      this.doorTransition({ x: 13 * TILE, y: TILE, w: 4 * TILE, h: 2 * TILE, color: 0x5a2e10, dir: 'up', to: 'ChamberScene', vanish: true })
      return true
    }
    return false
  }

  // Raunak finishes talking, then steps out of the doorway.
  onDialogueClosed(npc) {
    if (npc !== this.raunak || this.chamberOpen) return
    this.chamberOpen = true
    this.game.registry.set('raunak_talked', true)
    this.time.delayedCall(280, () => {
      this.walkNPC(npc, ['left', 'left', 'left'], {
        onDone: () => this.time.delayedCall(160, () => { this.faceNPC(npc, 'down'); npc.home = 'down' }),
      })
    })
  }

  // ─── Tileset (wood floor + wall) ─────────────────────────────────

  _buildTileset() {
    const S = TILE, C = 8
    const canvas = document.createElement('canvas')
    canvas.width = C * S; canvas.height = S * 4
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = false

    // TI.WOOD (0): warm wood plank
    ctx.fillStyle = '#c8933a'; ctx.fillRect(0, 0, S, S)
    ctx.fillStyle = '#a07228'
    for (let i = 5; i < S; i += 5) ctx.fillRect(0, i - 1, S, 1)
    ctx.fillStyle = '#b08232'
    ctx.fillRect(8, 0, 1, 5); ctx.fillRect(0, 5, 1, 5)
    ctx.fillRect(8, 10, 1, 5); ctx.fillRect(0, 15, 1, 1)

    // TI.WALL (1): dark brown wall
    ctx.fillStyle = '#4a3228'; ctx.fillRect(S, 0, S, S)
    ctx.fillStyle = '#3a2218'; ctx.fillRect(S, S - 3, S, 3)
    ctx.fillStyle = '#5a3e30'; ctx.fillRect(S, 2, S, 1)

    // TI.TRIM (2): lighter lower wall / wainscot
    ctx.fillStyle = '#8a6040'; ctx.fillRect(2 * S, 0, S, S)
    ctx.fillStyle = '#6a4828'; ctx.fillRect(2 * S, 0, S, 3)
    ctx.fillStyle = '#a87850'; ctx.fillRect(2 * S, 4, S, 1)

    // TI.EXIT (3): door/exit marker — same as wood but slightly lighter
    ctx.fillStyle = '#d8a848'; ctx.fillRect(3 * S, 0, S, S)
    ctx.fillStyle = '#b09040'
    for (let i = 5; i < S; i += 5) ctx.fillRect(3 * S, i - 1, S, 1)

    this.textures.addCanvas('tileset_int', canvas)
  }

  // ─── Map builders ─────────────────────────────────────────────────

  _buildGroundMap() {
    const map = []
    for (let y = 0; y < IH; y++) {
      const row = []
      for (let x = 0; x < IW; x++) {
        if (y <= 1 || y >= IH - 2 || x === 0 || x === IW - 1) {
          row.push(TI.WALL)
        } else if (y === 2 || y === IH - 3) {
          row.push(TI.TRIM)
        } else if (y === IH - 4 && x >= 13 && x <= 16) {
          row.push(TI.EXIT)  // door zone
        } else {
          row.push(TI.WOOD)
        }
      }
      map.push(row)
    }
    return map
  }

  _buildObjectsMap() {
    const map = Array.from({ length: IH }, () => new Array(IW).fill(-1))

    // Chamber door at top center (y=1-2, x=13-16)
    for (let x = 13; x <= 16; x++) {
      map[1][x] = 26  // door arch/lintel (on wall row)
      map[2][x] = 25  // door panels (on trim row)
    }

    // Bookshelf row near back wall (row 3, gap at center for door access)
    for (let x = 5; x <= 24; x++) {
      if (x >= 12 && x <= 17) continue  // wider center gap
      map[3][x] = 24
    }

    // Dining table (center, rows 10-11, cols 11-18)
    for (let x = 11; x <= 18; x++) {
      map[10][x] = TI.TABLE
      map[11][x] = TI.TABLE
    }
    // Chairs flanking the table
    for (let y = 10; y <= 11; y++) {
      map[y][9]  = TI.CHAIR  // left chairs
      map[y][20] = TI.CHAIR  // right chairs
    }
    // Chairs above and below table (pulled-out style)
    for (let x = 12; x <= 17; x++) {
      map[9][x]  = TI.CHAIR  // top row chairs
      map[12][x] = TI.CHAIR  // bottom row chairs
    }

    // Small side tables against left wall (row 6-7, col 2)
    map[6][2] = TI.TABLE
    map[7][2] = TI.TABLE

    return map
  }

  _buildCollisionMap(ground, objects) {
    const solid = new Set([TI.WALL, TI.TRIM])
    const solidObj = new Set([24, TI.TABLE, TI.CHAIR])
    return Array.from({ length: IH }, (_, y) =>
      Array.from({ length: IW }, (_, x) => {
        if (solid.has(ground[y][x])) return true
        if (objects[y] && solidObj.has(objects[y][x])) return true
        return false
      })
    )
  }

  _renderLayer(key, data) {
    const canvas = document.createElement('canvas')
    canvas.width  = IW * TILE
    canvas.height = IH * TILE
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = false
    const ts = this.textures.get('tileset_int').getSourceImage()
    const gbs = this.textures.get('tileset').getSourceImage()

    for (let y = 0; y < IH; y++) {
      for (let x = 0; x < IW; x++) {
        const id = data[y][x]
        if (id < 0) continue
        if (id < 8) {
          // Interior tileset (row 0, cols 0-7)
          ctx.drawImage(ts, id * TILE, 0, TILE, TILE, x * TILE, y * TILE, TILE, TILE)
        } else {
          // Shared tileset
          const sx = (id % 8) * TILE, sy = Math.floor(id / 8) * TILE
          ctx.drawImage(gbs, sx, sy, TILE, TILE, x * TILE, y * TILE, TILE, TILE)
        }
      }
    }
    // Draw shelves, tables, chairs as colored rects
    for (let y = 0; y < IH; y++) {
      for (let x = 0; x < IW; x++) {
        const id = data[y][x]
        const px = x * TILE, py = y * TILE
        if (id === 25) {
          // Chamber door opening (dark interior visible)
          ctx.fillStyle = '#1a0a04'; ctx.fillRect(px, py, TILE, TILE)
        } else if (id === 26) {
          // Door lintel/arch (top frame)
          ctx.fillStyle = '#2a1004'; ctx.fillRect(px, py, TILE, TILE)
          ctx.fillStyle = '#5a2e10'; ctx.fillRect(px + 1, py + TILE - 4, TILE - 2, 4)
          ctx.fillStyle = '#d4af37'; ctx.fillRect(px, py + TILE - 2, TILE, 1)
        } else if (id === 24) {
          // Bookshelf
          ctx.fillStyle = '#6b4226'; ctx.fillRect(px, py, TILE, TILE)
          ctx.fillStyle = '#8b5a30'; ctx.fillRect(px + 1, py + 4, TILE - 2, TILE - 8)
          ctx.fillStyle = '#553010'; ctx.fillRect(px, py + TILE - 2, TILE, 2)
        } else if (id === TI.TABLE) {
          // Dining table — dark oak top with edge highlight
          ctx.fillStyle = '#7a4e2d'; ctx.fillRect(px, py, TILE, TILE)
          ctx.fillStyle = '#9a6238'; ctx.fillRect(px + 1, py + 1, TILE - 2, 3)
          ctx.fillStyle = '#9a6238'; ctx.fillRect(px + 1, py + 1, 3, TILE - 2)
          ctx.fillStyle = '#5a3820'; ctx.fillRect(px, py + TILE - 2, TILE, 2)
          ctx.fillStyle = '#5a3820'; ctx.fillRect(px + TILE - 2, py, 2, TILE)
        } else if (id === TI.CHAIR) {
          // Chair — cushion on wood frame
          ctx.fillStyle = '#5a3820'; ctx.fillRect(px, py, TILE, TILE)
          ctx.fillStyle = '#c47840'; ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4)
          ctx.fillStyle = '#e09050'; ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 8)
        }
      }
    }
    if (this.textures.exists(key)) this.textures.remove(key)
    this.textures.addCanvas(key, canvas)
  }
}
