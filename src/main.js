import { AudioManager }  from './audio/AudioManager.js'
import { BootScene }     from './scenes/BootScene.js'
import { TitleScene }    from './scenes/TitleScene.js'
import { GameScene }     from './scenes/GameScene.js'
import { InteriorScene } from './scenes/InteriorScene.js'
import { ChamberScene }  from './scenes/ChamberScene.js'
import { BattleScene }   from './scenes/BattleScene.js'
import { UIScene }       from './scenes/UIScene.js'
import { computeGameSize, isPhone, patchTextResolution, updateTextRes } from './layout.js'

window.audioMgr = new AudioManager()
patchTextResolution()

// Phaser bakes text into textures, so the pixel font must be ready before the first frame.
const fontsReady = Promise.race([
  Promise.all([
    document.fonts?.load('10px "Press Start 2P"'),
    document.fonts?.load('20px "VT323"'),
  ]),
  new Promise(r => setTimeout(r, 2500)),
]).catch(() => {})

fontsReady.then(startGame)

function startGame() {
  const size = computeGameSize()
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    width: size.w,
    height: size.h,
    backgroundColor: '#080818',
    pixelArt: true,
    input: { activePointers: 3 },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: size.w,
      height: size.h,
    },
    scene: [BootScene, TitleScene, GameScene, InteriorScene, ChamberScene, BattleScene, UIScene],
  })
  window.__game = game
  updateTextRes(game)

  // Phaser stops its loop for good if a frame throws. Log the error and keep the game alive.
  const step = game.step.bind(game)
  game.step = (time, delta) => {
    try { step(time, delta) } catch (e) { console.error('[game] frame error', e) }
  }

  let resizeTimer = null
  const onResize = () => {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      const s = computeGameSize()
      const g = game.scale.gameSize
      if (s.w !== g.width || s.h !== g.height) game.scale.setGameSize(s.w, s.h)
      game.scale.refresh()
      updateTextRes(game)
    }, 100)
  }
  window.addEventListener('resize', onResize)
  window.addEventListener('orientationchange', onResize)
}

// Phones: go fullscreen on the first tap (needs a real user gesture). Both orientations work.
document.addEventListener('touchend', () => {
  if (!isPhone() || document.fullscreenElement) return
  const el = document.documentElement
  const req = el.requestFullscreen || el.webkitRequestFullscreen
  if (!req) return
  try {
    req.call(el, { navigationUI: 'hide' })?.catch?.(() => {})
  } catch {}
}, { passive: true, once: true })

document.addEventListener('visibilitychange', () => {
  window.audioMgr?.setSuspended(document.hidden)
})
