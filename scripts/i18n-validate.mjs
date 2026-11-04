// Usage: node scripts/i18n-validate.mjs <lang>   — checks didac/src/locales/<lang>.part{1..4}.json against the chunk key lists
import fs from 'fs'
const lang = process.argv[2]; let bad = 0, total = 0
for (let i = 1; i <= 4; i++) {
  const keys = JSON.parse(fs.readFileSync(`didac/src/locales/_chunk${i}.json`, 'utf8'))
  let part; try { part = JSON.parse(fs.readFileSync(`didac/src/locales/${lang}.part${i}.json`, 'utf8')) } catch (e) { console.log(`part${i}: missing or invalid JSON (${e.message.slice(0, 60)})`); bad++; continue }
  for (const k of keys) {
    total++; const v = part[k]
    if (typeof v !== 'string' || !v.trim()) { console.log(`part${i}: missing "${k.slice(0, 60)}"`); bad++; continue }
    const ph = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',')
    if (ph(k) !== ph(v)) { console.log(`part${i}: placeholder mismatch "${k.slice(0, 50)}" -> "${v.slice(0, 50)}"`); bad++ }
  }
  for (const k of Object.keys(part)) if (!keys.includes(k)) { console.log(`part${i}: unknown key "${k.slice(0, 60)}"`); bad++ }
}
console.log(bad ? `FAIL: ${bad} problems in ${total} keys` : `OK: ${total} keys validated for ${lang}`); process.exit(bad ? 1 : 0)
