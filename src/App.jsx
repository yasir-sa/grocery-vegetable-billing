import { useEffect, useState } from 'react'
import { useShop } from './lib/store'
import { Icon, Toasts } from './components/ui'
import Billing from './pages/Billing'
import Items from './pages/Items'
import Sales from './pages/Sales'
import Stock from './pages/Stock'
import Settings from './pages/Settings'

const PAGES = [
  { id: 'billing', icon: 'bill', Comp: Billing },
  { id: 'stock', icon: 'basket', Comp: Stock },
  { id: 'items', icon: 'box', Comp: Items },
  { id: 'sales', icon: 'chart', Comp: Sales },
  { id: 'settings', icon: 'gear', Comp: Settings },
]
const PAGE_KEY = 'abdhullah-page'

export default function App() {
  const { ready, t, settings, saveSettings } = useShop()
  const [page, setPage] = useState(() => {
    try { return localStorage.getItem(PAGE_KEY) || 'billing' } catch { return 'billing' }
  })
  useEffect(() => { try { localStorage.setItem(PAGE_KEY, page) } catch { /* ignore */ } }, [page])

  if (!ready) {
    return (
      <div className="splash">
        <img src="./icon.svg" alt="" />
        <p>{t('common.loading')}</p>
      </div>
    )
  }

  const Current = PAGES.find((p) => p.id === page)?.Comp ?? Billing
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img src="./icon.svg" alt="" />
          <div>
            <strong>{settings.shopName || t('app.name')}</strong>
            <small>{t('app.tag')}</small>
          </div>
        </div>
        <div className="topbar__actions">
          <button type="button" className="chip" onClick={() => saveSettings({ lang: settings.lang === 'ta' ? 'en' : 'ta' })} aria-label="Language">
            <Icon name="globe" size={18} /> {settings.lang === 'ta' ? 'English' : 'தமிழ்'}
          </button>
          <button type="button" className="icon-btn theme-btn" onClick={() => saveSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
            aria-label={settings.theme === 'dark' ? t('set.light') : t('set.dark')} title={settings.theme === 'dark' ? t('set.light') : t('set.dark')}>
            <Icon name={settings.theme === 'dark' ? 'sun' : 'moon'} />
          </button>
        </div>
      </header>

      <nav className="nav" aria-label="Main">
        {PAGES.map((p) => (
          <button key={p.id} type="button" className={page === p.id ? 'is-active' : ''} onClick={() => setPage(p.id)} aria-current={page === p.id ? 'page' : undefined}>
            <Icon name={p.icon} size={22} />
            <span>{t(`nav.${p.id}`)}</span>
          </button>
        ))}
      </nav>

      <main className="main">
        <div key={page} className="page-anim">
          <Current goTo={setPage} />
        </div>
      </main>
      <Toasts />
    </div>
  )
}
