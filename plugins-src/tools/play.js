import axios from "axios";
import https from "https";

const httpsAgent4 = new https.Agent({ family: 4, keepAlive: true });
const API_BASE = "https://api.ikyyxd.my.id";

async function searchYtPlay(query) {
  const url = `${API_BASE}/search/ytplay?q=${encodeURIComponent(query)}`;
  try {
    const res = await axios.get(url, {
      timeout: 30000,
      httpsAgent: httpsAgent4,
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      validateStatus: () => true,
    });

    if (res.status === 429 || res.data?.msg?.includes("Too many")) throw new Error("RATE_LIMIT");
    if (res.data?.status === false) throw new Error(res.data.msg || "API error");
    if (!res.data?.result) throw new Error("Tidak ada result");

    return res.data.result;
  } catch (e) {
    throw new Error(e.message === "RATE_LIMIT" ? "RATE_LIMIT" : `Search gagal: ${e.message}`);
  }
}

async function getAudioInfo(query) {
  const result = await searchYtPlay(query);
  if (!result?.audio?.url) throw new Error("URL audio tidak ada");
  return {
    title: result.title || "YouTube Audio",
    duration: result.duration || 0,
    thumbnail: result.thumbnail || "",
    source: result.source || "",
    downloadUrl: result.audio.url,
    quality: result.audio.quality || "-",
  };
}

async function downloadAudioWithRetry(info, query, retry = 2) {
  let url = info.downloadUrl;
  for (let attempt = 0; attempt <= retry; attempt++) {
    try {
      const res = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 120000,
        httpsAgent: httpsAgent4,
        headers: {
          "User-Agent": "Mozilla/5.0",
          Referer: "https://www.youtube.com/",
        },
      });
      const buf = Buffer.from(res.data);
      if (buf.length < 1000) throw new Error("Buffer kosong");
      return buf;
    } catch (e) {
      if (attempt < retry) {
        try { url = (await getAudioInfo(query)).downloadUrl; } catch {}
        await new Promise((r) => setTimeout(r, 2000));
      } else {
        throw new Error(`Download gagal ${retry + 1}x: ${e.message}`);
      }
    }
  }
}

function fmtDuration(sec) {
  if (!sec || isNaN(sec)) return "-";
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    if (!text) return m.reply(`Contoh: \`${usedPrefix + command} bergema\``);
    if (/youtube\.com|youtu\.be/i.test(text)) return m.reply(`Gunakan judul lagu, bukan link!`);

    await conn.sendMessage(m.chat, { react: { text: "⏳", key: m.key } });
    const query = text.trim();

    let info;
    for (let i = 0; i < 3; i++) {
      try {
        info = await getAudioInfo(query);
        break;
      } catch (e) {
        if (e.message === "RATE_LIMIT") {
          if (i === 2) throw new Error("API sedang sibuk (rate limit). Tunggu 15 detik.");
          await new Promise((r) => setTimeout(r, 15000));
        } else throw e;
      }
    }

    // === 1. DOWNLOAD SEMUA DI BACKGROUND (TANPA KIRIM PESAN) ===
    const [thumbRes, audioResult] = await Promise.allSettled([
      info.thumbnail ? axios.get(info.thumbnail, { responseType: "arraybuffer", httpsAgent: httpsAgent4 }) : Promise.reject(),
      downloadAudioWithRetry(info, query, 2),
    ]);

    const thumbBuffer = thumbRes.status === "fulfilled" ? Buffer.from(thumbRes.value.data) : null;
    if (audioResult.status === "rejected") throw new Error(audioResult.reason?.message || "Download audio gagal");
    
    const audioBuffer = audioResult.value;
    const safeTitle = (info.title || "audio").replace(/[\\/:*?"<>|]/g, "").trim() || "audio";
    const durationStr = fmtDuration(info.duration);
    const sizeMB = (audioBuffer.length / (1024 * 1024)).toFixed(2);

    const caption = `🎵 *${global.botname || "BOT"} - YOUTUBE MUSIC*\n\n📌 *Judul:* ${info.title}\n⏱️ *Durasi:* ${durationStr}\n🎧 *Kualitas:* ${info.quality}\n📦 *Ukuran:* ${sizeMB} MB\n🔗 *Source:* ${info.source}\n✨ *Request by:* ${m.pushName || "User"}`;

    // === 2. KIRIM FOTO & AUDIO BARENG (PARALEL) ===
    // Gunakan Promise.all agar perintah eksekusi dikirim hampir bersamaan
    let msgKey = null;

    await Promise.all([
      // A. Kirim Foto + Deskripsi
      (async () => {
        if (thumbBuffer) {
          const msg = await conn.sendMessage(m.chat, {
            image: thumbBuffer,
            caption: caption,
          }, { quoted: m });
          msgKey = msg.key; // Simpan key untuk reply audio
        } else {
          const msg = await conn.sendMessage(m.chat, {
            text: caption,
          }, { quoted: m });
          msgKey = msg.key;
        }
      })(),

      // B. Kirim Audio (delay dikit 500ms biar WA gak bingung urutan render)
      (async () => {
        await new Promise(r => setTimeout(r, 500)); // Jeda setengah detik
        await conn.sendMessage(m.chat, {
          audio: audioBuffer,
          mimetype: "audio/mp4", 
          ptt: false,
          fileName: `${safeTitle}.m4a`,
          // Reply ke foto yang dikirim di atas
          ...(msgKey ? { contextInfo: { stanzaId: msgKey.id, participant: msgKey.remoteJid, quotedMessage: { imageMessage: {} } } } : {})
        });
      })()
    ]);

    await conn.sendMessage(m.chat, { react: { text: "✅", key: m.key } });

  } catch (error) {
    console.error("[PLAY ERROR]", error);
    await conn.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
    m.reply(`❌ *Gagal:* ${error.message}`);
  }
};

handler.help = ["play <judul>"];
handler.command = /^(play|musik|music|song)$/i;
handler.tags = ["music"];
handler.limit = true;

export default handler;