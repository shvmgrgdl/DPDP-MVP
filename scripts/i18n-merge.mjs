// Usage: node scripts/i18n-merge.mjs <lang>… — merges <lang>.part1..4.json into didac/src/locales/<lang>.json (sorted, validated)
import fs from 'fs'
for (const lang of process.argv.slice(2)) {
  const out = {}
  for (let i = 1; i <= 4; i++) Object.assign(out, JSON.parse(fs.readFileSync(`didac/src/locales/${lang}.part${i}.json`, 'utf8')))
  fs.writeFileSync(`didac/src/locales/${lang}.json`, JSON.stringify(Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b))), null, 0))
  console.log(lang, Object.keys(out).length, 'keys')
}
