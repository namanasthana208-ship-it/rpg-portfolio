import { FONT, isTouchDevice, isPhone } from '../layout.js'

export class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene') }

  create() {
    this._started = false
    this._build()
    this.scale.on('resize', this._rebuild, this)
    this.events.once('shutdown', () => this.scale.off('resize', this._rebuild, this))
    this.input.keyboard.on('keydown', e => {
      if (['Enter', ' ', 'z', 'Z'].includes(e.key)) this._start()
    })
    this.input.on('pointerup', this._start, this)
    this.cameras.main.fadeIn(500, 0, 0, 0)
  }

  _rebuild() {
    if (this._started) return
    this.children.removeAll(true)
    this.tweens.killAll()
    this.time.removeAllEvents()
    this._build()
  }

  _build() {
    const W = this.scale.width, H = this.scale.height
    const phone = isPhone()
    const narrow = W < 320
    const titleSize = narrow ? '15px' : phone ? '18px' : '20px'
    this.add.rectangle(0, 0, W, H, 0x080818).setOrigin(0)

    this._stars = []
    const count = Math.round(W * H / 1900)
    for (let i = 0; i < count; i++) {
      const s = this.add.rectangle(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), 1, 1, 0xffffff,
        Phaser.Math.FloatBetween(0.25, 1))
      if (Math.random() < 0.12) s.setSize(2, 2)
      this._stars.push({ obj: s, base: s.alpha, phase: Math.random() * Math.PI * 2, speed: 600 + Math.random() * 900 })
    }

    const cy = H * (narrow ? 0.36 : 0.4)
    this.add.text(W / 2 + 2, cy + 2, 'NAMAN ASTHANA', { fontFamily: FONT, fontSize: titleSize, color: '#3a2a00' }).setOrigin(0.5)
    const title = this.add.text(W / 2, cy, 'NAMAN ASTHANA', {
      fontFamily: FONT, fontSize: titleSize, color: '#ffd700',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5)
    this.tweens.add({ targets: title, y: cy - 2, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.InOut' })

    this.add.text(W / 2, cy + 28, 'AN INTERACTIVE PORTFOLIO', {
      fontFamily: FONT, fontSize: '7px', color: '#9a9ae0',
    }).setOrigin(0.5)

    // The player waiting on the title screen
    const hero = this.add.sprite(W / 2, cy + 64, 'player', 'down_0').setScale(2)
    this.add.ellipse(W / 2, cy + 84, 18, 6, 0x000000, 0.4)
    let f = 0
    this.time.addEvent({ delay: 520, loop: true, callback: () => { f = f ? 0 : 2; hero.setFrame(`down_${f}`) } })

    this._prompt = this.add.text(W / 2, H - (narrow ? 90 : phone ? 42 : 56), isTouchDevice() ? 'TAP TO START' : 'PRESS ENTER', {
      fontFamily: FONT, fontSize: '9px', color: '#ffffff',
    }).setOrigin(0.5)
    this._blink = this.tweens.add({ targets: this._prompt, alpha: 0.15, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.InOut' })

    this.add.text(W / 2, H - 10, `© ${new Date().getFullYear()} NAMAN ASTHANA`, {
      fontFamily: FONT, fontSize: '6px', color: '#4a4a70',
    }).setOrigin(0.5, 1)
  }

  _start() {
    if (this._started) return
    this._started = true
    window.audioMgr?.unlock()
    window.audioMgr?.confirm()
    this._blink.stop()
    this.tweens.add({ targets: this._prompt, alpha: { from: 1, to: 0 }, duration: 60, yoyo: true, repeat: 4 })
    this.time.delayedCall(380, () => {
      this.cameras.main.fadeOut(450, 0, 0, 0)
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('GameScene'))
    })
  }

  update(time) {
    for (const s of this._stars ?? []) {
      s.obj.setAlpha(s.base * (0.55 + 0.45 * Math.sin(time / s.speed + s.phase)))
    }
  }
}
