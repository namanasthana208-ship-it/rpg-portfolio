// Web Audio API chiptune engine — no external files, works offline.
// Attach to window.audioMgr in main.js.

const NOTE = {
  C3:130.81, D3:146.83, E3:164.81, F3:174.61, G3:196.00, A3:220.00, Bb3:233.08, B3:246.94,
  C4:261.63, D4:293.66, Eb4:311.13, E4:329.63, F4:349.23, G4:392.00, Ab4:415.30,
  A4:440.00, Bb4:466.16, B4:493.88,
  C5:523.25, D5:587.33, Eb5:622.25, E5:659.25, F5:698.46, G5:783.99,
  Eb3:155.56, Ab3:207.65,
  R: 0,
}

// 8-bar town melody (C major pentatonic, 120 BPM, 16th-note ticks = 125ms each)
const TOWN_LEAD = [
  'G4','E4','C4','E4','G4','A4','G4','E4',
  'G4','E4','D4','E4','G4','E4','C4','E4',
  'A4','G4','E4','G4','A4','C5','A4','G4',
  'E4','G4','A4','G4','E4','D4','E4','C4',
  'C5','A4','G4','E4','G4','A4','G4','E4',
  'C5','E5','D5','C5','A4','G4','E4','G4',
  'A4','G4','E4','D4','E4','G4','A4','G4',
  'E4','G4','C4','E4','D4','E4','C4','R',
]
const TOWN_BASS = [
  'C3','R','R','R','G3','R','R','R',
  'C3','R','R','R','G3','R','R','R',
  'F3','R','R','R','C4','R','R','R',
  'G3','R','R','R','D4','R','R','R',
  'C3','R','R','R','G3','R','R','R',
  'F3','R','R','R','C4','R','R','R',
  'A3','R','R','R','E4','R','R','R',
  'G3','R','R','R','D4','R','R','R',
]

// 4-bar battle melody (C minor feel, 160 BPM)
const BATTLE_LEAD = [
  'C4','Eb4','G4','Bb4','G4','F4','Eb4','C4',
  'C4','Eb4','F4','G4','F4','Eb4','D4','C4',
  'Ab3','C4','Eb4','F4','G4','F4','Eb4','C4',
  'G3','Bb3','D4','G4','Bb4','G4','F4','Eb4',
]
const BATTLE_BASS = [
  'C3','R','C3','R','G3','R','G3','R',
  'F3','R','F3','R','C4','R','C4','R',
  'Ab3','R','Ab3','R','Eb4','R','Eb4','R',
  'G3','R','G3','R','D4','R','D4','R',
]

export class AudioManager {
  constructor() {
    this._ctx         = null
    this._masterGain  = null
    this._musicGain   = null
    this._sfxGain     = null
    this._music       = []
    this._unlocked    = false
    this._currentTrack = null
    this._loopTimeout  = null
    this.muted = (() => { try { return JSON.parse(localStorage.getItem('audio_muted') ?? 'false') } catch { return false } })()
  }

  // Call on first user gesture (TitleScene press-to-start).
  unlock() {
    if (this._unlocked) return
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)()
      this._masterGain = this._ctx.createGain()
      this._musicGain  = this._ctx.createGain()
      this._sfxGain    = this._ctx.createGain()
      this._musicGain.connect(this._masterGain)
      this._sfxGain.connect(this._masterGain)
      this._masterGain.connect(this._ctx.destination)
      this._masterGain.gain.value = this.muted ? 0 : 1
      this._musicGain.gain.value  = 0.32
      this._sfxGain.gain.value    = 0.55
      this._unlocked = true
    } catch (e) { /* no audio support */ }
  }

  // Resume suspended context (browser may suspend after inactivity)
  _resume() {
    if (this._ctx?.state === 'suspended') this._ctx.resume()
  }

  // ─── Mute ──────────────────────────────────────────────────────────

  setMuted(muted) {
    this.muted = muted
    try { localStorage.setItem('audio_muted', JSON.stringify(muted)) } catch {}
    if (this._masterGain && this._ctx) {
      this._masterGain.gain.setTargetAtTime(muted ? 0 : 1, this._ctx.currentTime, 0.05)
    }
  }

  toggleMute() { this.setMuted(!this.muted); return this.muted }

  // ─── SFX ───────────────────────────────────────────────────────────

  blip() {
    this._sfx(760, 'square', 0.055, 0.004, 0.030)
  }

  select() {
    this._sfxGlide(520, 880, 'square', 0.09, 0.05, 0.06)
  }

  footstep() {
    this._noise(0.038, 0.008, 0.025)
  }

  _sfx(freq, type, vol, atk, rel) {
    if (!this._unlocked) return
    this._resume()
    const ctx = this._ctx, t = ctx.currentTime
    const osc = ctx.createOscillator(), g = ctx.createGain()
    osc.type = type; osc.frequency.value = freq
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + atk)
    g.gain.exponentialRampToValueAtTime(0.001, t + atk + rel)
    osc.connect(g); g.connect(this._sfxGain)
    osc.start(t); osc.stop(t + atk + rel + 0.01)
  }

  _sfxGlide(f1, f2, type, vol, atk, rel) {
    if (!this._unlocked) return
    this._resume()
    const ctx = this._ctx, t = ctx.currentTime
    const osc = ctx.createOscillator(), g = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(f1, t)
    osc.frequency.linearRampToValueAtTime(f2, t + atk)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + atk * 0.4)
    g.gain.exponentialRampToValueAtTime(0.001, t + atk + rel)
    osc.connect(g); g.connect(this._sfxGain)
    osc.start(t); osc.stop(t + atk + rel + 0.01)
  }

  _noise(vol, atk, rel) {
    if (!this._unlocked) return
    this._resume()
    const ctx = this._ctx
    const len = Math.ceil(ctx.sampleRate * (atk + rel))
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource(), g = ctx.createGain()
    const filt = ctx.createBiquadFilter(); filt.type = 'highpass'; filt.frequency.value = 1800
    const t = ctx.currentTime
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + atk + rel)
    src.buffer = buf
    src.connect(filt); filt.connect(g); g.connect(this._sfxGain)
    src.start(t); src.stop(t + atk + rel + 0.01)
  }

  // ─── Music ─────────────────────────────────────────────────────────

  playTown()   { this._playLoop('town') }
  playBattle() { this._playLoop('battle') }

  stopMusic() {
    this._currentTrack = null
    clearTimeout(this._loopTimeout)
    this._stopNodes()
  }

  playSting() {
    if (!this._unlocked) return
    this._resume()
    const ctx = this._ctx
    const t0 = ctx.currentTime + 0.05
    const hit = (freq, start, dur, vol = 0.28, type = 'square') => {
      const osc = ctx.createOscillator(), g = ctx.createGain()
      osc.type = type; osc.frequency.value = freq
      const t = t0 + start
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(vol, t + 0.008)
      g.gain.exponentialRampToValueAtTime(0.001, t + dur)
      osc.connect(g); g.connect(this._musicGain)
      osc.start(t); osc.stop(t + dur + 0.01)
    }
    // Ascending E-minor sting (matches the existing ChamberScene sting feel)
    hit(329.63, 0.00, 0.14)
    hit(392.00, 0.10, 0.14)
    hit(493.88, 0.20, 0.14)
    hit(659.25, 0.30, 0.38)
    hit(164.81, 0.00, 0.12, 0.20, 'sawtooth')
    hit(196.00, 0.10, 0.12, 0.20, 'sawtooth')
    hit(246.94, 0.20, 0.12, 0.20, 'sawtooth')
    hit(329.63, 0.30, 0.32, 0.22, 'sawtooth')
  }

  _playLoop(track) {
    if (!this._unlocked) return
    if (this._currentTrack === track) return
    this._currentTrack = track
    clearTimeout(this._loopTimeout)
    this._stopNodes()
    this._scheduleLoop(track)
  }

  _scheduleLoop(track) {
    if (this._currentTrack !== track) return
    this._resume()
    const dur = this._renderTrack(track)
    this._loopTimeout = setTimeout(() => {
      if (this._currentTrack === track) {
        this._stopNodes()
        this._scheduleLoop(track)
      }
    }, (dur * 1000) - 80)
  }

  _stopNodes() {
    for (const n of this._music) { try { n.stop(); n.disconnect() } catch {} }
    this._music = []
  }

  _renderTrack(track) {
    if (track === 'town')   return this._renderTown()
    if (track === 'battle') return this._renderBattle()
    return 8
  }

  _renderTown() {
    const TICK = 60 / 120 / 4  // 16th note at 120 BPM = 0.125s
    this._schedNotes(TOWN_LEAD, 'square',   TICK, 0.20)
    this._schedNotes(TOWN_BASS, 'triangle', TICK, 0.14)
    return TOWN_LEAD.length * TICK
  }

  _renderBattle() {
    const TICK = 60 / 165 / 4  // 16th note at 165 BPM ≈ 0.0909s
    this._schedNotes(BATTLE_LEAD, 'square', TICK, 0.22)
    this._schedNotes(BATTLE_BASS, 'square', TICK, 0.13)
    return BATTLE_LEAD.length * TICK
  }

  _schedNotes(names, wave, tick, vol) {
    const ctx = this._ctx
    const t0 = ctx.currentTime + 0.04
    const gate = 0.82  // note length as fraction of tick

    for (let i = 0; i < names.length; i++) {
      const freq = NOTE[names[i]]
      if (!freq) continue
      const osc = ctx.createOscillator(), g = ctx.createGain()
      osc.type = wave; osc.frequency.value = freq
      const t = t0 + i * tick
      const dur = tick * gate
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(vol, t + 0.004)
      g.gain.setValueAtTime(vol, t + dur * 0.65)
      g.gain.exponentialRampToValueAtTime(0.001, t + dur)
      osc.connect(g); g.connect(this._musicGain)
      osc.start(t); osc.stop(t + dur + 0.01)
      this._music.push(osc)
    }
  }
}
