import fetch from 'node-fetch';

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text || !text.trim()) {
        return m.reply(`⚠️ Masukkan kata kunci!\nContoh: *${usedPrefix + command} delta*`);
    }
    const query = text.trim();

    if (/https?:\/\/(www\.)?(id\.)?(pinterest\.(com|co\.[a-z]{2}|[a-z]{2})|pin\.it)/i.test(query)) {
        await m.react('🕐').catch(() => {});
        try {
            await m.react('📥').catch(() => {});
            const buf = await downloadBuffer(query);
            if (!buf) throw new Error('Media tidak ditemukan');
            await conn.sendMessage(m.chat, { image: buf }, { quoted: m });
            return await m.react('✅').catch(() => {});
        } catch (e) {
            await m.react('❌').catch(() => {});
            return m.reply(`❌ Gagal: ${e.message}`);
        }
    }

    await m.react('🕐').catch(() => {});
    try {
        await m.react('🔍').catch(() => {});
        const pins = await getPinSearch(query);
        if (!pins.length) {
            await m.react('❌').catch(() => {});
            return m.reply(`❌ Tidak ditemukan: "${query}"`);
        }

        await m.react('📥').catch(() => {});
        const buffers = [];
        for (const p of pins.slice(0, 10)) {
            const buf = await downloadBuffer(p.image);
            if (buf) buffers.push(buf);
            if (buffers.length >= 10) break;
        }
        if (!buffers.length) throw new Error('Semua foto corrupt');

        // BIKIN ALBUM KAYAK DI SCREENSHOT - CUMA 1 BUBBLE, TANPA CHAT INFO PISAH
        const albumItems = buffers.map((buf, i) => ({
            image: buf,
            // Caption pendek aja, biar ga spam teks. Cuma foto pertama yang ada judulnya.
            caption: i === 0 ? `📌 Pinterest Search\n🔍 ${query} • ${buffers.length} foto` : `Pinterest ${i + 1}/${buffers.length}\n🔍 ${query}`
        }));

        // PRIORITAS: pake sendAlbum bawaan engine lu, ini yang bikin jadi grid geser
        if (typeof conn.sendAlbum === 'function') {
            await conn.sendAlbum(m.chat, albumItems, { quoted: m });
        } else {
            // Fallback Baileys murni
            const albumId = Date.now().toString();
            for (let i = 0; i < albumItems.length; i++) {
                await conn.sendMessage(m.chat, {
                    image: albumItems[i].image,
                    caption: albumItems[i].caption,
                    album: true,
                    albumId
                }, { quoted: i === 0 ? m : undefined });
            }
        }

        await m.react('✅').catch(() => {});
    } catch (e) {
        console.error('[Pinterest Error]', e);
        await m.react('❌').catch(() => {});
        m.reply("❌ Gagal: " + (e.message || 'Coba lagi'));
    }
};

handler.help = ['pin <query>', 'pinterest <query>', 'pinalbum <query>'];
handler.tags = ['search'];
handler.command = /^(pin|pinterest|pinalbum|pinsearch)$/i;
handler.limit = 1;
export default handler;

// ============ API NEXRAY ============

async function getPinSearch(query) {
    try {
        const r = await fetch(`https://api.nexray.eu.cc/search/pinterest?q=${encodeURIComponent(query)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 20000
        });
        const j = await r.json();
        const arr = j?.result || j?.data || [];
        if (!Array.isArray(arr) || !arr.length) return [];
        return arr.map(x => ({
            image: x.images_url || x.image || x.url || '',
            title: x.grid_title || x.seo_alt_text || query
        })).filter(x => x.image && x.image.startsWith('http'));
    } catch (e) {
        console.log('[nexray gagal]', e.message);
        return [];
    }
}

async function downloadBuffer(url) {
    try {
        const r = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.pinterest.com/' },
            timeout: 15000
        });
        if (!r.ok) return null;
        const ct = (r.headers.get('content-type') || '').toLowerCase();
        if (ct.includes('text/html') || ct.includes('application/json')) return null;
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.length < 5000) return null;
        const isImg = (buf[0] === 0xFF && buf[1] === 0xD8) ||
                      (buf[0] === 0x89 && buf[1] === 0x50) ||
                      (buf[0] === 0x47 && buf[1] === 0x49) ||
                      (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP');
        if (!isImg) return null;
        return buf;
    } catch { return null; }
}