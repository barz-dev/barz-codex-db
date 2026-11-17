import axios from 'axios'

let bratvid = async (m, { conn, text }) => {
  await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  if (!text) {
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    return m.reply('Format salah\nContoh:\n.bratvid halo dunia')
  }

  try {
    const url = `https://api.ikyyxd.my.id/canvas/bratvid?apikey=kyzz&text=${encodeURIComponent(text)}`
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 60000
    })

    const buffer = Buffer.from(res.data)

    // Validasi WebP
    const isWebP =
      buffer.slice(0, 4).toString() === 'RIFF' &&
      buffer.slice(8, 12).toString() === 'WEBP'
    if (!isWebP) throw new Error('Response bukan WebP')

    // === KUNCI FIX: kirim dengan flag animated ===
    await conn.sendMessage(
      m.chat,
      {
        sticker: buffer,
        mimetype: 'image/webp',
        // flag ini yang bikin WA render sebagai stiker animasi proper
        isAnimated: true,
        isAvatar: false
      },
      { quoted: m }
    )

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
  } catch (e) {
    console.error('[BRATVID ERROR]', e.message)
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    m.reply('Gagal: ' + e.message)
  }
}

bratvid.help = ['bratvid <teks>']
bratvid.tags = ['sticker']
bratvid.command = /^bratvid$/i
bratvid.limit = true

export default bratvid