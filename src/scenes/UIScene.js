// UIScene — persistent overlay for dialogue, mobile joystick, and A/B buttons.
// Runs on top of GameScene/InteriorScene via scene.launch().

const FONT = "'Press Start 2P', monospace"
const W = 480, H = 320

const DB = {
  x: 8, y: 208, w: 464, h: 100,
  pad: 12,
  textY: 228,
  textW: 440,
}

const SLIDE = H + 10   // off-screen slide offset for dialogue open/close animation

export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' })
    this.dialogueOpen  = false
    this.dlgData       = null   // { name, pages, choice }
    this.pageIdx       = 0
    this.charIdx       = 0
    this.typing        = false
    this.inChoice      = false
    this.selectedChoice = 0
    this.extraPage     = null   // single extra page after choice (e.g. "Your loss.")
    this._closing      = false  // true while slide-down + delay are in progress
  }

  create() {
    this.isTouch = this.sys.game.device.input.touch

    // ── Keyboard ──────────────────────────────────────────────────────
    this.keyZ     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z)
    this.keyEnter = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)
    this.keyEsc   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
    this.keyUp    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP)
    this.keyDown  = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN)
    this.keyW     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W)
    this.keyS     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S)

    // ── Dialogue box (always created, hidden until needed) ────────────
    this._buildDialogueBox()

    // ── Mobile controls ───────────────────────────────────────────────
    if (this.isTouch) {
      this._buildJoystick()
      this._buildButtons()
      this._buildMobileChoiceButtons()
    }

    // ── Interaction hint ──────────────────────────────────────────────
    this._buildHint()
    this.game.events.on('npc-adjacent', this._showHint, this)
    this.game.events.on('npc-gone',     this._hideHint, this)

    // ── Event listeners ───────────────────────────────────────────────
    this.game.events.on('dialogue:open',  this._onOpen,  this)
    this.game.events.on('dialogue:reset', this._onReset, this)
  }

  // ─── Dialogue box construction ────────────────────────────────────

  _buildDialogueBox() {
    const depth = 200

    // Name tab (sits above box)
    this.nameTabBg = this.add.graphics().setDepth(depth)
    this.nameText  = this.add.text(20, DB.y - 14, '', {
      fontFamily: FONT, fontSize: '8px', color: '#ffffff',
      stroke: '#2c2137', strokeThickness: 1,
    }).setDepth(depth + 1).setVisible(false)

    // Main box
    this.boxBg = this.add.graphics().setDepth(depth)

    // Dialogue text (word-wrapped)
    this.dlgText = this.add.text(DB.x + DB.pad, DB.textY, '', {
      fontFamily: FONT, fontSize: '8px', color: '#2c2137',
      stroke: '#f8f0d0', strokeThickness: 1,
      wordWrap: { width: DB.textW },
      lineSpacing: 0,
    }).setDepth(depth + 1).setVisible(false)

    // Page counter
    this.pageCounter = this.add.text(DB.x + DB.w - DB.pad, DB.y + 6, '', {
      fontFamily: FONT, fontSize: '8px', color: '#888888',
      stroke: '#f8f0d0', strokeThickness: 1,
    }).setOrigin(1, 0).setDepth(depth + 1).setVisible(false)

    // Blinking arrow
    this.arrow = this.add.text(DB.x + DB.w - DB.pad - 4, DB.y + DB.h - 10, '▼', {
      fontFamily: FONT, fontSize: '9px', color: '#2c2137',
    }).setOrigin(1, 1).setDepth(depth + 1).setVisible(false)

    this._arrowOn = false
    this.time.addEvent({
      delay: 500, loop: true,
      callback: () => {
        if (!this.dialogueOpen || this.typing || this.inChoice) return
        this._arrowOn = !this._arrowOn
        this.arrow.setVisible(this._arrowOn)
      },
    })

    // Choice UI (desktop)
    this.choiceBox    = this.add.graphics().setDepth(depth + 1).setVisible(false)
    this.choiceYesText = this.add.text(0, 0, '▶ YES', {
      fontFamily: FONT, fontSize: '9px', color: '#2c2137',
    }).setDepth(depth + 2).setVisible(false)
    this.choiceNoText  = this.add.text(0, 0, '  NO', {
      fontFamily: FONT, fontSize: '9px', color: '#2c2137',
    }).setDepth(depth + 2).setVisible(false)

    this._hideDialogue(true)
  }

  // Slide elements array (shared by show/hide)
  get _slideEls() {
    return [this.boxBg, this.nameTabBg, this.dlgText, this.nameText, this.pageCounter, this.arrow]
  }

  _showDialogueBox() {
    const { x, y, w, h } = DB
    const els = this._slideEls

    // Kill any in-progress animation and reset to base positions
    this.tweens.killTweensOf(els)
    this.boxBg.y         = 0
    this.nameTabBg.y     = 0
    this.dlgText.y       = DB.textY
    this.nameText.y      = DB.y - 14
    this.pageCounter.y   = DB.y + 6
    this.arrow.y         = DB.y + DB.h - 10

    // Draw box
    this.boxBg.clear()
    this.boxBg.fillStyle(0xf8f0d0, 1)
    this.boxBg.fillRect(x, y, w, h)
    this.boxBg.lineStyle(3, 0x2c2137, 1)
    this.boxBg.strokeRect(x, y, w, h)
    this.boxBg.setVisible(true)

    // Sync text positions
    this.dlgText.setPosition(DB.x + DB.pad, DB.textY)
    this.pageCounter.setPosition(DB.x + DB.w - DB.pad, DB.y + 6)
    this.arrow.setPosition(DB.x + DB.w - DB.pad - 4, DB.y + DB.h - 10)
    this.nameText.setPosition(20, DB.y - 14)

    const name = this.dlgData?.name ?? ''
    if (name) {
      this.nameText.setText(name)
      const tabW = name.length * 8 + 28, tabH = 22, tabY = DB.y - tabH
      this.nameTabBg.clear()
      this.nameTabBg.fillStyle(0x2866c8, 1)
      this.nameTabBg.fillRect(12, tabY, tabW, tabH)
      this.nameTabBg.lineStyle(2, 0x2c2137, 1)
      this.nameTabBg.strokeRect(12, tabY, tabW, tabH)
      this.nameTabBg.setVisible(true)
      this.nameText.setVisible(true)
    }
    this.dlgText.setVisible(true)
    this.pageCounter.setVisible(true)

    // Slide up from below screen
    els.forEach(e => { e.y += SLIDE })
    this.tweens.add({
      targets: els,
      y: `-=${SLIDE}`,
      duration: 150,
      ease: 'Power2',
    })
  }

  _hideDialogue(immediate = false) {
    const els = this._slideEls
    this.tweens.killTweensOf(els)
    this._hideChoiceUI()

    const resetPositions = () => {
      this.boxBg.clear().setVisible(false)
      this.nameTabBg.clear().setVisible(false)
      this.nameText.setVisible(false)
      this.dlgText.setVisible(false)
      this.pageCounter.setVisible(false)
      this.arrow.setVisible(false)
      this._arrowOn = false
      // Reset y to base so next slide-up starts from clean state
      this.boxBg.y       = 0
      this.nameTabBg.y   = 0
      this.dlgText.y     = DB.textY
      this.nameText.y    = DB.y - 14
      this.pageCounter.y = DB.y + 6
      this.arrow.y       = DB.y + DB.h - 10
    }

    if (immediate) {
      resetPositions()
      return
    }

    this.tweens.add({
      targets: els,
      y: `+=${SLIDE}`,
      duration: 120,
      ease: 'Power2',
      onComplete: resetPositions,
    })
  }

  // ─── Choice UI ────────────────────────────────────────────────────

  _showChoiceUI() {
    this.inChoice = true
    this.selectedChoice = 0
    const cx = DB.x + DB.w - 100, cy = DB.y + 12

    this.choiceBox.clear()
    this.choiceBox.fillStyle(0xf8f0d0, 1)
    this.choiceBox.fillRect(cx - 8, cy - 6, 88, 52)
    this.choiceBox.lineStyle(2, 0x2c2137, 1)
    this.choiceBox.strokeRect(cx - 8, cy - 6, 88, 52)
    this.choiceBox.setVisible(true)

    this.choiceYesText.setPosition(cx, cy).setVisible(true)
    this.choiceNoText.setPosition(cx, cy + 22).setVisible(true)
    this._updateChoiceCursor()

    if (this.isTouch) this._showMobileChoiceButtons()
  }

  _hideChoiceUI() {
    this.inChoice = false
    this.choiceBox.setVisible(false)
    this.choiceYesText.setVisible(false)
    this.choiceNoText.setVisible(false)
    if (this.isTouch) this._hideMobileChoiceButtons()
  }

  _updateChoiceCursor(playSound = false) {
    if (playSound) window.audioMgr?.select()
    this.choiceYesText.setText(this.selectedChoice === 0 ? '▶ YES' : '  YES')
    this.choiceNoText.setText(this.selectedChoice === 1  ? '▶ NO'  : '  NO')
  }

  // ─── Typewriter ───────────────────────────────────────────────────

  _startPage(pageText) {
    this.fullText  = pageText
    this.charIdx   = 0
    this.typing    = true
    this._arrowOn  = false
    this.arrow.setVisible(false)
    this.dlgText.setText('')

    if (this._typeTimer) this._typeTimer.remove()
    this._typeTimer = this.time.addEvent({
      delay: 35, loop: true,
      callback: () => {
        if (!this.typing) return
        this.charIdx++
        this.dlgText.setText(this.fullText.slice(0, this.charIdx))
        window.audioMgr?.blip()
        if (this.charIdx >= this.fullText.length) {
          this.typing = false
          this._typeTimer.remove()
          this._typeTimer = null
          this._onPageComplete()
        }
      },
    })
  }

  _skipToEnd() {
    if (!this.typing) return
    this.typing = false
    if (this._typeTimer) { this._typeTimer.remove(); this._typeTimer = null }
    this.charIdx = this.fullText.length
    this.dlgText.setText(this.fullText)
    this._onPageComplete()
  }

  _onPageComplete() {
    if (!this.dlgData) return
    const { pages, choice } = this.dlgData
    const isLastPage = this.pageIdx >= pages.length - 1
    const hasChoice  = isLastPage && choice && !this.extraPage

    if (hasChoice) {
      this._showChoiceUI()
    } else {
      this._arrowOn = true
      this.arrow.setVisible(true)
    }
  }

  // ─── Dialogue state machine ───────────────────────────────────────

  _onReset() {
    if (this._typeTimer) { this._typeTimer.remove(); this._typeTimer = null }
    this._hideDialogue(true)   // always immediate on scene transitions
    this.dialogueOpen  = false
    this.typing        = false
    this.inChoice      = false
    this._closing      = false
    this.dlgData       = null
    this.extraPage     = null
    this.game.registry.set('inputLock', false)
  }

  _onOpen(npcData) {
    this._hideHint()
    this.dlgData      = npcData
    this.pageIdx      = 0
    this.extraPage    = null
    this.dialogueOpen = true
    this._closing     = false
    this.game.registry.set('inputLock', true)
    this._showDialogueBox()
    this._updatePageCounter()
    this._startPage(npcData.pages[0])
  }

  _advance() {
    if (!this.dialogueOpen || this._closing) return

    if (this.typing) { this._skipToEnd(); return }
    if (this.inChoice) return

    const { pages } = this.dlgData
    if (this.extraPage) {
      this._close()
      return
    }

    const nextPage = this.pageIdx + 1
    if (nextPage < pages.length) {
      this.pageIdx = nextPage
      this._updatePageCounter()
      this._startPage(pages[this.pageIdx])
    } else {
      this._close()
    }
  }

  _confirmChoice() {
    if (!this.inChoice) return
    window.audioMgr?.select()
    const choice = this.dlgData.choice
    this._hideChoiceUI()
    this.arrow.setVisible(false)

    if (this.selectedChoice === 0) {
      if (choice.yes?.url) window.open(choice.yes.url, '_blank')
      this._close()
    } else {
      if (choice.no?.text) {
        this.extraPage = choice.no.text
        this.dlgText.setText('')
        this._startPage(choice.no.text)
      } else {
        this._close()
      }
    }
  }

  _close() {
    if (this._closing) return
    this._closing = true
    this._hideChoiceUI()
    this._hideDialogue()   // slide-down animation (120ms)
    // Delay state/lock release until animation finishes
    this.time.delayedCall(130, () => {
      this.dialogueOpen = false
      this._closing     = false
      this.dlgData      = null
      this.extraPage    = null
      this.game.registry.set('inputLock', false)
      this.game.events.emit('dialogue:closed')
    })
  }

  _updatePageCounter() {
    if (!this.dlgData) return
    const total = this.dlgData.pages.length
    this.pageCounter.setText(`${this.pageIdx + 1}/${total}`)
  }

  // ─── Mobile joystick ──────────────────────────────────────────────

  _buildJoystick() {
    const JX = 80, JY = H - 70, R = 50, TR = 26
    this.joyBase  = this.add.circle(JX, JY, R, 0x888888, 0.45).setDepth(150)
    this.joyThumb = this.add.circle(JX, JY, TR, 0xdddddd, 0.7).setDepth(151)

    this.joyStick = this.plugins.get('rexVirtualJoystick').add(this, {
      x: JX, y: JY,
      radius: R,
      base: this.joyBase,
      thumb: this.joyThumb,
      dir: '4dir',
      forceMin: 14,
    })
  }

  _buildButtons() {
    const depth = 150
    const AX = W - 56, AY = H - 60
    const BX = W - 116, BY = H - 60

    this.btnA = this.add.circle(AX, AY, 28, 0xdd4444, 0.8).setDepth(depth).setInteractive()
    this.add.text(AX, AY, 'A', { fontFamily: FONT, fontSize: '12px', color: '#fff' })
      .setOrigin(0.5).setDepth(depth + 1)
    this.btnA.on('pointerdown', () => this._onActionPress())

    this.btnB = this.add.circle(BX, BY, 22, 0x5555dd, 0.8).setDepth(depth).setInteractive()
    this.add.text(BX, BY, 'B', { fontFamily: FONT, fontSize: '10px', color: '#fff' })
      .setOrigin(0.5).setDepth(depth + 1)
    this.btnB.on('pointerdown', () => this._onCancelPress())
  }

  _buildMobileChoiceButtons() {
    const depth = 210
    const bw = W - 32, bh = 36
    const bx = 16, byY = H - 78, byN = H - 36

    this.mChoiceYes = this.add.rectangle(bx + bw / 2, byY, bw, bh, 0x44aa44, 0.95)
      .setDepth(depth).setInteractive().setVisible(false)
    this.add.text(bx + bw / 2, byY, '▶ YES', { fontFamily: FONT, fontSize: '10px', color: '#fff' })
      .setOrigin(0.5).setDepth(depth + 1).setVisible(false)
    this.mChoiceNo = this.add.rectangle(bx + bw / 2, byN, bw, bh, 0xaa4444, 0.95)
      .setDepth(depth).setInteractive().setVisible(false)
    this.add.text(bx + bw / 2, byN, '✕ NO', { fontFamily: FONT, fontSize: '10px', color: '#fff' })
      .setOrigin(0.5).setDepth(depth + 1).setVisible(false)

    this._mChoiceChildren = this.children.list.slice(-4)

    this.mChoiceYes.on('pointerdown', () => { this.selectedChoice = 0; this._confirmChoice() })
    this.mChoiceNo.on('pointerdown',  () => { this.selectedChoice = 1; this._confirmChoice() })
  }

  _showMobileChoiceButtons() {
    this._mChoiceChildren?.forEach(o => o.setVisible(true))
  }

  _hideMobileChoiceButtons() {
    this._mChoiceChildren?.forEach(o => o.setVisible(false))
  }

  // ─── Interaction hint ─────────────────────────────────────────────

  _buildHint() {
    const label = this.isTouch ? 'A: TALK' : 'Z: TALK'
    this.hintBg   = this.add.graphics().setDepth(190)
    this.hintText = this.add.text(0, 0, label, {
      fontFamily: FONT, fontSize: '7px', color: '#ffffff',
    }).setOrigin(0.5, 1).setDepth(191).setVisible(false)
  }

  _showHint({ x, y }) {
    if (this.dialogueOpen) return
    const pad = 6, th = 16
    const tw = this.hintText.width + pad * 2
    this.hintBg.clear()
    this.hintBg.fillStyle(0x2c2137, 0.9)
    this.hintBg.fillRect(x - tw / 2, y - 52 - th, tw, th)
    this.hintBg.setVisible(true)
    this.hintText.setPosition(x, y - 52).setVisible(true)
  }

  _hideHint() {
    this.hintBg.clear().setVisible(false)
    this.hintText.setVisible(false)
  }

  // ─── Input handlers ───────────────────────────────────────────────

  _onActionPress() {
    if (this.dialogueOpen) {
      if (this.inChoice)   this._confirmChoice()
      else                 this._advance()
    } else {
      this.game.events.emit('interact')
    }
  }

  _onCancelPress() {
    if (this.dialogueOpen) this._close()
    else                   this.game.events.emit('cancel')
  }

  // ─── Update ───────────────────────────────────────────────────────

  update() {
    if (this.joyStick) {
      const force = this.joyStick.force
      const jx = force > 0 ? this.joyStick.forceX / (this.joyStick.radius || 50) : 0
      const jy = force > 0 ? this.joyStick.forceY / (this.joyStick.radius || 50) : 0
      this.game.registry.set('joystickDir', { x: jx, y: jy })
    }

    const actionJD = Phaser.Input.Keyboard.JustDown(this.keyZ) ||
                     Phaser.Input.Keyboard.JustDown(this.keyEnter)
    const cancelJD = Phaser.Input.Keyboard.JustDown(this.keyEsc)

    if (actionJD) this._onActionPress()
    if (cancelJD) this._onCancelPress()

    if (this.inChoice) {
      const upJD   = Phaser.Input.Keyboard.JustDown(this.keyUp)   ||
                     Phaser.Input.Keyboard.JustDown(this.keyW)
      const downJD = Phaser.Input.Keyboard.JustDown(this.keyDown) ||
                     Phaser.Input.Keyboard.JustDown(this.keyS)
      if (upJD   && this.selectedChoice !== 0) { this.selectedChoice = 0; this._updateChoiceCursor(true) }
      if (downJD && this.selectedChoice !== 1) { this.selectedChoice = 1; this._updateChoiceCursor(true) }
    }
  }
}
