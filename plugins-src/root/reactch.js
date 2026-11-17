// .reactch — React ke postingan channel WhatsApp pakai SEMUA sesi bot yang online di server.
// Khusus bot akun admin (root). Tiap sesi follow channel lalu kirim 1 reaction (emoji dibagi bergiliran dari daftar).
//
//   .reactch <link_post> <emoji1,emoji2,...>
//   .reactch <link_channel> <id_ch> <emoji1,emoji2,...>
//
//   link_post    : https://whatsapp.com/channel/<kode>/<id_pesan>   (disarankan, pasti kena pesan yang dimaksud)
//   link_channel : https://whatsapp.com/channel/<kode>              (react ke pesan terbaru)
//   id_ch        : 1203630xxxxxxxxxx@newsletter                    (opsional, kalau tidak ada diambil dari link)
//   emoji        : pisah koma, contoh ❤️,🔥,👍
import { isRoot } from './_guard.js'

const LINK = /whatsapp\.com\/channel\/[A-Za-z0-9_-]+(?:\/\d+)?/i
const JID = /^\d{8,25}@newsletter$/i
const seg = (s) => [...new Intl.Segmenter().segment(s)].map((x) => x.segment).filter((x) => x.trim())

function parse(raw) {
  const parts = String(raw || '').split(/[\s|]+/).filter(Boolean)
  let link = ''
  let jid = ''
  const rest = []
  for (const p of parts) {
    if (!link && LINK.test(p)) link = p.startsWith('http') ? p : 'https://' + p
    else if (!jid && JID.test(p)) jid = p.toLowerCase()
    else rest.push(p)
  }
  let emojis = rest.join(',').split(',').map((x) => x.trim()).filter(Boolean)
  // "❤️🔥👍" tanpa pemisah -> pecah per emoji
  if (emojis.length === 1) emojis = seg(emojis[0])
  return { link, jid, emojis }
}

let handler = async (m, { usedPrefix = '.', command = 'reactch', text }) => {
  if (!isRoot()) return
  const react = globalThis.__barzReactChannel
  if (typeof react !== 'function') return m.reply('❌ Fitur react channel belum siap di backend. Restart server lalu coba lagi.')

  const { link, jid, emojis } = parse(text)
  if (!link && !jid) {
    return m.reply(
      `*React Channel — semua sesi bot online*\n\n` +
      `${usedPrefix}${command} <link_post> <emoji1,emoji2>\n` +
      `${usedPrefix}${command} <link_channel> <id_ch> <emoji1,emoji2>\n\n` +
      `Contoh:\n${usedPrefix}${command} https://whatsapp.com/channel/0029Vb8KMS32phHVPVQEXu1c/123 ❤️,🔥,👍\n\n` +
      `• link_post → react tepat ke pesan itu\n• link_channel → react ke pesan terbaru\n• id_ch (xxxx@newsletter) opsional\n` +
      `• Tiap sesi dapat 1 emoji dari daftar (bergiliran). Kalau tidak ada sesi online, hasilnya gagal.`
    )
  }
  if (!emojis.length) return m.reply('❌ Emoji belum diisi. Contoh: ❤️,🔥,👍')

  await m.reply(`⏳ Mengirim reaction ${emojis.join(' ')} pakai semua sesi online...`)
  let r
  try { r = await react({ link, jid, emojis }) } catch (e) { return m.reply('❌ Gagal: ' + (e.message || e)) }
  if (r.error) return m.reply(`❌ *Gagal*\n${r.error}${r.total === 0 ? '' : `\n\nSesi online: ${r.total}`}`)

  const lines = [
    `${r.sent > 0 ? '✅' : '❌'} *React Channel selesai*`,
    ``,
    `Channel : ${r.jid}`,
    `Pesan   : ${r.serverId}`,
    `Sesi online : ${r.total}`,
    `Berhasil : ${r.sent}`,
    `Gagal    : ${r.failed}`,
  ]
  const bad = (r.results || []).filter((x) => !x.ok).slice(0, 8)
  if (bad.length) { lines.push('', '*Yang gagal:*'); for (const x of bad) lines.push(`• ${x.user} — ${x.error || 'gagal'}`) }
  return m.reply(lines.join('\n'))
}

handler.help = ['reactch <link_post> <emoji,emoji>']
handler.tags = ['root']
handler.command = /^(reactch|reactchannel|rch)$/i
handler.rowner = true
export default handler
