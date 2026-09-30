const FONT = "'Press Start 2P', monospace"
const W = 480, H = 320

export class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene') }

  create() {
    this._stars = []

    this.add.rectangle(W / 2, H / 2, W, H, 0x080818, 1).setDepth(0)

    // Starfield — 80 stars with random twinkle phases
    for (let i = 0; i < 80; i++) {
      const x = Phaser.Math.Between(0, W)
      const y = Phaser.Math.Between(0, H - 40)
      const r = Phaser.Math.FloatBetween(0.5, 1.8)
      const a = Phaser.Math.FloatBetween(0.3, 1.0)
      const star = this.add.circle(x, y, r, 0xffffff, a).setDepth(1)
      this._stars.push({ obj: star, base: a, phase: Math.random() * Math.PI * 2 })
    }

    // Title
    this.add.text(W / 2, H / 2 - 52, 'NAMAN ASTHANA', {
      fontFamily: FONT, fontSize: '16px', color: '#FFD700',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(10)

    this.add.text(W / 2, H / 2 - 20, 'INTERACTIVE PORTFOLIO', {
      fontFamily: FONT, fontSize: '6px', color: '#8888cc',
    }).setOrigin(0.5).setDepth(10)

    // Blinking prompt
    this._prompt = this.add.text(W / 2, H / 2 + 48, 'PRESS ENTER OR TAP TO START', {
      fontFamily: FONT, fontSize: '6px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(10)

    this.time.addEvent({
      delay: 550, loop: true,
      callback: () => this._prompt.setVisible(!this._prompt.visible),
    })

    // Copyright
    this.add.text(W / 2, H - 10, '2025 NAMAN ASTHANA', {
      fontFamily: FONT, fontSize: '5px', color: '#444466',
    }).setOrigin(0.5, 1).setDepth(10)

    // Input listeners — any keydown or pointer to start
    this.input.keyboard.once('keydown', this._start, this)
    this.input.once('pointerdown', this._start, this)
  }

  _start() {
    if (this._started) return
    this._started = true

    // Unlock Web Audio on first gesture
    window.audioMgr?.unlock()

    this.cameras.main.fadeOut(400, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameScene')
    })
  }

  update(time) {
    for (const s of this._stars) {
      s.obj.setAlpha(s.base * (0.55 + 0.45 * Math.sin(time / 900 + s.phase)))
    }
  }
}
