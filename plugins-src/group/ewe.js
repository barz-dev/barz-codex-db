/*
  ewe.js — .ewe meme grup (brutal absurd)
  author: zenno
  trigger: .ewe @tag / reply / tanpa tag = diri sendiri
  grup only, receh only
*/

const delay = ms => new Promise(res => setTimeout(res, ms));

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!global.db.data.users) global.db.data.users = {};
    let sender = m._normSender || m.sender;
    if (!global.db.data.users[sender]) global.db.data.users[sender] = {};

    let target = m.mentionedJid && m.mentionedJid[0]
        ? m.mentionedJid[0]
        : (m.quoted && m.quoted.sender)
        ? m.quoted.sender
        : sender;

    let tag = `@${target.split('@')[0]}`;
    let me = `@${sender.split('@')[0]}`;
    let mentions = [sender, target];

    let scenes = [
        [
            `*${me}* mulai deketin *${tag}*...`,
            `*${me}* mulai pegang tangan *${tag}*...`,
            `*${me}* mulai tarik *${tag}* ke kamar...`,
            `*${me}* mulai buka baju *${tag}*...`,
            `*${me}* mulai ngewe *${tag}*...`,
            `*${me}* ngewe *${tag}* makin kenceng...`,
            `*${me}* ngewe *${tag}* makin cepet...`,
            `*${me}* crot di dalem *${tag}* 💦`,
            `🫦 *MOMENT OF TRUTH*`,
            `9 bulan kemudian, *${tag}* hamil dan lahiran anak 3, *${me}* langsung kabur ke Kalimantan 🏃‍♂️💨`,
        ],
        [
            `*${me}* mulai gandeng *${tag}*...`,
            `*${me}* mulai cium *${tag}*...`,
            `*${me}* mulai lepas celana *${tag}*...`,
            `*${me}* mulai masuk...`,
            `*${me}* ngewe *${tag}* sambil goyang...`,
            `*${me}* ngewe *${tag}* sambil nyanyi...`,
            `*${me}* crot di dalem *${tag}* 💦`,
            `🫦 *MOMENT OF TRUTH*`,
            `*${tag}* hamil duluan sebelum *${me}* nikahin, sekarang *${me}* jadi bapak anak orang, kena tanggung jawab 18 tahun 💀`,
        ],
        [
            `*${me}* mulai ngewe *${tag}*...`,
            `*${me}* ngewe *${tag}* pake gaya bebek...`,
            `*${me}* ngewe *${tag}* pake gaya tarik tambang...`,
            `*${me}* ngewe *${tag}* pake gaya kungfu...`,
            `*${me}* crot di dalem *${tag}* 💦`,
            `🫦 *MOMENT OF TRUTH*`,
            `ternyata *${tag}* hamil, tapi bukan gara-gara *${me}*, tapi gara-gara tukang bakso 🍜`,
        ],
        [
            `*${me}* mendekati *${tag}*...`,
            `*${me}* memeluk *${tag}*...`,
            `*${me}* membuka baju *${tag}*...`,
            `*${me}* ngewe *${tag}*...`,
            `*${me}* ngewe *${tag}* sambil nyanyi lagu india...`,
            `*${me}* ngewe *${tag}* sampe *${tag}* teriak...`,
            `*${me}* crot di dalem *${tag}* 💦`,
            `🫦 *MOMENT OF TRUTH*`,
            `ternyata *${me}* ngewe *${tag}* di depan ibu-ibu, ibu-ibunya malah nyuruh lanjut, sekarang *${tag}* hamil anak kembar 5 🍼🍼🍼🍼🍼`,
        ],
        [
            `*${me}* mulai ngewe *${tag}*...`,
            `*${me}* ngewe *${tag}* sampe lupa waktu...`,
            `*${me}* ngewe *${tag}* sampe lupa diri...`,
            `*${me}* ngewe *${tag}* sampe keringetan...`,
            `*${me}* crot di dalem *${tag}* 💦`,
            `*${me}* crot lagi 💦`,
            `*${me}* crot lagi 💦`,
            `*${me}* crot lagi 💦`,
            `🫦 *MOMENT OF TRUTH*`,
            `9 bulan kemudian, *${tag}* hamil 7, lahiran 4, satu lagi masih di perut, *${me}* udah kabur ke luar negeri jadi TKI 💀`,
        ],
        [
            `*${me}* mulai ngewe *${tag}*...`,
            `*${me}* ngewe *${tag}* pake gaya apapun...`,
            `*${me}* ngewe *${tag}* di kamar, dapur, teras, halaman...`,
            `*${me}* ngewe *${tag}* di sawah, di kebun, di hutan...`,
            `*${me}* ngewe *${tag}* sampe *${tag}* minta ampun...`,
            `*${me}* crot di dalem *${tag}* 💦`,
            `🫦 *MOMENT OF TRUTH*`,
            `ternyata *${tag}* nggak hamil, tapi *${me}* yang hamil, dan sekarang mereka berdua bingung ngurusin anaknya 👶`,
        ],
        [
            `*${me}* mulai ngewe *${tag}*...`,
            `*${me}* ngewe *${tag}* sampe *${tag}* nangis...`,
            `*${me}* crot di dalem *${tag}* 💦`,
            `*${me}* crot di muka *${tag}* 💦`,
            `*${me}* crot di...`,
            `🫦 *MOMENT OF TRUTH*`,
            `*${tag}* hamil duluan, sekarang *${me}* kena tanggung jawab, tapi *${tag}* udah nikah sama orang lain, anaknya mirip tukang ojek 🏍️`,
        ],
        [
            `*${me}* mulai buka baju...`,
            `*${me}* mulai buka celana...`,
            `*${me}* mulai masuk ke kamar *${tag}*...`,
            `*${me}* mulai ngewe *${tag}*...`,
            `*${me}* crot di dalem *${tag}* 💦`,
            `*${me}* crot lagi 💦`,
            `*${me}* crot lagi 💦`,
            `🫦 *MOMENT OF TRUTH*`,
            `ternyata *${me}* lagi ngelamun di kamar mandi, *${tag}* di luar ngetok pintu, "*${me}* udah 3 jam dari tadi di dalam, mabok ya?" 🚪`,
        ],
    ];

    let scene = scenes[Math.floor(Math.random() * scenes.length)];

    let sent = await conn.sendMessage(m.chat, {
        text: scene[0],
        mentions
    }, { quoted: m });

    let cumulative = scene[0];
    for (let i = 1; i < scene.length; i++) {
        await delay(1200);
        cumulative += `\n${scene[i]}`;
        try {
            await conn.sendMessage(m.chat, {
                text: cumulative,
                mentions,
                edit: sent.key
            });
        } catch (e) {
            sent = await conn.sendMessage(m.chat, {
                text: cumulative,
                mentions
            });
        }
    }
};

handler.help = ['ewe [@tag]'];
handler.tags = ['group', 'fun'];
handler.command = /^ewe$/i;
handler.group = true;
handler.funny = true;

export default handler;