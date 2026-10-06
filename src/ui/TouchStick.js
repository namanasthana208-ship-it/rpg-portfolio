// Floating thumb-stick: touch anywhere inside its zone and the stick centres under
// the thumb. Output is snapped to one of four cardinal directions.

export class TouchStick {
  constructor(scene, { zone, home, radius = 34, depth = 150, showIdle = true, onChange = null }) {
    this.scene = scene
    this.zone = zone
    this.home = home
    this.radius = radius
    this.showIdle = showIdle
    this.onChange = onChange
    this.dir = null
    this.enabled = true
    this.pointerId = null

    this.base = scene.add.graphics().setDepth(depth)
    this.thumb = scene.add.graphics().setDepth(depth + 1)
    this._drawBase()
    this._drawThumb(false)
    this._rest()

    this._down = this._onDown.bind(this)
    this._move = this._onMove.bind(this)
    this._up = this._onUp.bind(this)
    scene.input.on('pointerdown', this._down)
    scene.input.on('pointermove', this._move)
    scene.input.on('pointerup', this._up)
    scene.input.on('pointerupoutside', this._up)
  }

  _drawBase() {
    const g = this.base, r = this.radius
    g.clear()
    g.fillStyle(0x000000, 0.28).fillCircle(0, 0, r)
    g.lineStyle(2, 0xffffff, 0.55).strokeCircle(0, 0, r)
    const c = r * 0.72, s = 5
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const lit = this.dir && DIRV[this.dir][0] === dx && DIRV[this.dir][1] === dy
      g.fillStyle(lit ? 0xffd34a : 0xffffff, lit ? 1 : 0.6)
      const x = dx * c, y = dy * c
      if (dy) g.fillTriangle(x - s, y - dy * s * 0.5, x + s, y - dy * s * 0.5, x, y + dy * s * 0.8)
      else    g.fillTriangle(x - dx * s * 0.5, y - s, x - dx * s * 0.5, y + s, x + dx * s * 0.8, y)
    }
  }

  _drawThumb(active) {
    const g = this.thumb, r = this.radius * 0.46
    g.clear()
    g.fillStyle(0xffffff, active ? 0.92 : 0.7).fillCircle(0, 0, r)
    g.lineStyle(2, 0x283048, 0.35).strokeCircle(0, 0, r)
  }

  _rest() {
    const { x, y } = this.home()
    this.base.setPosition(x, y)
    this.thumb.setPosition(x, y)
    const a = this.enabled && this.showIdle ? 0.55 : 0
    this.base.setAlpha(a)
    this.thumb.setAlpha(a)
  }

  relayout() { if (this.pointerId === null) this._rest() }

  setEnabled(on) {
    this.enabled = on
    if (!on) this._release()
    this.scene.tweens.add({ targets: [this.base, this.thumb], alpha: on && this.showIdle ? 0.55 : 0, duration: 140 })
  }

  _onDown(p) {
    if (!this.enabled || this.pointerId !== null || !this.zone(p)) return
    this.pointerId = p.id
    const { width, height } = this.scene.scale
    const r = this.radius, m = 6
    const x = Phaser.Math.Clamp(p.x, r + m, width - r - m)
    const y = Phaser.Math.Clamp(p.y, r + m, height - r - m)
    this.scene.tweens.killTweensOf([this.base, this.thumb])
    this.base.setPosition(x, y).setAlpha(0.9)
    this.thumb.setPosition(x, y).setAlpha(1)
    this._drawThumb(true)
    this._onMove(p)
  }

  _onMove(p) {
    if (p.id !== this.pointerId) return
    const dx = p.x - this.base.x, dy = p.y - this.base.y
    const dist = Math.hypot(dx, dy), r = this.radius
    const k = dist > r ? r / dist : 1
    this.thumb.setPosition(this.base.x + dx * k, this.base.y + dy * k)

    let dir = null
    if (dist > 7) {
      const ax = Math.abs(dx), ay = Math.abs(dy)
      const cur = this.dir
      // Hysteresis: hold the current axis until the other one clearly dominates
      const bias = cur ? 1.25 : 1
      const horizontal = cur === 'left' || cur === 'right'
        ? ax * bias >= ay
        : cur ? ax > ay * bias : ax > ay
      dir = horizontal ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down')
    }
    this._set(dir)
  }

  _onUp(p) {
    if (p.id !== this.pointerId) return
    this._release()
  }

  _release() {
    this.pointerId = null
    this._set(null)
    this._drawThumb(false)
    this._rest()
  }

  _set(dir) {
    if (dir === this.dir) return
    this.dir = dir
    this._drawBase()
    if (dir) navigator.vibrate?.(4)
    this.onChange?.(dir)
  }

  destroy() {
    const i = this.scene.input
    i.off('pointerdown', this._down)
    i.off('pointermove', this._move)
    i.off('pointerup', this._up)
    i.off('pointerupoutside', this._up)
    this.base.destroy()
    this.thumb.destroy()
  }
}

const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }
