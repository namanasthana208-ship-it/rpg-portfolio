// Responsive game resolution.
// Desktop/tablet: fixed 480×320 (letterboxed by Phaser FIT).
// Phone landscape: logical height 240, width matched to the screen's aspect ratio.
// Phone portrait: logical width 270, height matched to the screen; the game view
// sits on top and a control deck fills the bottom (see getLayout).
// Either way the canvas fills the display edge to edge with square pixels.

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
  const vw = window.innerWidth, vh = window.innerHeight
  const even = n => Math.round(n / 2) * 2
  if (vh > vw) {
    const w = 270
    return { w, h: even(Math.min(Math.max(w * vh / vw, 420), 660)) }
  }
  const h = 240
  return { w: even(Math.min(Math.max(h * vw / vh, 400), 600)), h }
}

// Where the game world is drawn and where the portrait control deck sits.
export function getLayout(scene) {
  const W = scene.scale.width, H = scene.scale.height
  const phone = isPhone()
  const portrait = phone && H > W
  if (!portrait) return { W, H, phone, portrait, view: { x: 0, y: 0, w: W, h: H }, deck: null }
  const dh = Math.round(Math.min(Math.max(H * 0.4, 180), 260))
  return {
    W, H, phone, portrait,
    view: { x: 0, y: 0, w: W, h: H - dh },
    deck: { x: 0, y: H - dh, w: W, h: dh },
  }
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
// Uses the camera's own viewport size, so it works with the portrait game view too.
export function fitCameraBounds(cam, worldW, worldH) {
  const bw = Math.max(worldW, cam.width)
  const bh = Math.max(worldH, cam.height)
  cam.setBounds((worldW - bw) / 2, (worldH - bh) / 2, bw, bh)
}
