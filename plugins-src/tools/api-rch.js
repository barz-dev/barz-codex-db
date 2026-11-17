// plugins/api-rch.js
import fs from 'fs'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'database', 'apikeys.json')

// Helper buat baca/tulis database
const loadDB = () => {
    try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) }
    catch { return {} }
}
const saveDB = (data) => {
    if (!fs.existsSync(path.dirname(DB_PATH))) fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
}

let handler = async (m, { usedPrefix = '.', command, text, sender }) => {
    const db = loadDB()
    const args = text.split(' ')
    const action = args[0]?.toLowerCase()
    const key = args[1]

    // .rch set <apikey>
    if (action === 'set') {
        if (!key) return m.reply(`Format salah!\nContoh: ${usedPrefix}${command} set BARZ-VIP-CODEX`)
        db[sender] = key
        saveDB(db)
        return m.reply(`✅ API Key berhasil disimpan!\n\nKey lo: *${key}*\nSekarang lo bisa pake *${usedPrefix}reactch*`)
    }

    // .rch get (buat liat key yg tersimpen)
    if (action === 'get' || !action) {
        const myKey = db[sender]
        if (!myKey) return m.reply(`Kamu belum set API Key.\n\nCara set:\n${usedPrefix}${command} set <apikey>\n\nDapetin apikey di: https://react.barz.web.id`)
        return m.reply(`🔑 *API Key Kamu:*\n${myKey}`)
    }

    // .rch delete
    if (action === 'delete' || action === 'del') {
        delete db[sender]
        saveDB(db)
        return m.reply('✅ API Key berhasil dihapus.')
    }

    return m.reply(`*MENU API KEY REACT*\n\n` +
        `${usedPrefix}${command} set <apikey> - Simpan API Key\n` +
        `${usedPrefix}${command} get - Liat API Key\n` +
        `${usedPrefix}${command} delete - Hapus API Key\n\n` +
        `Dapetin apikey di: https://react.barz.web.id`)
}

handler.help = ['rch set <apikey>', 'rch get']
handler.tags = ['tools']
handler.command = /^(rch|setapi)$/i
export default handler