// One-off codemod: wraps user-facing English in t('…') and collects the key list.
// Usage: node scripts/i18n-wrap.mjs   (idempotent: already-wrapped text is skipped)
import fs from 'fs'; import path from 'path'
import { parse } from '@babel/parser'
const root = 'didac/src'
const files = []; const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? (f !== 'locales' && walk(p)) : (/\.tsx$/.test(f) || f === 'data.ts') && files.push(p) } }; walk(root)
const keys = new Set(); const hints = {}
const ATTRS = new Set(['placeholder', 'aria-label', 'title', 'alt', 'label', 'eyebrow', 'sub'])
const PROPS = new Set(['title', 'body', 'line', 'cta', 'label', 'example', 'q', 'a', 'topic', 'control', 'status', 'desc'])
const hasLetters = (s) => /\p{L}/u.test(s)
const dec = (s) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
const q = (s) => JSON.stringify(s)
for (const file of files) {
  let src = fs.readFileSync(file, 'utf8'); const orig = src
  const ast = parse(src, { sourceType: 'module', plugins: ['jsx', 'typescript'] })
  const edits = [] // {start,end,text}
  const wrapLit = (n, k) => { keys.add(k); edits.push({ start: n.start, end: n.end, text: `t(${q(k)})` }) }
  const visit = (n, parent, inChildren) => {
    if (!n || typeof n.type !== 'string') return
    if (n.type === 'JSXText') {
      const raw = n.value; const norm = dec(raw).replace(/\s+/g, ' ').trim()
      if (norm && hasLetters(norm)) {
        const lead = /^[^\S\n]+/.exec(raw) && !/^\s*\n/.test(raw) ? ' ' : ''; const trail = /[^\S\n]+$/.exec(raw) && !/\n\s*$/.test(raw) ? ' ' : ''
        keys.add(norm); edits.push({ start: n.start, end: n.end, text: `${lead}{t(${q(norm)})}${trail}` })
      }
      return
    }
    if (n.type === 'JSXAttribute' && n.value?.type === 'StringLiteral' && ATTRS.has(n.name.name) && hasLetters(n.value.value)) { keys.add(n.value.value); edits.push({ start: n.value.start, end: n.value.end, text: `{t(${q(n.value.value)})}` }); return }
    if (n.type === 'JSXExpressionContainer' && (parent.type === 'JSXElement' || parent.type === 'JSXFragment')) {
      const walkExpr = (e) => {
        if (!e) return
        if (e.type === 'StringLiteral' && hasLetters(e.value)) wrapLit(e, e.value)
        else if (e.type === 'TemplateLiteral' && e.expressions.length === 0 && hasLetters(e.quasis[0].value.cooked)) wrapLit(e, e.quasis[0].value.cooked)
        else if (e.type === 'TemplateLiteral' && e.expressions.length && hasLetters(e.quasis.map((x) => x.value.cooked).join(''))) { let tpl = ''; e.quasis.forEach((qq, i) => { tpl += qq.value.cooked + (i < e.expressions.length ? `{${i}}` : '') }); keys.add(tpl); edits.push({ start: e.start, end: e.end, text: `t(${q(tpl)}, { ${e.expressions.map((x, i) => `${i}: ${src.slice(x.start, x.end)}`).join(', ')} })` }) }
        else if (e.type === 'ConditionalExpression') { walkExpr(e.consequent); walkExpr(e.alternate) }
        else if (e.type === 'LogicalExpression') walkExpr(e.right)
        else if (e.type === 'ParenthesizedExpression') walkExpr(e.expression)
      }
      walkExpr(n.expression)
    }
    if (n.type === 'JSXAttribute' && n.value?.type === 'JSXExpressionContainer' && ATTRS.has(n.name.name) && n.value.expression.type === 'TemplateLiteral' && n.value.expression.expressions.length) {
      const e = n.value.expression; let tpl = ''; e.quasis.forEach((qq, i) => { tpl += qq.value.cooked + (i < e.expressions.length ? `{${i}}` : '') })
      if (hasLetters(tpl.replace(/\{\d+\}/g, ''))) { keys.add(tpl); edits.push({ start: e.start, end: e.end, text: `t(${q(tpl)}, { ${e.expressions.map((x, i) => `${i}: ${src.slice(x.start, x.end)}`).join(', ')} })` }); return }
    }
    // identity-tag strings that live in arrays / data tables so they can be extracted and translated at render
    if (n.type === 'ArrayExpression' && !(parent && parent.type === 'JSXExpressionContainer')) {
      const tag = (x) => { if (!x) return; if (x.type === 'StringLiteral' && hasLetters(x.value) && x.value.length > 2 && /[\s\p{Lu}]/u.test(x.value)) { keys.add(x.value); edits.push({ start: x.start, end: x.end, text: `tx(${q(x.value)})` }) } else if (x.type === 'ArrayExpression') x.elements.forEach(tag) }
      if (n.elements.some((x) => x && (x.type === 'StringLiteral' || x.type === 'ArrayExpression'))) n.elements.forEach(tag)
    }
    if (n.type === 'ObjectProperty' && !n.computed && n.key && PROPS.has(n.key.name ?? n.key.value) && n.value.type === 'StringLiteral' && hasLetters(n.value.value) && n.value.value.length > 2) { keys.add(n.value.value); edits.push({ start: n.value.start, end: n.value.end, text: `tx(${q(n.value.value)})` }) }
    if (n.type === 'CallExpression') {
      const c = n.callee; const name = c.type === 'Identifier' ? c.name : c.type === 'MemberExpression' && c.object.name === 'toast' ? 'toast' : ''
      if ((name === 'toast' || name === 'confirm') && n.arguments[0]) {
        const a = n.arguments[0]
        if (a.type === 'StringLiteral' && hasLetters(a.value)) wrapLit(a, a.value)
        else if (a.type === 'TemplateLiteral' && hasLetters(a.quasis.map((x) => x.value.cooked).join(''))) {
          let tpl = ''; a.quasis.forEach((qq, i) => { tpl += qq.value.cooked + (i < a.expressions.length ? `{${i}}` : '') }); keys.add(tpl)
          edits.push({ start: a.start, end: a.end, text: `t(${q(tpl)}, { ${a.expressions.map((e, i) => `${i}: ${src.slice(e.start, e.end)}`).join(', ')} })` })
        }
      }
      if (name === 't' && n.arguments.length >= 2 && ['StringLiteral', 'TemplateLiteral'].includes(n.arguments[0].type)) {
        const conv = (a) => { if (a.type === 'StringLiteral') return { s: a.value, v: [] }; let s = ''; a.quasis.forEach((qq, i) => { s += qq.value.cooked + (i < a.expressions.length ? `{${i}}` : '') }); return { s, v: a.expressions.map((e) => src.slice(e.start, e.end)) } }
        const en = conv(n.arguments[0]); const hi = n.arguments[1].type === 'StringLiteral' || n.arguments[1].type === 'TemplateLiteral' ? conv(n.arguments[1]) : null
        keys.add(en.s); if (hi) hints[en.s] = hi.s
        edits.push({ start: n.start, end: n.end, text: en.v.length ? `t(${q(en.s)}, { ${en.v.map((e, i) => `${i}: ${e}`).join(', ')} })` : `t(${q(en.s)})` })
        return
      }
    }
    for (const k of Object.keys(n)) { if (k === 'loc' || k === 'start' || k === 'end' || k === 'extra') continue; const v = n[k]; if (Array.isArray(v)) v.forEach((x) => visit(x, n)); else if (v && typeof v.type === 'string') visit(v, n) }
  }
  visit(ast.program, null)
  // drop edits nested inside others, apply from the end
  edits.sort((a, b) => a.start - b.start || b.end - a.end)
  const kept = []; for (const e of edits) { const last = kept[kept.length - 1]; if (!last || e.start >= last.end) kept.push(e) }
  for (const e of kept.reverse()) src = src.slice(0, e.start) + e.text + src.slice(e.end)
  if (src !== orig) {
    if (/\btx\(/.test(src) && !/\btx\b[^;\n]*from '[^']*i18n'/.test(src) && !/export const tx\b/.test(src)) { const rel2 = path.relative(path.dirname(file), path.join(root, 'i18n')).replace(/\\/g, '/'); src = `import { tx } from '${rel2.startsWith('.') ? rel2 : './' + rel2}'\n` + src }
    if (/\bt\(/.test(src) && !/import \{[^}]*\bt\b[^}]*\} from '[^']*i18n'/.test(src) && !/from '\.\/i18n'/.test(src.split('\n').slice(0,3).join('\n'))) {
      const rel = path.relative(path.dirname(file), path.join(root, 'i18n')).replace(/\\/g, '/'); const imp = `import { t } from '${rel.startsWith('.') ? rel : './' + rel}'\n`
      const m = [...src.matchAll(/^import .*$/gm)].pop(); const at = m ? m.index + m[0].length + 1 : 0; src = src.slice(0, at) + imp + src.slice(at)
    }
    fs.writeFileSync(file, src); console.log('wrapped', file, kept.length)
  }
}
fs.writeFileSync('didac/src/locales/_keys.json', JSON.stringify([...keys].sort(), null, 1)); fs.writeFileSync('didac/src/locales/_hints_hi.json', JSON.stringify(hints, null, 1))
console.log('keys', keys.size, 'hindi hints', Object.keys(hints).length)
