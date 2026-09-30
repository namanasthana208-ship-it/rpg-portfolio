import { EXTERIOR_NPCS } from '../data/npcs.js'

// Tile IDs — must match BootScene's buildTileset() stamp positions
const T = {
  GRASS: 0, PATH: 1, PLAZA: 2, DARK_GRASS: 3,
  FLOWER_GRASS: 15,
  TREE_TOP: 16,
  TREE_BOT: 18,
  BUSH: 20, FLOWER: 21, ROCK: 22, SIGN: 23,
}

const TILE   = 16
const MAP_W  = 40
const MAP_H  = 30
const MOVE_MS = 133

const BUILDINGS = [
  { gx: 14, gy: 3, frame: 'bldg_red', pw: 192, ph: 162, scale: 2 },
]

// Door tile positions — sprite pixel analysis: door is at sprite x=25-34 → game tiles 17-18
const DOOR_ROW = 12
const DOOR_X1  = 17
const DOOR_X2  = 18

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene')
    this.gridX = 17; this.gridY = 21
    this.isMoving = false
    this.moveProgress = 0
    this.playerDir = 'down'
    this.frameIdx = 0; this.frameTimer = 0
    this.npcs = []
    this.transitioning = false
    this._lastAdj = null
  }

  create() {
    this.game.events.emit('dialogue:reset')
    this.game.registry.set('inputLock', false)

    // When returning from interior, spawn in front of the door exit
    if (this.game.registry.get('fromInterior')) {
      this.gridX = 17
      this.gridY = 14
      this.game.registry.remove('fromInterior')
    } else {
      this.gridX = 17
      this.gridY = 21
    }

    const ground  = buildGroundMap()
    const objects = buildObjectsMap()
    this.collision = buildCollisionMap(ground, objects)

    this.renderMapLayer('ground_tex',  ground,  MAP_W, MAP_H)
    this.renderMapLayer('objects_tex', objects, MAP_W, MAP_H)

    this.add.image(0, 0, 'ground_tex').setOrigin(0, 0).setDepth(0)
    this.objImg = this.add.image(0, 0, 'objects_tex').setOrigin(0, 0).setDepth(5)

    this.renderBuildings()

    // Dark interior behind door — hidden until the door opens
    this.doorDark = this.add.graphics().setDepth(7).setVisible(false)
    this.doorDark.fillStyle(0x1a0a04, 1)
    this.doorDark.fillRect(DOOR_X1 * TILE, (DOOR_ROW - 2) * TILE, 2 * TILE, 3 * TILE)


    // Player
    const sx = this.gridX * TILE + TILE / 2
    const sy = this.gridY * TILE + TILE / 2
    this.player = this.add.sprite(sx, sy, 'player', 'down_0').setScale(2).setDepth(10)

    this.cameras.main.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE)
    this.cameras.main.centerOn(sx, sy)
    this.cameras.main.startFollow(this.player, true, 0.25, 0.25)
    this.cameras.main.fadeIn(350, 0, 0, 0)

    this.cursors = this.input.keyboard.createCursorKeys()
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W, down:  Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A, right: Phaser.Input.Keyboard.KeyCodes.D,
    })

    // Spawn exterior NPCs
    this.npcs = []
    for (const npc of EXTERIOR_NPCS) this._spawnNPC(npc)
    for (const npc of this.npcs) this.collision[npc.gy][npc.gx] = true

    // Listen for A-button / Z-key "interact" from UIScene
    this.game.events.on('interact', this._handleInteract, this)

    this.transitioning = false

    // Start overworld music
    window.audioMgr?.playTown()
  }

  shutdown() {
    this.game.events.off('interact', this._handleInteract, this)
    this.game.events.emit('npc-gone')
    if (this.textures.exists('ground_tex'))  this.textures.remove('ground_tex')
    if (this.textures.exists('objects_tex')) this.textures.remove('objects_tex')
    this.npcs = []
    this.transitioning = false
    this._lastAdj = null
  }

  // ─── NPC ──────────────────────────────────────────────────────────

  _spawnNPC(npcDef) {
    const { key, gx, gy, facing } = npcDef
    const x = gx * TILE + TILE / 2
    const y = gy * TILE + TILE / 2
    const sprDir = facing === 'left' ? 'right' : facing
    const sprite = this.add.sprite(x, y, key, `${sprDir}_0`).setScale(2).setDepth(10)
    if (facing === 'left') sprite.setFlipX(true)
    this.npcs.push({ ...npcDef, sprite, baseY: y, bobPhase: Math.random() * Math.PI * 2 })
  }

  _handleInteract() {
    if (this.isMoving || this.transitioning) return
    const deltas = { up:[0,-1], down:[0,1], left:[-1,0], right:[1,0] }
    const [dx, dy] = deltas[this.playerDir] ?? [0, 1]
    const fx = this.gridX + dx, fy = this.gridY + dy

    for (const npc of this.npcs) {
      if (npc.gx === fx && npc.gy === fy) {
        this._facePlayer(npc)
        this.game.events.emit('dialogue:open', {
          name: npc.name, pages: npc.pages, choice: npc.choice ?? null,
        })
        break
      }
    }
  }

  _facePlayer(npc) {
    const dx = this.gridX - npc.gx, dy = this.gridY - npc.gy
    const dir = Math.abs(dx) >= Math.abs(dy)
      ? (dx > 0 ? 'right' : 'left')
      : (dy > 0 ? 'down' : 'up')
    npc.sprite.setFrame(`${dir === 'left' ? 'right' : dir}_0`)
    npc.sprite.setFlipX(dir === 'left')
  }

  // ─── Buildings ────────────────────────────────────────────────────

  renderBuildings() {
    for (const b of BUILDINGS) {
      this.add.image(b.gx * TILE, b.gy * TILE, 'buildings', b.frame)
        .setOrigin(0, 0).setScale(b.scale ?? 1).setDepth(6)
    }
  }

  // ─── Movement ─────────────────────────────────────────────────────

  getDir() {
    if (this.game.registry.get('inputLock')) return null
    const c = this.cursors, w = this.wasd
    if (c.up.isDown    || w.up.isDown)    return 'up'
    if (c.down.isDown  || w.down.isDown)  return 'down'
    if (c.left.isDown  || w.left.isDown)  return 'left'
    if (c.right.isDown || w.right.isDown) return 'right'
    const joy = this.game.registry.get('joystickDir')
    if (joy) {
      if (joy.y < -0.5) return 'up'
      if (joy.y >  0.5) return 'down'
      if (joy.x < -0.5) return 'left'
      if (joy.x >  0.5) return 'right'
    }
    return null
  }

  tryMove(dir) {
    const dx = dir === 'right' ? 1 : dir === 'left' ? -1 : 0
    const dy = dir === 'down'  ? 1 : dir === 'up'   ? -1 : 0
    const nx = this.gridX + dx, ny = this.gridY + dy
    this.playerDir = dir
    if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H || this.collision[ny][nx]) return

    this.isMoving = true
    this.moveProgress = 0; this.frameTimer = 0
    this.moveFromX = this.player.x; this.moveFromY = this.player.y
    this.moveToX = nx * TILE + TILE / 2; this.moveToY = ny * TILE + TILE / 2
    this.frameIdx = 1
    this.gridX = nx; this.gridY = ny
    window.audioMgr?.footstep()
  }

  _enterInterior() {
    this.transitioning = true
    this.doorDark.setVisible(true)
    this.cameras.main.stopFollow()

    // Door panels slide apart
    const doorX   = DOOR_X1 * TILE
    const doorTop = (DOOR_ROW - 2) * TILE
    const panW    = TILE, panH = TILE * 3
    const mkPanel = (ox) => {
      const g = this.add.graphics().setDepth(30)
      g.fillStyle(0x5a2e0e, 1)
      g.fillRect(doorX + ox, doorTop, panW, panH)
      g.fillStyle(0x3a1a06, 1)
      g.fillRect(doorX + ox + (ox === 0 ? panW - 2 : 0), doorTop + 5, 2, panH - 10)
      return g
    }
    const leftPanel  = mkPanel(0)
    const rightPanel = mkPanel(panW)
    this.tweens.add({ targets: leftPanel,  x: -panW, duration: 280, ease: 'Power2' })
    this.tweens.add({ targets: rightPanel, x:  panW, duration: 280, ease: 'Power2' })

    // Player starts walking when door is halfway open
    this.time.delayedCall(180, () => {
      this.playerDir = 'up'
      this.player.setFrame('up_1')
      let toggle = false
      this.time.addEvent({
        delay: MOVE_MS / 2, repeat: 3,
        callback: () => { toggle = !toggle; this.player.setFrame(`up_${toggle ? 2 : 1}`) },
      })
      this.tweens.add({
        targets: this.player, y: this.player.y - TILE,
        duration: MOVE_MS, ease: 'Linear',
      })
    })

    // Fade to black once door is fully open
    this.time.delayedCall(360, () => {
      this.cameras.main.fadeOut(320, 0, 0, 0)
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('InteriorScene')
      })
    })
  }

  // ─── Update ───────────────────────────────────────────────────────

  update(time, delta) {
    if (this.transitioning) return

    if (this.isMoving) {
      this.moveProgress += Math.min(delta, MOVE_MS) / MOVE_MS

      if (this.moveProgress >= 1) {
        this.player.x = this.moveToX; this.player.y = this.moveToY
        this.isMoving = false; this.frameIdx = 0; this.frameTimer = 0

        // Door check
        if (this.gridY === DOOR_ROW && (this.gridX === DOOR_X1 || this.gridX === DOOR_X2)) {
          this._enterInterior(); return
        }

        const dir = this.getDir()
        if (dir) this.tryMove(dir)
      } else {
        const t = this.moveProgress
        this.player.x = this.moveFromX + (this.moveToX - this.moveFromX) * t
        this.player.y = this.moveFromY + (this.moveToY - this.moveFromY) * t
        this.frameTimer += delta
        if (this.frameTimer >= MOVE_MS / 2) {
          this.frameTimer = 0; this.frameIdx = this.frameIdx === 1 ? 2 : 1
        }
      }
    } else {
      const dir = this.getDir()
      if (dir) this.tryMove(dir)
      else this.frameIdx = 0
    }

    // Player sprite + Y-depth sort
    this.player.setFlipX(this.playerDir === 'left')
    this.player.setFrame(`${this.playerDir}_${this.frameIdx}`)
    this.player.setDepth(10 + this.player.y / 10000)
    for (const npc of this.npcs) {
      npc.sprite.y = npc.baseY + Math.sin(time / 800 * Math.PI + npc.bobPhase) * 2
      npc.sprite.setDepth(10 + npc.sprite.y / 10000)
    }
    this.objImg.setDepth(this.player.y < MAP_H * TILE * 0.55 ? 15 : 5)

    // Interaction hint
    const deltas = { up:[0,-1], down:[0,1], left:[-1,0], right:[1,0] }
    const [fdx, fdy] = deltas[this.playerDir] ?? [0, 1]
    const fx = this.gridX + fdx, fy = this.gridY + fdy
    const locked = this.game.registry.get('inputLock')
    let facingNPC = null
    for (const npc of this.npcs) {
      if (npc.gx === fx && npc.gy === fy) { facingNPC = npc; break }
    }
    const newAdj = !locked && !this.transitioning ? facingNPC : null
    if (newAdj !== this._lastAdj) {
      this._lastAdj = newAdj
      if (newAdj) {
        const cam = this.cameras.main
        this.game.events.emit('npc-adjacent', {
          x: newAdj.sprite.x - cam.scrollX,
          y: newAdj.sprite.y - cam.scrollY,
        })
      } else {
        this.game.events.emit('npc-gone')
      }
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
        if (id < 0) continue
        if (id === T.TREE_TOP) {
          // Draw full 16×32 tree at 32×48 starting AT the TREE_TOP row — leaves a 1-tile gap
          // above the canopy so the player at row (y-2) can't clip into the tree tip visually.
          ctx.drawImage(treeImg, 0, 0, 16, 32, x * TILE, y * TILE, 2 * TILE, 3 * TILE)
          continue
        }
        if (id === T.TREE_BOT) continue  // covered by TREE_TOP draw above
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

  // Trees render 2 tiles wide — block the right adjacent column too
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W - 1; x++) {
      if (objects[y][x] === T.TREE_TOP || objects[y][x] === T.TREE_BOT) {
        col[y][x + 1] = true
      }
      // Block the row above the canopy so the sprite doesn't clip into the tree top
      if (objects[y][x] === T.TREE_TOP && y > 0) {
        col[y - 1][x]     = true
        col[y - 1][x + 1] = true
      }
    }
  }

  return col
}
