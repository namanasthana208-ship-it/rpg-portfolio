// Responsive game resolution.
// Desktop/tablet: fixed 480×320 (letterboxed by Phaser FIT).
// Phone: logical height 240 with width matched to the screen's aspect ratio, so
// the canvas fills the display edge to edge with square pixels and ~1.6× larger UI.

export const FONT = "'Press Start 2P', monospace"
export const TILE = 16

// Primary pointer is a finger (phones, tablets) — not touchscreen laptops with a mouse.
export function isTouchDevice() {
  const mq = q => window.matchMedia?.(q).matches
  return mq('(pointer: coarse)') || (navigator.maxTouchPoints > 0 && !mq('(any-pointer: fine)'))
}

export function isPhone() {
  return isTouchDevice() && Math.min(window.innerWidth, window.innerHeight) <= 500
}

export function computeGameSize() {
  if (!isPhone()) return { w: 480, h: 320 }
  const long = Math.max(window.innerWidth, window.innerHeight)
  const short = Math.min(window.innerWidth, window.innerHeight)
  const h = 240
  const w = Math.round(Math.min(Math.max(h * long / short, 400), 600) / 2) * 2
  return { w, h }
}

// Text is rendered at the device's real pixel density so it stays crisp when scaled.
let textRes = 1
export function updateTextRes(game) {
  const { width, height } = game.scale.gameSize
  const scale = Math.min(window.innerWidth / width, window.innerHeight / height)
  textRes = Math.max(1, Math.min(6, Math.round(scale * (window.devicePixelRatio || 1))))
}

export function patchTextResolution() {
  const proto = Phaser.GameObjects.GameObjectFactory.prototype
  const orig = proto.text
  proto.text = function (x, y, text, style) {
    return orig.call(this, x, y, text, { resolution: textRes, ...style })
  }
}

// Camera bounds that keep a small map centred when it's narrower/shorter than the view.
export function fitCameraBounds(cam, worldW, worldH) {
  const bw = Math.max(worldW, cam.width)
  const bh = Math.max(worldH, cam.height)
  cam.setBounds((worldW - bw) / 2, (worldH - bh) / 2, bw, bh)
}
