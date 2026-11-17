import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

// ---------- SMALL CAPS ----------
const SC_MAP = {
  a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ',
  h: 'ʜ', i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ',
  o: 'ᴏ', p: 'ᴘ', q: 'ǫ', r: 'ʀ', s: 'ꜱ', t: 'ᴛ', u: 'ᴜ',
  v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ'
};
function sc(text) {
  return String(text).replace(/[a-z]/g, (c) => SC_MAP[c] || c);
}
// =================================

export default async function handler(m, { conn, args }) {
    let url = args[0];
    if (!url) return m.reply(sc(`Masukin url nya.\n\nCara:\n`) + `.getcode https://example.com`);
    if (!url.startsWith('http')) url = 'https://' + url;

    let startUrl;
    try { startUrl = new URL(url); } catch { return m.reply(sc(`Url nya ga valid.`)); }

    const domain = startUrl.hostname;
    await m.reply(sc(`Lagi crawling ${domain}... tunggu.`));

    const name = domain.replace(/[^a-zA-Z0-9]/g, '_') + '_' + Date.now();
    const baseDir = path.join('./tmp', 'getcode', name);
    const zipPath = path.join('./tmp', 'getcode', name + '.zip');
    fs.mkdirSync(baseDir, { recursive: true });

    const visited = new Set();
    const queue = [startUrl.href];
    const foundFiles = [];
    const MAX = 100;

    try {
        while (queue.length > 0 && visited.size < MAX) {
            const currentUrl = queue.shift();
            if (visited.has(currentUrl)) continue;
            visited.add(currentUrl);

            let u;
            try { u = new URL(currentUrl); } catch { continue; }
            if (u.hostname !== domain) continue;

            let filePath = path.join(baseDir, u.pathname.replace(/^\//, ''));
            if (u.pathname === '/' || u.pathname.endsWith('/')) filePath = path.join(filePath, 'index.html');
            if (!path.extname(filePath)) filePath += '.html';

            let content = null;
            try {
                const res = await fetch(currentUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                if (!res.ok) continue;
                const buf = Buffer.from(await res.arrayBuffer());
                content = buf.toString();
                fs.mkdirSync(path.dirname(filePath), { recursive: true });
                fs.writeFileSync(filePath, buf);
                foundFiles.push(u.pathname + (u.search || ''));
            } catch { continue; }

            if (!content) continue;

            const htmlRegex = /(?:src|href|action)=["']([^"']+)["']/g;
            const jsRegex = /(?:import\s+.*?from\s+|from\s+|require\(|fetch\(|axios\.get\(|import\()["']([^"']+)["']/g;
            const cssRegex = /(?:@import\s+|url\()\s*["']?([^"'\)]+)["']?\)?/g;

            const allMatches = [...content.matchAll(htmlRegex), ...content.matchAll(jsRegex), ...content.matchAll(cssRegex)];

            for (let match of allMatches) {
                let link = match[1];
                if (!link || link.startsWith('#') || link.startsWith('data:') || link.startsWith('mailto:') || link.startsWith('tel:') || link.startsWith('javascript:')) continue;
                if (link.includes('googleapis') || link.includes('gstatic') || link.includes('cloudflare')) continue;
                try {
                    let full = new URL(link, currentUrl).href.split('#')[0];
                    if (new URL(full).hostname === domain && !visited.has(full) && !queue.includes(full)) {
                        queue.push(full);
                    }
                } catch {}
            }

            const jsFileRegex = /["']([^"']+\.js(?:\?[^"']*)?)["']/g;
            for (let jm of content.matchAll(jsFileRegex)) {
                try {
                    let full = new URL(jm[1], currentUrl).href.split('#')[0];
                    if (new URL(full).hostname === domain && !visited.has(full) && !queue.includes(full)) queue.push(full);
                } catch {}
            }
        }

        if (foundFiles.length === 0) return m.reply(sc(`Ga ada file yang ke ambil, webnya mungkin ke block / pake cloudflare.`));

        const jsFiles = foundFiles.filter(f => f.includes('.js'));
        const cssFiles = foundFiles.filter(f => f.includes('.css'));
        const htmlFiles = foundFiles.filter(f => f.includes('.html') || f === '/');

        fs.writeFileSync(path.join(baseDir, 'INFO.txt'),
`SOURCE: ${startUrl.href}
DOMAIN: ${domain}
DIAMBIL: ${new Date().toLocaleString('id-ID')}
TOTAL: ${foundFiles.length} file
HTML: ${htmlFiles.length}
JS: ${jsFiles.length}
CSS: ${cssFiles.length}

ALL FILE:
${foundFiles.join('\n')}
`);

        await new Promise((resolve, reject) => {
            const output = fs.createWriteStream(zipPath);
            const archive = archiver('zip', { zlib: { level: 9 } });
            output.on('close', resolve);
            archive.on('error', reject);
            archive.pipe(output);
            archive.directory(baseDir, false);
            archive.finalize();
        });

        const zipSize = (fs.statSync(zipPath).size / 1024 / 1024).toFixed(2);

        await conn.sendMessage(m.chat, {
            document: fs.readFileSync(zipPath),
            fileName: `${domain}_full_source.zip`,
            mimetype: 'application/zip',
            caption: sc(`Getcode berhasil - full crawl\n\n`) +
                `• ${sc('Domain')} : ${domain}\n` +
                `• ${sc('Total')} : ${foundFiles.length} file\n` +
                `• ${sc('Html')} : ${htmlFiles.length}\n` +
                `• ${sc('Js')} : ${jsFiles.length} file\n` +
                `• ${sc('Css')} : ${cssFiles.length} file\n` +
                `• ${sc('Ukuran')} : ${zipSize} MB\n\n` +
                sc(`Ini udah all, bukan cuma home. Cek INFO.txt buat list lengkapnya.`)
        }, { quoted: m });

        fs.rmSync(baseDir, { recursive: true, force: true });
        fs.rmSync(zipPath, { force: true });

    } catch (e) {
        return m.reply(sc(`Gagal getcode: `) + e.message);
    }
};

handler.command = handler.help = ["getcode", "getsource", "webdl"];
handler.tags = ["tools"];
handler.owner = false;