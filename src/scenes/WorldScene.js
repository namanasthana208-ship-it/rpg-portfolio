// Shared base for every walkable scene (overworld, house, chamber):
// grid movement, NPCs, talk flow, interaction hint, camera and cleanup.

import { FONT, TILE, isTouchDevice, fitCameraBounds, getLayout } from '../layout.js'

export const STEP_MS = 140
// Character sheets put the feet 20px below the frame centre; lift them so a
// character stands on its own tile instead of the one below it.
export const SPRITE_Y = -12

const DELTA = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' }

export const tileX = gx => gx * TILE + TILE / 2
export const tileY = gy => gy * TILE + TILE / 2 + SPRITE_Y

export function frameFor(dir, idx) {
  return `${dir === 'left' ? 'right' : dir}_${idx}`
}

export function setFacing(sprite, dir, idx = 0) {
  sprite.setFrame(frameFor(dir, idx))
  sprite.setFlipX(dir === 'left')
}

export function dirToward(fromX, fromY, toX, toY) {
  const dx = toX - fromX, dy = toY - fromY
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left'
  return dy > 0 ? 'down' : 'up'
}

export class WorldScene extends Phaser.Scene {

  // ─── Setup ────────────────────────────────────────────────────────

  setupWorld({ cols, rows, collision, spawn, fadeMs = 350 }) {
    this.cols = cols
    this.rows = rows
    this.collision = collision
    this.gridX = spawn.gx
    this.gridY = spawn.gy
    this.playerDir = spawn.dir ?? 'down'
    this.isMoving = false
    this.busy = false
    this.npcs = []
    this._lastAdj = null
    this._foot = 0
    this._bumpAt = 0
    this._talking = null
    this.isTouch = isTouchDevice()

    this.playerShadow = this._makeShadow()
    this.player = this.add.sprite(tileX(this.gridX), tileY(this.gridY), 'player', frameFor(this.playerDir, 0))
      .setScale(2)
    this.player.setFlipX(this.playerDir === 'left')

    const cam = this.cameras.main
    cam.setRoundPixels(true)
    this._applyView()
    cam.startFollow(this.player, true, 1, 1)
    cam.setFollowOffset(0, SPRITE_Y)
    cam.fadeIn(fadeMs, 0, 0, 0)

    const K = Phaser.Input.Keyboard.KeyCodes
    const kb = this.input.keyboard
    this._dirKeys = {
      up:    [kb.addKey(K.UP),    kb.addKey(K.W)],
      down:  [kb.addKey(K.DOWN),  kb.addKey(K.S)],
      left:  [kb.addKey(K.LEFT),  kb.addKey(K.A)],
      right: [kb.addKey(K.RIGHT), kb.addKey(K.D)],
    }

    this._buildHint()

    const ev = this.game.events
    ev.on('interact', this._onInteract, this)
    ev.on('dialogue:closed', this._onDialogueClosed, this)
    ev.on('npc:sad', this._onNpcSad, this)
    this.scale.on('resize', this._onResize, this)
    this.events.once('shutdown', this._teardown, this)

    this.game.registry.set('inputLock', false)
    this.game.events.emit('dialogue:reset')
    this.game.events.emit('world:enter', this.scene.key)
  }

  _teardown() {
    const ev = this.game.events
    ev.off('interact', this._onInteract, this)
    ev.off('dialogue:closed', this._onDialogueClosed, this)
    ev.off('npc:sad', this._onNpcSad, this)
    this.scale.off('resize', this._onResize, this)
    ev.emit('npc-gone')
    this.npcs = []
    this._lastAdj = null
    this._talking = null
    this.onTeardown?.()
  }

  _onResize() {
    this._applyView()
    this.onResize?.()
  }

  // Portrait phones draw the world in the top view; the control deck owns the rest.
  _applyView() {
    const { view } = getLayout(this)
    const cam = this.cameras.main
    cam.setViewport(view.x, view.y, view.w, view.h)
    fitCameraBounds(cam, this.cols * TILE, this.rows * TILE)
  }

  _makeShadow() {
    return this.add.ellipse(0, 0, 18, 6, 0x000000, 0.22).setDepth(4)
  }

  // ─── NPCs ─────────────────────────────────────────────────────────

  addNPC(def, { wander = false } = {}) {
    const x = tileX(def.gx), y = tileY(def.gy)
    const shadow = this._makeShadow().setPosition(x, y + 20)
    const sprite = this.add.sprite(x, y, def.key, frameFor(def.facing, 0)).setScale(2)
    sprite.setFlipX(def.facing === 'left')
    const npc = {
      ...def, sprite, shadow,
      facing: def.facing, home: def.facing,
      baseY: y,
      bobPhase: Math.random() * Math.PI * 2,
      bobSpeed: 700 + Math.random() * 260,
      mood: null,
    }
    this.npcs.push(npc)
    this.collision[def.gy][def.gx] = true
    if (wander) this._scheduleWander(npc)
    return npc
  }

  faceNPC(npc, dir) {
    npc.facing = dir
    setFacing(npc.sprite, dir)
  }

  _scheduleWander(npc) {
    this.time.delayedCall(2200 + Math.random() * 2400, () => {
      if (!npc.sprite.active) return
      if (!npc.mood && npc !== this._talking && !npc.walking) {
        const dirs = ['down', 'left', 'right', 'up'].filter(d => d !== npc.facing)
        this.faceNPC(npc, dirs[Math.floor(Math.random() * dirs.length)])
      }
      this._scheduleWander(npc)
    })
  }

  // ─── Talking ──────────────────────────────────────────────────────

  _npcInFront() {
    const [dx, dy] = DELTA[this.playerDir]
    const fx = this.gridX + dx, fy = this.gridY + dy
    return this.npcs.find(n => n.gx === fx && n.gy === fy && !n.walking) ?? null
  }

  _onInteract() {
    if (this.busy || this.isMoving || this.game.registry.get('inputLock')) return
    if (this.time.now < (this._talkAgainAt ?? 0)) return
    const npc = this._npcInFront()
    if (npc) this.talkTo(npc)
  }

  talkTo(npc) {
    this.busy = true
    this.game.registry.set('inputLock', true)
    this._hideHint()
    this.faceNPC(npc, OPPOSITE[this.playerDir])
    this.popBubble(npc, () => {
      if (npc.onTalk) { npc.onTalk(npc); return }
      this._talking = npc
      this.game.events.emit('dialogue:open', { name: npc.name, pages: npc.pages, choice: npc.choice ?? null })
    })
  }

  popBubble(npc, then) {
    window.audioMgr?.bubble()
    const x = npc.sprite.x, y = npc.baseY - 16
    const g = this.add.container(x, y).setDepth(80)
    const box = this.add.graphics()
    box.fillStyle(0xffffff, 1).fillRoundedRect(-7, -16, 14, 15, 3)
    box.lineStyle(1.5, 0x283048, 1).strokeRoundedRect(-7, -16, 14, 15, 3)
    box.fillStyle(0xffffff, 1).fillTriangle(-3, -2, 3, -2, 0, 3)
    box.lineStyle(1.5, 0x283048, 1).lineBetween(-3, -1, 0, 3).lineBetween(3, -1, 0, 3)
    const mark = this.add.text(0, -8.5, '!', { fontFamily: FONT, fontSize: '9px', color: '#e03c3c' }).setOrigin(0.5)
    g.add([box, mark])
    g.setScale(0.2, 0.2)
    this.tweens.add({ targets: g, scaleX: 1, scaleY: 1, duration: 160, ease: 'Back.Out' })
    this.tweens.add({ targets: g, y: y - 3, duration: 90, yoyo: true, delay: 160, ease: 'Sine.Out' })
    this.time.delayedCall(560, () => {
      this.tweens.add({ targets: g, alpha: 0, scaleY: 0.6, duration: 90, onComplete: () => g.destroy() })
      then?.()
    })
  }

  _onDialogueClosed() {
    const npc = this._talking
    this._talking = null
    this.busy = false
    this._talkAgainAt = this.time.now + 300
    if (npc?.mood === 'sad') {
      this.time.delayedCall(2600, () => {
        if (!npc.sprite.active) return
        npc.mood = null
        this.faceNPC(npc, npc.home)
      })
    }
    this.onDialogueClosed?.(npc)
  }

  // Player said NO — the NPC turns away and slumps for a moment.
  _onNpcSad() {
    const npc = this._talking
    if (!npc) return
    npc.mood = 'sad'
    this.faceNPC(npc, this.playerDir)
  }

  // ─── Hint above the NPC you're facing ────────────────────────────

  _buildHint() {
    const label = this.isTouch ? 'A' : 'Z'
    this._hint = this.add.container(0, 0).setDepth(70).setVisible(false)
    const bg = this.add.graphics()
    const key = this.add.text(-10, 0, label, { fontFamily: FONT, fontSize: '6px', color: '#283048' }).setOrigin(0.5)
    const txt = this.add.text(6, 0, 'TALK', { fontFamily: FONT, fontSize: '6px', color: '#ffffff' }).setOrigin(0.5)
    bg.fillStyle(0x283048, 0.88).fillRoundedRect(-16, -6, 38, 12, 6)
    bg.fillStyle(0xffd34a, 1).fillCircle(-10, 0, 5)
    this._hint.add([bg, key, txt])
  }

  _showHint(npc) {
    this._hint.setPosition(npc.sprite.x, npc.baseY - 22).setVisible(true).setAlpha(0)
    this.tweens.killTweensOf(this._hint)
    this.tweens.add({ targets: this._hint, alpha: 1, y: npc.baseY - 25, duration: 160, ease: 'Sine.Out' })
  }

  _hideHint() {
    this.tweens.killTweensOf(this._hint)
    this._hint.setVisible(false)
  }

  // ─── Movement ─────────────────────────────────────────────────────

  getDir() {
    if (this.busy || this.game.registry.get('inputLock')) return null
    let best = null, bestT = -1
    for (const dir in this._dirKeys) {
      for (const k of this._dirKeys[dir]) {
        if (k.isDown && k.timeDown > bestT) { bestT = k.timeDown; best = dir }
      }
    }
    return best ?? this.game.registry.get('joyDir') ?? null
  }

  blocked(nx, ny) {
    return nx < 0 || ny < 0 || nx >= this.cols || ny >= this.rows || this.collision[ny][nx]
  }

  tryMove(dir, carry = 0) {
    this.playerDir = dir
    const [dx, dy] = DELTA[dir]
    const nx = this.gridX + dx, ny = this.gridY + dy
    if (this.blocked(nx, ny)) {
      setFacing(this.player, dir, 0)
      const now = this.time.now
      if (now - this._bumpAt > STEP_MS * 2) {
        this._bumpAt = now
        window.audioMgr?.bump()
      }
      return false
    }
    this.isMoving = true
    this.moveT = carry
    this.fromX = this.player.x; this.fromY = this.player.y
    this.toX = tileX(nx); this.toY = tileY(ny)
    this.gridX = nx; this.gridY = ny
    this._foot ^= 1
    window.audioMgr?.footstep()
    return true
  }

  // Walk an NPC along a list of directions, one tile at a time.
  walkNPC(npc, dirs, { stepMs = STEP_MS * 1.25, onDone } = {}) {
    npc.walking = true
    this.collision[npc.gy][npc.gx] = false
    let foot = 0
    const step = i => {
      if (i >= dirs.length || !npc.sprite.active) {
        npc.walking = false
        this.collision[npc.gy][npc.gx] = true
        onDone?.()
        return
      }
      const dir = dirs[i]
      const [dx, dy] = DELTA[dir]
      npc.gx += dx; npc.gy += dy
      npc.facing = dir
      foot ^= 1
      setFacing(npc.sprite, dir, foot ? 1 : 3)
      this.time.delayedCall(stepMs / 2, () => setFacing(npc.sprite, dir, 0))
      this.tweens.add({
        targets: npc, baseY: tileY(npc.gy), duration: stepMs, ease: 'Linear',
      })
      this.tweens.add({
        targets: [npc.sprite, npc.shadow], x: tileX(npc.gx), duration: stepMs, ease: 'Linear',
        onComplete: () => step(i + 1),
      })
    }
    step(0)
  }

  // ─── Update ───────────────────────────────────────────────────────

  update(time, delta) {
    if (!this.player) return

    if (this.isMoving) {
      this.moveT += delta / (this.game.registry.get('running') ? STEP_MS * 0.55 : STEP_MS)
      if (this.moveT >= 1) {
        const carry = Math.min(this.moveT - 1, 0.5)
        this.isMoving = false
        this.player.setPosition(this.toX, this.toY)
        setFacing(this.player, this.playerDir, 0)
        if (this.onStep?.()) { this._sync(time); return }
        const dir = this.getDir()
        if (dir) this.tryMove(dir, carry)
      } else {
        const t = this.moveT
        this.player.setPosition(this.fromX + (this.toX - this.fromX) * t, this.fromY + (this.toY - this.fromY) * t)
        // Fire Red step: stepping frame for the first half of the tile, alternating feet
        setFacing(this.player, this.playerDir, t < 0.5 ? (this._foot ? 1 : 3) : 0)
      }
    } else if (!this.busy) {
      const dir = this.getDir()
      if (dir) this.tryMove(dir)
    }

    this._sync(time)
  }

  _sync(time) {
    const p = this.player
    this.playerShadow.setPosition(p.x, p.y + 20)
    p.setDepth(10 + p.y / 10000)

    for (const npc of this.npcs) {
      const amp = npc.mood === 'sad' ? 0 : 1.5
      const sag = npc.mood === 'sad' ? 1.5 : 0
      npc.sprite.y = npc.baseY + sag + Math.sin(time / npc.bobSpeed * Math.PI + npc.bobPhase) * amp
      npc.shadow.y = npc.baseY + 20
      npc.sprite.setDepth(10 + npc.baseY / 10000)
    }

    const npc = (!this.busy && !this.isMoving && !this.game.registry.get('inputLock')) ? this._npcInFront() : null
    if (npc !== this._lastAdj) {
      this._lastAdj = npc
      if (npc) { this._showHint(npc); this.game.events.emit('npc-adjacent') }
      else { this._hideHint(); this.game.events.emit('npc-gone') }
    }
    this.onUpdate?.(time)
  }

  // ─── Doors & transitions ──────────────────────────────────────────

  // Door panels slide apart, the player walks one tile through, screen fades.
  doorTransition({ x, y, w, h, color = 0x5a2e10, dir, to, data, vanish = false }) {
    this.busy = true
    this.isMoving = false
    this.game.registry.set('inputLock', true)
    this._hideHint()
    window.audioMgr?.door()

    const half = w / 2
    const mk = ox => this.add.rectangle(x + ox + half / 2, y + h / 2, half, h, color).setDepth(9)
    const left = mk(0), right = mk(half)
    this.tweens.add({ targets: left,  x: left.x - half,  duration: 260, ease: 'Cubic.Out' })
    this.tweens.add({ targets: right, x: right.x + half, duration: 260, ease: 'Cubic.Out' })

    this.time.delayedCall(140, () => {
      const [dx, dy] = DELTA[dir]
      this.playerDir = dir
      this._foot ^= 1
      setFacing(this.player, dir, this._foot ? 1 : 3)
      this.time.delayedCall(STEP_MS / 2, () => setFacing(this.player, dir, 0))
      this.tweens.add({ targets: this.player, x: this.player.x + dx * TILE, y: this.player.y + dy * TILE, duration: STEP_MS, ease: 'Linear' })
      if (vanish) this.tweens.add({ targets: [this.player, this.playerShadow], alpha: 0, duration: STEP_MS * 1.4 })
    })

    this.time.delayedCall(300, () => this.fadeTo(to, data, 320))
  }

  fadeTo(key, data, ms = 320) {
    this.busy = true
    this.cameras.main.fadeOut(ms, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key, data))
  }
}
