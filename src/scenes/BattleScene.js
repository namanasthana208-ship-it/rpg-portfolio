const FONT  = "'Press Start 2P', monospace"
const W     = 480
const H     = 320
const FIELD_H = 195   // battle field area height
const BOX_Y   = FIELD_H + 3

export class BattleScene extends Phaser.Scene {
  constructor() { super({ key: 'BattleScene' }) }

  init(data) {
    this.fromScene    = data.from ?? 'ChamberScene'
    this.selectedOpt  = 0
    this.menuActive   = false
    this.awaitingTap  = false
    this.textBoxBuilt = false
    this.isTouch      = false
    this._typeTimer   = null
  }

  create() {
    this.isTouch = this.sys.game.device.input.touch

    // Keyboard
    this.keyZ     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z)
    this.keyEnter = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)
    this.keyUp    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP)
    this.keyDown  = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN)
    this.keyW     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W)
    this.keyS     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S)

    // Full black bg
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 1).setDepth(0)

    // Start sequence
    this._playFlash(() => this._playWipe(() => this._showBattle()))
  }

  // ─── Flash ────────────────────────────────────────────────────────

  _playFlash(onDone) {
    const flash = this.add.rectangle(W / 2, H / 2, W, H, 0xffffff, 1).setDepth(98)
    let n = 0
    const on  = () => { flash.setAlpha(1); this.time.delayedCall(75, off) }
    const off = () => {
      flash.setAlpha(0); n++
      if (n < 3) this.time.delayedCall(75, on)
      else       this.time.delayedCall(80, onDone)
    }
    on()
  }

  // ─── Wipe transition ──────────────────────────────────────────────

  _playWipe(onDone) {
    const BARS  = 14
    const barH  = Math.ceil(H / BARS)
    const g     = this.add.graphics().setDepth(90)
    let elapsed = 0

    const timer = this.time.addEvent({
      delay: 16, loop: true,
      callback: () => {
        elapsed += 16
        const p = Math.min(elapsed / 720, 1)
        g.clear()

        for (let i = 0; i < BARS; i++) {
          const fromLeft  = i % 2 === 0
          const barDelay  = (i / BARS) * 0.45
          const rawP      = (p - barDelay) / 0.55
          const barP      = Math.max(0, Math.min(1, rawP))
          const eased     = barP < 0.5 ? 2*barP*barP : 1 - Math.pow(-2*barP+2, 2)/2
          const barW      = eased * W
          const x         = fromLeft ? 0 : W - barW
          const y         = i * barH
          // Alternating black / white bars
          g.fillStyle(i % 4 < 2 ? 0x000000 : 0xffffff, 1)
          g.fillRect(x, y, barW, barH)
        }

        if (p >= 1) {
          timer.remove()
          g.clear()
          g.fillStyle(0x000000, 1)
          g.fillRect(0, 0, W, H)
          this.time.delayedCall(180, () => { g.destroy(); onDone() })
        }
      },
    })
  }

  // ─── Battle screen ────────────────────────────────────────────────

  _showBattle() {
    // Battle field bg — light gray like HGSS
    this.add.rectangle(W/2, FIELD_H/2, W, FIELD_H, 0xe8ecf0, 1).setDepth(1)

    // Subtle perspective lines on field
    const lg = this.add.graphics().setDepth(2)
    lg.lineStyle(1, 0xc8ccd0, 0.7)
    for (let y = 60; y < FIELD_H - 20; y += 14) lg.lineBetween(0, y, W, y)

    // Battle music starts when the battle screen appears
    window.audioMgr?.playBattle()

    // Naman sprite slides in from right
    const tex = this.textures.get('naman_battle')
    const natW = tex.source[0].width
    const natH = tex.source[0].height
    const maxH = 170
    const scale = maxH / natH
    const sprW = natW * scale
    const targetX = W - 24 - sprW / 2
    const sprY = FIELD_H - 12 - maxH / 2

    this.namanSprite = this.add.image(W + sprW, sprY, 'naman_battle')
      .setScale(scale).setDepth(10)

    // Oval platform (like Pokemon HGSS)
    const platCX = targetX, platCY = FIELD_H - 22, platRX = sprW * 0.5, platRY = 12
    const pg2 = this.add.graphics().setDepth(3)
    pg2.fillStyle(0xa8b8c8, 1)
    pg2.fillEllipse(platCX, platCY, platRX * 2, platRY * 2)
    pg2.fillStyle(0xc8d8e8, 1)
    pg2.fillEllipse(platCX, platCY - 3, platRX * 2 - 8, platRY * 2 - 5)

    this.namanSprite.setY(sprY)
    this.tweens.add({
      targets: this.namanSprite, x: targetX, duration: 500, ease: 'Power2',
      onComplete: () => {
        this._buildTextBox()
        this._typeText('A wild NAMAN appeared!', () => {
          this.awaitingTap = true
        })
      },
    })
  }

  // ─── Text box ─────────────────────────────────────────────────────

  _buildTextBox() {
    if (this.textBoxBuilt) return
    this.textBoxBuilt = true
    const bg = this.add.graphics().setDepth(20)
    bg.fillStyle(0xffffff, 1)
    bg.fillRect(0, BOX_Y, W, H - BOX_Y)
    bg.lineStyle(3, 0x1a1a3a, 1)
    bg.strokeRect(3, BOX_Y + 3, W - 6, H - BOX_Y - 6)
    this.textObj = this.add.text(16, BOX_Y + 14, '', {
      fontFamily: FONT, fontSize: '9px', color: '#000000',
      wordWrap: { width: W - 180 },
    }).setDepth(21)
  }

  _typeText(msg, onDone) {
    if (this._typeTimer) { this._typeTimer.remove(); this._typeTimer = null }
    this.textObj.setText('')
    let idx = 0
    this._typeTimer = this.time.addEvent({
      delay: 28, loop: true,
      callback: () => {
        idx++
        this.textObj.setText(msg.slice(0, idx))
        if (idx >= msg.length) {
          this._typeTimer.remove(); this._typeTimer = null
          if (onDone) onDone()
        }
      },
    })
  }

  // ─── Battle menu ──────────────────────────────────────────────────

  _showMenu() {
    this.awaitingTap = false
    this.menuActive  = true
    this.textObj.setText('What will\nyou do?')

    if (this.isTouch) {
      this._buildTouchMenu()
    } else {
      this._buildDesktopMenu()
    }
  }

  _buildDesktopMenu() {
    const mx = W - 156, my = BOX_Y + 4, mw = 150, mh = H - BOX_Y - 8
    this.menuBg = this.add.graphics().setDepth(22)
    this.menuBg.fillStyle(0xffffff, 1)
    this.menuBg.fillRect(mx, my, mw, mh)
    this.menuBg.lineStyle(2, 0x1a1a3a, 1)
    this.menuBg.strokeRect(mx, my, mw, mh)

    const opts = ['EDUCATION', 'EXPERIENCE', 'SKILLS', 'CONTACT', 'RUN']
    this.menuTexts = opts.map((label, i) =>
      this.add.text(mx + 14, my + 10 + i * 20, label, {
        fontFamily: FONT, fontSize: '8px', color: '#000000',
      }).setDepth(23)
    )
    this.menuCursor = this.add.text(mx + 4, my + 10, '►', {
      fontFamily: FONT, fontSize: '8px', color: '#cc0000',
    }).setDepth(24)
    this._updateMenuCursor()
  }

  _buildTouchMenu() {
    const bw = W - 32, bh = 20
    const bx = W / 2
    const opts = ['EDUCATION', 'EXPERIENCE', 'SKILLS', 'CONTACT', 'RUN']
    this.touchBtns = []
    this.touchBtnTexts = []

    opts.forEach((label, i) => {
      const by = BOX_Y + 14 + i * 22
      const bg = this.add.rectangle(bx, by, bw, bh, i === 4 ? 0xf0f0f0 : 0xffffff, 0.95)
        .setDepth(22).setInteractive()
      const txt = this.add.text(bx, by, label, { fontFamily: FONT, fontSize: '7px', color: '#000000' })
        .setOrigin(0.5).setDepth(23)
      bg.on('pointerdown', () => this._selectOption(i))
      this.touchBtns.push(bg)
      this.touchBtnTexts.push(txt)
    })
  }

  _updateMenuCursor() {
    if (!this.menuCursor) return
    this.menuCursor.setY(BOX_Y + 14 + this.selectedOpt * 20)
  }

  _selectOption(opt) {
    if (!this.menuActive) return
    this.menuActive = false

    const tabs = ['edu', 'exp', 'skills', 'contact']
    if (opt === 4) {
      // RUN
      this._hideMenuUI()
      this._typeText('...', () => {
        this.time.delayedCall(1200, () => {
          this._typeText("You can't run from this.", () => {
            this.time.delayedCall(1400, () => this._doPortfolio('exp'))
          })
        })
      })
    } else {
      this._doPortfolio(tabs[opt])
    }
  }

  _hideMenuUI() {
    this.menuBg?.destroy()
    this.menuCursor?.destroy()
    this.menuTexts?.forEach(t => t.destroy())
    this.touchBtns?.forEach(b => b.destroy())
    this.touchBtnTexts?.forEach(t => t.destroy())
  }

  _doPortfolio(tab = 'exp') {
    this._hideMenuUI()
    window.audioMgr?.stopMusic()
    this.cameras.main.fadeOut(350, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this._showPortfolio(tab)
    })
  }

  // ─── Portfolio overlay ────────────────────────────────────────────

  _showPortfolio(tab = 'exp') {
    const overlay = document.createElement('div')
    overlay.id = 'pf-overlay'
    overlay.innerHTML = this._portfolioHTML()
    overlay.style.cssText = `
      position:fixed;top:0;left:0;width:100vw;height:100vh;
      background:rgba(0,0,0,0.96);z-index:9999;
      display:flex;justify-content:center;align-items:center;
      opacity:0;transition:opacity 0.4s;font-family:${FONT};
    `
    document.body.appendChild(overlay)

    // Activate the tab that matches the menu option the player chose
    overlay.querySelectorAll('.pf-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab)
    })
    overlay.querySelectorAll('.pf-content').forEach(c => {
      c.classList.toggle('active', c.id === `pf-${tab}`)
    })

    requestAnimationFrame(() => { overlay.style.opacity = '1' })

    // Tab switching
    overlay.querySelectorAll('.pf-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        overlay.querySelectorAll('.pf-tab').forEach(b => b.classList.remove('active'))
        overlay.querySelectorAll('.pf-content').forEach(c => c.classList.remove('active'))
        btn.classList.add('active')
        overlay.querySelector(`#pf-${btn.dataset.tab}`).classList.add('active')
      })
    })

    // Close
    const closePortfolio = () => {
      if (document.activeElement) document.activeElement.blur()
      overlay.style.opacity = '0'
      setTimeout(() => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay)
        this._returnToChamber()
      }, 420)
    }

    overlay.querySelector('#pf-close').addEventListener('click', closePortfolio)
    document.addEventListener('keydown', function escClose(e) {
      if (e.key === 'Escape') { document.removeEventListener('keydown', escClose); closePortfolio() }
    })
  }

  _returnToChamber() {
    // Clear inputLock before waking so _onWake and UIScene first-update see it false
    this.game.registry.set('inputLock', false)
    this.scene.wake('ChamberScene')
    this.scene.setVisible(true, 'UIScene')
    this.scene.resume('UIScene')
    this.scene.stop('BattleScene')
    // Focus canvas after a tick — scene.stop() triggers input-plugin cleanup which
    // can steal/drop focus; delaying ensures canvas.focus() wins.
    const game = this.game
    setTimeout(() => {
      game.canvas.tabIndex = 0
      game.canvas.focus()
    }, 50)
  }

  // ─── Input (update) ───────────────────────────────────────────────

  update() {
    const actionJD = Phaser.Input.Keyboard.JustDown(this.keyZ) ||
                     Phaser.Input.Keyboard.JustDown(this.keyEnter)

    if (this.awaitingTap && actionJD) {
      this.awaitingTap = false
      this._showMenu()
      return
    }

    if (this.menuActive && !this.isTouch) {
      const upJD   = Phaser.Input.Keyboard.JustDown(this.keyUp) || Phaser.Input.Keyboard.JustDown(this.keyW)
      const downJD = Phaser.Input.Keyboard.JustDown(this.keyDown) || Phaser.Input.Keyboard.JustDown(this.keyS)
      if (upJD   && this.selectedOpt > 0) { this.selectedOpt--; this._updateMenuCursor() }
      if (downJD && this.selectedOpt < 4) { this.selectedOpt++; this._updateMenuCursor() }
      if (actionJD) this._selectOption(this.selectedOpt)
    }
  }

  // ─── Portfolio HTML ───────────────────────────────────────────────

  _portfolioHTML() {
    const css = `
      <style>
        #pf-card{background:#080818;border:3px solid #FFD700;box-shadow:inset 0 0 0 1px #FFD70066;
          width:min(580px,95vw);height:88vh;display:flex;flex-direction:column;
          position:relative;box-sizing:border-box;overflow:hidden;}
        #pf-close{position:absolute;top:8px;right:8px;min-width:44px;min-height:44px;
          background:transparent;border:2px solid #FFD700;color:#FFD700;cursor:pointer;
          font-family:${FONT};font-size:10px;display:flex;align-items:center;
          justify-content:center;z-index:10;}
        #pf-close:hover{background:#FFD70022;}
        #pf-header{padding:14px 56px 12px 16px;border-bottom:1px solid #FFD70066;flex-shrink:0;}
        #pf-name{font-size:9px;color:#FFD700;margin-bottom:8px;line-height:1.5;}
        #pf-sub{font-size:6px;color:#aaaacc;line-height:1.8;}
        #pf-tabs{display:flex;border-bottom:1px solid #FFD70066;flex-shrink:0;overflow-x:auto;}
        .pf-tab{flex:1;min-width:80px;padding:10px 4px;background:transparent;border:none;
          border-right:1px solid #FFD70033;color:#aaaacc;cursor:pointer;
          font-family:${FONT};font-size:6px;transition:all 0.15s;}
        .pf-tab:last-child{border-right:none;}
        .pf-tab:hover{background:#FFD70011;color:#FFD700;}
        .pf-tab.active{background:#FFD70022;color:#FFD700;border-bottom:2px solid #FFD700;}
        #pf-body{flex:1;overflow:hidden;position:relative;}
        .pf-content{position:absolute;inset:0;overflow-y:auto;padding:14px 16px;
          display:none;-webkit-overflow-scrolling:touch;}
        .pf-content.active{display:block;}
        .pf-role{font-size:7px;color:#FFD700;margin:14px 0 4px;line-height:1.6;}
        .pf-company{font-size:6px;color:#8888aa;margin-bottom:10px;line-height:1.8;}
        .pf-section{font-size:6px;color:#aaaadd;margin:10px 0 5px;text-transform:uppercase;
          border-bottom:1px solid #FFD70033;padding-bottom:3px;}
        .pf-text{font-size:6px;color:#ccccee;line-height:2;margin-bottom:4px;
          word-break:break-word;overflow-wrap:break-word;}
        .pf-skill-group{margin-bottom:12px;}
        .pf-skill-label{font-size:6px;color:#FFD700;margin-bottom:6px;}
        .pf-skill-items{font-size:6px;color:#aaaacc;line-height:2.2;}
        .pf-contact-item{font-size:6px;color:#aaaacc;margin-bottom:14px;line-height:2;}
        .pf-link{color:#FFD700;text-decoration:none;}
        .pf-link:hover{text-decoration:underline;}
        .pf-divider{border:none;border-top:1px solid #FFD70033;margin:14px 0;}
        @media(max-width:420px){
          #pf-name{font-size:7px;}
          .pf-role{font-size:6px;}
          .pf-tab{font-size:5px;padding:8px 2px;}
        }
      </style>
    `

    const exp = `
      <div class="pf-role">GROWTH ASSOCIATE</div>
      <div class="pf-company">DG3 (Barter) &nbsp;&middot;&nbsp; Feb 2025 &ndash; Present</div>

      <div class="pf-section">CONTENT</div>
      <div class="pf-text">Built a football acquisition page on Instagram from zero.</div>
      <div class="pf-text">368K &rarr; 1.06M &rarr; 1.1M &rarr; 3.7M monthly impressions in 4 months.</div>
      <div class="pf-text">Peak: 1.99M accounts reached &middot; 461K interactions in one month.</div>
      <div class="pf-text">Grew DG3's Twitter from 875K to 6M impressions/month in 6 months.</div>

      <div class="pf-section">PAID ACQUISITION</div>
      <div class="pf-text">Betting ads get blocked everywhere &mdash; so built a surrogate funnel instead.</div>
      <div class="pf-text">Drove traffic to a free prediction game, captured emails, converted warm leads.</div>
      <div class="pf-text">$9.5K across Meta, Reddit, YouTube, Telegram &amp; crypto networks &middot; 7 countries.</div>
      <div class="pf-text">2.1M+ impressions &middot; 1,900+ signups &middot; 1,858 emails collected.</div>
      <div class="pf-text">Cut CAC from $23.55 &rarr; $6.10 (&minus;74%) by diagnosing UX drop-offs via Clarity and getting the product fixed: OTP flow &rarr; $9 &middot; deep linking &rarr; $7.90 &rarr; $6.10.</div>

      <div class="pf-section">AFFILIATES</div>
      <div class="pf-text">Ran the affiliate program end to end &mdash; outreach, negotiation, closing, account management.</div>
      <div class="pf-text">Set up automated DM outreach via InboxApp on X, then personally handled 1,000+ replies through to conversion.</div>
      <div class="pf-text">Built custom assets per affiliate based on their audience and needs.</div>
      <div class="pf-text">Channel total: 1,600+ users &middot; $661K+ in trading volume.</div>

      <div class="pf-section">ACTIVATION</div>
      <div class="pf-text">Led user activation managing a direct report.</div>
      <div class="pf-text">Built onboarding email journeys and ran win-back campaigns for dormant signups.</div>
      <div class="pf-text">Monthly activation rate: 20% &rarr; 35%.</div>
      <div class="pf-text">Email open rates consistently 25%+ &middot; peaks at 35%.</div>

      <div class="pf-section">ANALYTICS &amp; OPS</div>
      <div class="pf-text">Built Python-automated Excel dashboards covering all DG3 pages &mdash; weekly reporting, UTM attribution, targets tracking.</div>
      <div class="pf-text">Set up GTM, GA4, and Microsoft Clarity end to end.</div>
      <div class="pf-text">Wrote PostgreSQL queries for channel-level signup tracking.</div>
      <div class="pf-text">Traced a UTM-stripping bug to the SPA router and got it fixed.</div>

      <hr class="pf-divider"/>

      <div class="pf-role">MARKETING INTERN</div>
      <div class="pf-company">DG3 (Barter) &nbsp;&middot;&nbsp; Jun 2024 &ndash; Feb 2025</div>
      <div class="pf-text">Built a football meme page on Instagram as a top-of-funnel acquisition channel. Ran all of it: strategy, creatives, posting.</div>
      <div class="pf-text">368K &rarr; 3.7M monthly impressions in 4 months &middot; 1.99M accounts reached at peak.</div>
      <div class="pf-text">Owned DG3's football content on Twitter end to end.</div>
      <div class="pf-text">875K &rarr; 6M impressions/month in 6 months &middot; 110 &rarr; 5,000+ followers.</div>
      <div class="pf-text">Ran Euro 2024 and Wimbledon campaigns across Twitter, Discord and Telegram.</div>
      <div class="pf-text">Drove $150K+ in betting volume in a single month.</div>

      <hr class="pf-divider"/>

      <div class="pf-role">CONTENT CREATION INTERN</div>
      <div class="pf-company">The Indian Idiot &nbsp;&middot;&nbsp; Feb 2023 &ndash; Apr 2024</div>
      <div class="pf-text">One of 3 interns working directly under the founder.</div>
      <div class="pf-text">1M+ follower Instagram community.</div>
      <div class="pf-text">Wrote 150+ posts reaching 100M+ accounts.</div>
      <div class="pf-text">Brands: Netflix, Prime Video, Spotify, Flipkart, Indeed and 15+ others.</div>
      <div class="pf-text">Led ground-up campaigns for Masters&rsquo; Union and ISBF.</div>
      <div class="pf-text">Analysed 5,000+ user responses across 15 posts to build UGC strategy.</div>
    `

    const edu = `
      <div class="pf-role">BACHELOR OF COMMERCE</div>
      <div class="pf-company">National PG College &nbsp;&middot;&nbsp; 2021 &ndash; 2024</div>
      <hr class="pf-divider"/>
      <div class="pf-role">ISC CLASS XII &nbsp;&mdash;&nbsp; 91%</div>
      <div class="pf-role" style="margin-top:8px;">ICSE CLASS X &nbsp;&mdash;&nbsp; 92.6%</div>
      <div class="pf-company">City Montessori School, Gomti Nagar &nbsp;&middot;&nbsp; 2009 &ndash; 2021</div>
    `

    const skills = `
      <div class="pf-skill-group">
        <div class="pf-skill-label">GROWTH</div>
        <div class="pf-skill-items">
          Performance marketing &middot; affiliate &amp; partnerships<br>
          KOL &amp; influencer marketing &middot; lifecycle email<br>
          User activation &middot; funnel &amp; CAC optimisation<br>
          Cold outreach &middot; key account management<br>
          Agency management
        </div>
      </div>
      <div class="pf-skill-group">
        <div class="pf-skill-label">CONTENT</div>
        <div class="pf-skill-items">
          Content strategy &middot; copywriting &middot; short-form video<br>
          Social media (X, Instagram) &middot; community (Discord, Telegram)<br>
          Live stream &amp; podcast production
        </div>
      </div>
      <div class="pf-skill-group">
        <div class="pf-skill-label">ANALYTICS &amp; TOOLS</div>
        <div class="pf-skill-items">
          GA4 &middot; GTM &middot; Microsoft Clarity &middot; UTM attribution<br>
          SQL (PostgreSQL) &middot; Excel &middot; Python (AI-assisted)<br>
          Prompt writing
        </div>
      </div>
      <div class="pf-skill-group">
        <div class="pf-skill-label">DOMAIN</div>
        <div class="pf-skill-items">
          Prediction markets &middot; Polymarket &middot; Kalshi &middot; sports trading
        </div>
      </div>
      <div class="pf-skill-group">
        <div class="pf-skill-label">EXECUTION</div>
        <div class="pf-skill-items">I can get things done.</div>
      </div>
    `

    const contact = `
      <div class="pf-contact-item">
        <div class="pf-skill-label" style="margin-bottom:6px;">LINKEDIN</div>
        <a class="pf-link" href="https://linkedin.com/in/naman-asthana-a1874722a" target="_blank" rel="noopener">
          linkedin.com/in/naman-asthana-a1874722a
        </a>
      </div>
      <div class="pf-contact-item">
        <div class="pf-skill-label" style="margin-bottom:6px;">EMAIL</div>
        <a class="pf-link" href="mailto:namanasthana208@gmail.com">namanasthana208@gmail.com</a>
      </div>
      <div class="pf-contact-item">
        <div class="pf-skill-label" style="margin-bottom:6px;">PHONE</div>
        <div class="pf-text">+91 9161211377</div>
      </div>
    `

    return `
      ${css}
      <div id="pf-card">
        <button id="pf-close">&#x2715;</button>
        <div id="pf-header">
          <div id="pf-name">NAMAN ASTHANA</div>
          <div id="pf-sub">Growth Associate @ DG3 &nbsp;&middot;&nbsp; Lucknow, India</div>
        </div>
        <div id="pf-tabs">
          <button class="pf-tab active" data-tab="exp">EXPERIENCE</button>
          <button class="pf-tab" data-tab="edu">EDUCATION</button>
          <button class="pf-tab" data-tab="skills">SKILLS</button>
          <button class="pf-tab" data-tab="contact">CONTACT</button>
        </div>
        <div id="pf-body">
          <div id="pf-exp"     class="pf-content active">${exp}</div>
          <div id="pf-edu"     class="pf-content">${edu}</div>
          <div id="pf-skills"  class="pf-content">${skills}</div>
          <div id="pf-contact" class="pf-content">${contact}</div>
        </div>
      </div>
    `
  }
}
