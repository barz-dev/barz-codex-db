let handler = async (m, { conn }) => {
  let txt = `*Jadibot Free*\n\nLewat link ini bos:\nhttps://jadibot.barz.web.id`
  await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
}

handler.help = ["jadibot"]
handler.tags = ["jadibot"]
handler.customPrefix = /^(jadibot)$/i
handler.command = new RegExp
export default handler