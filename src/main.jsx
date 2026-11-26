import React from 'react'
import ReactDOM from 'react-dom/client'
import { ShopProvider } from './lib/store'
import App from './App'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ShopProvider>
      <App />
    </ShopProvider>
  </React.StrictMode>,
)
