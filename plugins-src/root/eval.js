// Root only: jalan hanya di bot milik akun admin DAN dari nomor owner utama (rowner).
import util from 'util'
import { createRequire } from 'module'
import { isRoot, trunc } from './_guard.js'

const req = createRequire(import.meta.url)
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!isRoot()) return
  if (!text) return m.reply(`📝 *EVAL JAVASCRIPT*\n\nContoh:\n${usedPrefix + command} 1 + 1\n${usedPrefix + command} m.chat\n${usedPrefix + command} const x = 10; x * 2\n${usedPrefix + command} await conn.sendMessage(m.chat, { text: "Halo" })`)
  await m.react('⏳')
  const code = text.trim()
  const logs = []
  const cons = { ...console, log: (...a) => logs.push(a.map((x) => (typeof x === 'object' && x !== null ? util.inspect(x, { depth: 4 }) : String(x))).join(' ')) }
  cons.error = cons.warn = cons.info = cons.log
  try {
    const isExpr = !code.includes('\n') && !/[;{}]/.test(code) && !/^(const|let|var|function|class|async|await|for|if|switch|try|while|return|import|export)/.test(code)
    const body = isExpr ? `return (${code});` : code
    const fn = new AsyncFunction('m', 'conn', 'quoted', 'console', 'process', 'Buffer', 'util', 'require', 'db', 'pg', 'global',
      `const jid = m.chat, from = m.chat, sender = m.sender;\n${body}`)
    const res = await fn(m, conn, m.quoted || null, cons, process, Buffer, util, req, global.db, global.pg, global)
    let out = ''
    if (logs.length) out += `📜 Console:\n${logs.join('\n')}\n\n`
    out += res === undefined ? 'undefined' : typeof res === 'object' ? util.inspect(res, { depth: 5 }) : String(res)
    await m.reply('```js\n' + trunc(out, 4000) + '\n```')
    await m.react('✅')
  } catch (e) {
    await m.reply('❌ *Error:*\n```js\n' + trunc(e?.stack || e?.message || e, 4000) + '\n```')
    await m.react('❌')
  }
}
handler.help = ['eval <code>']
handler.tags = ['root']
handler.command = /^(eval|ev|js)$/i
handler.rowner = true
export default handler
