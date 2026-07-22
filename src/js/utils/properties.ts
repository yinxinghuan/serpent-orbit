import GUI from "three/examples/jsm/libs/lil-gui.module.min.js"

export type QualityLevel = "low" | "medium" | "high"

export interface SnakeConfig {
  length: number
  spineSegments: number
  radialSegments: number
  texturePoints: number
  dpr: number
  enableDebug: boolean
  shaderQuality: QualityLevel
  scaleMin: number
  scaleMax: number
}

export class Properties {
  static isBaseline = new URLSearchParams(window.location.search).get("baseline") === "1"
  static viewportWidth = 0
  static viewportHeight = 0
  static dpr = Math.min(2, window.devicePixelRatio) ?? 1

  // Mobile detection
  static isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  static isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0

  // Quality level system
  static qualityLevel: QualityLevel = Properties.detectQualityLevel()
  static gui: GUI | null = import.meta.env.DEV && Properties.isBaseline ? new GUI() : null

  private static detectQualityLevel(): QualityLevel {
    // Embedded browsers do not always expose a recognizable mobile UA.
    // Treat the actual narrow viewport as the authoritative composition signal.
    if (this.isMobile || window.innerWidth <= 600) {
      console.log("[Properties] Detected quality: low (mobile device or narrow viewport)")
      return "low"
    }

    // Desktop → always high quality, let DPR be what device supports
    console.log(`[Properties] Detected quality: high (desktop, DPR: ${this.dpr})`)
    return "high"
  }

  static getSnakeConfig(): SnakeConfig {
    const config = (() => {
      switch (this.qualityLevel) {
        case "low":
          return {
            length: 15,
            spineSegments: 64,
            radialSegments: 8,
            texturePoints: 64,
            dpr: 1, // Force 1x on mobile
            enableDebug: false,
            shaderQuality: "low" as QualityLevel,
            // Keep the main subject substantial after the mobile camera pulls
            // back; shader complexity remains far below the desktop profile.
            scaleMin: 0.12,
            scaleMax: 0.72,
          }
        case "medium":
          return {
            length: 16,
            spineSegments: 75,
            radialSegments: 6,
            texturePoints: 75,
            dpr: Math.min(1.5, this.dpr),
            enableDebug: false,
            shaderQuality: "medium" as QualityLevel,
            scaleMin: 0.1,
            scaleMax: 0.49,
          }
        case "high":
          return {
            length: 26,
            spineSegments: 100,
            radialSegments: 8,
            texturePoints: 100,
            dpr: this.dpr, // Use actual device DPR
            enableDebug: import.meta.env.DEV && this.isBaseline,
            shaderQuality: "high" as QualityLevel,
            scaleMin: 0.13,
            scaleMax: 0.65,
          }
      }
    })()

    console.log("[Properties] Snake config:", config)
    return config
  }
}
