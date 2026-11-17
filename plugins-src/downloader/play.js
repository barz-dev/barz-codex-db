import axios from "axios";
import yts from "yt-search";

async function getYouTubeAudio(url) {
    let errors = [];

    // 1. JereAPI
    try {
        const res = await axios.get(`${global.web}/api/downloader/youtube`, {
            params: { apikey: global.apikey?.jereapi, url: url, format: 'mp3' },
            timeout: 30000
        });
        if (res.data?.status) {
            const data = res.data.result || res.data.data || res.data;
            const dl = data.download || data.downloadUrl || data.download_url || data.url;
            if (dl) return {
                title: data.title || "YouTube Audio",
                author: data.channel || data.author || "YouTube",
                duration: data.duration || "-",
                thumbnail: data.thumbnail || `https://i.ytimg.com/vi/${data.id || ''}/hqdefault.jpg`,
                downloadUrl: dl
            };
        }
        errors.push(`jereapi: status=${res.data?.status}`);
    } catch (e) {
        errors.push(`jereapi: ${e.response?.status || e.message}`);
    }

    // 2. Siputzx - fallback paling stabil
    try {
        const res = await axios.get(`https://api.siputzx.my.id/api/d/ytmp3`, {
            params: { url: url },
            timeout: 30000
        });
        const data = res.data?.data || res.data?.result || res.data;
        const dl = data?.download || data?.url || data?.downloadUrl;
        if (dl) return {
            title: data.title || "YouTube Audio",
            author: data.author || data.channel || "YouTube",
            duration: data.duration || "-",
            thumbnail: data.thumbnail || data.image || `https://i.ytimg.com/vi/${url.split('v=')[1]?.split('&')[0] || url.split('/').pop() || ''}/hqdefault.jpg`,
            downloadUrl: dl
        };
        errors.push(`siputzx: no download url`);
    } catch (e) {
        errors.push(`siputzx: ${e.response?.status || e.message}`);
    }

    // 3. Siputzx v2
    try {
        const res = await axios.get(`https://api.siputzx.my.id/api/d/ytmp3v2`, {
            params: { url: url },
            timeout: 30000
        });
        const data = res.data?.data || res.data?.result || res.data;
        const dl = data?.download || data?.url;
        if (dl) return {
            title: data.title || "YouTube Audio",
            author: data.author || "YouTube",
            duration: data.duration || "-",
            thumbnail: data.thumbnail || "",
            downloadUrl: dl
        };
    } catch (e) {
        errors.push(`siputzx v2: ${e.response?.status || e.message}`);
    }

    throw new Error(`Gagal mengambil audio. ${errors.join(" | ")}`);
}

async function searchYoutube(query) {
    try {
        const searchResults = await yts(query);
        if (!searchResults?.videos?.length) {
            throw new Error('Tidak ditemukan hasil pencarian');
        }
        return searchResults.videos.slice(0, 5);
    } catch (error) {
        try {
            const res = await axios.get(`${global.web}/api/search/youtube`, {
                params: { apikey: global.apikey?.jereapi, q: query },
                timeout: 20000
            });
            if (res.data?.status && Array.isArray(res.data.result) && res.data.result.length > 0) {
                return res.data.result.slice(0, 5).map(v => ({
                    title: v.title,
                    author: { name: v.channel || 'YouTube' },
                    timestamp: v.duration || '-',
                    views: 0,
                    thumbnail: v.imageUrl || '',
                    videoId: v.id || '',
                    url: v.link || `https://youtube.com/watch?v=${v.id}`
                }));
            }
        } catch { }
        throw error;
    }
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        if (!text) {
            return m.reply(`🎵 *${global.botname || 'BOT'} - YOUTUBE PLAY*` + '\n\n' +
                `📌 *Cara Pakai:*` + '\n' +
                `> \`${usedPrefix + command} <judul lagu / link youtube>\`` + '\n\n' +
                `💡 *Contoh:*` + '\n' +
                `> \`${usedPrefix + command} Never Gonna Give You Up\`` + '\n' +
                `> \`${usedPrefix + command} https://youtu.be/dQw4w9WgXcQ\``);
        }

        await conn.sendMessage(m.chat, { react: { text: "⏳", key: m.key } });

        // Jika input berupa Link YouTube langsung download
        if (text.includes('youtube.com') || text.includes('youtu.be')) {
            const audioData = await getYouTubeAudio(text.trim());
            
            await conn.sendMessage(m.chat, { react: { text: "📥", key: m.key } });

            const caption = `🎵 *${global.botname || 'BOT'} - YOUTUBE MUSIC*\n\n📌 *Judul:* ${audioData.title}\n👤 *Channel:* ${audioData.author}\n⏱️ *Durasi:* ${audioData.duration}\n✨ *Request by:* ${m.pushName || 'User'}`;

            // === 1. DOWNLOAD THUMBNAIL DULU ===
            let thumbBuffer = null
            try {
                if (audioData.thumbnail) {
                    const thumbRes = await axios.get(audioData.thumbnail, { responseType: 'arraybuffer', timeout: 20000 })
                    thumbBuffer = Buffer.from(thumbRes.data)
                }
            } catch {}

            // === 2. KIRIM FOTO + DESK LANGSUNG ===
            if (thumbBuffer) {
                await conn.sendMessage(m.chat, {
                    image: thumbBuffer,
                    caption: caption + `\n\n⏳ *Sedang menyiapkan audio...*`
                }, { quoted: m })
            } else {
                await conn.sendMessage(m.chat, { text: caption + `\n\n⏳ *Sedang menyiapkan audio...*` }, { quoted: m })
            }

            // === 3. BARU DOWNLOAD AUDIO ===
            const audioRes = await axios.get(audioData.downloadUrl, {
                responseType: 'arraybuffer',
                timeout: 120000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });

            const audioBuffer = Buffer.from(audioRes.data);
            const safeTitle = audioData.title.replace(/[\\/:*?"<>|]/g, '').trim() || 'audio';
            const filename = `${safeTitle}.mp3`;
            const sizeMB = (audioBuffer.length / (1024 * 1024)).toFixed(1);

            let sent = false;

            // === 4. KIRIM AUDIO BARENG THUMBNAIL + DESK ===
            if (audioBuffer.length <= 20 * 1024 * 1024) {
                try {
                    await conn.sendMessage(m.chat, {
                        audio: audioBuffer,
                        mimetype: 'audio/mpeg',
                        ptt: false,
                        fileName: filename,
                        contextInfo: {
                            externalAdReply: {
                                title: audioData.title,
                                body: `${audioData.author} • ${audioData.duration} • visit barz.web.id`,
                                thumbnail: thumbBuffer,
                                mediaType: 1,
                                mediaUrl: text.trim(),
                                sourceUrl: text.trim()
                            }
                        }
                    }, { quoted: m });
                    sent = true;
                } catch (errAudio) {
                    console.warn('[PLAY] Gagal kirim mode audio, fallback dokumen:', errAudio.message);
                }
            }

            // 5. Fallback mode dokumen (sampai 100MB) + thumbnail juga
            if (!sent && audioBuffer.length <= 100 * 1024 * 1024) {
                try {
                    await conn.sendMessage(m.chat, {
                        document: audioBuffer,
                        mimetype: 'audio/mpeg',
                        fileName: filename,
                        caption: caption,
                        jpegThumbnail: thumbBuffer
                    }, { quoted: m });
                    sent = true;
                } catch (errDoc) {
                    console.warn('[PLAY] Gagal kirim mode dokumen:', errDoc.message);
                }
            }

            // 6. Fallback direct link jika > 100MB
            if (!sent) {
                await conn.sendMessage(m.chat, {
                    text: `${caption}\n\n⚠️ *Ukuran audio (${sizeMB} MB) terlalu besar untuk diunggah langsung ke WhatsApp.*\n📥 *Link Download Langsung:*\n${audioData.downloadUrl}`
                }, { quoted: m });
            }

            await conn.sendMessage(m.chat, { react: { text: "✅", key: m.key } });
            return;
        }

        // Jika input berupa kata kunci pencarian
        const videos = await searchYoutube(text.trim());
        if (!videos.length) {
            await conn.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
            return m.reply(`❌ Tidak ditemukan lagu untuk: "${text}"`);
        }

        const sections = [{
            title: "🎧 Pilih Lagu Yang Ingin Didownload",
            highlight_label: `Ditemukan ${videos.length} Lagu`,
            rows: videos.map((v, i) => ({
                title: `${i + 1}. ${v.title.substring(0, 45)}`,
                description: `Channel: ${v.author?.name || 'YouTube'} | Durasi: ${v.timestamp || '-'}`,
                id: `${usedPrefix + command} https://youtu.be/${v.videoId}`
            }))
        }];

        const listText = `🎵 *${global.botname || 'BOT'} - YOUTUBE MUSIC SEARCH*` + '\n\n' +
            `🔍 *Query:* ${text}` + '\n' +
            `📌 *Ditemukan:* ${videos.length} hasil` + '\n\n' +
            videos.map((v, i) => `*${i + 1}.* ${v.title}\n   👤 *Channel:* ${v.author?.name || 'YouTube'}\n   ⏱️ *Durasi:* ${v.timestamp || '-'}\n   🔗 *Link:* https://youtu.be/${v.videoId}`).join('\n\n') +
            `\n\n_Pilih lagu melalui tombol di bawah atau ketik \`${usedPrefix + command} <link>\`_`;

        try {
            await conn.sendButton(m.chat, {
                text: listText,
                footer: `${global.botname || 'BOT'} • YouTube Player`,
                buttons: [{
                    name: "single_select",
                    buttonParamsJson: JSON.stringify({
                        title: "🎧 Pilih Lagu",
                        sections
                    })
                }]
            }, { quoted: m });
        } catch {
            await m.reply(listText);
        }

        await conn.sendMessage(m.chat, { react: { text: "✅", key: m.key } });

    } catch (error) {
        console.error('Play Error:', error);
        await conn.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
        m.reply(`❌ *Gagal memproses lagu:* ${error.message}`);
    }
};

handler.help = ["play <judul/url>", "musik <judul/url>", "song <judul/url>"];
handler.command = /^(play|musik|music)$/i;
handler.tags = ["downloader"];

handler.limit = true

export default handler;