import axios from 'axios'
import bu from '../../lib/sticker.js'

let brat = async (m, { conn, text }) => {
  await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  if (!text) {
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    return m.reply('Format salah\nContoh:\n.brat halo dunia')
  }

  try {
    const res = await axios.get(
      `https://api.siputzx.my.id/api/m/brat`,
      {
        params: { text: text },
        responseType: 'arraybuffer'
      }
    )

    const packname = global.stickerPack?.packname || global.botname || 'visit'
    const author = global.stickerPack?.author || global.ownername || 'barz.web.id'

    const sticker = await bu.writeExif(
      { data: res.data, mimetype: 'image/png' },
      { packName: packname, packPublish: author }
    )

    await conn.sendMessage(m.chat, { sticker }, { quoted: m })
    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
  } catch (e) {
    console.error(e)
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    m.reply('Gagal generate brat: ' + e.message)
  }
}

brat.help = ['brat <teks>']
brat.tags = ['sticker']
brat.command = /^brat$/i
brat.limit = true

export default brat