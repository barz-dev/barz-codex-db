import fs from 'fs'
import { isRoot } from './_guard.js'
import { safeRel } from './saveplugin.js'

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!isRoot()) return
  if (!text) return m.reply(`⚠️ Contoh: *${usedPrefix + command} downloader/play.js*`)
  const p = safeRel(text)
  if (!p || !fs.existsSync(p.full)) return m.reply('⚠️ File plugin tidak ditemukan.')
  const code = fs.readFileSync(p.full, 'utf8')
  if (code.length < 3500) return m.reply(code)
  await conn.sendMessage(m.chat, { document: Buffer.from(code), fileName: p.rel.split('/').pop(), mimetype: 'text/javascript' }, { quoted: m, noFooter: true })
}
handler.help = ['gp <folder/file.js>']
handler.tags = ['root']
handler.command = /^(gp|getplugin|gf|getfile)$/i
handler.rowner = true
export default handler
