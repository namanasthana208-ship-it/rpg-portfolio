// UIScene — persistent overlay: dialogue box, YES/NO choice, touch controls, hints.
// Runs above every walkable scene. Everything is laid out from the live game size.

import { FONT, isTouchDevice, getLayout } from '../layout.js'
import { TouchStick } from '../ui/TouchStick.js'

const TYPE_MS = 26

export class UIScene extends Phaser.Scene {
  constructor() { super({ key: 'UIScene' }) }

  create() {
    this.isTouch = isTouchDevice()
    this.dialogueOpen = false
    this.inChoice = false
    this.typing = false
    this._closing = false
    this.dlgData = null
    this.extraPage = null
    this.selectedChoice = 0
    this._coached = false
    this._reacting = false
    this._timers = []

    const K = Phaser.Input.Keyboard.KeyCodes
    const kb = this.input.keyboard
    this.keysAction = [K.Z, K.ENTER, K.SPACE].map(k => kb.addKey(k))
    this.keysCancel = [K.X, K.ESC, K.BACKSPACE].map(k => kb.addKey(k))
    this.keysUp = [K.UP, K.W].map(k => kb.addKey(k, false))
    this.keysDown = [K.DOWN, K.S].map(k => kb.addKey(k, false))
    this.keysSide = [K.LEFT, K.RIGHT].map(k => kb.addKey(k, false))
    this.keysRun = [K.SHIFT, K.X].map(k => kb.addKey(k, false))

    this.m = this._metrics()
    this.deckBg = this.add.graphics().setDepth(100).setVisible(false)
    this.deckBrand = this.add.text(0, 0, '★ NAMAN ASTHANA ★', {
      fontFamily: FONT, fontSize: '6px', color: '#3c416e',
    }).setOrigin(0.5, 1).setDepth(101).setVisible(false)
    this._buildDialogue()
    this._buildChoice()
    if (this.isTouch) {
      this._buildTouchControls()
      // Controls stay hidden on the title screen until a walkable scene starts
      this.stick.setEnabled(false)
      this.btnA.c.setAlpha(0)
      this.btnB.c.setAlpha(0)
    }

    // Tap anywhere to advance text
    this.input.on('pointerdown', () => {
      if (this.dialogueOpen && !this.inChoice && !this._closing) this._advance()
    })

    const ev = this.game.events
    ev.on('dialogue:open', this._onOpen, this)
    ev.on('dialogue:reset', this._onReset, this)
    ev.on('npc-adjacent', label => this._setTalkCue(true, label))
    ev.on('npc-gone', () => this._setTalkCue(false))
    ev.on('world:enter', this._onWorldEnter, this)

    this.events.on('pause', () => this._releaseStick())
    this.events.on('sleep', () => this._releaseStick())
    this.scale.on('resize', this._layout, this)
    this._layout()
  }

  // ─── Layout ───────────────────────────────────────────────────────

  _metrics() {
    const { W, H, phone, portrait, deck } = getLayout(this)
    if (portrait) {
      const bh = Math.round(Math.min(Math.max(deck.h - 94, 96), 140))
      return { W, H, phone, portrait, deck, box: { x: 6, y: deck.y + 16, w: W - 12, h: bh }, line: 9 }
    }
    const bh = phone ? 72 : 90
    return {
      W, H, phone, portrait, deck,
      box: { x: 5, y: H - bh - 5, w: W - 10, h: bh },
      line: phone ? 9 : 11,
    }
  }

  _layout() {
    this.m = this._metrics()
    this._drawDeck()
    this._drawDialogueBox()
    this._layoutChoice()
    if (this.isTouch) this._layoutTouch()
  }

  // ─── Portrait control deck ────────────────────────────────────────

  _drawDeck() {
    const { deck, W } = this.m
    const g = this.deckBg.clear()
    if (!deck) { this._setDeckVisible(this._deckWanted); return }
    g.fillStyle(0x0d0f20, 1).fillRect(deck.x, deck.y, deck.w, deck.h)
    g.fillStyle(0x161a33, 1).fillRoundedRect(deck.x + 6, deck.y + 8, deck.w - 12, deck.h - 14, 10)
    g.fillStyle(0xffd700, 0.85).fillRect(deck.x, deck.y, deck.w, 2)
    g.fillStyle(0x000000, 0.35).fillRect(deck.x, deck.y + 2, deck.w, 3)
    // Speaker grille, Game Boy style
    for (let i = 0; i < 5; i++) {
      const x = W - 46 + i * 7, y = deck.y + deck.h - 20
      g.lineStyle(2, 0x22264a, 1).lineBetween(x, y, x + 6, y - 10)
    }
    this.deckBrand.setPosition(W / 2, deck.y + deck.h - 10)
    this._setDeckVisible(this._deckWanted)
  }

  // The deck only exists in portrait, but remember it's wanted so rotating back restores it
  _setDeckVisible(on) {
    this._deckWanted = !!on
    const show = this._deckWanted && !!this.m.deck
    this.deckBg.setVisible(show)
    this.deckBrand.setVisible(show)
  }

  // ─── Dialogue box ─────────────────────────────────────────────────

  _buildDialogue() {
    this.dlg = this.add.container(0, 0).setDepth(200).setVisible(false)
    this.tabBg = this.add.graphics()
    this.boxBg = this.add.graphics()
    this.nameText = this.add.text(0, 0, '', {
      fontFamily: FONT, fontSize: '8px', color: '#ffffff',
    }).setShadow(1, 1, '#1a2448', 0, false, true)
    this.dlgText = this.add.text(0, 0, '', {
      fontFamily: FONT, fontSize: '10px', color: '#383848',
    }).setShadow(1, 1, '#d4d4cc', 0, false, true)
    this.pageText = this.add.text(0, 0, '', {
      fontFamily: FONT, fontSize: '6px', color: '#a0a0b0',
    }).setOrigin(1, 0)
    this.arrow = this.add.graphics()
    this.arrow.fillStyle(0x283048, 1).fillTriangle(-6, -3, 6, -3, 0, 5)
    this.arrow.fillStyle(0xe04848, 1).fillTriangle(-4, -2, 4, -2, 0, 3)
    this.arrow.setVisible(false)
    this.dlg.add([this.tabBg, this.boxBg, this.nameText, this.dlgText, this.pageText, this.arrow])
  }

  _drawDialogueBox() {
    const { box, line } = this.m
    const g = this.boxBg
    g.clear()
    g.fillStyle(0x283048, 1).fillRoundedRect(box.x, box.y, box.w, box.h, 7)
    g.fillStyle(0xfafaf6, 1).fillRoundedRect(box.x + 3, box.y + 3, box.w - 6, box.h - 6, 5)
    g.lineStyle(2, 0x8ca4cc, 1).strokeRoundedRect(box.x + 6, box.y + 6, box.w - 12, box.h - 12, 4)

    this.dlgText.setPosition(box.x + 16, box.y + 16)
    this.dlgText.setWordWrapWidth(box.w - 48)
    this.dlgText.setLineSpacing(line)
    this.pageText.setPosition(box.x + box.w - 12, box.y + 10)
    this._arrowY = box.y + box.h - 15
    this.tweens.killTweensOf(this.arrow)
    this.arrow.setPosition(box.x + box.w - 22, this._arrowY)
    this.tweens.add({ targets: this.arrow, y: this._arrowY + 3, duration: 280, yoyo: true, repeat: -1, ease: 'Sine.InOut' })
    this._drawNameTab()
  }

  _drawNameTab() {
    const { box } = this.m
    const name = this.dlgData?.name ?? ''
    this.tabBg.clear()
    this.nameText.setText(name).setVisible(!!name)
    if (!name) return
    const tw = this.nameText.width + 22, th = 22, tx = box.x + 10, ty = box.y - 16
    this.tabBg.fillStyle(0x283048, 1).fillRoundedRect(tx, ty, tw, th, 6)
    this.tabBg.fillStyle(0x3a6cd0, 1).fillRoundedRect(tx + 2, ty + 2, tw - 4, th - 4, 4)
    this.nameText.setPosition(tx + 11, ty + 5)
  }

  _slideOffset() { return this.m.H - this.m.box.y + 24 }

  _showBox() {
    const off = this._slideOffset()
    this.tweens.killTweensOf(this.dlg)
    this.dlg.setVisible(true).setY(off)
    this.tweens.add({ targets: this.dlg, y: 0, duration: 170, ease: 'Cubic.Out' })
  }

  _hideBox(immediate, onDone) {
    this.tweens.killTweensOf(this.dlg)
    if (immediate) { this.dlg.setVisible(false); onDone?.(); return }
    this.tweens.add({
      targets: this.dlg, y: this._slideOffset(), duration: 130, ease: 'Cubic.In',
      onComplete: () => { this.dlg.setVisible(false); onDone?.() },
    })
  }

  // ─── Dialogue flow ────────────────────────────────────────────────

  // Delayed dialogue steps are cancelled when the conversation ends, so a late timer
  // can never run against a closed dialogue (that used to throw and freeze the game).
  _later(ms, fn) {
    const t = this.time.delayedCall(ms, () => {
      this._timers = this._timers.filter(x => x !== t)
      if (this.dialogueOpen && !this._closing) fn()
    })
    this._timers.push(t)
  }

  _cancelTimers() {
    for (const t of this._timers) t.remove()
    this._timers = []
    this._typeTimer?.remove()
    this._typeTimer = null
  }

  _onReset() {
    this._cancelTimers()
    this._reacting = false
    this._hideChoice(true)
    this._hideBox(true)
    this.dialogueOpen = false
    this.typing = false
    this._closing = false
    this.dlgData = null
    this.extraPage = null
    this.game.registry.set('inputLock', false)
    this._setControlsVisible(true)
  }

  _onOpen(data) {
    this.dlgData = data
    this.pageIdx = 0
    this.extraPage = null
    this.dialogueOpen = true
    this._closing = false
    this.game.registry.set('inputLock', true)
    this._releaseStick()
    this._setControlsVisible(false)
    this._dismissCoach()
    this._drawNameTab()
    this.dlgText.setText('')
    this._updatePageText()
    this._showBox()
    this._later(90, () => this._startPage(data.pages[0]))
  }

  _startPage(text, speed = TYPE_MS) {
    if (!text || !this.dialogueOpen) return
    this.fullText = text
    this.charIdx = 0
    this.typing = true
    this.arrow.setVisible(false)
    this.dlgText.setText('')
    this._typeTimer?.remove()
    this._typeTimer = this.time.addEvent({
      delay: speed, loop: true,
      callback: () => {
        this.charIdx++
        this.dlgText.setText(this.fullText.slice(0, this.charIdx))
        if (this.charIdx % 2 === 1 && this.fullText[this.charIdx - 1] !== ' ') window.audioMgr?.blip()
        if (this.charIdx >= this.fullText.length) this._finishPage()
      },
    })
  }

  _finishPage() {
    this._typeTimer?.remove()
    this._typeTimer = null
    this.typing = false
    if (!this.dlgData) return
    this.dlgText.setText(this.fullText)
    const { pages, choice } = this.dlgData
    const last = this.pageIdx >= pages.length - 1
    if (last && choice && !this.extraPage) this._showChoice()
    else this.arrow.setVisible(true)
  }

  _advance() {
    if (!this.dialogueOpen || this._closing || this.inChoice || this._reacting) return
    if (this.typing) { this._finishPage(); return }
    if (this.extraPage) { this._close(); return }
    if (this.pageIdx + 1 < this.dlgData.pages.length) {
      this.pageIdx++
      this._updatePageText()
      window.audioMgr?.cursor()
      this._startPage(this.dlgData.pages[this.pageIdx])
    } else {
      this._close()
    }
  }

  _close() {
    if (this._closing) return
    this._closing = true
    this._cancelTimers()
    this._reacting = false
    this.typing = false
    this.arrow.setVisible(false)
    this._hideChoice()
    this._hideBox(false, () => {
      this.dialogueOpen = false
      this._closing = false
      this.dlgData = null
      this.extraPage = null
      this.game.registry.set('inputLock', false)
      this._setControlsVisible(true)
      this.game.events.emit('dialogue:closed')
    })
  }

  _updatePageText() {
    const n = this.dlgData?.pages.length ?? 0
    this.pageText.setText(n > 1 ? `${this.pageIdx + 1}/${n}` : '')
  }

  // ─── YES / NO ─────────────────────────────────────────────────────

  _buildChoice() {
    this.choice = this.add.container(0, 0).setDepth(210).setVisible(false)
    this.choiceBg = this.add.graphics()
    this.choiceHi = this.add.graphics()
    this.choiceCursor = this.add.text(0, 0, '▶', { fontFamily: FONT, fontSize: '9px', color: '#e04848' }).setOrigin(0, 0.5)
    this.choiceLabels = ['YES', 'NO'].map(t =>
      this.add.text(0, 0, t, { fontFamily: FONT, fontSize: '10px', color: '#383848' })
        .setOrigin(0, 0.5).setShadow(1, 1, '#d4d4cc', 0, false, true))
    this.choiceZones = [0, 1].map(i => {
      const z = this.add.rectangle(0, 0, 10, 10, 0xffffff, 0.001).setInteractive({ useHandCursor: true })
      z.on('pointerdown', (p, lx, ly, e) => {
        if (!this.inChoice) return
        e?.stopPropagation()
        this._pressedChoice = i
        this._setChoice(i)
      })
      // Confirm on release: opening a link must happen inside a real tap gesture
      z.on('pointerup', () => {
        if (this.inChoice && this._pressedChoice === i) this._confirmChoice(i)
      })
      z.on('pointerover', () => { if (this.inChoice && !this.isTouch) this._setChoice(i) })
      return z
    })
    this.choice.add([this.choiceBg, this.choiceHi, ...this.choiceZones, this.choiceCursor, ...this.choiceLabels])
  }

  _layoutChoice() {
    const { box, phone, portrait, deck } = this.m
    const g = this.choiceBg.clear()
    const panel = (x, y, w, h) => {
      g.fillStyle(0x283048, 1).fillRoundedRect(x, y, w, h, 7)
      g.fillStyle(0xfafaf6, 1).fillRoundedRect(x + 3, y + 3, w - 6, h - 6, 5)
      g.lineStyle(2, 0x8ca4cc, 1).strokeRoundedRect(x + 6, y + 6, w - 12, h - 12, 4)
    }
    if (portrait) {
      // Two big thumb targets side by side under the dialogue box
      const y = box.y + box.h + 8
      const h = Math.min(56, deck.y + deck.h - y - 14), gap = 8
      const w = (box.w - gap) / 2
      this._choiceCells = [0, 1].map(i => ({ x: box.x + i * (w + gap), y, w, h }))
      this._choiceCells.forEach(c => panel(c.x, c.y, c.w, c.h))
    } else {
      const w = phone ? 124 : 92, row = phone ? 34 : 22, pad = 6
      const h = row * 2 + pad * 2
      const x = box.x + box.w - w, y = box.y - h - 6
      panel(x, y, w, h)
      this._choiceCells = [0, 1].map(i => ({ x: x + 6, y: y + pad + row * i, w: w - 12, h: row }))
    }
    this._choiceCells.forEach((c, i) => {
      this.choiceZones[i].setPosition(c.x + c.w / 2, c.y + c.h / 2).setSize(c.w, c.h)
      this.choiceZones[i].input?.hitArea.setSize(c.w, c.h)
      const label = this.choiceLabels[i]
      label.setPosition(c.x + (c.w - label.width) / 2 + 7, c.y + c.h / 2)
    })
    this._setChoice(this.selectedChoice, true)
  }

  _setChoice(i, silent = false) {
    if (!silent && i !== this.selectedChoice) window.audioMgr?.cursor()
    this.selectedChoice = i
    const c = this._choiceCells[i], label = this.choiceLabels[i]
    const inset = this.m.portrait ? 6 : 2
    this.choiceCursor.setPosition(label.x - 14, c.y + c.h / 2)
    this.choiceHi.clear()
    this.choiceHi.fillStyle(0xffe9a8, 1).fillRoundedRect(c.x + inset, c.y + inset, c.w - inset * 2, c.h - inset * 2, 4)
  }

  _showChoice() {
    this.inChoice = true
    this._pressedChoice = null
    this._setChoice(0, true)
    this.choice.setVisible(true).setAlpha(0)
    this.choice.setPosition(0, 6)
    this.tweens.add({ targets: this.choice, alpha: 1, y: 0, duration: 140, ease: 'Back.Out' })
  }

  _hideChoice(immediate) {
    this.inChoice = false
    this.tweens.killTweensOf(this.choice)
    if (immediate || !this.choice.visible) { this.choice.setVisible(false); return }
    this.tweens.add({ targets: this.choice, alpha: 0, duration: 90, onComplete: () => this.choice.setVisible(false) })
  }

  _confirmChoice(i) {
    if (!this.inChoice) return
    const choice = this.dlgData.choice
    this._hideChoice()
    if (i === 0) {
      window.audioMgr?.confirm()
      if (choice.yes?.url) window.open(choice.yes.url, '_blank', 'noopener')
      this._close()
      return
    }
    // NO — let the silence land before the NPC reacts
    window.audioMgr?.cursor()
    this.extraPage = choice.no?.text
    if (!this.extraPage) { this._close(); return }
    this.dlgText.setText('')
    this.arrow.setVisible(false)
    this.pageText.setText('')
    // Taps are ignored until the NPC's reaction starts typing
    this._reacting = true
    this._later(700, () => {
      this.game.events.emit('npc:sad')
      window.audioMgr?.sad()
      this._later(350, () => {
        this._reacting = false
        this._startPage(this.extraPage, 55)
      })
    })
  }

  // ─── Touch controls ───────────────────────────────────────────────

  _buildTouchControls() {
    this.stick = new TouchStick(this, {
      zone: p => p.x < this.scale.width * 0.5 && !this.dialogueOpen,
      home: () => this._stickHome ?? { x: 60, y: this.scale.height - 60 },
      radius: 34,
      onChange: dir => {
        this.game.registry.set('joyDir', dir)
        if (dir && this._coach) this.time.delayedCall(500, () => this._dismissCoach())
      },
    })

    this.btnA = this._makeButton('A', 0xd84848, 0xff7a6a, () => this._onAction())
    this.btnB = this._makeButton('B', 0x4a5cc8, 0x7d8cf0, () => this._onCancel(), held => { this._bHeld = held })

    this.talkCue = this.add.text(0, 0, 'TALK', {
      fontFamily: FONT, fontSize: '7px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(161).setShadow(1, 1, '#000000', 0, false, true).setAlpha(0)
  }

  _makeButton(label, color, light, onPress, onHold) {
    const c = this.add.container(0, 0).setDepth(160)
    const ring = this.add.circle(0, 0, 10, 0xffffff, 0).setStrokeStyle(2, 0xffffff, 0.9)
    const g = this.add.graphics()
    const t = this.add.text(0, 1, label, { fontFamily: FONT, fontSize: '11px', color: '#ffffff' })
      .setOrigin(0.5).setShadow(1, 1, '#00000088', 0, false, true)
    c.add([ring, g, t])
    const btn = { c, g, ring, t, color, light, r: 20, down: false }
    const draw = pressed => {
      g.clear()
      g.fillStyle(0x000000, 0.25).fillCircle(0, 3, btn.r)
      g.fillStyle(pressed ? light : color, pressed ? 1 : 0.88).fillCircle(0, pressed ? 2 : 0, btn.r)
      g.lineStyle(2, 0xffffff, pressed ? 0.95 : 0.55).strokeCircle(0, pressed ? 2 : 0, btn.r)
      g.fillStyle(0xffffff, pressed ? 0.12 : 0.22).fillEllipse(0, -btn.r * 0.45, btn.r * 1.2, btn.r * 0.6)
      t.setY(pressed ? 3 : 1)
    }
    btn.draw = draw
    c.setInteractive(new Phaser.Geom.Circle(0, 0, 30), Phaser.Geom.Circle.Contains)
    c.on('pointerdown', (p, lx, ly, e) => {
      if (c.alpha < 0.3) return
      e?.stopPropagation()
      btn.down = true
      draw(true)
      this.tweens.killTweensOf(c)
      c.setScale(0.9)
      ring.setRadius(btn.r).setAlpha(0.9)
      this.tweens.add({ targets: ring, radius: btn.r + 12, alpha: 0, duration: 260, ease: 'Cubic.Out' })
      navigator.vibrate?.(8)
      onHold?.(true)
      onPress()
    })
    const up = () => {
      if (!btn.down) return
      btn.down = false
      onHold?.(false)
      draw(false)
      this.tweens.add({ targets: c, scale: 1, duration: 140, ease: 'Back.Out' })
    }
    c.on('pointerup', up)
    c.on('pointerout', up)
    draw(false)
    return btn
  }

  _layoutTouch() {
    const { W, H, phone, portrait, deck } = this.m
    let rA, rB, ax, ay, bx, by, stickR
    if (portrait) {
      const cy = deck.y + deck.h * 0.5
      rA = 28; rB = 22; stickR = 40
      ax = W - 50; ay = cy - 10
      bx = ax - 64; by = cy + 22
      this._stickHome = { x: 66, y: cy + 4 }
    } else {
      rA = phone ? 25 : 28; rB = phone ? 19 : 22; stickR = phone ? 34 : 38
      ax = W - (phone ? 48 : 56); ay = H - (phone ? 66 : 76)
      bx = ax - (phone ? 58 : 66); by = ay + (phone ? 26 : 30)
      this._stickHome = { x: phone ? 58 : 66, y: H - (phone ? 58 : 66) }
    }
    this._placeButton(this.btnA, ax, ay, rA)
    this._placeButton(this.btnB, bx, by, rB)
    this.talkCue.setPosition(ax, ay - rA - 9)
    this.stick.radius = stickR
    this.stick._drawBase()
    this.stick._drawThumb(false)
    this.stick.relayout()
  }

  _placeButton(btn, x, y, r) {
    btn.r = r
    btn.c.setPosition(x, y)
    btn.c.input.hitArea.setTo(0, 0, r + 12)
    btn.draw(false)
  }

  _setControlsVisible(on) {
    if (!this.isTouch) return
    this.stick.setEnabled(on)
    const targets = [this.btnA.c, this.btnB.c]
    this.tweens.killTweensOf(targets)
    this.tweens.add({ targets, alpha: on ? 1 : 0, duration: 150 })
    if (!on) this._setTalkCue(false)
  }

  _setTalkCue(on, label = 'TALK') {
    if (!this.isTouch) return
    this.talkCue.setText(label)
    this._pulse?.stop()
    this._pulse = null
    this.btnA.g.setScale(1)
    this.tweens.killTweensOf(this.talkCue)
    if (on && !this.dialogueOpen) {
      this.tweens.add({ targets: this.talkCue, alpha: 1, duration: 150 })
      this._pulse = this.tweens.add({ targets: this.btnA.g, scale: 1.08, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.InOut' })
    } else {
      this.tweens.add({ targets: this.talkCue, alpha: 0, duration: 120 })
    }
  }

  _releaseStick() {
    this.stick?._release()
    this._bHeld = false
    this.game.registry.set('joyDir', null)
  }

  // ─── First-time control hints ─────────────────────────────────────

  _onWorldEnter(key) {
    this._setDeckVisible(true)
    if (!this.dialogueOpen) this._setControlsVisible(true)
    if (this._coached || key !== 'GameScene') return
    this._coached = true
    this.time.delayedCall(700, () => this._showCoach())
  }

  _showCoach() {
    const { W, H, phone } = this.m
    const items = []
    const pill = (x, y, text, origin = 0.5) => {
      const t = this.add.text(0, 0, text, { fontFamily: FONT, fontSize: '7px', color: '#ffffff', align: 'center', lineSpacing: 5 })
        .setOrigin(0.5).setShadow(1, 1, '#000000', 0, false, true)
      const bw = t.width + 16, bh = t.height + 12
      const g = this.add.graphics()
      g.fillStyle(0x10142a, 0.82).fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 6)
      g.lineStyle(1, 0xffd34a, 0.7).strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 6)
      const c = this.add.container(x + (origin === 0 ? bw / 2 : origin === 1 ? -bw / 2 : 0), y, [g, t]).setDepth(190).setAlpha(0)
      items.push(c)
    }
    if (this.isTouch && this.m.portrait) {
      const top = this.m.deck.y + 22
      pill(10, top, 'DRAG HERE\nTO WALK', 0)
      pill(W - 10, top, 'A  TALK\nHOLD B  RUN', 1)
    } else if (this.isTouch) {
      pill(10, H - (phone ? 118 : 130), 'DRAG HERE\nTO WALK', 0)
      pill(W - 10, H - (phone ? 128 : 144), 'A  TALK\nHOLD B  RUN', 1)
    } else {
      pill(W / 2, 22, 'ARROWS  WALK    Z  TALK    SHIFT  RUN')
    }
    this._coach = items
    this.tweens.add({ targets: items, alpha: 1, duration: 300 })
    this.time.delayedCall(5500, () => this._dismissCoach())
  }

  _dismissCoach() {
    const items = this._coach
    if (!items) return
    this._coach = null
    this.tweens.add({ targets: items, alpha: 0, duration: 300, onComplete: () => items.forEach(i => i.destroy()) })
  }

  // ─── Input ────────────────────────────────────────────────────────

  _onAction() {
    if (this.dialogueOpen) {
      if (this.inChoice) this._confirmChoice(this.selectedChoice)
      else this._advance()
    } else {
      this.game.events.emit('interact')
    }
  }

  _onCancel() {
    if (this.dialogueOpen) {
      if (this.inChoice) this._confirmChoice(1)
      else this._advance()
    } else {
      this.game.events.emit('cancel')
    }
  }

  update() {
    const running = !this.dialogueOpen && (this._bHeld || this.keysRun.some(k => k.isDown))
    if (running !== this._running) {
      this._running = running
      this.game.registry.set('running', running)
    }
    const JD = Phaser.Input.Keyboard.JustDown
    if (this.keysAction.some(k => JD(k))) this._onAction()
    if (this.keysCancel.some(k => JD(k))) this._onCancel()
    if (this.inChoice) {
      if (this.keysUp.some(k => JD(k)) || JD(this.keysSide[0])) this._setChoice(0)
      if (this.keysDown.some(k => JD(k)) || JD(this.keysSide[1])) this._setChoice(1)
    }
  }
}
