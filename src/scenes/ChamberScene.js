import { FONT, TILE } from '../layout.js'
import { WorldScene, tileX, tileY } from './WorldScene.js'

const CW = 30
const CH = 20
const NAMAN = { gx: 14, gy: 4 }
const BRAZIERS = [[6, 6], [23, 6], [6, 12], [23, 12]]
const BANNERS = [9, 20]

export class ChamberScene extends WorldScene {
  constructor() { super('ChamberScene') }

  create() {
    this._makeFxTextures()
    this._renderRoom()
    this.add.image(0, 0, 'ch_ground').setOrigin(0, 0).setDepth(0)

    const collision = this._buildCollision()
    this.setupWorld({ cols: CW, rows: CH, collision, spawn: { gx: 14, gy: 15, dir: 'up' }, fadeMs: 900 })

    this._buildLights()

    this.naman = this.addNPC({
      key: 'npc_naman', name: 'NAMAN', gx: NAMAN.gx, gy: NAMAN.gy, facing: 'down',
      onTalk: () => this._startBattle(),
    })
    this._buildAura()

    this.label = this.add.text(tileX(NAMAN.gx), tileY(NAMAN.gy) - 34, '★ NAMAN ★', {
      fontFamily: FONT, fontSize: '7px', color: '#ffd34a',
    }).setOrigin(0.5, 1).setDepth(75).setShadow(1, 1, '#000000', 0, false, true)

    this._buildVignette()

    // The reveal: music drops out, the sting hits as the room fades up and the aura flares
    window.audioMgr?.stopMusic(0.25)
    this.time.delayedCall(140, () => {
      window.audioMgr?.sting()
      this.aura.setAlpha(1).setScale(2.6)
      this.tweens.add({ targets: this.aura, scale: 1.3, alpha: 0.22, duration: 1100, ease: 'Cubic.Out' })
      this.cameras.main.shake(260, 0.004)
    })
    this.time.delayedCall(1700, () => { if (!this.busy) window.audioMgr?.playChamber() })

    this.events.on('wake', this._onWake, this)
  }

  onTeardown() {
    this.events.off('wake', this._onWake, this)
    if (this.textures.exists('ch_ground')) this.textures.remove('ch_ground')
    if (this.textures.exists('ch_vignette')) this.textures.remove('ch_vignette')
  }

  onResize() { this._buildVignette() }

  onStep() {
    if (this.gridY >= CH - 4 && this.gridX >= 13 && this.gridX <= 16) {
      this.game.registry.set('interiorEntryPoint', { gx: 14, gy: 4, dir: 'down' })
      this.doorTransition({ x: 13 * TILE, y: (CH - 4) * TILE, w: 4 * TILE, h: 2 * TILE, color: 0x3a1806, dir: 'down', to: 'InteriorScene' })
      return true
    }
    return false
  }

  onUpdate(time) {
    this.label.setAlpha(this._lastAdj ? 0 : 0.75 + 0.25 * Math.sin(time / 380))
    this.label.y = this.naman.sprite.y - 33
    this.aura.y = this.naman.sprite.y + 4
    for (const b of this._braziers) {
      b.glow.setAlpha(0.32 + Math.random() * 0.08 + 0.06 * Math.sin(time / 90 + b.phase))
    }
  }

  // ─── Battle hand-off ──────────────────────────────────────────────

  _startBattle() {
    this.game.registry.set('joyDir', null)
    this.game.events.emit('npc-gone')
    this.scene.setVisible(false, 'UIScene')
    this.scene.pause('UIScene')
    this.scene.launch('BattleScene', { from: 'ChamberScene' })
    this.scene.bringToTop('BattleScene')
  }

  _onWake() {
    this.busy = false
    this.isMoving = false
    this._lastAdj = null
    this.game.registry.set('inputLock', false)
    this.game.registry.set('joyDir', null)
    this.cameras.main.resetFX()
    this.cameras.main.fadeIn(500, 0, 0, 0)
    window.audioMgr?.playChamber()
  }

  // ─── Room ─────────────────────────────────────────────────────────

  _buildCollision() {
    const col = Array.from({ length: CH }, (_, y) =>
      Array.from({ length: CW }, (_, x) => y <= 2 || y >= CH - 3 || x === 0 || x === CW - 1))
    for (const [bx, by] of BRAZIERS) col[by][bx] = true
    return col
  }

  _renderRoom() {
    const c = document.createElement('canvas')
    c.width = CW * TILE; c.height = CH * TILE
    const ctx = c.getContext('2d')
    const T = TILE
    const rect = (col, x, y, w, h) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h) }

    // Stone floor — dark, cool, subtle checker
    for (let y = 0; y < CH; y++) {
      for (let x = 0; x < CW; x++) {
        const px = x * T, py = y * T
        rect((x + y) % 2 ? '#1b1830' : '#201c38', px, py, T, T)
        rect('#2a2546', px, py, T, 1)
        rect('#14111f', px, py + T - 1, T, 1)
      }
    }

    // Back wall + gold trim
    for (let x = 0; x < CW; x++) {
      const px = x * T
      rect('#100c20', px, 0, T, 2 * T)
      rect('#191430', px + 1, 2, T - 2, 2 * T - 6)
      rect('#0a0816', px, 2 * T - 3, T, 3)
      rect('#7a5a14', px, 2 * T, T, T)
      rect('#c8a040', px, 2 * T, T, 2)
      rect('#4a360a', px, 3 * T - 3, T, 3)
    }
    // Side and front walls
    for (let y = 0; y < CH; y++) {
      rect('#100c20', 0, y * T, T, T)
      rect('#100c20', (CW - 1) * T, y * T, T, T)
    }
    for (let x = 0; x < CW; x++) {
      rect('#7a5a14', x * T, (CH - 3) * T, T, T)
      rect('#c8a040', x * T, (CH - 3) * T, T, 2)
      rect('#100c20', x * T, (CH - 2) * T, T, 2 * T)
    }

    // Banners
    for (const bx of BANNERS) {
      const px = bx * T
      rect('#5a121c', px + 1, 0, T * 2 - 2, 2 * T + 10)
      rect('#8a1c2a', px + 3, 0, T * 2 - 6, 2 * T + 6)
      ctx.fillStyle = '#5a121c'
      ctx.beginPath(); ctx.moveTo(px + 3, 2 * T + 6); ctx.lineTo(px + T, 2 * T + 14); ctx.lineTo(px + 2 * T - 3, 2 * T + 6); ctx.fill()
      rect('#d4af37', px + T - 3, 12, 6, 6)
      rect('#d4af37', px + T - 1, 8, 2, 14)
      rect('#d4af37', px + T - 7, 14, 14, 2)
    }

    // Red carpet runner from the door to the podium
    const cx0 = 13 * T, cw = 4 * T
    rect('#5a121c', cx0, 5 * T, cw, (CH - 8) * T)
    rect('#8a1c2a', cx0 + 3, 5 * T, cw - 6, (CH - 8) * T)
    rect('#c8a040', cx0 + 3, 5 * T, 2, (CH - 8) * T)
    rect('#c8a040', cx0 + cw - 5, 5 * T, 2, (CH - 8) * T)

    // Gold podium
    const ax = 12 * T, ay = 3 * T, aw = 5 * T, ah = 3 * T
    rect('#5a420e', ax - 2, ay - 2, aw + 4, ah + 4)
    rect('#8a6a14', ax, ay, aw, ah)
    rect('#b08a24', ax + 2, ay + 2, aw - 4, ah - 6)
    rect('#e0c060', ax + 2, ay + 2, aw - 4, 2)
    rect('#7a5a14', ax, ay + ah - 4, aw, 4)

    // Brazier stands
    for (const [bx, by] of BRAZIERS) {
      const px = bx * T, py = by * T
      rect('#0c0a14', px + 3, py + 13, 10, 3)
      rect('#3a3048', px + 6, py + 6, 4, 8)
      rect('#5a4a2a', px + 2, py + 2, 12, 5)
      rect('#c8a040', px + 2, py + 2, 12, 1)
    }

    // Exit doorway
    for (let x = 13; x <= 16; x++) rect('#2a0e04', x * T, (CH - 3) * T, T, T)
    rect('#d4af37', 13 * T, (CH - 3) * T, 4 * T, 1)

    if (this.textures.exists('ch_ground')) this.textures.remove('ch_ground')
    this.textures.addCanvas('ch_ground', c)
  }

  // ─── Light & FX ───────────────────────────────────────────────────

  _makeFxTextures() {
    if (!this.textures.exists('fx_glow')) {
      const c = document.createElement('canvas'); c.width = c.height = 64
      const ctx = c.getContext('2d')
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
      g.addColorStop(0, 'rgba(255,255,255,1)')
      g.addColorStop(0.35, 'rgba(255,255,255,0.45)')
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64)
      this.textures.addCanvas('fx_glow', c)
    }
    if (!this.textures.exists('fx_spark')) {
      const g = this.make.graphics({ add: false })
      g.fillStyle(0xffffff, 1).fillRect(1, 0, 1, 3).fillRect(0, 1, 3, 1)
      g.generateTexture('fx_spark', 3, 3)
      g.destroy()
    }
  }

  _buildLights() {
    this._braziers = BRAZIERS.map(([bx, by], i) => {
      const x = bx * TILE + TILE / 2, y = by * TILE
      const glow = this.add.image(x, y + 2, 'fx_glow').setTint(0xff9a30).setBlendMode('ADD').setScale(2.2).setDepth(55)
      const flame = this.add.graphics().setPosition(x, y + 3).setDepth(11)
      flame.fillStyle(0xff6a1a, 1).fillTriangle(-5, 0, 5, 0, 0, -11)
      flame.fillStyle(0xffd34a, 1).fillTriangle(-3, 0, 3, 0, 0, -7)
      this.tweens.add({ targets: flame, scaleY: 0.75, scaleX: 1.1, duration: 140 + i * 17, yoyo: true, repeat: -1, ease: 'Sine.InOut' })
      return { glow, phase: i * 1.7 }
    })
  }

  _buildAura() {
    const x = this.naman.sprite.x, y = this.naman.sprite.y
    this.floorGlow = this.add.image(x, tileY(NAMAN.gy) + 22, 'fx_glow').setTint(0xffc83a)
      .setBlendMode('ADD').setScale(2.2, 0.8).setAlpha(0.22).setDepth(3)
    this.aura = this.add.image(x, y + 4, 'fx_glow').setTint(0xffb830).setBlendMode('ADD')
      .setScale(1.3).setAlpha(0).setDepth(9)
    this.tweens.add({ targets: this.aura, alpha: { from: 0.22, to: 0.42 }, scale: { from: 1.3, to: 1.55 }, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: 1300 })
    this.tweens.add({ targets: this.floorGlow, alpha: 0.38, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.InOut' })

    this.add.particles(x, tileY(NAMAN.gy) + 16, 'fx_spark', {
      x: { min: -16, max: 16 }, y: { min: -4, max: 4 },
      speedY: { min: -30, max: -12 }, speedX: { min: -5, max: 5 },
      lifespan: 1500, frequency: 140,
      alpha: { start: 1, end: 0 }, scale: { start: 1.2, end: 0.4 },
      tint: [0xffd34a, 0xfff2b0, 0xffb020], blendMode: 'ADD',
    }).setDepth(12)
  }

  _buildVignette() {
    const W = this.cameras.main.width, H = this.cameras.main.height
    const c = document.createElement('canvas'); c.width = W; c.height = H
    const ctx = c.getContext('2d')
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.22, W / 2, H / 2, Math.max(W, H) * 0.72)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, 'rgba(0,0,8,0.72)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    if (this.textures.exists('ch_vignette')) {
      this.vignette?.destroy()
      this.textures.remove('ch_vignette')
    }
    this.textures.addCanvas('ch_vignette', c)
    this.vignette = this.add.image(0, 0, 'ch_vignette').setOrigin(0, 0).setScrollFactor(0).setDepth(60)
  }
}
