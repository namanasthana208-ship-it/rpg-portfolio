import { AudioManager }  from './audio/AudioManager.js'
import { BootScene }     from './scenes/BootScene.js'
import { TitleScene }    from './scenes/TitleScene.js'
import { GameScene }     from './scenes/GameScene.js'
import { InteriorScene } from './scenes/InteriorScene.js'
import { ChamberScene }  from './scenes/ChamberScene.js'
import { BattleScene }   from './scenes/BattleScene.js'
import { UIScene }       from './scenes/UIScene.js'

window.audioMgr = new AudioManager()

const config = {
  type: Phaser.AUTO,
  width: 480,
  height: 320,
  backgroundColor: '#080818',
  pixelArt: true,
  plugins: {
    global: [{
      key: 'rexVirtualJoystick',
      plugin: window.RexVirtualJoystickPlugin,
      start: true,
    }],
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 480,
    height: 320,
  },
  scene: [BootScene, TitleScene, GameScene, InteriorScene, ChamberScene, BattleScene, UIScene],
}

window.__game = new Phaser.Game(config)
