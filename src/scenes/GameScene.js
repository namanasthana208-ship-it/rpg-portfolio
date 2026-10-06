import { EXTERIOR_NPCS } from '../data/npcs.js'
import { WorldScene } from './WorldScene.js'
import { TILE } from '../layout.js'

// Tile IDs — must match BootScene's buildTileset() stamp positions
const T = {
  GRASS: 0, PATH: 1, PLAZA: 2, DARK_GRASS: 3,
  FLOWER_GRASS: 15,
  TREE_TOP: 16,
  TREE_BOT: 18,
  BUSH: 20, FLOWER: 21, ROCK: 22, SIGN: 23,
}

const MAP_W  = 40
const MAP_H  = 30

const BUILDINGS = [
  { gx: 14, gy: 3, frame: 'bldg_red', pw: 192, ph: 162, scale: 2 },
]

// Door tile positions — sprite pixel analysis: door is at sprite x=25-34 → game tiles 17-18
const DOOR_ROW = 12
const DOOR_X1  = 17
const DOOR_X2  = 18

export class GameScene extends WorldScene {
  constructor() { super('GameScene') }

  create() {
    const fromInterior = this.game.registry.get('fromInterior')
    this.game.registry.remove('fromInterior')
    const spawn = fromInterior ? { gx: 17, gy: 14, dir: 'down' } : { gx: 17, gy: 21, dir: 'up' }

    const ground  = buildGroundMap()
    const objects = buildObjectsMap()
    const collision = buildCollisionMap(ground, objects)

    this.renderMapLayer('ground_tex',  ground,  MAP_W, MAP_H)
    this.renderMapLayer('objects_tex', objects, MAP_W, MAP_H)
    this.add.image(0, 0, 'ground_tex').setOrigin(0, 0).setDepth(0)
    this.add.image(0, 0, 'objects_tex').setOrigin(0, 0).setDepth(5)
    this.renderBuildings()

    // Dark doorway revealed when the door slides open
    this.doorDark = this.add.rectangle(DOOR_X1 * TILE, (DOOR_ROW - 2) * TILE, 2 * TILE, 3 * TILE, 0x1a0a04)
      .setOrigin(0, 0).setDepth(7).setVisible(false)

    this.setupWorld({ cols: MAP_W, rows: MAP_H, collision, spawn })
    for (const npc of EXTERIOR_NPCS) this.addNPC(npc)

    window.audioMgr?.playTown()
  }

  onTeardown() {
    if (this.textures.exists('ground_tex'))  this.textures.remove('ground_tex')
    if (this.textures.exists('objects_tex')) this.textures.remove('objects_tex')
  }

  onStep() {
    if (this.gridY === DOOR_ROW && (this.gridX === DOOR_X1 || this.gridX === DOOR_X2)) {
      this.doorDark.setVisible(true)
      this.doorTransition({
        x: DOOR_X1 * TILE, y: (DOOR_ROW - 2) * TILE, w: 2 * TILE, h: 3 * TILE,
        color: 0x5a2e0e, dir: 'up', to: 'InteriorScene', vanish: true,
      })
      return true
    }
    return false
  }

  renderBuildings() {
    for (const b of BUILDINGS) {
      this.add.image(b.gx * TILE, b.gy * TILE, 'buildings', b.frame)
        .setOrigin(0, 0).setScale(b.scale ?? 1).setDepth(6)
    }
  }

  // ─── Map layer renderer ───────────────────────────────────────────

  renderMapLayer(key, data, mw, mh) {
    const canvas = document.createElement('canvas')
    canvas.width = mw * TILE; canvas.height = mh * TILE
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = false

    const tsCanvas = this.textures.get('tileset').getSourceImage()
    const treeImg  = this.textures.get('src_tree').getSourceImage()

    for (let y = 0; y < mh; y++) {
      for (let x = 0; x < mw; x++) {
        const id = data[y][x]
        if (id < 0 || id === T.TREE_BOT) continue
        if (id === T.TREE_TOP) {
          ctx.drawImage(treeImg, 0, 0, 16, 32, x * TILE, y * TILE, 2 * TILE, 3 * TILE)
          continue
        }
        const srcX = (id % 8) * TILE, srcY = Math.floor(id / 8) * TILE
        ctx.drawImage(tsCanvas, srcX, srcY, TILE, TILE, x * TILE, y * TILE, TILE, TILE)
      }
    }
    if (this.textures.exists(key)) this.textures.remove(key)
    this.textures.addCanvas(key, canvas)
  }
}

// ─── Map builders ─────────────────────────────────────────────────────

function buildGroundMap() {
  const map = Array.from({ length: MAP_H }, () => new Array(MAP_W).fill(T.GRASS))

  // Stone path: y=12 is the door tile, y=13-22 leads to player spawn
  for (let y = 12; y <= 22; y++) {
    map[y][17] = T.PATH
    map[y][18] = T.PATH
  }

  // Paved frontage plaza in front of the building (removes grass in that strip)
  for (let x = 14; x <= 25; x++) {
    map[13][x] = T.PATH
    map[14][x] = T.PATH
  }

  const flowers = [[4,5],[8,3],[11,7],[6,13],[3,18],[8,21],[10,25],[29,5],[33,3],
                   [36,8],[32,13],[37,18],[30,22],[35,26],[16,25],[23,25]]
  for (const [fx, fy] of flowers) {
    if (map[fy]?.[fx] === T.GRASS) map[fy][fx] = T.FLOWER_GRASS
  }
  return map
}

function buildObjectsMap() {
  const map = Array.from({ length: MAP_H }, () => new Array(MAP_W).fill(-1))

  function inBuilding(tx, ty) {
    return BUILDINGS.some(b => {
      const tw = Math.ceil(b.pw / TILE), th = Math.ceil(b.ph / TILE)
      return tx >= b.gx && tx < b.gx + tw && ty >= b.gy && ty < b.gy + th
    })
  }

  function tree(tx, ty) {
    if (tx < 0 || ty < 0 || ty + 1 >= MAP_H || tx >= MAP_W) return
    if (inBuilding(tx, ty) || inBuilding(tx, ty + 1)) return
    if (tx === 19 || tx === 20) return
    map[ty][tx] = T.TREE_TOP; map[ty + 1][tx] = T.TREE_BOT
  }

  for (let x = 0; x <= 38; x += 2) { if (x < 18 || x > 20) tree(x, 0) }
  for (let y = 3; y <= 28; y += 4) tree(0, y)
  for (let y = 3; y <= 28; y += 4) tree(39, y)
  for (let x = 0; x <= 38; x += 2) tree(x, 27)

  const leftTrees  = [[8,3],[8,7],[10,15],[7,15],[7,19],[10,19],[7,23],[10,26]]
  const rightTrees = [[27,3],[31,3],[27,7],[31,7],[29,15],[33,15],[29,19],[33,19],[29,23],[33,26]]
  const lowerTrees = [[14,22],[23,22],[15,26],[22,26]]
  for (const [tx, ty] of [...leftTrees, ...rightTrees, ...lowerTrees]) tree(tx, ty)

  map[15][14] = T.BUSH; map[15][25] = T.BUSH
  map[7][8]   = T.ROCK; map[7][30]  = T.ROCK

  return map
}

function buildCollisionMap(ground, objects) {
  const solidTiles = new Set([T.TREE_TOP, T.TREE_BOT, T.BUSH, T.ROCK, T.SIGN])

  const col = Array.from({ length: MAP_H }, (_, y) =>
    Array.from({ length: MAP_W }, (_, x) => {
      if (x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1) return true
      for (const b of BUILDINGS) {
        const tiles_w = Math.ceil(b.pw / TILE)
        const tiles_h = Math.floor(b.ph / TILE)
        if (x >= b.gx && x < b.gx + tiles_w && y >= b.gy && y < b.gy + tiles_h) {
          if (y === DOOR_ROW && (x === DOOR_X1 || x === DOOR_X2)) return false
          return true
        }
      }
      return objects[y][x] !== -1 && solidTiles.has(objects[y][x])
    })
  )

  // Trees are drawn 2 tiles wide × 3 tall — the whole footprint is solid, so a
  // character can only ever overlap a tree from the front.
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (objects[y][x] !== T.TREE_TOP) continue
      for (let ty = y; ty <= Math.min(y + 2, MAP_H - 1); ty++) {
        col[ty][x] = true
        if (x + 1 < MAP_W) col[ty][x + 1] = true
      }
    }
  }

  return col
}
