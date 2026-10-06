// Web Audio chiptune engine — synthesised, no files to load or fail.
// Unlocked on the first user gesture; music is scheduled ahead on the audio clock
// (gapless loops) and every track change crossfades.

const NOTE = {
  E2: 82.41, Fs2: 92.5, G2: 98.0, A2: 110.0, B2: 123.47,
  C3: 130.81, D3: 146.83, Eb3: 155.56, E3: 164.81, F3: 174.61, Fs3: 185.0, G3: 196.0,
  Ab3: 207.65, A3: 220.0, Bb3: 233.08, B3: 246.94,
  C4: 261.63, D4: 293.66, Ds4: 311.13, Eb4: 311.13, E4: 329.63, F4: 349.23, Fs4: 369.99,
  G4: 392.0, Ab4: 415.3, A4: 440.0, Bb4: 466.16, B4: 493.88,
  C5: 523.25, D5: 587.33, Eb5: 622.25, E5: 659.25, F5: 698.46, G5: 783.99,
}

const split = s => s.trim().split(/\s+/)

const TOWN = {
  bpm: 120,
  voices: [
    { wave: 'square', vol: 0.15, notes: split(`
      G4 E4 C4 E4 G4 A4 G4 E4  G4 E4 D4 E4 G4 E4 C4 E4
      A4 G4 E4 G4 A4 C5 A4 G4  E4 G4 A4 G4 E4 D4 E4 C4
      C5 A4 G4 E4 G4 A4 G4 E4  C5 E5 D5 C5 A4 G4 E4 G4
      A4 G4 E4 D4 E4 G4 A4 G4  E4 G4 C4 E4 D4 E4 C4 R`) },
    { wave: 'triangle', vol: 0.16, notes: split(`
      C3 - - - G3 - - -  C3 - - - G3 - - -
      F3 - - - C4 - - -  G3 - - - D4 - - -
      C3 - - - G3 - - -  F3 - - - C4 - - -
      A3 - - - E4 - - -  G3 - - - D4 - - -`) },
  ],
}

const BATTLE = {
  bpm: 165,
  voices: [
    { wave: 'square', vol: 0.15, notes: split(`
      C4 Eb4 G4 Bb4 G4 F4 Eb4 C4   C4 Eb4 F4 G4 F4 Eb4 D4 C4
      Ab3 C4 Eb4 F4 G4 F4 Eb4 C4   G3 Bb3 D4 G4 Bb4 G4 F4 Eb4
      C5 - Bb4 G4 Eb5 - D5 C5      Bb4 G4 F4 Eb4 F4 G4 Bb4 -
      Ab4 G4 F4 Eb4 F4 - Eb4 D4    G4 - D4 - B3 - D4 -`) },
    { wave: 'square', vol: 0.09, notes: split(`
      C3 R C3 R G3 R G3 R   F3 R F3 R C4 R C4 R
      Ab3 R Ab3 R Eb4 R Eb4 R   G3 R G3 R D4 R D4 R
      C3 R C3 R G3 R G3 R   Eb3 R Eb3 R Bb3 R Bb3 R
      F3 R F3 R C4 R C4 R   G3 R G3 R B3 R D4 R`) },
    { wave: 'triangle', vol: 0.18, notes: split(`
      C3 C3 C3 C3 C3 C3 C3 C3   F3 F3 F3 F3 F3 F3 F3 F3
      Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 Ab3   G3 G3 G3 G3 G3 G3 G3 G3
      C3 C3 C3 C3 C3 C3 C3 C3   Eb3 Eb3 Eb3 Eb3 Eb3 Eb3 Eb3 Eb3
      F3 F3 F3 F3 F3 F3 F3 F3   G3 G3 G3 G3 G3 G3 G3 G3`) },
  ],
}

// Naman's chamber — slow, low, E minor. Tension before the encounter.
const CHAMBER = {
  bpm: 92,
  voices: [
    { wave: 'square', vol: 0.10, notes: split(`
      B4 - - - G4 - - - E4 - - - Fs4 - G4 -
      E4 - - - - - - - C4 - D4 - E4 - - -
      A4 - - - C5 - B4 - A4 - - - E4 - - -
      Fs4 - - - - - Ds4 - B3 - - - - - - -`) },
    { wave: 'triangle', vol: 0.11, notes: split(`
      E4 G4 B4 G4 E4 G4 B4 G4 E4 G4 B4 G4 E4 G4 B4 G4
      C4 E4 G4 E4 C4 E4 G4 E4 C4 E4 G4 E4 C4 E4 G4 E4
      A3 C4 E4 C4 A3 C4 E4 C4 A3 C4 E4 C4 A3 C4 E4 C4
      B3 Ds4 Fs4 Ds4 B3 Ds4 Fs4 Ds4 B3 Ds4 Fs4 Ds4 B3 Ds4 Fs4 Ds4`) },
    { wave: 'triangle', vol: 0.2, notes: split(`
      E2 - E2 - E2 - E2 - E2 - E2 - E2 - E3 -
      C3 - C3 - C3 - C3 - C3 - C3 - C3 - G2 -
      A2 - A2 - A2 - A2 - A2 - A2 - A2 - E3 -
      B2 - B2 - B2 - B2 - Fs2 - Fs2 - B2 - - -`) },
  ],
}

const TRACKS = { town: TOWN, battle: BATTLE, chamber: CHAMBER }

export class AudioManager {
  constructor() {
    this._ctx = null
    this._unlocked = false
    this._track = null
    this.muted = (() => { try { return JSON.parse(localStorage.getItem('audio_muted') ?? 'false') } catch { return false } })()
  }

  unlock() {
    if (this._unlocked) return
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      this._ctx = ctx
      this._master = ctx.createGain()
      this._music  = ctx.createGain()
      this._sfx    = ctx.createGain()
      this._music.connect(this._master)
      this._sfx.connect(this._master)
      this._master.connect(ctx.destination)
      this._master.gain.value = this.muted ? 0 : 0.9
      this._music.gain.value  = 0.55
      this._sfx.gain.value    = 0.7
      this._unlocked = true
      if (this._pendingTrack) { this.play(this._pendingTrack); this._pendingTrack = null }
    } catch { /* no audio — game runs silently */ }
  }

  setSuspended(hidden) {
    if (!this._ctx) return
    try { hidden ? this._ctx.suspend() : this._ctx.resume() } catch {}
  }

  setMuted(muted) {
    this.muted = muted
    try { localStorage.setItem('audio_muted', JSON.stringify(muted)) } catch {}
    if (this._ctx) this._master.gain.setTargetAtTime(muted ? 0 : 0.9, this._ctx.currentTime, 0.05)
  }

  toggleMute() { this.setMuted(!this.muted); return this.muted }

  // ─── Music ──────────────────────────────────────────────────────────

  playTown()   { this.play('town') }
  playBattle() { this.play('battle', { fadeIn: 0.02, fadeOut: 0.12 }) }
  playChamber(){ this.play('chamber', { fadeIn: 2.0 }) }

  play(name, { fadeIn = 0.6, fadeOut = 0.5 } = {}) {
    if (!this._unlocked) { this._pendingTrack = name; return }
    if (this._track?.name === name) return
    try {
      this._resume()
      this._fadeOutTrack(fadeOut)
      const ctx = this._ctx, now = ctx.currentTime
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.linearRampToValueAtTime(1, now + fadeIn)
      gain.connect(this._music)
      const st = { name, def: TRACKS[name], gain, nodes: [], next: now + 0.03, timer: null }
      this._track = st
      this._pump(st)
    } catch {}
  }

  stopMusic(fade = 0.4) {
    this._pendingTrack = null
    if (!this._unlocked) return
    this._fadeOutTrack(fade)
  }

  _fadeOutTrack(fade) {
    const st = this._track
    if (!st) return
    this._track = null
    clearTimeout(st.timer)
    const now = this._ctx.currentTime
    st.gain.gain.cancelScheduledValues(now)
    st.gain.gain.setValueAtTime(Math.max(st.gain.gain.value, 0.0001), now)
    st.gain.gain.linearRampToValueAtTime(0.0001, now + fade)
    for (const n of st.nodes) { try { n.stop(now + fade + 0.02) } catch {} }
    setTimeout(() => { try { st.gain.disconnect() } catch {} }, (fade + 0.2) * 1000)
  }

  _pump(st) {
    if (this._track !== st) return
    const ctx = this._ctx
    if (st.next < ctx.currentTime) st.next = ctx.currentTime + 0.03
    while (st.next < ctx.currentTime + 1.2) st.next += this._renderLoop(st, st.next)
    st.nodes = st.nodes.filter(n => n._end > ctx.currentTime)
    st.timer = setTimeout(() => this._pump(st), 300)
  }

  _renderLoop(st, t0) {
    const tick = 60 / st.def.bpm / 4
    let len = 0
    for (const v of st.def.voices) {
      len = Math.max(len, v.notes.length)
      for (let i = 0; i < v.notes.length; i++) {
        const freq = NOTE[v.notes[i]]
        if (!freq) continue
        let hold = 1
        while (v.notes[i + hold] === '-') hold++
        this._note(st, freq, v.wave, v.vol, t0 + i * tick, tick * (hold - 0.18))
      }
    }
    return len * tick
  }

  _note(st, freq, wave, vol, t, dur) {
    const ctx = this._ctx
    const osc = ctx.createOscillator(), g = ctx.createGain()
    osc.type = wave; osc.frequency.value = freq
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + 0.005)
    g.gain.setValueAtTime(vol, t + dur * 0.7)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    osc.connect(g); g.connect(st.gain)
    osc.start(t); osc.stop(t + dur + 0.02)
    osc._end = t + dur + 0.02
    st.nodes.push(osc)
  }

  // ─── SFX ────────────────────────────────────────────────────────────

  blip()    { this._tone(780, 'square', 0.045, 0.003, 0.03) }
  cursor()  { this._tone(1046, 'square', 0.06, 0.002, 0.045) }
  select()  { this._glide(520, 880, 'square', 0.08, 0.05, 0.06) }
  confirm() { this._tone(880, 'square', 0.07, 0.002, 0.05); this._tone(1318, 'square', 0.07, 0.002, 0.08, 0.06) }
  tap()     { this._tone(1400, 'triangle', 0.05, 0.001, 0.02) }
  footstep(){ this._noise(0.035, 0.006, 0.022, 1800) }
  bump()    { this._glide(140, 70, 'square', 0.09, 0.01, 0.08) }
  door()    { this._noise(0.08, 0.02, 0.22, 500) }
  bubble()  { this._tone(1318, 'square', 0.07, 0.002, 0.05); this._tone(1760, 'square', 0.07, 0.002, 0.09, 0.07) }
  sad()     { this._tone(392, 'triangle', 0.12, 0.01, 0.22); this._tone(311, 'triangle', 0.12, 0.01, 0.4, 0.24) }
  deny()    { this._tone(110, 'square', 0.1, 0.005, 0.1); this._tone(104, 'square', 0.1, 0.005, 0.16, 0.13) }
  whoosh()  { this._noise(0.09, 0.25, 0.35, 900) }

  cry() {
    this._glide(720, 260, 'sawtooth', 0.09, 0.05, 0.42)
    this._glide(540, 200, 'square', 0.06, 0.05, 0.38, 0.03)
    this._noise(0.05, 0.01, 0.3, 2400)
  }

  sting() {
    if (!this._ready()) return
    try {
      const ctx = this._ctx, t0 = ctx.currentTime + 0.02
      const hit = (freq, start, dur, vol, type) => {
        const osc = ctx.createOscillator(), g = ctx.createGain()
        osc.type = type; osc.frequency.value = freq
        const t = t0 + start
        g.gain.setValueAtTime(0, t)
        g.gain.linearRampToValueAtTime(vol, t + 0.008)
        g.gain.exponentialRampToValueAtTime(0.001, t + dur)
        osc.connect(g); g.connect(this._sfx)
        osc.start(t); osc.stop(t + dur + 0.02)
      }
      // Rising E-minor run into a held stab, with a low hit underneath
      ;[[329.63, 0], [392, 0.09], [493.88, 0.18], [659.25, 0.27]].forEach(([f, s]) => hit(f, s, 0.13, 0.11, 'square'))
      hit(987.77, 0.36, 1.1, 0.09, 'square')
      hit(659.25, 0.36, 1.1, 0.09, 'square')
      hit(493.88, 0.36, 1.1, 0.08, 'sawtooth')
      hit(82.41, 0.36, 1.2, 0.26, 'triangle')
      hit(41.2, 0.36, 0.9, 0.2, 'square')
      this._noise(0.12, 0.005, 0.6, 3000, 0.36)
    } catch {}
  }

  _ready() {
    if (!this._unlocked) return false
    this._resume()
    return true
  }

  _resume() { if (this._ctx?.state === 'suspended' && !document.hidden) this._ctx.resume() }

  _tone(freq, type, vol, atk, rel, delay = 0) {
    if (!this._ready()) return
    try {
      const ctx = this._ctx, t = ctx.currentTime + delay
      const osc = ctx.createOscillator(), g = ctx.createGain()
      osc.type = type; osc.frequency.value = freq
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(vol, t + atk)
      g.gain.exponentialRampToValueAtTime(0.001, t + atk + rel)
      osc.connect(g); g.connect(this._sfx)
      osc.start(t); osc.stop(t + atk + rel + 0.01)
    } catch {}
  }

  _glide(f1, f2, type, vol, atk, rel, delay = 0) {
    if (!this._ready()) return
    try {
      const ctx = this._ctx, t = ctx.currentTime + delay
      const osc = ctx.createOscillator(), g = ctx.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(f1, t)
      osc.frequency.exponentialRampToValueAtTime(f2, t + atk + rel)
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(vol, t + atk * 0.4)
      g.gain.exponentialRampToValueAtTime(0.001, t + atk + rel)
      osc.connect(g); g.connect(this._sfx)
      osc.start(t); osc.stop(t + atk + rel + 0.01)
    } catch {}
  }

  _noise(vol, atk, rel, cutoff, delay = 0) {
    if (!this._ready()) return
    try {
      const ctx = this._ctx
      if (!this._noiseBuf) {
        const len = ctx.sampleRate
        this._noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate)
        const d = this._noiseBuf.getChannelData(0)
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
      }
      const t = ctx.currentTime + delay
      const src = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter()
      f.type = 'highpass'; f.frequency.value = cutoff
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(vol, t + atk)
      g.gain.exponentialRampToValueAtTime(0.001, t + atk + rel)
      src.buffer = this._noiseBuf
      src.connect(f); f.connect(g); g.connect(this._sfx)
      src.start(t); src.stop(t + atk + rel + 0.01)
    } catch {}
  }
}
