// Local storage for the shop, using the browser's IndexedDB (works offline, holds photos,
// and keeps working inside an Android APK). Nothing is sent to any server.
//   items:    products for sale (with photo)
//   sales:    saved bills
//   settings: shop name, UPI QR photo, theme, language, bill counter

//   lots:     each purchase of an item (date, quantity, cost) — "batches"
//   wastes:   stock thrown in the dustbin (rotten/damaged), valued at the lot's cost
//   expenses: rent, electricity, transport…
// Version 2 only ADDS stores, so existing items/bills are kept on update.

const DB_NAME = 'abdhullah-shop'
const DB_VERSION = 2
let dbPromise = null

function open() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('items')) db.createObjectStore('items', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('sales')) {
        const sales = db.createObjectStore('sales', { keyPath: 'id' })
        sales.createIndex('date', 'date')
      }
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' })
      if (!db.objectStoreNames.contains('lots')) db.createObjectStore('lots', { keyPath: 'id' }).createIndex('itemId', 'itemId')
      if (!db.objectStoreNames.contains('wastes')) db.createObjectStore('wastes', { keyPath: 'id' }).createIndex('date', 'date')
      if (!db.objectStoreNames.contains('expenses')) db.createObjectStore('expenses', { keyPath: 'id' }).createIndex('date', 'date')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

async function run(store, mode, fn) {
  const db = await open()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode)
    const result = fn(tx.objectStore(store))
    tx.oncomplete = () => resolve(result?.result ?? result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export const db = {
  all: (store) => run(store, 'readonly', (s) => s.getAll()),
  get: (store, key) => run(store, 'readonly', (s) => s.get(key)),
  put: (store, value) => run(store, 'readwrite', (s) => s.put(value)),
  remove: (store, key) => run(store, 'readwrite', (s) => s.delete(key)),
  clear: (store) => run(store, 'readwrite', (s) => s.clear()),
  async putMany(store, values) {
    const conn = await open()
    return new Promise((resolve, reject) => {
      const tx = conn.transaction(store, 'readwrite')
      const s = tx.objectStore(store)
      values.forEach((v) => s.put(v))
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  },
}

// Ask the browser not to clear our data when the device is low on space.
export async function requestPersistence() {
  try { return (await navigator.storage?.persist?.()) ?? false } catch { return false }
}

export const newId = () =>
  (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`)

// Shrinks a photo before saving (keeps the database small and fast): max 480 px, JPEG.
export function compressImage(file, max = 480, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Not an image'))
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}
