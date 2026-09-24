// Usage: node scripts/eval.mjs "<js expression using s = store state>"  (dev helper)
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'
const require = createRequire(execSync('npm root -g').toString().trim() + '/')
const { chromium } = require('playwright')
const b = await chromium.launch(); const p = await b.newPage()
await p.goto((process.env.BASE ?? 'http://localhost:5173') + '/')
await p.waitForFunction(() => window.__app?.getState().hydrated, null, { timeout: 20000 })
console.log(JSON.stringify(await p.evaluate((expr) => { const s = window.__app.getState(); return eval(expr) }, process.argv[2]), null, 1))
await b.close()
