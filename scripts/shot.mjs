// Usage: node scripts/shot.mjs <outDir> <role>:<path>[@WxH] ...   (dev helper; uses global playwright)
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'
const require = createRequire(execSync('npm root -g').toString().trim() + '/')
const { chromium } = require('playwright')
const [out, ...specs] = process.argv.slice(2)
const base = process.env.BASE ?? 'http://localhost:5173'
const browser = await chromium.launch()
const errors = []
for (const spec of specs) {
  const [rp, size] = spec.split('@')
  const [role, path] = rp.split(':')
  const [w, h] = (size ?? '1440x900').split('x').map(Number)
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  page.on('pageerror', (e) => errors.push(`${spec}: ${e.message}`))
  page.on('console', (m) => m.type() === 'error' && errors.push(`${spec}: ${m.text()}`))
  await page.goto(base + '/#/')
  await page.waitForFunction(() => window.__app && window.__app.getState().hydrated, null, { timeout: 20000 })
  await page.evaluate((r) => window.__app.getState().setRole(r), role)
  await page.goto(base + '/#' + path)
  await page.waitForTimeout(1500)
  const file = `${out}/${role}${path.replace(/\//g, '_')}.png`
  await page.screenshot({ path: file, fullPage: process.env.FULL === '1' })
  console.log('shot', file)
  await page.close()
}
await browser.close()
if (errors.length) { console.log('ERRORS:\n' + errors.slice(0, 30).join('\n')) } else console.log('no console errors')
