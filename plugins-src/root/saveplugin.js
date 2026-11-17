// Root only. Reply pesan berisi kode plugin lalu: .sp folder/nama.js
// Disimpan ke folder plugins (global, dipakai semua bot user) dan langsung aktif tanpa restart.
import fs from 'fs'
import path from 'path'
import { loadOne, PLUGINS_ROOT } from '../../registry.js'
import { isRoot } from './_guard.js'

export const safeRel = (input) => {
  const rel = String(input || '').trim().replace(/\\/g, '/').replace(/^(\.\/|\/)+/, '')
  if (!rel || rel.split('/').some((p) => p === '..' || p === '' || p.startsWith('.'))) return null
  if (!/\.(js|mjs|cjs)$/.test(rel)) return null
  const full = path.resolve(PLUGINS_ROOT, rel)
  if (!full.startsWith(PLUGINS_ROOT + path.sep)) return null
  return { rel, full }
}

let handler = async (m, { text, usedPrefix, command }) => {
  if (!isRoot()) return
  if (!text) return m.reply(`⚠️ Contoh: *${usedPrefix + command} downloader/play.js* (reply pesan berisi kode plugin)`)
  if (!m.quoted || !m.quoted.text) return m.reply('⚠️ Reply ke pesan yang berisi kode plugin.')
  const p = safeRel(text)
  if (!p) return m.reply('⚠️ Nama file harus seperti folder/nama.js (.js/.mjs/.cjs), tanpa ".." atau titik di depan.')
  const code = m.quoted.text
  if (!/export\s+default|module\.exports/.test(code)) return m.reply('⚠️ Kode harus punya "export default handler".')
  fs.mkdirSync(path.dirname(p.full), { recursive: true })
  const had = fs.existsSync(p.full) ? fs.readFileSync(p.full, 'utf8') : null
  fs.writeFileSync(p.full, code, 'utf8')
  try {
    const r = await loadOne(p.rel)
    await m.reply(`✅ Plugin *${p.rel}* tersimpan & aktif untuk semua bot.\n📦 Total plugin: ${r.total}`)
  } catch (e) {
    if (had === null) fs.rmSync(p.full, { force: true }); else fs.writeFileSync(p.full, had, 'utf8')
    await m.reply('❌ Plugin gagal dimuat, file dikembalikan seperti semula.\n' + String(e.message).split('\n')[0])
  }
}
handler.help = ['sp <folder/file.js>']
handler.tags = ['root']
handler.command = /^(sp|saveplugin|savep|sf)$/i
handler.rowner = true
export default handler
