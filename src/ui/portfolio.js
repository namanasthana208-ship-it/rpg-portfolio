// Portfolio overlay — HTML on top of the canvas so text is real, selectable and scrollable.

const PX = "'Press Start 2P', monospace"
const RESUME_URL = 'assets/Naman_Asthana_Resume.pdf'
const RESUME_FILE = 'Naman_Asthana_Resume.pdf'
const BODY = "'VT323', 'Courier New', monospace"

const TABS = [
  { id: 'exp', label: 'EXPERIENCE' },
  { id: 'edu', label: 'EDUCATION' },
  { id: 'skills', label: 'SKILLS' },
  { id: 'contact', label: 'CONTACT' },
]

const li = items => `<ul class="pf-list">${items.map(t => `<li>${t}</li>`).join('')}</ul>`
const section = (title, items) => `<h4 class="pf-section"><span>${title}</span></h4>${li(items)}`

const EXPERIENCE = `
  <article class="pf-role-card">
    <h3 class="pf-role">GROWTH ASSOCIATE</h3>
    <p class="pf-meta">DG3 (Barter) &middot; Feb 2025 &ndash; Present</p>
    ${section('AFFILIATES', [
      'Ran the affiliate funnel end to end with a small founding team.',
      'Set up automated cold DM outreach on X through InboxApp, then personally handled <b>1,000+</b> replies through negotiation and closing.',
      'Once someone came on board, found out what they were struggling with and built custom assets for their audience and platform.',
      'On the founding team of a channel that brought in <b>1,600+</b> users and <b>$661K+</b> in trading volume.',
    ])}
    ${section('PAID ACQUISITION', [
      'Betting ads get rejected on most platforms, so built a surrogate funnel: ads for a free football prediction game, then email capture, then a push to the trading platform once users were warm.',
      '<b>$9.5K</b> across Meta, Reddit, YouTube, Telegram and crypto ad networks in <b>7 countries</b>: <b>2.1M+</b> impressions, <b>1,900+</b> signups and <b>1,850+</b> emails.',
      'Cut cost per signup from <b>$23.55 to $6.10 (&minus;74%)</b> by fixing the product alongside the ads. Clarity recordings showed people dropping off at the OTP screen: the OTP fix took it to $9, deep linking to $7.90, then a deep-linking fix to $6.10.',
      'Managed an external agency (Dot Ads).',
    ])}
    ${section('ACTIVATION', [
      'Led user activation and managed one direct report.',
      'Built the onboarding email journey and ran win-back offers for people who signed up but never traded.',
      'Monthly activation went from <b>20% to 35%</b>. Email open rates stayed above <b>25%</b> and peaked at <b>35%</b>.',
    ])}
    ${section('CONTENT, KOLS &amp; LIVE', [
      'Plans the DG3 content calendar and runs KOL distribution: <b>38</b> quote-post placements, each with its own creator brief.',
      "Read X's open-sourced ranking algorithm and rebuilt the content playbook around it.",
      'Hosted and produced live streams and podcasts through the FIFA World Cup 2026, Wimbledon 2026 and the Premier League.',
    ])}
    ${section('ANALYTICS &amp; RESEARCH', [
      'Built an AI-assisted Python reporting system that produces weekly Excel dashboards for all four DG3 X pages, with UTM attribution.',
      'Set up GTM, GA4 and Microsoft Clarity end to end. Wrote PostgreSQL queries for signups by channel.',
      'Traced a bug where the terminal was stripping UTMs back to the SPA router.',
      'Backtested World Cup 2026 Polymarket strategies across <b>40</b> matches and wrote up the results.',
    ])}
  </article>
  <hr class="pf-divider">
  <article class="pf-role-card">
    <h3 class="pf-role">MARKETING INTERN</h3>
    <p class="pf-meta">DGBet (now DG3) &middot; Jun 2024 &ndash; Feb 2025</p>
    ${li([
      'Started a football meme page on Instagram as a top-of-funnel channel and ran all of it.',
      'Monthly impressions went <b>368K &rarr; 3.7M</b> in four months. The best month reached <b>1.99M</b> accounts and <b>461K</b> interactions.',
      "Owned DGBet's football content on X: <b>875K &rarr; 6M</b> monthly impressions in six months, and <b>110 &rarr; 5,000+</b> followers.",
      'Ran Euro 2024 and Wimbledon campaigns with contests across X, Discord and Telegram, driving <b>$150K+</b> in betting volume in one month.',
    ])}
  </article>
  <hr class="pf-divider">
  <article class="pf-role-card">
    <h3 class="pf-role">CONTENT CREATION INTERN</h3>
    <p class="pf-meta">The Indian Idiot &middot; Feb 2023 &ndash; Apr 2024</p>
    ${li([
      'One of three interns reporting directly to the founder of a <b>1M+</b> follower Instagram community.',
      'Wrote <b>150+</b> posts reaching <b>100M+</b> accounts, with <b>20+</b> brands including Netflix, Prime Video, Spotify, Flipkart and Indeed.',
      'Ran campaigns from scratch for Masters&rsquo; Union and ISBF.',
      'Read through <b>5,000+</b> user responses to pick the ones worth turning into user-generated content.',
    ])}
  </article>`

const EDUCATION = `
  <article class="pf-role-card">
    <h3 class="pf-role">BACHELOR OF COMMERCE</h3>
    <p class="pf-meta">National PG College &middot; 2021 &ndash; 2024</p>
  </article>
  <hr class="pf-divider">
  <article class="pf-role-card">
    <h3 class="pf-role">ISC CLASS XII <span class="pf-score">91%</span></h3>
    <h3 class="pf-role">ICSE CLASS X <span class="pf-score">92.6%</span></h3>
    <p class="pf-meta">City Montessori School, Gomti Nagar &middot; 2009 &ndash; 2021</p>
  </article>`

const chips = items => `<div class="pf-chips">${items.map(t => `<span class="pf-chip">${t}</span>`).join('')}</div>`

const SKILLS = `
  <h4 class="pf-section"><span>GROWTH</span></h4>
  ${chips(['Performance marketing (Meta, Reddit, YouTube, Google Ads)', 'Affiliate &amp; partnerships', 'KOL &amp; influencer marketing', 'Lifecycle email', 'User activation', 'Funnel &amp; CAC optimisation', 'Cold outreach', 'Key account management', 'Agency management'])}
  <h4 class="pf-section"><span>CONTENT</span></h4>
  ${chips(['Content strategy', 'Copywriting', 'Short-form video', 'Social media (X, Instagram)', 'Community (Discord, Telegram)', 'Live stream &amp; podcast production'])}
  <h4 class="pf-section"><span>ANALYTICS &amp; TOOLS</span></h4>
  ${chips(['GA4', 'GTM', 'Microsoft Clarity', 'UTM attribution', 'SQL (PostgreSQL)', 'Excel', 'Python (AI-assisted)', 'Claude', 'Prompt writing', 'InboxApp'])}
  <h4 class="pf-section"><span>DOMAIN</span></h4>
  ${chips(['Prediction markets', 'Polymarket', 'Kalshi', 'Sports trading', 'Crypto'])}
  <h4 class="pf-section"><span>EXECUTION</span></h4>
  <p class="pf-quote">&ldquo;I can get things done.&rdquo;</p>`

const contactCard = (label, value, href, { download, icon = '&#8599;', cls = '' } = {}) => `
  <a class="pf-link-card ${cls}" href="${href}" ${download ? `download="${download}"` : ''} ${href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>
    <span class="pf-link-body"><span class="pf-link-label">${label}</span><span class="pf-link-value">${value}</span></span>
    <span class="pf-link-arrow" aria-hidden="true">${icon}</span>
  </a>`

const CONTACT = `
  <p class="pf-lead">If you&rsquo;re hiring for growth, or you work in coffee, let&rsquo;s talk.</p>
  <div class="pf-contact">
    ${contactCard('RESUME', 'Download PDF', RESUME_URL, { download: RESUME_FILE, icon: '&#8595;', cls: 'pf-resume-card' })}
    ${contactCard('LINKEDIN', 'linkedin.com/in/naman-asthana-a1874722a', 'https://linkedin.com/in/naman-asthana-a1874722a')}
    ${contactCard('EMAIL', 'namanasthana208@gmail.com', 'mailto:namanasthana208@gmail.com')}
    ${contactCard('PHONE', '+91 9161211377', 'tel:+919161211377')}
  </div>`

const PANES = { exp: EXPERIENCE, edu: EDUCATION, skills: SKILLS, contact: CONTACT }

const CSS = `
#pf-root{position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;
  padding:max(14px,env(safe-area-inset-top)) max(14px,env(safe-area-inset-right)) max(14px,env(safe-area-inset-bottom)) max(14px,env(safe-area-inset-left));
  background:radial-gradient(ellipse at 50% 40%,rgba(26,20,60,.88),rgba(2,2,10,.96));
  opacity:0;transition:opacity .32s ease;font-family:${BODY};-webkit-tap-highlight-color:transparent}
#pf-root.on{opacity:1}
#pf-card{position:relative;width:min(720px,100%);height:min(820px,100%);display:flex;flex-direction:column;
  background:#0b0b1f;border:3px solid #ffd700;
  box-shadow:0 0 0 3px #0b0b1f,0 0 0 5px rgba(255,215,0,.32),0 30px 90px rgba(0,0,0,.75);
  transform:translateY(18px) scale(.97);transition:transform .45s cubic-bezier(.2,.9,.25,1.08)}
#pf-root.on #pf-card{transform:none}
#pf-head{display:flex;align-items:center;gap:14px;padding:16px 14px 14px 18px;border-bottom:2px solid rgba(255,215,0,.22);flex-shrink:0}
#pf-avatar{width:48px;height:48px;flex-shrink:0;border:2px solid #ffd700;background:#000 url('assets/naman_battle.png') no-repeat;
  background-size:290%;background-position:50% 9%;image-rendering:pixelated}
#pf-id{flex:1;min-width:0}
#pf-name{margin:0;font:15px/1.4 ${PX};color:#ffd700;text-shadow:2px 2px 0 #3a2c00}
#pf-sub{margin:4px 0 0;font-size:20px;line-height:1.1;color:#a8a8d8}
#pf-close{flex-shrink:0;width:46px;height:46px;display:flex;align-items:center;justify-content:center;
  background:transparent;border:2px solid #ffd700;color:#ffd700;font:13px ${PX};cursor:pointer;transition:background .15s,transform .1s}
#pf-close:hover,#pf-close:focus-visible{background:rgba(255,215,0,.14);outline:none}
#pf-close:active{transform:scale(.92)}
#pf-resume{flex-shrink:0;height:46px;display:flex;align-items:center;gap:8px;padding:0 14px;text-decoration:none;
  background:#ffd700;border:2px solid #ffd700;color:#0b0b1f;font:9px ${PX};cursor:pointer;transition:background .15s,transform .1s}
#pf-resume:hover,#pf-resume:focus-visible{background:#ffe55c;outline:none}
#pf-resume:active{transform:scale(.94)}
#pf-resume .ico{font-size:13px;line-height:1}
.pf-resume-card{border-color:#ffd700;background:rgba(255,215,0,.08)}
#pf-tabs{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:2px solid rgba(255,215,0,.22);flex-shrink:0}
.pf-tab{position:relative;min-height:48px;padding:12px 4px;background:none;border:0;border-right:1px solid rgba(255,215,0,.12);
  color:#8c8cba;font:9px/1.3 ${PX};cursor:pointer;transition:color .15s,background .15s}
.pf-tab:last-child{border-right:0}
.pf-tab:hover{color:#e6d27a;background:rgba(255,215,0,.05)}
.pf-tab[aria-selected="true"]{color:#ffd700;background:rgba(255,215,0,.08)}
.pf-tab[aria-selected="true"]::after{content:"";position:absolute;left:0;right:0;bottom:-2px;height:3px;background:#ffd700}
.pf-tab:focus-visible{outline:2px dashed #ffd700;outline-offset:-5px}
#pf-body{position:relative;flex:1;overflow:hidden}
.pf-pane{position:absolute;inset:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;
  padding:20px 24px 32px;opacity:0;visibility:hidden;transform:translateY(8px);
  transition:opacity .2s ease,transform .2s ease,visibility 0s linear .2s;
  scrollbar-width:thin;scrollbar-color:#ffd700 transparent}
.pf-pane.on{opacity:1;visibility:visible;transform:none;transition:opacity .24s ease .06s,transform .24s ease .06s,visibility 0s}
.pf-pane::-webkit-scrollbar{width:6px}.pf-pane::-webkit-scrollbar-thumb{background:#ffd700}
.pf-role-card{margin:0}
.pf-role{margin:0 0 4px;font:12px/1.7 ${PX};color:#ffd700}
.pf-score{color:#fff;margin-left:10px}
.pf-meta{margin:2px 0 10px;font-size:20px;color:#9494c4}
.pf-section{display:flex;align-items:center;margin:20px 0 10px;padding:9px 12px;font:9px/1.3 ${PX};letter-spacing:1px;color:#ffd700;
  background:linear-gradient(90deg,rgba(255,215,0,.16),rgba(255,215,0,0) 85%);border-left:4px solid #ffd700}
.pf-list{list-style:none;margin:0;padding:0}
.pf-list li{position:relative;margin:0 0 9px;padding-left:22px;font-size:21px;line-height:1.2;color:#e6e6f8}
.pf-list li::before{content:"\\25B8";position:absolute;left:3px;top:0;color:#ffd700}
.pf-list b{color:#ffe27a;font-weight:normal}
.pf-divider{border:0;height:2px;margin:28px 0 24px;background:repeating-linear-gradient(90deg,#ffd700 0 6px,transparent 6px 12px);opacity:.35}
.pf-chips{display:flex;flex-wrap:wrap;gap:8px}
.pf-chip{padding:5px 11px;font-size:20px;line-height:1.1;color:#e6e6f8;border:1px solid rgba(255,215,0,.35);background:rgba(255,215,0,.06)}
.pf-quote{margin:4px 0 0;font-size:26px;color:#ffe27a}
.pf-lead{margin:0 0 16px;font-size:24px;color:#e6e6f8}
.pf-contact{display:grid;gap:12px}
.pf-link-card{display:flex;align-items:center;gap:14px;min-height:64px;padding:12px 16px;text-decoration:none;
  border:2px solid rgba(255,215,0,.35);background:rgba(255,255,255,.02);transition:border-color .15s,background .15s,transform .1s}
.pf-link-card:hover,.pf-link-card:focus-visible{border-color:#ffd700;background:rgba(255,215,0,.08);outline:none}
.pf-link-card:active{transform:scale(.985)}
.pf-link-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}
.pf-link-label{font:9px ${PX};color:#ffd700}
.pf-link-value{font-size:22px;color:#fff;text-decoration:underline;text-decoration-color:rgba(255,215,0,.6);text-underline-offset:4px;word-break:break-all}
.pf-link-arrow{font-size:28px;color:#ffd700}
@media (max-height:520px),(max-width:520px){
  #pf-root{padding:0}
  #pf-card{width:100%;height:100%;border:0;box-shadow:none}
  #pf-head{gap:10px;padding:6px max(8px,env(safe-area-inset-right)) 6px max(14px,env(safe-area-inset-left))}
  #pf-avatar{width:34px;height:34px}
  #pf-name{font-size:11px}
  #pf-sub{font-size:17px;margin-top:1px}
  #pf-resume{height:44px;padding:0 10px}
  .pf-tab{min-height:42px;padding:8px 2px;font-size:8px}
  .pf-pane{padding:14px max(18px,env(safe-area-inset-right)) 26px max(18px,env(safe-area-inset-left))}
  .pf-list li{font-size:20px}
}
@media (max-width:460px){.pf-tab{font-size:7px}#pf-name{font-size:11px}#pf-resume .lbl-long{display:none}}
@media (min-width:461px){#pf-resume .lbl-short{display:none}}
`

export function openPortfolio({ tab = 'exp', game, onClose }) {
  const root = document.createElement('div')
  root.id = 'pf-root'
  root.setAttribute('role', 'dialog')
  root.setAttribute('aria-modal', 'true')
  root.setAttribute('aria-label', 'Naman Asthana — portfolio')
  root.innerHTML = `
    <style>${CSS}</style>
    <div id="pf-card">
      <header id="pf-head">
        <div id="pf-avatar" aria-hidden="true"></div>
        <div id="pf-id">
          <h2 id="pf-name">NAMAN ASTHANA</h2>
          <p id="pf-sub">Growth Associate @ DG3 &middot; Lucknow, India</p>
        </div>
        <a id="pf-resume" href="${RESUME_URL}" download="${RESUME_FILE}" aria-label="Download resume (PDF)">
          <span class="ico" aria-hidden="true">&#8595;</span><span class="lbl-long">RESUME</span><span class="lbl-short">CV</span>
        </a>
        <button id="pf-close" aria-label="Close portfolio">&#x2715;</button>
      </header>
      <nav id="pf-tabs" role="tablist">
        ${TABS.map(t => `<button class="pf-tab" role="tab" id="pf-tab-${t.id}" data-tab="${t.id}" aria-controls="pf-${t.id}">${t.label}</button>`).join('')}
      </nav>
      <div id="pf-body">
        ${TABS.map(t => `<section class="pf-pane" id="pf-${t.id}" role="tabpanel" aria-labelledby="pf-tab-${t.id}" tabindex="0">${PANES[t.id]}</section>`).join('')}
      </div>
    </div>`
  document.body.appendChild(root)

  const kb = game?.input?.keyboard
  if (kb) kb.enabled = false

  const tabs = [...root.querySelectorAll('.pf-tab')]
  const select = id => {
    for (const t of tabs) {
      const on = t.dataset.tab === id
      t.setAttribute('aria-selected', on)
      t.tabIndex = on ? 0 : -1
    }
    for (const p of root.querySelectorAll('.pf-pane')) p.classList.toggle('on', p.id === `pf-${id}`)
    current = id
  }
  let current = tab
  select(tab)
  tabs.forEach(t => t.addEventListener('click', () => {
    if (t.dataset.tab !== current) window.audioMgr?.cursor()
    select(t.dataset.tab)
  }))

  let closed = false
  const close = (fromHistory = false) => {
    if (closed) return
    closed = true
    window.removeEventListener('popstate', onPop)
    document.removeEventListener('keydown', onKey, true)
    if (!fromHistory && history.state?.pf) history.back()
    window.audioMgr?.select()
    root.classList.remove('on')
    setTimeout(() => {
      root.remove()
      if (kb) kb.enabled = true
      onClose?.()
    }, 330)
  }
  const onPop = () => close(true)
  const onKey = e => {
    if (e.key === 'Escape') { e.preventDefault(); close() }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const i = TABS.findIndex(t => t.id === current)
      const next = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length].id
      e.preventDefault()
      window.audioMgr?.cursor()
      select(next)
      root.querySelector(`#pf-tab-${next}`)?.focus({ preventScroll: true })
    }
  }

  root.querySelector('#pf-close').addEventListener('click', () => close())
  root.querySelectorAll(`a[href="${RESUME_URL}"]`).forEach(a => a.addEventListener('click', () => window.audioMgr?.confirm()))
  root.addEventListener('click', e => { if (e.target === root) close() })
  document.addEventListener('keydown', onKey, true)
  try { history.pushState({ pf: true }, '') } catch {}
  window.addEventListener('popstate', onPop)

  requestAnimationFrame(() => {
    root.classList.add('on')
    root.querySelector('#pf-close').focus({ preventScroll: true })
  })
}
