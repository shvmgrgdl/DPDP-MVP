// Collects every translatable English key: t('…'), tx('…'), audit templates, plus a few dynamic words.
import fs from 'fs'; import path from 'path'
import { parse } from '@babel/parser'
const walk = (d, o = []) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? (f !== 'locales' && walk(p, o)) : /\.tsx?$/.test(f) && o.push(p) } return o }
const keys = new Set()
for (const f of walk('didac/src')) {
  const ast = parse(fs.readFileSync(f, 'utf8'), { sourceType: 'module', plugins: ['jsx', 'typescript'] })
  const v = (n) => { if (!n || typeof n.type !== 'string') return
    if (n.type === 'CallExpression' && n.callee.type === 'Identifier' && ['t', 'tx', 'D'].includes(n.callee.name) && n.arguments[0]) { const a = n.arguments[0]; if (a.type === 'StringLiteral') keys.add(a.value); else if (a.type === 'TemplateLiteral' && !a.expressions.length) keys.add(a.quasis[0].value.cooked) }
    if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && n.callee.property.name === 'logEvent') for (const a of n.arguments.slice(0, 2)) if (a.type === 'StringLiteral') keys.add(a.value)
    for (const k of Object.keys(n)) { if (['loc', 'start', 'end', 'extra'].includes(k)) continue; const c = n[k]; Array.isArray(c) ? c.forEach(v) : c && typeof c.type === 'string' && v(c) } }
  v(ast.program)
}
for (const f of ['_keys_store.json']) for (const k of JSON.parse(fs.readFileSync('didac/src/locales/' + f, 'utf8'))) keys.add(k)
const extra = ['pending', 'approved', 'declined', 'open', 'resolved', 'new', 'qualified', 'demo', 'proposal', 'paid', 'yes', 'maybe', 'no', 'Access request', 'Correction request', 'Erasure request', 'Grievance request', 'Takedown request', 'Wrong face request', 'Access', 'Correction', 'Erasure', 'Grievance', 'Takedown', 'Wrong face', 'Photographer · Studio Lens', 'School admin · Principal’s office', 'Guardian', 'Gallery viewer', 'System', 'Unknown ID', 'Mother', 'Father', 'Legal guardian', 'Photographer', 'School admin', 'Parent', 'Annual Day 2026', 'Play', 'Pause', 'Hide password', 'Show password', 'Notice read', 'Audit log exported', 'Leak trace checked', 'Decrypted for viewing', 'Tamper test run']
extra.forEach((k) => keys.add(k))
const out = [...keys].filter((k) => /\p{L}/u.test(k.replace(/\{\w+\}/g, ''))).sort()
fs.writeFileSync('didac/src/locales/_all_keys.json', JSON.stringify(out, null, 1)); console.log('total keys', out.length)
