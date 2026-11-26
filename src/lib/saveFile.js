import { Capacitor } from '@capacitor/core'

// Saves a file the user asked for (bill PDF, report PDF, backup).
//   Browser: a normal download.
//   Android app: browsers' blob downloads do not work inside the app, so the file is written to
//   the app's storage and Android's Share menu opens (WhatsApp, Files, Drive, Print…).
export async function saveFile(blob, fileName) {
  if (!Capacitor.isNativePlatform()) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
    return
  }
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('@capacitor/share'),
  ])
  const data = await blobToBase64(blob)
  const { uri } = await Filesystem.writeFile({ path: fileName, data, directory: Directory.Cache })
  await Share.share({ title: fileName, files: [uri] })
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1])
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}
