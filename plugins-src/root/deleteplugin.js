import fs from 'fs'
import path from 'path'
import { removeOne, PLUGINS_ROOT, registry } from '../../registry.js'
import { isRoot } from './_guard.js'
import { safeRel } from './saveplugin.js'

let handler = async (m, { text, usedPrefix, command }) => {
  if (!isRoot()) return
  if (!text) return m.reply(`⚠️ Contoh:\n• *${usedPrefix + command} downloader/play.js*\n• *${usedPrefix + command} custom --on* (hapus folder)`)
  const args = text.trim().split(/\s+/)
  const folderMode = args.includes('--on')
  if (folderMode) {
    const name = args[0].replace(/^(\.\/|\/)+/, '').replace(/\/+$/, '')
    const dir = path.resolve(PLUGINS_ROOT, name)
    if (!name || name.includes('..') || !dir.startsWith(PLUGINS_ROOT + path.sep) || !fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return m.reply('❌ Folder tidak ditemukan.')
    if (name === 'root') return m.reply('⛔ Folder root tidak boleh dihapus (nanti kamu kehilangan akses eval/exec).')
    fs.rmSync(dir, { recursive: true, force: true })
    for (const e of [...registry.all]) if (e.name.startsWith(name + '/')) removeOne(e.name)
    return m.reply(`🗑️ Folder *${name}* dan semua plugin di dalamnya dihapus.`)
  }
  const p = safeRel(args[0])
  if (!p || !fs.existsSync(p.full)) return m.reply('❌ File plugin tidak ditemukan.')
  fs.rmSync(p.full, { force: true })
  removeOne(p.rel)
  await m.reply(`✅ Plugin *${p.rel}* dihapus.`)
}
handler.help = ['dp <folder/file.js>', 'dp <folder> --on']
handler.tags = ['root']
handler.command = /^(dp|deleteplugin|delplugin|df)$/i
handler.rowner = true
export default handler
