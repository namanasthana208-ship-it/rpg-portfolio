import { INTERIOR_NPCS } from '../data/npcs.js'

// Interior is exactly 30×20 tiles = 480×320px — fills viewport, no camera scroll.
const TILE  = 16
const IW    = 30   // interior width  in tiles
const IH    = 20   // interior height in tiles
const MOVE_MS = 133

const TI = { WOOD: 0, WALL: 1, TRIM: 2, EXIT: 3, TABLE: 4, CHAIR: 5 }

export class InteriorScene extends Phaser.Scene {
  constructor() {
    super('InteriorScene')
    this.gridX = 14
    this.gridY = 15
    this.isMoving = false
    this.moveProgress = 0
    this.playerDir = 'up'
    this.frameIdx = 0
    this.frameTimer = 0
    this.npcs = []
    this.exitCooldown = true
    this.exiting = false
    this._lastAdj = null
    this._lastTalkedNPC = null
    this.chamberBlocked = true
  }

  create() {
    this.isMoving = false
    this.exiting = false
    this.moveProgress = 0

    this.game.events.emit('dialogue:reset')
    this.game.registry.set('inputLock', false)

    // Build interior tileset on first run
    if (!this.textures.exists('tileset_int')) this._buildTileset()

    // Restore spawn point when returning from chamber
    const entry = this.game.registry.get('interiorEntryPoint')
    if (entry) {
      this.gridX = entry.gx
      this.gridY = entry.gy
      this.playerDir = entry.dir
      this.game.registry.remove('interiorEntryPoint')
    } else {
      this.gridX = 14
      this.gridY = 15
      this.playerDir = 'up'
    }

    const ground  = this._buildGroundMap()
    const objects = this._buildObjectsMap()
    this.collision = this._buildCollisionMap(ground, objects)

    this._renderLayer('int_ground', ground)
    this._renderLayer('int_objects', objects)

    this.add.image(0, 0, 'int_ground').setOrigin(0, 0).setDepth(0)
    this.objImg = this.add.image(0, 0, 'int_objects').setOrigin(0, 0).setDepth(5)

    // Player
    const sx = this.gridX * TILE + TILE / 2
    const sy = this.gridY * TILE + TILE / 2
    this.player = this.add.sprite(sx, sy, 'player', `${this.playerDir === 'left' ? 'right' : this.playerDir}_0`)
      .setScale(2).setDepth(10)

    // Spawn NPCs (Raunak steps aside if already talked to)
    this.chamberBlocked = !this.game.registry.get('raunak_talked')
    for (const npcDef of INTERIOR_NPCS) {
      let def = npcDef
      if (def.key === 'npc_raunak' && !this.chamberBlocked) {
        def = { ...def, gx: 11 }
      }
      this._spawnNPC(def)
    }

    // Mark NPC tiles as solid
    for (const npc of this.npcs) this.collision[npc.gy][npc.gx] = true

    // Camera covers the whole room
    this.cameras.main.setBounds(0, 0, IW * TILE, IH * TILE)
    this.cameras.main.fadeIn(300, 0, 0, 0)

    // Input
    this.cursors = this.input.keyboard.createCursorKeys()
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    })

    // Game event listeners
    this.game.events.on('interact',        this._handleInteract,    this)
    this.game.events.on('dialogue:closed', this._onDialogueClosed,  this)
    this.game.events.on('cancel',          () => {},                this)

    this.exitCooldown = true
    this.time.delayedCall(600, () => { this.exitCooldown = false })
  }

  shutdown() {
    this.game.events.off('interact',        this._handleInteract,   this)
    this.game.events.off('dialogue:closed', this._onDialogueClosed, this)
    this.game.events.emit('npc-gone')
    if (this.textures.exists('int_ground'))   this.textures.remove('int_ground')
    if (this.textures.exists('int_objects'))  this.textures.remove('int_objects')
    this.npcs = []
    this.exiting = false
    this._lastAdj = null
    this._lastTalkedNPC = null
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

  // ─── NPC management ───────────────────────────────────────────────

  _spawnNPC(npcDef) {
    const { key, gx, gy, facing } = npcDef
    const x = gx * TILE + TILE / 2
    const y = gy * TILE + TILE / 2
    const dir = facing === 'left' ? 'right' : facing
    const sprite = this.add.sprite(x, y, key, `${dir}_0`)
      .setScale(2).setDepth(10)
    if (facing === 'left') sprite.setFlipX(true)
    const npcEntry = { ...npcDef, sprite, currentFacing: facing, baseY: y, bobPhase: Math.random() * Math.PI * 2 }
    this.npcs.push(npcEntry)
    this._scheduleNPCTurn(npcEntry)
  }

  _scheduleNPCTurn(npc) {
    this.time.delayedCall(2000 + Math.random() * 1500, () => {
      if (!this.game.registry.get('inputLock') && !this.exiting) {
        const dirs = ['down', 'left', 'right', 'up'].filter(d => d !== npc.currentFacing)
        const newDir = dirs[Math.floor(Math.random() * dirs.length)]
        const frameDir = newDir === 'left' ? 'right' : newDir
        npc.sprite.setFrame(`${frameDir}_0`)
        npc.sprite.setFlipX(newDir === 'left')
        npc.currentFacing = newDir
      }
      this._scheduleNPCTurn(npc)
    })
  }

  _handleInteract() {
    if (this.isMoving) return
    const { dx, dy } = this._facingDelta()
    const tx = this.gridX + dx, ty = this.gridY + dy

    for (const npc of this.npcs) {
      if (npc.gx === tx && npc.gy === ty) {
        this._facePlayer(npc)
        this._lastTalkedNPC = npc
        this.game.events.emit('dialogue:open', {
          name: npc.name, pages: npc.pages, choice: npc.choice ?? null,
        })
        break
      }
    }
  }

  _onDialogueClosed() {
    if (this._lastTalkedNPC?.key === 'npc_raunak' && this.chamberBlocked) {
      this.chamberBlocked = false
      this.game.registry.set('raunak_talked', true)
      const npc = this._lastTalkedNPC
      const targetX = 11 * TILE + TILE / 2
      const steps = Math.round(Math.abs(targetX - npc.sprite.x) / TILE)
      const duration = steps * MOVE_MS

      // Walk left with proper frame animation
      npc.sprite.setFlipX(true)
      npc.sprite.setFrame('right_1')
      let wf = 1
      this.time.addEvent({
        delay: MOVE_MS / 2,
        repeat: Math.ceil(duration / (MOVE_MS / 2)),
        callback: () => { wf = wf === 1 ? 2 : 1; npc.sprite.setFrame(`right_${wf}`) },
      })
      this.tweens.add({
        targets: npc.sprite, x: targetX,
        duration, ease: 'Linear',
        onComplete: () => { npc.sprite.setFrame('right_0') },
      })

      this.collision[npc.gy][14] = false
      npc.gx = 11
      this.collision[npc.gy][11] = true
    }
  }

  _facePlayer(npc) {
    const dx = this.gridX - npc.gx
    const dy = this.gridY - npc.gy
    let dir = 'down'
    if (Math.abs(dx) >= Math.abs(dy)) dir = dx > 0 ? 'right' : 'left'
    else dir = dy > 0 ? 'down' : 'up'

    const frameDir = dir === 'left' ? 'right' : dir
    npc.sprite.setFrame(`${frameDir}_0`)
    npc.sprite.setFlipX(dir === 'left')
    npc.currentFacing = dir
  }

  // ─── Movement ─────────────────────────────────────────────────────

  _facingDelta() {
    const map = { up: { dx: 0, dy: -1 }, down: { dx: 0, dy: 1 }, left: { dx: -1, dy: 0 }, right: { dx: 1, dy: 0 } }
    return map[this.playerDir] ?? { dx: 0, dy: 1 }
  }

  _getDir() {
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

  _tryMove(dir) {
    const dx = dir === 'right' ? 1 : dir === 'left' ? -1 : 0
    const dy = dir === 'down'  ? 1 : dir === 'up'   ? -1 : 0
    const nx = this.gridX + dx, ny = this.gridY + dy
    this.playerDir = dir
    if (nx < 0 || nx >= IW || ny < 0 || ny >= IH || this.collision[ny][nx]) return

    this.isMoving = true
    this.moveProgress = 0
    this.frameTimer = 0
    this.moveFromX = this.player.x
    this.moveFromY = this.player.y
    this.moveToX = nx * TILE + TILE / 2
    this.moveToY = ny * TILE + TILE / 2
    this.frameIdx = 1
    this.gridX = nx; this.gridY = ny
    window.audioMgr?.footstep()
  }

  // ─── Update ───────────────────────────────────────────────────────

  update(time, delta) {
    if (this.exiting) return

    // Movement
    if (this.isMoving) {
      this.moveProgress += Math.min(delta, MOVE_MS) / MOVE_MS
      if (this.moveProgress >= 1) {
        this.player.x = this.moveToX
        this.player.y = this.moveToY
        this.isMoving = false
        this.frameIdx = 0
        this.frameTimer = 0
        const dir = this._getDir()
        if (dir) this._tryMove(dir)
        // Check south exit
        if (!this.exitCooldown && this.gridY >= IH - 4 &&
            this.gridX >= 13 && this.gridX <= 16) {
          this._exitToExterior()
        }
        // Check north chamber door
        if (!this.exitCooldown && !this.chamberBlocked &&
            this.gridY <= 3 && this.gridX >= 13 && this.gridX <= 16) {
          this._enterChamber()
        }
      } else {
        const t = this.moveProgress
        this.player.x = this.moveFromX + (this.moveToX - this.moveFromX) * t
        this.player.y = this.moveFromY + (this.moveToY - this.moveFromY) * t
        this.frameTimer += delta
        if (this.frameTimer >= MOVE_MS / 2) {
          this.frameTimer = 0
          this.frameIdx = this.frameIdx === 1 ? 2 : 1
        }
      }
    } else {
      const dir = this._getDir()
      if (dir) this._tryMove(dir)
      else this.frameIdx = 0
    }

    // Player sprite + Y-depth sort
    const sprDir = this.playerDir === 'left' ? 'right' : this.playerDir
    this.player.setFlipX(this.playerDir === 'left')
    this.player.setFrame(`${sprDir}_${this.frameIdx}`)
    this.player.setDepth(10 + this.player.y / 10000)
    for (const npc of this.npcs) {
      // Idle bob — skip while Raunak walk tween is active (x-only tween, y is safe to set)
      npc.sprite.y = npc.baseY + Math.sin(time / 800 * Math.PI + npc.bobPhase) * 2
      npc.sprite.setDepth(10 + npc.sprite.y / 10000)
    }
    this.objImg.setDepth(this.player.y < IH * TILE * 0.5 ? 15 : 5)

    // Interaction hint
    const { dx, dy } = this._facingDelta()
    const fx = this.gridX + dx, fy = this.gridY + dy
    const locked = this.game.registry.get('inputLock')
    let facingNPC = null
    for (const npc of this.npcs) {
      if (npc.gx === fx && npc.gy === fy) { facingNPC = npc; break }
    }
    const newAdj = !locked ? facingNPC : null
    if (newAdj !== this._lastAdj) {
      this._lastAdj = newAdj
      if (newAdj) {
        this.game.events.emit('npc-adjacent', { x: newAdj.sprite.x, y: newAdj.sprite.y })
      } else {
        this.game.events.emit('npc-gone')
      }
    }
  }

  _enterChamber() {
    this.exiting = true
    const doorX  = 13 * TILE
    const doorTop = 1 * TILE
    const panW   = 2 * TILE

    const mkPanel = (ox) => {
      const g = this.add.graphics().setDepth(30)
      g.fillStyle(0x5a2e10, 1)
      g.fillRect(doorX + ox, doorTop, panW, 2 * TILE)
      return g
    }
    const leftPanel  = mkPanel(0)
    const rightPanel = mkPanel(panW)
    this.tweens.add({ targets: leftPanel,  x: -panW, duration: 280, ease: 'Power2' })
    this.tweens.add({ targets: rightPanel, x:  panW, duration: 280, ease: 'Power2' })

    this.time.delayedCall(180, () => {
      this.playerDir = 'up'
      this.player.setFrame('up_1')
      this.tweens.add({ targets: this.player, y: this.player.y - TILE, duration: MOVE_MS, ease: 'Linear' })
    })

    this.time.delayedCall(360, () => {
      this.cameras.main.fadeOut(300, 0, 0, 0)
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('ChamberScene')
      })
    })
  }

  _exitToExterior() {
    this.exitCooldown = true
    this.exiting = true

    // Door panels at the south exit (4 tiles wide, cols 13-16)
    const doorX  = 13 * TILE           // 208
    const doorTop = (IH - 4) * TILE    // row 16 = 256
    const panW   = 2 * TILE            // each panel is 2 tiles wide = 32px
    const panH   = 3 * TILE            // 3 rows tall = 48px

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

    this.time.delayedCall(180, () => {
      this.playerDir = 'down'
      this.player.setFrame('down_1')
      let toggle = false
      this.time.addEvent({
        delay: MOVE_MS / 2, repeat: 3,
        callback: () => { toggle = !toggle; this.player.setFrame(`down_${toggle ? 2 : 1}`) },
      })
      this.tweens.add({
        targets: this.player, y: this.player.y + TILE,
        duration: MOVE_MS, ease: 'Linear',
      })
    })

    this.time.delayedCall(360, () => {
      this.cameras.main.fadeOut(320, 0, 0, 0)
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.game.registry.set('fromInterior', true)
        this.scene.start('GameScene')
      })
    })
  }
}
