export type Locale = "zh" | "en"

const override = localStorage.getItem("game_locale")
export const locale: Locale = override === "zh" || override === "en"
  ? override
  : navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en"

const copy = {
  zh: {
    title: "SERPENT HALO",
    study: "习作 03 / 程序化盘绕",
    hint: "按住光珠 · 绕成一环",
    progress: "继续绕行",
    complete: "环已经闭合",
  },
  en: {
    title: "SERPENT HALO",
    study: "STUDY 03 / PROCEDURAL COIL",
    hint: "HOLD THE PEARL · DRAW A HALO",
    progress: "KEEP CIRCLING",
    complete: "THE HALO CLOSES",
  },
} as const

export function t(key: keyof typeof copy.en): string {
  return copy[locale][key]
}

