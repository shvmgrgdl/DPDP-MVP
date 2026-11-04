import fs from 'fs'; import path from 'path'
import { parse } from '@babel/parser'
const root='didac/src'; const out=[]
const walk=(d)=>{for(const f of fs.readdirSync(d)){const p=path.join(d,f);fs.statSync(p).isDirectory()?(f!=='locales'&&walk(p)):/\.tsx$/.test(f)&&scan(p)}}
function scan(file){const src=fs.readFileSync(file,'utf8');const ast=parse(src,{sourceType:'module',plugins:['jsx','typescript']})
 const v=(n,par)=>{ if(!n||typeof n.type!=='string')return
  if(n.type==='JSXExpressionContainer'&&(par.type==='JSXElement'||par.type==='JSXFragment')&&['Identifier','MemberExpression','OptionalMemberExpression'].includes(n.expression.type)){out.push(`${file.replace('didac/src/','')}:${n.loc.start.line}  {${src.slice(n.expression.start,n.expression.end)}}`)}
  for(const k of Object.keys(n)){if(['loc','start','end','extra'].includes(k))continue;const c=n[k];Array.isArray(c)?c.forEach(x=>v(x,n)):c&&typeof c.type==='string'&&v(c,n)}}
 v(ast.program,null)}
walk(root); console.log(out.join('\n'))
