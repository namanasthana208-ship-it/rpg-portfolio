// The wild encounter: flash → diagonal wipe → shutters open → Naman slides in as a
// silhouette, colours in with a cry → "A wild NAMAN appeared!" → 2×2 battle menu.

import { FONT, isTouchDevice, getLayout } from '../layout.js'
import { TouchStick } from '../ui/TouchStick.js'
import { openPortfolio } from '../ui/portfolio.js'

const OPTIONS = [
  { label: 'PORTFOLIO', tab: 'exp' },
  { label: 'SKILLS', tab: 'skills' },
  { label: 'CONTACT', tab: 'contact' },
  { label: 'RUN', run: true },
]

export class BattleScene extends Phaser.Scene {
  constructor() { super({ key: 'BattleScene' }) }

  init(data) {
    this.fromScene = data.from ?? 'ChamberScene'
    this.sel = 0
    this.menuActive = false
    this.awaiting = null
    this.isTouch = isTouchDevice()
    this._typeTimer = null
    this._ready = false
  }

  create() {
    const K = Phaser.Input.Keyboard.KeyCodes
    const kb = this.input.keyboard
    this.kAction = [K.Z, K.ENTER, K.SPACE].map(k => kb.addKey(k))
    this.kDir = {
      up: [K.UP, K.W].map(k => kb.addKey(k)), down: [K.DOWN, K.S].map(k => kb.addKey(k)),
      left: [K.LEFT, K.A].map(k => kb.addKey(k)), right: [K.RIGHT, K.D].map(k => kb.addKey(k)),
    }

    this.input.on('pointerdown', () => this._advanceIfWaiting())
    this.scale.on('resize', this._layout, this)
    this.events.once('shutdown', () => {
      this.scale.off('resize', this._layout, this)
      this.stick?.destroy()
    })

    // Battle music hits the instant the encounter starts
    window.audioMgr?.playBattle()
    this._flash(() => this._wipe(() => {
      this.scene.sleep(this.fromScene)
      this._build()
      this._intro()
    }))
  }

  // ─── Metrics ──────────────────────────────────────────────────────

  // Landscape: text box + menu share one strip under the field.
  // Portrait: the field fills the top view; text box and a big 2×2 menu stack in the deck.
  _metrics() {
    const L = getLayout(this)
    const { W, H, phone, portrait } = L
    if (portrait) {
      const FH = L.view.h
      const tb = { x: 6, y: FH + 10, w: W - 12, h: 64 }
      const my = tb.y + tb.h + 8
      const menu = { x: 6, y: my, w: W - 12, h: Math.min(124, H - my - 12) }
      return {
        W, H, phone, portrait, FH, nH: Math.round(FH * 0.74),
        ex: Math.round(W * 0.66), ey: Math.round(FH * 0.9),
        px: Math.round(W * 0.24), pScale: 4, infoW: 132,
        deck: { x: 0, y: FH, w: W, h: H - FH }, tb, menu,
        wrapMenu: tb.w - 32, wrapFull: tb.w - 32,
      }
    }
    const TB = phone ? 72 : 88
    const FH = H - TB
    const menuW = phone ? Math.min(Math.round(W * 0.56), 300) : 236
    return {
      W, H, phone, portrait, FH, nH: Math.round(FH * 0.84),
      ex: Math.round(W * 0.7), ey: Math.round(FH * 0.93),
      px: Math.round(W * 0.22), pScale: phone ? 4 : 5, infoW: phone ? 150 : 172,
      deck: { x: 0, y: FH, w: W, h: TB },
      tb: { x: 4, y: FH + 4, w: W - 8, h: TB - 8 },
      menu: { x: W - menuW - 4, y: FH + 4, w: menuW, h: TB - 8 },
      wrapMenu: W - 48 - menuW, wrapFull: W - 58,
    }
  }

  // ─── Encounter transition ─────────────────────────────────────────

  _flash(done) {
    const { width: W, height: H } = this.scale
    const f = this.add.rectangle(0, 0, W, H, 0xffffff, 0).setOrigin(0).setDepth(98)
    let n = 0
    const on = () => { f.setAlpha(0.9); this.time.delayedCall(65, off) }
    const off = () => {
      f.setAlpha(0); n++
      if (n < 3) this.time.delayedCall(65, on)
      else { f.destroy(); this.time.delayedCall(60, done) }
    }
    on()
  }

  _wipe(done) {
    const { width: W, height: H } = this.scale
    const g = this.add.graphics().setDepth(97)
    const slope = 0.6, span = W + H * slope, bars = 9, gap = span / bars
    const dur = 620
    window.audioMgr?.whoosh()
    let elapsed = 0
    const tick = this.time.addEvent({
      delay: 16, loop: true,
      callback: () => {
        elapsed += 16
        g.clear()
        let complete = true
        for (let i = 0; i < bars; i++) {
          const local = Phaser.Math.Clamp((elapsed - i * 38) / (dur - bars * 38), 0, 1)
          if (local < 1) complete = false
          const w = Phaser.Math.Easing.Cubic.InOut(local) * (gap + 1)
          const x0 = i * gap
          g.fillStyle(0x000000, 1)
          g.fillPoints([
            { x: x0, y: 0 }, { x: x0 + w, y: 0 },
            { x: x0 + w - H * slope, y: H }, { x: x0 - H * slope, y: H },
          ], true)
          if (local > 0 && local < 1) {
            g.lineStyle(2, 0xffffff, 0.8)
            g.lineBetween(x0 + w, 0, x0 + w - H * slope, H)
          }
        }
        if (complete) {
          tick.remove()
          g.clear().fillStyle(0x000000, 1).fillRect(0, 0, W, H)
          this.time.delayedCall(140, () => { g.destroy(); done() })
        }
      },
    })
  }

  // ─── Build the battle screen ──────────────────────────────────────

  _build() {
    this.bg = this.add.graphics().setDepth(0)
    this.platEnemy = this.add.graphics().setDepth(2)
    this.platPlayer = this.add.graphics().setDepth(2)

    const tex = this.textures.get('naman_battle')
    this._bbox = tex.customData.bbox ?? (tex.customData.bbox = figureBounds(tex.getSourceImage()))
    const b = this._bbox, src = tex.getSourceImage()
    const ox = (b.x + b.w / 2) / src.width, oy = (b.y + b.h) / src.height
    this.naman = this.add.image(0, 0, 'naman_battle').setOrigin(ox, oy).setDepth(10)
    this.namanSil = this.add.image(0, 0, 'naman_battle').setOrigin(ox, oy).setDepth(11).setTintFill(0x14142a)

    this.hero = this.add.sprite(0, 0, 'player', 'up_0').setOrigin(0.5, 26 / 32).setDepth(12)

    this.info = this.add.container(0, 0).setDepth(15)
    this.infoBg = this.add.graphics()
    this.infoName = this.add.text(0, 0, 'NAMAN', { fontFamily: FONT, fontSize: '9px', color: '#383848' })
      .setShadow(1, 1, '#d4d4cc', 0, false, true)
    this.infoLv = this.add.text(0, 0, 'Lv99', { fontFamily: FONT, fontSize: '7px', color: '#383848' }).setOrigin(1, 0)
    this.infoHp = this.add.text(0, 0, 'HP', { fontFamily: FONT, fontSize: '6px', color: '#f8c030' })
      .setShadow(1, 1, '#583800', 0, false, true)
    this.info.add([this.infoBg, this.infoName, this.infoLv, this.infoHp])

    this.box = this.add.graphics().setDepth(20)
    this.text = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '10px', color: '#ffffff' })
      .setDepth(21).setShadow(1, 1, '#38406a', 0, false, true)
    this.arrow = this.add.graphics().setDepth(22).setVisible(false)
    this.arrow.fillStyle(0xf8d048, 1).fillTriangle(-5, -3, 5, -3, 0, 4)

    this.menu = this.add.container(0, 0).setDepth(30).setVisible(false)
    this.menuBg = this.add.graphics()
    this.menu.add(this.menuBg)
    this.cells = OPTIONS.map((opt, i) => {
      const bg = this.add.graphics()
      const label = this.add.text(0, 0, opt.label, {
        fontFamily: FONT, fontSize: '9px', color: opt.run ? '#b83030' : '#383848',
      }).setOrigin(0, 0.5).setShadow(1, 1, '#d4d4cc', 0, false, true)
      const cursor = this.add.text(0, 0, '▶', { fontFamily: FONT, fontSize: '8px', color: '#e04848' }).setOrigin(0, 0.5)
      const zone = this.add.rectangle(0, 0, 10, 10, 0xffffff, 0.001).setOrigin(0).setInteractive({ useHandCursor: true })
      zone.on('pointerdown', (p, lx, ly, e) => {
        if (!this.menuActive) return
        e?.stopPropagation()
        this._pressed = i
        this._select(i)
      })
      zone.on('pointerup', () => { if (this.menuActive && this._pressed === i) this._confirm() })
      zone.on('pointerover', () => { if (this.menuActive && !this.isTouch) this._select(i) })
      this.menu.add([bg, zone, cursor, label])
      return { bg, label, cursor, zone }
    })

    this.cover = this.add.graphics().setDepth(96)
    this._layout()
  }

  _layout() {
    if (!this.bg) return
    const m = this.m = this._metrics()
    const { W, FH, phone, deck, tb, menu } = m

    // Sky + field
    const g = this.bg.clear()
    const horizon = Math.round(FH * 0.52)
    bands(g, 0, horizon, [0x9cc4ea, 0xe6f0f8], 16, W)
    g.fillStyle(0xb8d0a8, 1).fillRect(0, horizon - 6, W, 6)
    bands(g, horizon, FH, [0xd2e2b0, 0xa8c488], 10, W)
    g.lineStyle(1, 0xffffff, 0.22)
    for (let y = horizon + 10, step = 6; y < FH; y += step, step += 3) g.lineBetween(0, y, W, y)

    // Enemy platform + Naman
    const scale = m.nH / this._bbox.h
    const rx = Math.max(56, m.nH * 0.36), ry = rx * 0.22
    drawPlatform(this.platEnemy, rx, ry)
    this.platEnemy.setPosition(m.ex, m.ey - 2)
    this.naman.setScale(scale).setPosition(m.ex, m.ey)
    this.namanSil.setScale(scale).setPosition(m.ex, m.ey)
    this._namanX = m.ex

    // Player back sprite
    const prx = 16 * m.pScale * 1.5
    drawPlatform(this.platPlayer, prx, prx * 0.22)
    this.platPlayer.setPosition(m.px, FH - 2)
    this.hero.setScale(m.pScale).setPosition(m.px, FH + (phone ? 10 : 14))
    this._heroX = m.px

    // Enemy info box
    const iw = m.infoW, ih = phone ? 38 : 42
    const ig = this.infoBg.clear()
    ig.fillStyle(0x283048, 1).fillRoundedRect(0, 0, iw, ih, 6)
    ig.fillStyle(0xf8f8f0, 1).fillRoundedRect(3, 3, iw - 6, ih - 6, 4)
    const barX = 30, barY = ih - 14, barW = iw - 42
    ig.fillStyle(0x283048, 1).fillRoundedRect(barX - 2, barY - 2, barW + 4, 8, 3)
    ig.fillStyle(0x58d878, 1).fillRect(barX, barY, barW, 4)
    ig.fillStyle(0x88f0a0, 1).fillRect(barX, barY, barW, 1)
    this.infoName.setPosition(10, 8)
    this.infoLv.setPosition(iw - 10, 9)
    this.infoHp.setPosition(12, barY - 1)
    this.info.setPosition(10, 10)
    this._infoX = 10
    this._infoW = iw

    // Text box
    const bx = this.box.clear()
    bx.fillStyle(0x1c2238, 1).fillRect(deck.x, deck.y, deck.w, deck.h)
    if (m.portrait) bx.fillStyle(0xffd700, 0.85).fillRect(0, FH, W, 2)
    bx.fillStyle(0x2c3a64, 1).fillRoundedRect(tb.x, tb.y, tb.w, tb.h, 6)
    bx.lineStyle(2, 0xa8b8e0, 1).strokeRoundedRect(tb.x + 3, tb.y + 3, tb.w - 6, tb.h - 6, 4)
    this.text.setPosition(tb.x + 14, tb.y + 14).setLineSpacing(phone ? 8 : 10)
    this._wrap()
    const ay = tb.y + tb.h - 14
    this.tweens.killTweensOf(this.arrow)
    this.arrow.setPosition(tb.x + tb.w - 18, ay)
    this.tweens.add({ targets: this.arrow, y: ay + 3, duration: 280, yoyo: true, repeat: -1, ease: 'Sine.InOut' })

    // 2×2 menu
    const { x: mx, y: my, w: mw, h: mh } = menu
    const mg = this.menuBg.clear()
    mg.fillStyle(0x283048, 1).fillRoundedRect(mx, my, mw, mh, 6)
    mg.fillStyle(0xf8f8f0, 1).fillRoundedRect(mx + 3, my + 3, mw - 6, mh - 6, 4)
    const pad = 6, gap = 4
    const cw = (mw - pad * 2 - gap) / 2, ch = (mh - pad * 2 - gap) / 2
    this.cells.forEach((c, i) => {
      const x = mx + pad + (i % 2) * (cw + gap), y = my + pad + Math.floor(i / 2) * (ch + gap)
      c.rect = { x, y, w: cw, h: ch }
      c.zone.setPosition(x, y).setSize(cw, ch)
      c.zone.input.hitArea.setSize(cw, ch)
      c.cursor.setPosition(x + 6, y + ch / 2)
      c.label.setPosition(x + 18, y + ch / 2)
    })
    this._drawCells()

    if (this.isTouch && !this.stick) {
      this.stick = new TouchStick(this, {
        zone: p => this.menuActive && p.x < this.scale.width * 0.45,
        home: () => ({ x: 60, y: this.scale.height - 60 }),
        radius: 30, showIdle: false, depth: 40,
        onChange: dir => { if (dir && this.menuActive) this._move(dir) },
      })
    }
  }

  _wrap() {
    this.text.setWordWrapWidth(this.menu?.visible ? this.m.wrapMenu : this.m.wrapFull)
  }

  _drawCells(flash = -1) {
    this.cells.forEach((c, i) => {
      const { x, y, w, h } = c.rect
      const on = i === this.sel
      c.bg.clear()
      if (on) {
        c.bg.fillStyle(i === flash ? 0xffffff : 0xffecb0, 1).fillRoundedRect(x, y, w, h, 4)
        c.bg.lineStyle(2, 0xe0a030, 1).strokeRoundedRect(x + 1, y + 1, w - 2, h - 2, 4)
      } else {
        c.bg.lineStyle(1, 0xd8d8e4, 1).strokeRoundedRect(x + 1, y + 1, w - 2, h - 2, 4)
      }
      c.cursor.setVisible(on)
    })
  }

  // ─── Intro choreography ───────────────────────────────────────────

  _intro() {
    const { W, H } = this.m
    // Shutters: black halves part vertically to reveal the field
    const top = this.add.rectangle(0, 0, W, H / 2 + 1, 0x000000).setOrigin(0).setDepth(96)
    const bot = this.add.rectangle(0, H / 2, W, H / 2 + 1, 0x000000).setOrigin(0).setDepth(96)
    this.tweens.add({ targets: top, y: -H / 2, duration: 380, ease: 'Cubic.InOut', onComplete: () => top.destroy() })
    this.tweens.add({ targets: bot, y: H, duration: 380, ease: 'Cubic.InOut', onComplete: () => bot.destroy() })

    // Naman glides in from the right as a silhouette; the player from the left
    const slide = W * 0.75
    for (const o of [this.naman, this.namanSil, this.platEnemy]) {
      const tx = o.x
      o.x = tx + slide
      this.tweens.add({ targets: o, x: tx, duration: 900, ease: 'Cubic.Out', delay: 60 })
    }
    for (const o of [this.hero, this.platPlayer]) {
      const tx = o.x
      o.x = tx - slide
      this.tweens.add({ targets: o, x: tx, duration: 900, ease: 'Cubic.Out', delay: 60 })
    }
    this.info.x = -this._infoW - 20

    this.time.delayedCall(1020, () => {
      // Colour floods in, with a cry and a jolt
      window.audioMgr?.cry()
      this.cameras.main.shake(180, 0.008)
      this.namanSil.setTintFill(0xffffff).setAlpha(1)
      this.tweens.add({ targets: this.namanSil, alpha: 0, duration: 380, ease: 'Sine.Out' })
      this.tweens.add({ targets: this.naman, scaleX: this.naman.scaleX * 1.04, scaleY: this.naman.scaleY * 1.04, duration: 110, yoyo: true, ease: 'Sine.Out' })
    })
    this.time.delayedCall(1380, () => {
      this.tweens.add({ targets: this.info, x: this._infoX, duration: 260, ease: 'Back.Out' })
    })
    this.time.delayedCall(1700, () => {
      this._ready = true
      this._breathe()
      this._type('A wild NAMAN appeared!', () => this._wait(2000, () => this._showMenu()), 34)
    })
  }

  _breathe() {
    const s = this.naman.scaleY
    this.tweens.add({ targets: this.naman, scaleY: s * 1.012, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.InOut' })
  }

  // ─── Text helpers ─────────────────────────────────────────────────

  _type(msg, done, speed = 26) {
    this._typeTimer?.remove()
    this.arrow.setVisible(false)
    this.text.setText('')
    let i = 0
    this._typeTimer = this.time.addEvent({
      delay: speed, loop: true,
      callback: () => {
        i++
        this.text.setText(msg.slice(0, i))
        if (i % 2 && msg[i - 1] !== ' ') window.audioMgr?.blip()
        if (i >= msg.length) { this._typeTimer.remove(); this._typeTimer = null; done?.() }
      },
    })
  }

  // Wait for A / tap, or move on by itself after `ms`
  _wait(ms, next) {
    this.arrow.setVisible(true)
    const go = () => {
      if (this.awaiting !== go) return
      this.awaiting = null
      this.arrow.setVisible(false)
      next()
    }
    this.awaiting = go
    this.time.delayedCall(ms, go)
  }

  _advanceIfWaiting() {
    if (this.awaiting) { window.audioMgr?.cursor(); this.awaiting() }
  }

  _seq(steps, done) {
    const run = i => {
      if (i >= steps.length) { done?.(); return }
      const s = steps[i]
      if (s.fn) s.fn()
      if (s.text === undefined) { this.time.delayedCall(s.wait ?? 0, () => run(i + 1)); return }
      if (s.instant) { this.text.setText(s.text); this.time.delayedCall(s.wait ?? 0, () => run(i + 1)); return }
      this._type(s.text, () => this.time.delayedCall(s.wait ?? 0, () => run(i + 1)), s.speed)
    }
    run(0)
  }

  // ─── Menu ─────────────────────────────────────────────────────────

  _showMenu() {
    this.text.setText('What will\nyou do?')
    this.menu.setVisible(true).setAlpha(0)
    this.menu.y = 8
    this.tweens.add({ targets: this.menu, alpha: 1, y: 0, duration: 160, ease: 'Cubic.Out' })
    this._wrap()
    this._drawCells()
    this.menuActive = true
  }

  _hideMenu() {
    this.menuActive = false
    this.tweens.add({ targets: this.menu, alpha: 0, duration: 120, onComplete: () => { this.menu.setVisible(false); this._wrap() } })
  }

  _select(i) {
    if (i === this.sel) return
    this.sel = i
    window.audioMgr?.cursor()
    this._drawCells()
  }

  _move(dir) {
    const col = this.sel % 2, row = Math.floor(this.sel / 2)
    if (dir === 'left' || dir === 'right') this._select(row * 2 + (dir === 'right' ? 1 : 0))
    else this._select((dir === 'down' ? 2 : 0) + col)
  }

  _confirm() {
    if (!this.menuActive) return
    this.menuActive = false
    window.audioMgr?.confirm()
    navigator.vibrate?.(10)
    const opt = OPTIONS[this.sel]
    this._drawCells(this.sel)
    this.time.delayedCall(70, () => this._drawCells())
    this.time.delayedCall(140, () => this._drawCells(this.sel))
    this.time.delayedCall(210, () => {
      this._hideMenu()
      if (opt.run) this._run()
      else if (opt.tab === 'exp') this._seq([
        { text: 'You used PORTFOLIO!', wait: 450 },
        { text: "It's super effective!", wait: 650 },
      ], () => this._openPortfolio('exp'))
      else if (opt.tab === 'skills') this._seq([
        { text: "You inspected NAMAN's SKILLS!", wait: 700 },
      ], () => this._openPortfolio('skills'))
      else this._seq([
        { text: "You asked for NAMAN's CONTACT!", wait: 700 },
      ], () => this._openPortfolio('contact'))
    })
  }

  // The game has fun with you: there is no running.
  _run() {
    this._seq([
      { text: '.', instant: true, wait: 550, fn: () => window.audioMgr?.blip() },
      { text: '. .', instant: true, wait: 550, fn: () => window.audioMgr?.blip() },
      { text: '. . .', instant: true, wait: 900, fn: () => window.audioMgr?.blip() },
      {
        fn: () => {
          window.audioMgr?.deny()
          this.cameras.main.shake(260, 0.012)
          this.tweens.add({ targets: this.naman, x: this._namanX - 10, duration: 70, yoyo: true, repeat: 1 })
        },
        text: "You can't run from this.", speed: 42, wait: 1100,
      },
      { text: 'NAMAN used PORTFOLIO!', wait: 450 },
      { text: "It's super effective!", wait: 650 },
    ], () => this._openPortfolio('exp'))
  }

  // ─── Portfolio ────────────────────────────────────────────────────

  _openPortfolio(tab) {
    const { W, H } = this.m
    const flash = this.add.rectangle(0, 0, W, H, 0xffffff, 1).setOrigin(0).setDepth(99)
    this.tweens.add({ targets: flash, alpha: 0, duration: 420, onComplete: () => flash.destroy() })
    this.cover.clear().fillStyle(0x000000, 0.6).fillRect(0, 0, W, H)
    window.audioMgr?.play('town', { fadeIn: 1.2, fadeOut: 0.6 })
    this.time.delayedCall(120, () => openPortfolio({ tab, game: this.game, onClose: () => this._return() }))
  }

  _return() {
    this.cameras.main.fadeOut(320, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.game.registry.set('inputLock', false)
      this.game.registry.set('joyDir', null)
      this.scene.wake(this.fromScene)
      this.scene.setVisible(true, 'UIScene')
      this.scene.resume('UIScene')
      this.scene.stop()
      const canvas = this.game.canvas
      setTimeout(() => { canvas.tabIndex = 0; canvas.focus() }, 50)
    })
  }

  // ─── Update ───────────────────────────────────────────────────────

  update() {
    const JD = Phaser.Input.Keyboard.JustDown
    if (!this.kAction) return
    const action = this.kAction.some(k => JD(k))
    if (this.awaiting && action) { this._advanceIfWaiting(); return }
    if (!this.menuActive) return
    for (const dir in this.kDir) if (this.kDir[dir].some(k => JD(k))) this._move(dir)
    if (action) this._confirm()
  }
}

// ─── Drawing helpers ────────────────────────────────────────────────

function bands(g, y0, y1, [c0, c1], n, W) {
  const a = Phaser.Display.Color.IntegerToColor(c0), b = Phaser.Display.Color.IntegerToColor(c1)
  const h = (y1 - y0) / n
  for (let i = 0; i < n; i++) {
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(a, b, n - 1, i)
    g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1)
    g.fillRect(0, Math.floor(y0 + i * h), W, Math.ceil(h) + 1)
  }
}

function drawPlatform(g, rx, ry) {
  g.clear()
  g.fillStyle(0x6c9054, 1).fillEllipse(0, 2, rx * 2, ry * 2 + 4)
  g.fillStyle(0x94b874, 1).fillEllipse(0, 0, rx * 2, ry * 2)
  g.fillStyle(0xb4d494, 1).fillEllipse(0, -ry * 0.25, rx * 1.6, ry * 1.2)
  g.fillStyle(0x000000, 0.18).fillEllipse(0, 0, rx * 0.7, ry * 0.7)
}

// Tight bounding box of the opaque figure in the (flood-filled) portrait.
function figureBounds(img) {
  const c = document.createElement('canvas')
  c.width = img.width; c.height = img.height
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0)
  const d = ctx.getImageData(0, 0, c.width, c.height).data
  let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0
  for (let y = 0; y < c.height; y += 2) {
    for (let x = 0; x < c.width; x += 2) {
      if (d[(y * c.width + x) * 4 + 3] > 0) {
        if (x < x0) x0 = x; if (x > x1) x1 = x
        if (y < y0) y0 = y; if (y > y1) y1 = y
      }
    }
  }
  if (x1 <= x0) return { x: 0, y: 0, w: img.width, h: img.height }
  return { x: x0, y: y0, w: x1 - x0 + 2, h: y1 - y0 + 2 }
}
