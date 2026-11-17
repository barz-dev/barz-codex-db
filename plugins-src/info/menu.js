import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { proto, generateWAMessageFromContent, prepareWAMessageMedia } from "@adiwajshing/baileys";

/* ============ HELPER ============ */
const SC = {
    a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ғ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ',
    n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'ǫ', r: 'ʀ', s: 's', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ'
};
const sc = (t) => String(t).toLowerCase().split('').map(c => SC[c] || c).join('');

const LINE = '─────────────────';
const OWNER_WA = 'https://wa.me/6285887047505?text=hallo%20min';

const ICONS = {
    ai: '🤖', alkitab: '📖', am: '🧩', anime: '🎌', bugs: '🐞', buga: '🐞', donghua: '🐉', downloader: '📥',
    freefire: '🔥', game: '🎮', group: '👥', info: 'ℹ️', internet: '🌐', islami: '🕌', komik: '📚',
    maker: '🎨', manga: '📕', mlbb: '⚔️', movie: '🎬', music: '🎵', news: '📰', owner: '👑', panel: '🖥️',
    primbon: '🔮', random: '🎲', samp: '🚗', search: '🔍', stalker: '🕵️', sticker: '🏷️', store: '🛒', tools: '🛠️'
};
const icon = (tag) => ICONS[tag] || '📂';

function getUptime() {
    let s = Math.floor(process.uptime());
    const d = Math.floor(s / 86400); s %= 86400;
    const h = Math.floor(s / 3600); s %= 3600;
    const mnt = Math.floor(s / 60); s %= 60;
    return `${d ? d + 'd ' : ''}${h}h ${mnt}m ${s}s`;
}
function getTime() {
    return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date()) + ' WIB';
}
function getDate() {
    return new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date());
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_THUMBNAIL = path.join(__dirname, '..', '..', 'media', 'thumbnail.jpg');

/* ============ HEADER MENU ============ */
function buildHeader(userName, prefix, title) {
    return `╭${LINE}
│ʜɪ ${sc(userName)}, ᴡᴇʟᴄᴏᴍᴇ 👋
├${LINE}
│📌 𝐁𝐨𝐭 𝐈𝐧𝐟𝐨
│ ├ ɴᴀᴍᴇ  : ${sc(global.botname || 'bot')}
│ ├ ᴠᴇʀsɪ  : ${global.botversion || 'v1'}
│ ├ ᴘʀᴇғɪx : ${prefix}
├${LINE}
│🕒 𝙎𝙏𝘼𝙏𝙐𝙎
│├ ᴊᴀᴍ     : ${getTime()}
│├ ᴛᴀɴɢɢᴀʟ : ${getDate()}
│╰ ᴜᴘᴛɪᴍᴇ  : ${getUptime()}
├${LINE}
│⚙️ 𝙊𝙒𝙉𝙀𝙍
│ ├ ᴅᴇᴠ     : ${sc(global.devname || global.ownername || 'Owner')}
│ ╰ ᴄʀᴇᴀᴛᴏʀ : ${sc(global.creatorname || global.ownername || 'Owner')}
╰${LINE}
\`${title}\``;
}

/* ============ BLOK COMMAND PER KATEGORI ============ */
function buildBlock(tag, items, prefix) {
    const rows = items.map((it, i) => {
        const branch = i === items.length - 1 ? '╰' : '├';
        return `│ ${branch} ${prefix}${it.help}${it.badge}`;
    }).join('\n');
    return `╭${LINE}
│${icon(tag)} ${sc(tag)} (${items.length})
├${LINE}
${rows}
╰${LINE}`;
}

/* ============ LIST KATEGORI BUAT PC - TINGGAL KETIK ============ */
function buildCategoryList(tags, cats, prefix) {
    const rows = tags.map(t => `│ ${icon(t)} ${prefix}menu ${t} — ${cats[t].length} fitur`).join('\n');
    return `╭${LINE}
│📂 ${sc('daftar kategori')}
├${LINE}
${rows}
╰${LINE}
\nKetik salah satu di atas buat liat isinya, contoh: *${prefix}menu owner*`;
}

/* ============ AMBIL DATA PLUGIN ============ */
function collectCategories(isOwner) {
    const pluginsObj = (global.pg || (typeof pg !== 'undefined' ? pg : null))?.plugins || global.plugins || {};
    const map = {};
    for (const plugin of Object.values(pluginsObj)) {
        if (!plugin || plugin.disabled) continue;
        const tags = Array.isArray(plugin.tags) ? plugin.tags : (plugin.tags ? [plugin.tags] : []);
        const helps = Array.isArray(plugin.help) ? plugin.help : (plugin.help ? [plugin.help] : []);
        if (!helps.length) continue;
        const badge = plugin.premium ? ' ✨' : (plugin.limit ? ' ⚡' : '');
        for (const t of tags) {
            if (!t || typeof t !== 'string') continue;
            const tag = t.toLowerCase().trim();
            if (tag === 'main') continue;
            if (tag === 'owner' && !isOwner) continue;
            if (!map[tag]) map[tag] = [];
            for (const h of helps) map[tag].push({ help: h, badge });
        }
    }
    for (const tag of Object.keys(map)) {
        const seen = new Set();
        map[tag] = map[tag].filter(x => !seen.has(x.help) && seen.add(x.help));
        map[tag].sort((a, b) => a.help.localeCompare(b.help));
    }
    return map;
}

/* ============ PENGIRIM KARTU INTERAKTIF (GRUP) ============ */
async function sendMenuInteractive(conn, jid, quoted, { body = '', image = null, buttons = [] }) {
    const content = { nativeFlowMessage: { buttons } };
    if (body) content.body = { text: body };
    if (image) {
        const media = await prepareWAMessageMedia({ image }, { upload: conn.waUploadToServer });
        content.header = { title: '', hasMediaAttachment: true, imageMessage: media.imageMessage };
    }
    const payload = proto.Message.InteractiveMessage.create(content);
    const wa = generateWAMessageFromContent(jid, { viewOnceMessage: { message: { interactiveMessage: payload } } }, {
        userJid: conn.user.id,
        quoted: quoted || null
    });
    const additionalNodes = [{
        tag: 'biz', attrs: {},
        content: [{ tag: 'interactive', attrs: { type: 'native_flow', v: '1' }, content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }] }]
    }];
    await conn.relayMessage(jid, wa.message, { messageId: wa.key.id, additionalNodes });
    return wa;
}

/* ============ MEDIA RESOLVER ============ */
async function fetchToBuffer(url) {
    if (!url || typeof url !== 'string') return null;
    if (!/^https?:\/\//i.test(url)) return null;
    try {
        const r = await fetch(url, { redirect: 'follow' });
        if (!r.ok) return null;
        const ab = await r.arrayBuffer();
        const buf = Buffer.from(ab);
        if (!buf || buf.length === 0) return null;
        return buf;
    } catch { return null; }
}

function guessAudioMime(url) {
    const u = String(url || '').toLowerCase().split('?')[0];
    if (u.endsWith('.ogg')) return 'audio/ogg; codecs=opus';
    if (u.endsWith('.m4a')) return 'audio/mp4';
    if (u.endsWith('.wav')) return 'audio/wav';
    if (u.endsWith('.opus')) return 'audio/ogg; codecs=opus';
    return 'audio/mpeg';
}

async function resolveBanner() {
    const url = global.bannerUrl;
    if (url) {
        const buf = await fetchToBuffer(url);
        if (buf) return buf;
    }
    try {
        if (fs.existsSync(DEFAULT_THUMBNAIL)) return fs.readFileSync(DEFAULT_THUMBNAIL);
    } catch {}
    return null;
}

async function resolveAudio() {
    const url = global.audioUrl || process.env.DEFAULT_AUDIO_URL || '';
    if (!url) return null;
    const buf = await fetchToBuffer(url);
    if (!buf) return null;
    return { buf, mime: guessAudioMime(url) };
}

/* ============ HANDLER ============ */
let handler = async (m, { conn, text, usedPrefix, isROwner, command }) => {
    try {
        await conn.sendMessage(m.chat, { react: { text: '🗡️', key: m.key } }).catch(() => {});

        const prefix = usedPrefix || '.';
        const senderNum = String(m.sender || '').split('@')[0].split(':')[0];
        const ownerNums = (global.owner || []).map(o => String(Array.isArray(o) ? o[0] : o).replace(/[^0-9]/g, ''));
        const isOwner = !!(isROwner || m.fromMe || ownerNums.includes(senderNum));

        const userName = m.pushName || 'User';
        const cats = collectCategories(isOwner);
        const tags = Object.keys(cats).sort();

        let query = (text || '').trim().toLowerCase();
        if (/^allmenu$/i.test(command || '') && !query) query = 'all';

        const isPrivate = !m.chat.endsWith('@g.us');
        const WEBSITE_URL = global.web || 'https://barz.web.id';

        /* ---------- TOMBOL - GRUP ONLY ---------- */
        const rows = [
            { title: `📜 ${sc('allmenu')}`, description: sc('semua fitur bot'), id: `${prefix}menu all` },
            ...tags.map(t => ({
                title: `${icon(t)} ${sc(t)}`,
                description: sc(`${cats[t].length} fitur`),
                id: `${prefix}menu ${t}`
            }))
        ];
        const buttons = [
            {
                name: 'single_select',
                buttonParamsJson: JSON.stringify({
                    title: 'ᴘɪʟɪʜ ᴍᴇɴᴜ',
                    sections: [{ title: 'ᴋᴀᴛᴇɢᴏʀɪ ᴍᴇɴᴜ', highlight_label: 'BARZ', rows }]
                })
            },
            {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: '📢 Channel Dev',
                    url: global.linkch || global.linkchcreator || 'https://whatsapp.com/channel/0029Vb8KMS32phHVPVQEXu1c'
                })
            },
            {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: '🌐 Website',
                    url: WEBSITE_URL
                })
            },
            {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: '💬 Chat Owner',
                    url: OWNER_WA
                })
            }
        ];

        /* ---------- ISI MENU ---------- */
        let title = 'MENU IS BELOW';
        let blocks = [];

        if (query === 'all' || query === 'allmenu') {
            title = 'ALL MENU';
            blocks = tags.map(t => buildBlock(t, cats[t], prefix));
        } else if (query) {
            const wanted = query.split(/[,\s]+/).filter(Boolean).filter(t => cats[t]);
            if (!wanted.length) {
                title = 'KATEGORI TIDAK ADA';
            } else {
                title = `${wanted.join(', ').toUpperCase()} MENU`;
                blocks = wanted.map(t => buildBlock(t, cats[t], prefix));
            }
        }

        const header = buildHeader(userName, prefix, title);

        // --- PC: kalau query kosong, jangan kirim header doang, kasih list kategori yang bisa diketik ---
        let full;
        if (isPrivate && !query) {
            const catList = buildCategoryList(tags, cats, prefix);
            full = `${header}\n\n${catList}\n\n╭${LINE}\n│💬 ${sc('chat owner')} : ${OWNER_WA}\n│🌐 ${sc('website')} : ${WEBSITE_URL}\n╰${LINE}`;
        } else {
            const fullBase = blocks.length ? `${header}\n\n${blocks.join('\n\n')}` : header;
            full = isPrivate
                ? `${fullBase}\n\n╭${LINE}\n│💬 ${sc('chat owner')} : ${OWNER_WA}\n│🌐 ${sc('website')} : ${WEBSITE_URL}\n╰${LINE}\n\nKetik *${prefix}menu* buat balik ke daftar kategori`
                : fullBase;
        }

        const body = full;
        const image = await resolveBanner();

        /* ---------- KIRIM: PC vs GRUP BEDA JALUR ---------- */
        if (isPrivate) {
            // PC: JANGAN PAKE BUTTON / LIST, LANGSUNG TEKS + GAMBAR AJA. INI YANG PALING STABIL DI WA BARU.
            if (image) await conn.sendMessage(m.chat, { image, caption: full }, { quoted: m });
            else await conn.sendMessage(m.chat, { text: full }, { quoted: m });
        } else {
            try {
                await sendMenuInteractive(conn, m.chat, m, { body, image, buttons });
            } catch (e) {
                console.error('[menu] kartu interaktif gagal, fallback teks:', e?.message || e);
                try {
                    if (image) await conn.sendMessage(m.chat, { image, caption: full }, { quoted: m });
                    else await conn.sendMessage(m.chat, { text: full }, { quoted: m });
                } catch (e2) {
                    await conn.sendMessage(m.chat, { text: full }, { quoted: m }).catch(() => {});
                }
            }
        }

        /* ---------- AUDIO MENU ---------- */
        const sendAudio = !query || query === 'all' || query === 'allmenu';
        if (sendAudio) {
            const audio = await resolveAudio();
            if (audio) {
                try {
                    await conn.sendMessage(m.chat, { audio: audio.buf, mimetype: audio.mime, ptt: false, fileName: 'menu-audio.mp3' }, { quoted: m });
                } catch (e) {
                    console.error('[menu] audio gagal terkirim:', e?.message || e);
                }
            }
        }
    } catch (err) {
        console.error(err);
        m.reply('Error: ' + (err.message || err));
    }
};

handler.help = ['menu', 'allmenu', 'help'];
handler.command = ['menu', 'allmenu', 'help', 'cmd', 'coremenu'];
handler.tags = ['main'];

export default handler;