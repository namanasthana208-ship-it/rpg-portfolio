const TILE    = 16
const CW      = 30
const CH      = 20
const MOVE_MS = 133
const FONT    = "'Press Start 2P', monospace"

export class ChamberScene extends Phaser.Scene {
  constructor() {
    super('ChamberScene')
    this.gridX     = 14
    this.gridY     = 15
    this.isMoving  = false
    this.moveProgress = 0
    this.playerDir = 'up'
    this.frameIdx  = 0
    this.frameTimer = 0
    this.exitCooldown   = true
    this.battleCooldown = false
    this.exiting   = false
    this._lastAdj  = null
    this.namanGx   = 14
    this.namanGy   = 4
  }

  create() {
    this.game.events.emit('dialogue:reset')
    if (!this.textures.exists('tileset_ch')) this._buildTileset()

    const ground = this._buildGroundMap()
    this.collision = this._buildCollision(ground)
    this.collision[this.namanGy][this.namanGx] = true
    this._renderGround(ground)

    this.add.image(0, 0, 'ch_ground').setOrigin(0, 0).setDepth(0)

    // Naman sprite
    this.namanSprite = this.add.sprite(
      this.namanGx * TILE + TILE / 2,
      this.namanGy * TILE + TILE / 2,
      'npc_naman', 'down_0'
    ).setScale(2).setDepth(10)

    // Floating name label
    this.namanLabel = this.add.text(
      this.namanGx * TILE + TILE / 2,
      this.namanGy * TILE - 18,
      '★ NAMAN',
      { fontFamily: FONT, fontSize: '7px', color: '#FFD700',
        stroke: '#000000', strokeThickness: 2 }
    ).setOrigin(0.5, 1).setDepth(50)

    // Player
    const sx = this.gridX * TILE + TILE / 2
    const sy = this.gridY * TILE + TILE / 2
    this.player = this.add.sprite(sx, sy, 'player', 'up_0').setScale(2).setDepth(10)

    // Camera
    this.cameras.main.setBounds(0, 0, CW * TILE, CH * TILE)
    this.cameras.main.fadeIn(350, 0, 0, 0)

    // Input
    this.cursors = this.input.keyboard.createCursorKeys()
    this.wasd    = this.input.keyboard.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.W,
      down:  Phaser.Input.Keyboard.KeyCodes.S,
      left:  Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    })

    this.game.events.on('interact', this._handleInteract, this)

    this.exitCooldown = true
    this.time.delayedCall(600, () => { this.exitCooldown = false })

    // Dramatic sting then resume ambient
    this.time.delayedCall(250, () => {
      window.audioMgr?.stopMusic()
      window.audioMgr?.playSting()
    })
    this.time.delayedCall(1400, () => window.audioMgr?.playTown())

    this.events.on('wake', this._onWake, this)
  }

  _onWake() {
    this.exiting = false
    this.isMoving = false
    this._lastAdj = null
    this.battleCooldown = true
    this.time.delayedCall(400, () => { this.battleCooldown = false })
    this.game.registry.set('inputLock', false)
    // Recreate keyboard keys — Phaser may drop them while the scene sleeps
    this.cursors = this.input.keyboard.createCursorKeys()
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W, down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A, right: Phaser.Input.Keyboard.KeyCodes.D,
    })
    this.cameras.main.setAlpha(1)
    this.game.events.emit('npc-gone')
    this.game.events.off('interact', this._handleInteract, this)
    this.game.events.on('interact', this._handleInteract, this)
    // Safety: re-clear inputLock after UIScene has had one frame to resume
    this.time.delayedCall(100, () => this.game.registry.set('inputLock', false))
    window.audioMgr?.playTown()
  }

  shutdown() {
    this.game.events.off('interact', this._handleInteract, this)
    this.events.off('wake', this._onWake, this)
    this.exiting = false
    this._lastAdj = null
    if (this.textures.exists('ch_ground')) this.textures.remove('ch_ground')
    if (this.textures.exists('tileset_ch')) this.textures.remove('tileset_ch')
  }

  // ─── Tileset ──────────────────────────────────────────────────────

  _buildTileset() {
    const S = TILE
    const canvas = document.createElement('canvas')
    canvas.width = 8 * S; canvas.height = S
    const ctx = canvas.getContext('2d')

    // 0 FLOOR: warm honey-wood planks
    ctx.fillStyle = '#d4b870'; ctx.fillRect(0, 0, S, S)
    ctx.fillStyle = '#b89040'
    for (let i = 4; i < S; i += 4) ctx.fillRect(0, i - 1, S, 1)
    ctx.fillStyle = '#e0c880'; ctx.fillRect(0, 0, S, 1)

    // 1 WALL: medium gym blue
    ctx.fillStyle = '#3060b0'; ctx.fillRect(S, 0, S, S)
    ctx.fillStyle = '#2050a0'; ctx.fillRect(S, S - 3, S, 3)
    ctx.fillStyle = '#4878c8'; ctx.fillRect(S, 2, S, 2)

    // 2 TRIM: gold band
    ctx.fillStyle = '#c89020'; ctx.fillRect(2 * S, 0, S, S)
    ctx.fillStyle = '#e0a828'; ctx.fillRect(2 * S, 0, S, 4)
    ctx.fillStyle = '#a07010'; ctx.fillRect(2 * S, S - 4, S, 4)

    // 3 EXIT: bright golden floor
    ctx.fillStyle = '#e0c870'; ctx.fillRect(3 * S, 0, S, S)
    ctx.fillStyle = '#c8a848'
    for (let i = 4; i < S; i += 4) ctx.fillRect(3 * S, i - 1, S, 1)

    this.textures.addCanvas('tileset_ch', canvas)
  }

  // ─── Map ──────────────────────────────────────────────────────────

  _buildGroundMap() {
    const map = []
    for (let y = 0; y < CH; y++) {
      const row = []
      for (let x = 0; x < CW; x++) {
        if (y <= 1 || y >= CH - 2 || x === 0 || x === CW - 1) {
          row.push(1)  // WALL
        } else if (y === 2 || y === CH - 3) {
          row.push(2)  // TRIM
        } else if (y === CH - 4 && x >= 13 && x <= 16) {
          row.push(3)  // EXIT
        } else {
          row.push(0)  // FLOOR
        }
      }
      map.push(row)
    }
    return map
  }

  _buildCollision(ground) {
    const solid = new Set([1, 2])
    return ground.map(row => row.map(id => solid.has(id)))
  }

  _renderGround(ground) {
    const canvas = document.createElement('canvas')
    canvas.width = CW * TILE; canvas.height = CH * TILE
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = false
    const ts = this.textures.get('tileset_ch').getSourceImage()

    for (let y = 0; y < CH; y++) {
      for (let x = 0; x < CW; x++) {
        const id = ground[y][x]
        ctx.drawImage(ts, id * TILE, 0, TILE, TILE, x * TILE, y * TILE, TILE, TILE)
      }
    }

    // Arena platform behind Naman (gym-leader podium feel) — hardcoded to namanGx=14, namanGy=4
    const ax = 12 * TILE
    const ay = 3 * TILE
    const aw = 5 * TILE, ah = 3 * TILE
    ctx.fillStyle = '#c8a030'
    ctx.fillRect(ax, ay, aw, ah)
    ctx.fillStyle = '#d4b048'
    ctx.fillRect(ax + 2, ay + 2, aw - 4, ah - 4)
    ctx.fillStyle = '#b88820'
    ctx.fillRect(ax, ay, aw, 2)
    ctx.fillRect(ax, ay + ah - 2, aw, 2)
    ctx.fillRect(ax, ay, 2, ah)
    ctx.fillRect(ax + aw - 2, ay, 2, ah)
    // Star in center
    ctx.fillStyle = '#ffe040'
    const sx = ax + aw / 2, sy = ay + ah / 2
    for (let a = 0; a < 8; a++) {
      const angle = (a * Math.PI) / 4
      const len = a % 2 === 0 ? 8 : 4
      ctx.fillRect(sx + Math.cos(angle) * len - 1, sy + Math.sin(angle) * len - 1, 2, 2)
    }
    ctx.fillRect(sx - 2, sy - 2, 4, 4)

    // South exit door arch (y=15-16, x=13-16)
    for (let x = 13; x <= 16; x++) {
      const px = x * TILE, pyA = 15 * TILE
      ctx.fillStyle = '#3a1806'; ctx.fillRect(px, pyA, TILE, TILE)
      ctx.fillStyle = '#5a2e10'; ctx.fillRect(px + 1, pyA + 1, TILE - 2, TILE - 2)
      const isLeft = x < 15
      ctx.fillStyle = '#3a1806'
      if (isLeft) ctx.fillRect(px + TILE - 2, pyA, 2, TILE)
      else ctx.fillRect(px, pyA, 2, TILE)
      ctx.fillStyle = '#d4af37'
      if (isLeft) ctx.fillRect(px + TILE - 5, pyA + 6, 3, 5)
      else ctx.fillRect(px + 2, pyA + 6, 3, 5)
    }

    if (this.textures.exists('ch_ground')) this.textures.remove('ch_ground')
    this.textures.addCanvas('ch_ground', canvas)
  }

  // ─── NPC / Interact ───────────────────────────────────────────────

  _handleInteract() {
    if (this.isMoving || this.exiting || this.battleCooldown) return
    const { dx, dy } = this._facingDelta()
    const tx = this.gridX + dx, ty = this.gridY + dy
    if (tx === this.namanGx && ty === this.namanGy) {
      this._faceNaman()
      this._startBattle()
    }
  }

  _faceNaman() {
    const dx = this.gridX - this.namanGx
    const dy = this.gridY - this.namanGy
    let dir = 'down'
    if (Math.abs(dx) >= Math.abs(dy)) dir = dx > 0 ? 'right' : 'left'
    else dir = dy > 0 ? 'down' : 'up'
    const fd = dir === 'left' ? 'right' : dir
    this.namanSprite.setFrame(`${fd}_0`)
    this.namanSprite.setFlipX(dir === 'left')
  }

  _startBattle() {
    this.exiting = true
    window.audioMgr?.stopMusic()
    this.game.events.off('interact', this._handleInteract, this)
    this.scene.setVisible(false, 'UIScene')
    this.scene.pause('UIScene')
    this.scene.launch('BattleScene', { from: 'ChamberScene' })
    this.scene.sleep('ChamberScene')
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
    if (nx < 0 || nx >= CW || ny < 0 || ny >= CH || this.collision[ny][nx]) return
    this.isMoving = true
    this.moveProgress = 0
    this.frameTimer = 0
    this.moveFromX = this.player.x
    this.moveFromY = this.player.y
    this.moveToX   = nx * TILE + TILE / 2
    this.moveToY   = ny * TILE + TILE / 2
    this.frameIdx  = 1
    this.gridX = nx; this.gridY = ny
  }

  // ─── Update ───────────────────────────────────────────────────────

  update(time, delta) {
    if (this.exiting) return

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

    // Player sprite
    const sprDir = this.playerDir === 'left' ? 'right' : this.playerDir
    this.player.setFlipX(this.playerDir === 'left')
    this.player.setFrame(`${sprDir}_${this.frameIdx}`)
    this.player.setDepth(10 + this.player.y / 10000)

    // Naman idle: slower bob (more dramatic) + label shimmer
    const namanBaseY = this.namanGy * TILE + TILE / 2
    this.namanSprite.y = namanBaseY + Math.sin(time / 600 * Math.PI) * 3
    this.namanSprite.setDepth(10 + this.namanSprite.y / 10000)
    this.namanLabel.setAlpha(0.7 + 0.3 * Math.sin(time / 400 * Math.PI))

    // Interaction hint
    const { dx, dy } = this._facingDelta()
    const fx = this.gridX + dx, fy = this.gridY + dy
    const locked = this.game.registry.get('inputLock')
    const adjacent = (!locked && fx === this.namanGx && fy === this.namanGy)
    if (adjacent !== this._lastAdj) {
      this._lastAdj = adjacent
      if (adjacent) this.game.events.emit('npc-adjacent', { x: this.namanSprite.x, y: this.namanSprite.y })
      else this.game.events.emit('npc-gone')
    }
  }

  // ─── Exit ─────────────────────────────────────────────────────────

  _exitToInterior() {
    this.exiting = true
    this.game.registry.set('interiorEntryPoint', { gx: 14, gy: 4, dir: 'down' })

    const doorX  = 13 * TILE
    const doorTop = (CH - 4) * TILE
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
      this.playerDir = 'down'
      this.player.setFrame('down_1')
      this.tweens.add({ targets: this.player, y: this.player.y + TILE, duration: MOVE_MS, ease: 'Linear' })
    })

    this.time.delayedCall(360, () => {
      this.cameras.main.fadeOut(300, 0, 0, 0)
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('InteriorScene')
      })
    })
  }

  // ─── Dramatic music sting ─────────────────────────────────────────

  _playSting() {
    const ACtx = window.AudioContext || window.webkitAudioContext
    if (!ACtx) return
    try {
      const ctx = new ACtx()
      const schedule = (freq, start, dur, vol = 0.25, type = 'square') => {
        const osc  = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.type = type; osc.frequency.value = freq
        const t = ctx.currentTime + start
        gain.gain.setValueAtTime(vol, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
        osc.start(t); osc.stop(t + dur + 0.02)
      }
      // Ascending dramatic motif (E minor feel)
      schedule(329.63, 0.00, 0.12)
      schedule(392.00, 0.09, 0.12)
      schedule(493.88, 0.18, 0.12)
      schedule(659.25, 0.27, 0.35)
      schedule(164.81, 0.00, 0.10, 0.18, 'sawtooth')
      schedule(196.00, 0.09, 0.10, 0.18, 'sawtooth')
      schedule(246.94, 0.18, 0.10, 0.18, 'sawtooth')
      schedule(329.63, 0.27, 0.30, 0.20, 'sawtooth')
    } catch (e) { /* audio not available */ }
  }
}
