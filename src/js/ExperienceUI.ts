import { Input } from "./utils/input"
import { t } from "./i18n"

export type RitualFrame = {
  haloPhase: number
  progress: number
}

const TAU = Math.PI * 2
const REQUIRED_ARC = Math.PI * 1.65

export class ExperienceUI {
  private root: HTMLElement | null = null
  private ghost: HTMLElement | null = null
  private hint: HTMLElement | null = null
  private progress = 0
  private accumulatedArc = 0
  private direction = 0
  private previousAngle: number | null = null
  private pointerDown = false
  private hasInteracted = false
  private idleAge = 0
  private releaseAge = 0
  private guideAge = 0
  private haloAge = -1
  private keyboardAge = -1
  private audio: AudioContext | null = null
  private toneLevel = 0

  private readonly onPointerDown = (event: PointerEvent) => {
    this.hasInteracted = true
    this.pointerDown = true
    this.releaseAge = 0
    this.guideAge = -1
    this.ghost?.classList.add("sh-ghost--hidden")
    this.updateInput(event.clientX, event.clientY)
    this.previousAngle = this.angleAt(event.clientX, event.clientY)
    this.resumeAudio()
    this.tone(92, 0.08, 0.018, "sine")
  }

  private readonly onPointerMove = (event: PointerEvent) => {
    if (!this.pointerDown || this.haloAge >= 0) return
    this.updateInput(event.clientX, event.clientY)
    this.trackArc(event.clientX, event.clientY)
  }

  private readonly onPointerUp = () => {
    this.pointerDown = false
    this.previousAngle = null
    this.releaseAge = 0
  }

  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.code !== "Space" || event.repeat || this.haloAge >= 0) return
    event.preventDefault()
    this.hasInteracted = true
    this.keyboardAge = 0
    this.pointerDown = true
    this.resumeAudio()
    this.tone(92, 0.08, 0.018, "sine")
  }

  private readonly onKeyUp = (event: KeyboardEvent) => {
    if (event.code !== "Space") return
    this.pointerDown = false
    this.keyboardAge = -1
  }

  constructor(private readonly baseline: boolean) {
    if (baseline) return
    this.mount()
    document.addEventListener("pointerdown", this.onPointerDown, { passive: true })
    document.addEventListener("pointermove", this.onPointerMove, { passive: true })
    document.addEventListener("pointerup", this.onPointerUp, { passive: true })
    document.addEventListener("pointercancel", this.onPointerUp, { passive: true })
    document.addEventListener("keydown", this.onKeyDown)
    document.addEventListener("keyup", this.onKeyUp)
  }

  private mount(): void {
    const root = document.createElement("div")
    root.className = "sh-ui"
    root.innerHTML = `
      <div class="sh-title"><strong>${t("title")}</strong><span>${t("study")}</span></div>
      <div class="sh-orbit" aria-hidden="true"><span></span></div>
      <div class="sh-ghost" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M9 11.24V7.5C9 6.12 10.12 5 11.5 5S14 6.12 14 7.5v3.74c1.21-.81 2-2.18 2-3.74C16 5.01 13.99 3 11.5 3S7 5.01 7 7.5c0 1.56.79 2.93 2 3.74zm9.84 4.63-4.54-2.26c-.17-.07-.35-.11-.54-.11H13v-6c0-.83-.67-1.5-1.5-1.5S10 6.67 10 7.5v10.74l-3.43-.72c-.08-.01-.15-.03-.24-.03-.31 0-.59.13-.79.33l-.79.8 4.94 4.94c.27.27.65.44 1.06.44h6.79c.75 0 1.33-.55 1.44-1.28l.75-5.27c.01-.07.02-.14.02-.2 0-.62-.38-1.16-.91-1.39z"/></svg>
      </div>
      <div class="sh-hint">${t("hint")}</div>`
    document.body.append(root)
    this.root = root
    this.ghost = root.querySelector(".sh-ghost")
    this.hint = root.querySelector(".sh-hint")
  }

  private angleAt(x: number, y: number): number {
    return Math.atan2(y - innerHeight * 0.5, x - innerWidth * 0.5)
  }

  private updateInput(x: number, y: number): void {
    Input.setVirtualPosition(x, y)
    this.root?.style.setProperty("--target-x", `${x}px`)
    this.root?.style.setProperty("--target-y", `${y}px`)
  }

  private trackArc(x: number, y: number): void {
    const radius = Math.hypot(x - innerWidth * 0.5, y - innerHeight * 0.5)
    const shortSide = Math.min(innerWidth, innerHeight)
    if (radius < shortSide * 0.18 || radius > shortSide * 0.58) {
      this.previousAngle = this.angleAt(x, y)
      return
    }

    const angle = this.angleAt(x, y)
    if (this.previousAngle === null) {
      this.previousAngle = angle
      return
    }
    let delta = angle - this.previousAngle
    if (delta > Math.PI) delta -= TAU
    if (delta < -Math.PI) delta += TAU
    this.previousAngle = angle
    if (Math.abs(delta) < 0.004 || Math.abs(delta) > 0.5) return

    if (this.direction === 0) this.direction = Math.sign(delta)
    const directed = delta * this.direction
    this.accumulatedArc = directed >= 0
      ? this.accumulatedArc + directed
      : Math.max(0, this.accumulatedArc + Math.max(directed, -Math.PI * 0.045))
    this.setProgress(this.accumulatedArc / REQUIRED_ARC)
  }

  private setProgress(value: number): void {
    this.progress = Math.max(0, Math.min(1, value))
    this.root?.style.setProperty("--progress", String(this.progress))
    if (this.progress > 0.05 && this.hint && this.haloAge < 0) this.hint.textContent = t("progress")
    const nextTone = Math.min(4, Math.floor(this.progress * 4))
    if (nextTone > this.toneLevel && nextTone < 4) {
      this.tone([220, 277, 330][nextTone - 1], 0.055, 0.012, "triangle")
    }
    this.toneLevel = Math.max(this.toneLevel, nextTone)
    if (this.progress >= 1 && this.haloAge < 0) this.complete()
  }

  private complete(): void {
    this.haloAge = 0
    this.pointerDown = false
    this.previousAngle = null
    this.hint!.textContent = t("complete")
    this.root?.classList.add("sh-ui--complete")
    this.tone(440, 0.42, 0.018, "sine")
    window.setTimeout(() => this.tone(660, 0.34, 0.012, "sine"), 65)
  }

  private resumeAudio(): void {
    this.audio ??= new AudioContext()
    if (this.audio.state === "suspended") void this.audio.resume()
  }

  private tone(frequency: number, duration: number, volume: number, type: OscillatorType): void {
    if (!this.audio) return
    const oscillator = this.audio.createOscillator()
    const gain = this.audio.createGain()
    const now = this.audio.currentTime
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, now)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    oscillator.connect(gain).connect(this.audio.destination)
    oscillator.start(now)
    oscillator.stop(now + duration + 0.02)
  }

  update(delta: number): RitualFrame {
    if (this.baseline) return { haloPhase: -1, progress: 0 }
    this.idleAge += delta

    if (!this.hasInteracted && this.guideAge >= 0 && this.idleAge > 1.2) {
      this.guideAge += delta
      const phase = Math.min(1, this.guideAge / 3.2)
      const angle = -Math.PI * 0.65 + phase * TAU * 0.78
      const radius = Math.min(innerWidth, innerHeight) * 0.28
      const x = innerWidth * 0.5 + Math.cos(angle) * radius
      const y = innerHeight * 0.5 + Math.sin(angle) * radius
      this.updateInput(x, y)
      this.root?.style.setProperty("--guide-progress", String(phase * 0.78))
      this.ghost?.classList.add("sh-ghost--active")
      if (phase >= 1) {
        this.guideAge = -1
        this.ghost?.classList.remove("sh-ghost--active")
        // The guide deliberately stops short of a full circle. Hand the real
        // target back to centre when the ghost disappears, otherwise the snake
        // keeps orbiting the guide's final off-screen-biased position.
        this.updateInput(innerWidth * 0.5, innerHeight * 0.5)
        this.idleAge = 0
      }
    }

    if (this.keyboardAge >= 0 && this.haloAge < 0) {
      this.keyboardAge += delta
      const phase = this.keyboardAge / 2.8
      const angle = phase * TAU
      const radius = Math.min(innerWidth, innerHeight) * 0.3
      const x = innerWidth * 0.5 + Math.cos(angle) * radius
      const y = innerHeight * 0.5 + Math.sin(angle) * radius
      this.updateInput(x, y)
      this.accumulatedArc = Math.min(REQUIRED_ARC, phase * REQUIRED_ARC)
      this.setProgress(this.accumulatedArc / REQUIRED_ARC)
    }

    if (!this.pointerDown && this.progress > 0 && this.haloAge < 0) {
      this.releaseAge += delta
      if (this.releaseAge > 2.4) {
        this.accumulatedArc = Math.max(0, this.accumulatedArc - delta * REQUIRED_ARC / 0.9)
        this.setProgress(this.accumulatedArc / REQUIRED_ARC)
      }
    }

    if (this.haloAge >= 0) {
      this.haloAge += delta
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches
      const duration = reduced ? 0.5 : 1.8
      const phase = Math.min(1, this.haloAge / duration)
      this.updateInput(innerWidth * 0.5, innerHeight * 0.5)
      if (phase >= 1) this.reset()
      return { haloPhase: phase, progress: 1 }
    }

    return { haloPhase: -1, progress: this.progress }
  }

  private reset(): void {
    this.haloAge = -1
    this.accumulatedArc = 0
    this.progress = 0
    this.direction = 0
    this.releaseAge = 0
    this.toneLevel = 0
    this.root?.classList.remove("sh-ui--complete")
    this.root?.style.setProperty("--progress", "0")
    if (this.hint) this.hint.textContent = t("hint")
  }

  destroy(): void {
    if (this.baseline) return
    document.removeEventListener("pointerdown", this.onPointerDown)
    document.removeEventListener("pointermove", this.onPointerMove)
    document.removeEventListener("pointerup", this.onPointerUp)
    document.removeEventListener("pointercancel", this.onPointerUp)
    document.removeEventListener("keydown", this.onKeyDown)
    document.removeEventListener("keyup", this.onKeyUp)
    void this.audio?.close()
    this.root?.remove()
  }
}
