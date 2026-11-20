// plugins/reactch.js
import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch' // Pastiin lo ada package node-fetch atau pake axios

const DB_PATH = path.join(process.cwd(), 'database', 'apikeys.json')
const loadDB = () => {
    try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) }
    catch { return {} }
}

const LINK = /whatsapp\.com\/channel\/[A-Za-z0-9_-]+(?:\/\d+)?/i
const seg = (s) => [...new Intl.Segmenter().segment(s)].map((x) => x.segment).filter((x) => x.trim())

function parse(raw) {
    const parts = String(raw || '').split(/[\s|]+/).filter(Boolean)
    let link = ''
    const rest = []
    for (const p of parts) {
        if (!link && LINK.test(p)) link = p.startsWith('http') ? p : 'https://' + p
        else rest.push(p)
    }
    let emojis = rest.join(',').split(',').map((x) => x.trim()).filter(Boolean)
    if (emojis.length === 1) emojis = seg(emojis[0])
    return { link, emojis }
}

let handler = async (m, { usedPrefix = '.', command, text, sender }) => {
    // 1. Cek API Key User
    const db = loadDB()
    const apiKey = db[sender]

    if (!apiKey) {
        return m.reply(`❌ *Kamu belum punya API Key!*\n\n` +
            `Silakan daftar dan beli limit di:\nhttps://react.barz.web.id\n\n` +
            `Abis dapet API Key, simpan pake:\n${usedPrefix}rch set <APIKEY_KAMU>`)
    }

    // 2. Parse input
    const { link, emojis } = parse(text)
    if (!link) {
        return m.reply(`*React Channel*\n\n` +
            `Format: ${usedPrefix}${command} <link_post> <emoji1,emoji2>\n` +
            `Contoh: ${usedPrefix}${command} https://whatsapp.com/channel/0029Vb8K8.../123 ❤️,🔥,👍`)
    }
    if (!emojis.length) return m.reply('❌ Emoji belum diisi. Contoh: ❤️,🔥,👍')

    // 3. Kirim reaction via API r.barz.web.id
    await m.reply(`⏳ Mengirim reaction ${emojis.join(' ')} via API...`)

    try {
        // Emoji diambil satu aja buat 1 request API (karena endpoint cuma nerima 1 emoji per hit)
        const emoji = emojis[0]
        const url = `https://r.barz.web.id/react?apikeys=${apiKey}&link=${encodeURIComponent(link)}&emoji=${encodeURIComponent(emoji)}`
        
        const res = await fetch(url)
        const json = await res.json()

        if (json.status === 'success') {
            let lines = [
                `✅ *React Berhasil!*`,
                ``,
                `Link    : ${json.link}`,
                `Emoji   : ${json.emoji}`,
                `Sisa Limit : ${json.remaining}`
            ]
            return m.reply(lines.join('\n'))
        } else {
            return m.reply(`❌ *Gagal!*\n\nError: ${json.message || json.error || 'Unknown error'}\nCek limit atau API Key kamu di https://react.barz.web.id`)
        }
    } catch (e) {
        return m.reply(`❌ Koneksi ke server API gagal: ${e.message}`)
    }
}

handler.help = ['reactch <link_post> <emoji>']
handler.tags = ['tools']
handler.command = /^(reactch|reactchannel)$/i
export default handler