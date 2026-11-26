import { useRef, useState } from 'react'
import { useShop } from '../lib/store'
import { compressImage } from '../lib/db'
import { Confirm, Icon, Segmented } from '../components/ui'

export default function Settings() {
  const { t, settings, saveSettings, exportBackup, importBackup, toast } = useShop()
  const [form, setForm] = useState({ shopName: settings.shopName, phone: settings.phone, address: settings.address })
  const [pendingFile, setPendingFile] = useState(null)
  const qrRef = useRef(null)
  const restoreRef = useRef(null)

  const onQr = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    // Keep the QR sharp (large, high quality) so phones can scan it from the screen.
    try { await saveSettings({ qr: await compressImage(file, 900, 0.95) }); toast(t('set.saved')) } catch { toast('Photo could not be read', 'error') }
  }

  return (
    <section className="page page--narrow">
      <header className="page__head"><h1>{t('set.title')}</h1></header>

      <form className="card form-card" onSubmit={async (e) => { e.preventDefault(); await saveSettings(form); toast(t('set.saved')) }}>
        <label className="field"><span>{t('set.shopName')}</span>
          <input value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} />
        </label>
        <label className="field"><span>{t('set.phone')}</span>
          <input value={form.phone} inputMode="tel" onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="98765 43210" />
        </label>
        <label className="field"><span>{t('set.address')}</span>
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </label>
        <button type="submit" className="btn btn-primary"><Icon name="check" size={18} /> {t('common.save')}</button>
      </form>

      <div className="card">
        <h2 className="card__title"><Icon name="qr" /> {t('set.qr')}</h2>
        <p className="muted">{t('set.qrHelp')}</p>
        <div className="qr-box">
          {settings.qr ? <img src={settings.qr} alt="UPI QR" /> : <div className="qr-box__empty"><Icon name="qr" size={56} stroke={1.5} /></div>}
          <div className="qr-box__actions">
            <button type="button" className="btn btn-primary" onClick={() => qrRef.current?.click()}><Icon name="upload" size={18} /> {t('set.qrUpload')}</button>
            {settings.qr && <button type="button" className="btn btn-ghost-danger" onClick={() => saveSettings({ qr: null })}><Icon name="trash" size={18} /> {t('set.qrRemove')}</button>}
          </div>
          <input ref={qrRef} type="file" accept="image/*" hidden onChange={onQr} />
        </div>
      </div>

      <div className="card">
        <div className="setting-row">
          <span>{t('set.theme')}</span>
          <Segmented value={settings.theme} onChange={(theme) => saveSettings({ theme })} options={[
            { value: 'light', label: t('set.light'), icon: '☀️' },
            { value: 'dark', label: t('set.dark'), icon: '🌙' },
          ]} />
        </div>
        <div className="setting-row">
          <span>{t('set.lang')}</span>
          <Segmented value={settings.lang} onChange={(lang) => saveSettings({ lang })} options={[
            { value: 'en', label: 'English' },
            { value: 'ta', label: 'தமிழ்' },
          ]} />
        </div>
      </div>

      <div className="card">
        <h2 className="card__title"><Icon name="download" /> {t('set.backup')}</h2>
        <p className="muted">{t('set.backupHelp')}</p>
        <div className="row-gap">
          <button type="button" className="btn btn-primary" onClick={exportBackup}><Icon name="download" size={18} /> {t('set.export')}</button>
          <button type="button" className="btn" onClick={() => restoreRef.current?.click()}><Icon name="upload" size={18} /> {t('set.import')}</button>
          <input ref={restoreRef} type="file" accept="application/json,.json" hidden onChange={(e) => { setPendingFile(e.target.files?.[0] ?? null); e.target.value = '' }} />
        </div>
      </div>

      <Confirm open={!!pendingFile} text={t('set.importAsk')} onNo={() => setPendingFile(null)}
        onYes={async () => {
          const file = pendingFile
          setPendingFile(null)
          try { await importBackup(file); toast(t('set.restored')) } catch { toast(t('set.badFile'), 'error') }
        }} />
    </section>
  )
}
