import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

await mkdir('_qa/ui', { recursive: true })
const browser = await chromium.launch({ headless: true })
const errors = new Set()
const results = {}

for (const test of [
  { name: 'compat-after-390x844', width: 390, height: 844, url: 'http://127.0.0.1:5204/' },
  { name: 'compat-after-320x568', width: 320, height: 568, url: 'http://127.0.0.1:5204/' },
  { name: 'core-only-390x844', width: 390, height: 844, url: 'http://127.0.0.1:5204/?coreOnly=1' },
  { name: 'baseline-390x844', width: 390, height: 844, url: 'http://127.0.0.1:5204/?baseline=1' },
]) {
  const context = await browser.newContext({ viewport: { width: test.width, height: test.height }, hasTouch: true, colorScheme: 'dark' })
  const page = await context.newPage()
  page.on('pageerror', error => errors.add(String(error.stack || error)))
  page.on('console', message => { if (message.type() === 'error') errors.add(message.text()) })
  await page.goto(test.url, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForSelector('#canvas')
  await page.waitForTimeout(5200)
  const metrics = await page.evaluate(() => {
    const canvas = document.querySelector('#canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    const pixels = new Uint8Array(4)
    gl.readPixels(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
    return {
      viewport: [innerWidth, innerHeight],
      canvas: [canvas.width, canvas.height],
      webgl2: gl instanceof WebGL2RenderingContext,
      maxVertexTextures: gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),
      floatLinear: Boolean(gl.getExtension('OES_texture_float_linear')),
      centerPixel: [...pixels],
    }
  })
  await page.screenshot({ path: `_qa/ui/${test.name}.png` })
  results[test.name] = metrics
  await context.close()
}

results.errors = [...errors]
await writeFile('_qa/ui/snake-compat-state.json', JSON.stringify(results, null, 2))
console.log(JSON.stringify(results, null, 2))
await browser.close()
