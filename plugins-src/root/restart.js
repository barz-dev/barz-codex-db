// Restart proses. Exit code 1 supaya "auto restart saat crash" di Pterodactyl menyalakannya lagi.
import { isRoot } from './_guard.js'

let handler = async (m) => {
  if (!isRoot()) return
  await m.reply('♻️ Restart... tunggu sebentar.\n(Kalau panel tidak menyala sendiri, tekan Start.)')
  setTimeout(() => { globalThis.__jadibotRestart = true; process.emit('SIGTERM') }, 1200)
}
handler.help = ['restart']
handler.tags = ['root']
handler.command = /^(restart|reboot)$/i
handler.rowner = true
export default handler
