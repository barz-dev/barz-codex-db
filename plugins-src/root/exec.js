// Root only. Contoh: .exec ls -la   |   .sh node -v
import { exec } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import { isRoot, trunc } from './_guard.js'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

let handler = async (m, { text, usedPrefix, command }) => {
  if (!isRoot()) return
  if (!text) return m.reply(`⚠️ Contoh: *${usedPrefix + command} ls -la*`)
  await m.react('⏳')
  exec(text, { timeout: 60000, maxBuffer: 1024 * 1024, cwd: ROOT }, async (err, stdout, stderr) => {
    let out = ''
    if (stdout) out += stdout
    if (stderr) out += (out ? '\n' : '') + '[stderr]\n' + stderr
    if (err && !out) out = err.message
    if (!out) out = '(tanpa output)'
    await m.reply('```\n' + trunc(out) + '\n```').catch(() => {})
    await m.react(err ? '❌' : '✅').catch(() => {})
  })
}
handler.help = ['exec <perintah shell>']
handler.tags = ['root']
handler.command = /^(exec|sh)$/i
handler.rowner = true
export default handler
