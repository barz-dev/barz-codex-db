import { registry } from '../../registry.js'
import { isRoot } from './_guard.js'

let handler = async (m, { text }) => {
  if (!isRoot()) return
  const by = {}
  for (const e of registry.all) (by[e.category] ||= []).push(e.name)
  const q = (text || '').trim().toLowerCase()
  if (q && by[q]) return m.reply(`*📁 ${q}* (${by[q].length})\n` + by[q].map((n, i) => `${i + 1}. ${n.slice(q.length + 1)}`).join('\n'))
  const cats = Object.entries(by).sort((a, b) => b[1].length - a[1].length)
  await m.reply(`*Plugin dimuat: ${registry.all.length}* (gagal: ${registry.errors.length})\n\n` + cats.map(([c, l]) => `• ${c}: ${l.length}`).join('\n') + '\n\nKetik *.lp <folder>* untuk isi folder.')
}
handler.help = ['lp [folder]']
handler.tags = ['root']
handler.command = /^(lp|listplugin|listplugins)$/i
handler.rowner = true
export default handler
