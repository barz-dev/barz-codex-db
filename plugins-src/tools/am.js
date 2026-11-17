import axios from 'axios';

const API_URL = 'https://am-verif.barz.web.id';

// ---------- SMALL CAPS HELPER ----------
const SC_MAP = {
  a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ',
  h: 'ʜ', i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ',
  o: 'ᴏ', p: 'ᴘ', q: 'ǫ', r: 'ʀ', s: 'ꜱ', t: 'ᴛ', u: 'ᴜ',
  v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ'
};
function sc(text) {
  return String(text).replace(/[a-z]/g, (c) => SC_MAP[c] || c);
}

// ---------- LOGIKA UTAMA ----------
let handler = async (m, { conn, text, usedPrefix, command }) => {
    const cmd = command.toLowerCase();
    const args = text ? text.trim().split(/\s+/) : [];
    const fullText = text ? text.trim() : '';

    // ==========================================
    // CMD 1: .am-verif (Verifikasi Link)
    // ==========================================
    if (['am-verif', 'amverif', 'verifyam'].includes(cmd)) {
        if (!fullText || !fullText.includes('|')) {
            return m.reply(
                sc(`Cara verifikasi\n\n`) +
                `*${usedPrefix}${cmd} email | link*\n\n` +
                sc(`Contoh:\n`) +
                `${usedPrefix}${cmd} nama@gmail.com | https://alight...oobCode=xxx\n\n` +
                sc(`Kirim dulu linknya pake:\n`) +
                `*${usedPrefix}am nama@gmail.com*`
            );
        }

        const [emailRaw, linkRaw] = fullText.split('|');
        const email = (emailRaw || '').trim().toLowerCase();
        const link = (linkRaw || '').trim();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return m.reply(sc(`Email tidak valid.\n\nFormat:\n`) + `${usedPrefix}${cmd} nama@gmail.com | <link>`);
        }

        if (!link || (!link.includes('oobCode') && !link.includes('alightcreative') && !link.includes('https://'))) {
            return m.reply(sc(`Link tidak valid.\n\nPastikan link dari email Alight Motion ada tulisan oobCode.`));
        }

        await m.reply(sc(`Memverifikasi link...`));

        try {
            const res = await axios.post(`${API_URL}/api/verify-link`, {
                email: email,
                magicLink: link
            }, { timeout: 30000 });

            if (res.data.success) {
                const d = res.data.data || {};
                let txt = sc(`Premium aktif!\n\n`);
                txt += sc(`Email: `) + `${d.email || email}\n`;
                txt += sc(`Uid: `) + `${d.uid || '-'}\n`;
                txt += sc(`Status: `) + `${d.status || 'premium'}\n`;
                txt += sc(`Order id: `) + `${d.orderId || '-'}\n`;
                txt += sc(`Valid until: `) + `${d.validUntil || '-'}\n`;
                if (d.idToken) {
                    txt += `\n` + sc(`Id token:\n`) + `\`\`\`${d.idToken}\`\`\`\n\n`;
                    txt += sc(`Jangan share token ini ke orang lain.`);
                }
                return m.reply(txt);
            }

            return m.reply(sc(`Gagal verifikasi: `) + (res.data.message || 'Link mungkin sudah kedaluwarsa.') + `\n\n` + sc(`Coba kirim ulang link baru pake `) + `${usedPrefix}am ${email}`);
        } catch (e) {
            const msg = e.response?.data?.message || e.message;
            return m.reply(sc(`Koneksi ke server gagal: `) + msg);
        }
    }

    // ==========================================
    // CMD 2: .am (Kirim Link ke Email)
    // ==========================================
    const email = (args[0] || '').trim().toLowerCase();

    if (!email) {
        return m.reply(
            sc(`Alight Motion Verifikasi\n\n`) +
            sc(`Cara pakai:\n`) +
            `*${usedPrefix}am nama@gmail.com*\n\n` +
            sc(`Contoh:\n`) +
            `${usedPrefix}am nama@gmail.com`
        );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return m.reply(sc(`Email tidak valid.\n\nContoh yang bener:\n`) + `${usedPrefix}am nama@gmail.com`);
    }

    await m.reply(sc(`Sedang mengirim link ke email kamu...`));

    try {
        const res = await axios.post(`${API_URL}/api/send-link`, { email }, { timeout: 30000 });

        if (res.data.success) {
            return m.reply(
                sc(`Link berhasil dikirim!\n\n`) +
                sc(`Ke email: `) + `*${email}*\n` +
                sc(`Cek kotak masuk / spam.\n\n`) +
                sc(`Lanjut verifikasi:\n`) +
                sc(`Copy link dari email, terus kirim:\n`) +
                `*${usedPrefix}am-verif ${email} | <paste link>*\n\n` +
                sc(`Contoh:\n`) +
                `${usedPrefix}am-verif ${email} | https://alight...oobCode=xxx`
            );
        }
        return m.reply(sc(`Gagal: `) + (res.data.message || 'Server error'));
    } catch (e) {
        const msg = e.response?.data?.message || e.message;
        return m.reply(sc(`Koneksi ke server gagal: `) + msg);
    }
};

// ==========================================
// KONFIGURASI EXPORT (Standar Bot)
// ==========================================
handler.help = ['am <email>', 'am-verif <email> | <link>'];
handler.tags = ['tools'];
handler.command = /^(am|am-verif|amverif|verifyam|alight)$/i;
handler.limit = false; // Set true kalau mau pakai limit

export default handler;