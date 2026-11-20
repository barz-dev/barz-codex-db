import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import { downloadContentFromMessage } from '@whiskeysockets/baileys'

const execAsync = promisify(exec)

let handler = async (m, { conn, text, usedPrefix, command }) => {
    let rasio = (text || '').trim().toLowerCase().replace(/x/g, ':').replace(/,/g, ':')
    if (!rasio) rasio = '9:16'

    let listRasio = `📌 *PANGKAS UKURAN - CROP*` + '\n\n' +
        `Reply foto / video, lalu ketik:` + '\n' +
        `👉 *${usedPrefix + command} 9:16*` + '\n\n' +
        `*List Rasio:*` + '\n' +
        `• 9:16 - Story / Reels / TikTok (vertikal)` + '\n' +
        `• 16:9 - YouTube / Landscape` + '\n' +
        `• 1:1 - Feed IG kotak` + '\n' +
        `• 4:5 - Feed IG portrait` + '\n' +
        `• 4:3 - Landscape klasik` + '\n' +
        `• 3:4 - Portrait` + '\n' +
        `• 2:3 - Poster` + '\n' +
        `• 21:9 - Cinematic` + '\n\n' +
        `*Contoh:*` + '\n' +
        `*${usedPrefix + command} 9:16*` + '\n' +
        `*${usedPrefix + command} 1:1*`

    if (!m.quoted) return m.reply(listRasio)

    let [wStr, hStr] = rasio.split(':')
    let targetW = parseFloat(wStr)
    let targetH = parseFloat(hStr)
    if (!targetW || !targetH) return m.reply(`❌ Rasio salah!\n\n${listRasio}`)

    let targetRatio = targetW / targetH
    let q = m.quoted
    let mime = q.mimetype || q.msg?.mimetype || ''
    let isImage = /image/.test(mime)
    let isVideo = /video/.test(mime)

    if (!isImage && !isVideo) return m.reply(`❌ Reply foto / video dulu!\n\n${listRasio}`)

    await m.react('⏳').catch(()=>{})
    await m.reply(`✂️ *Memangkas ke ${rasio}...*`).catch(()=>{})

    try {
        let stream = await downloadContentFromMessage(q.msg || q, isImage ? 'image' : 'video')
        let chunks = []
        for await (let chunk of stream) chunks.push(chunk)
        let buffer = Buffer.concat(chunks)

        let tmpDir = './tmp'
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
        let input = path.join(tmpDir, `pangkas_in_${Date.now()}.${isImage ? 'jpg' : 'mp4'}`)
        let output = path.join(tmpDir, `pangkas_out_${Date.now()}.${isImage ? 'jpg' : 'mp4'}`)
        fs.writeFileSync(input, buffer)

        if (isImage) {
            try {
                let sharp = (await import('sharp')).default
                let meta = await sharp(input).metadata()
                let { width, height } = meta
                let currRatio = width / height
                let cropW, cropH
                if (currRatio > targetRatio) {
                    cropH = height
                    cropW = Math.floor(height * targetRatio)
                } else {
                    cropW = width
                    cropH = Math.floor(width / targetRatio)
                }
                await sharp(input)
                    .extract({ left: Math.floor((width - cropW) / 2), top: Math.floor((height - cropH) / 2), width: cropW, height: cropH })
                    .jpeg({ quality: 92 })
                    .toFile(output)
            } catch (e) {
                let Jimp = (await import('jimp')).default
                let img = await Jimp.read(input)
                let width = img.bitmap.width
                let height = img.bitmap.height
                let currRatio = width / height
                let cropW, cropH
                if (currRatio > targetRatio) {
                    cropH = height
                    cropW = Math.floor(height * targetRatio)
                } else {
                    cropW = width
                    cropH = Math.floor(width / targetRatio)
                }
                img.crop(Math.floor((width - cropW) / 2), Math.floor((height - cropH) / 2), cropW, cropH)
                await img.quality(92).writeAsync(output)
            }

            await conn.sendMessage(m.chat, {
                image: fs.readFileSync(output),
                caption: `✅ *Berhasil dipangkas ke ${rasio}*\n> 🌐 _barz | barz.web.id_`
            }, { quoted: m })

        } else {
            let filter = `crop='min(iw\\,ih*${targetRatio})':'min(ih\\,iw/${targetRatio})'`
            filter += `,scale=trunc(iw/2)*2:trunc(ih/2)*2`
            await execAsync(`ffmpeg -y -i "${input}" -vf "${filter}" -c:v libx264 -preset veryfast -crf 23 -c:a copy "${output}"`)
            if (!fs.existsSync(output)) throw new Error('FFmpeg gagal, cek ffmpeg terinstall apa enggak')

            await conn.sendMessage(m.chat, {
                video: fs.readFileSync(output),
                caption: `✅ *Berhasil dipangkas ke ${rasio}*\n> 🌐 _barz | barz.web.id_`,
                fileName: `pangkas_${rasio.replace(':','x')}.mp4`
            }, { quoted: m })
        }

        fs.unlinkSync(input)
        if (fs.existsSync(output)) fs.unlinkSync(output)
        await m.react('✅').catch(()=>{})

    } catch (e) {
        console.error('[PANGKAS ERROR]', e)
        m.reply(`❌ *Gagal pangkas!*\n${e.message}\n\nPastikan di VPS udah install:\n• *ffmpeg* buat video\n• *sharp* / *jimp* buat foto\n\n> npm i sharp jimp`)
        await m.react('❌').catch(()=>{})
    }
}

handler.help = ['pangkas <rasio>', 'crop <rasio>', 'rasio <rasio>']
handler.tags = ['tools']
handler.command = /^(pangkas|crop|rasio|potong)$/i

export default handler