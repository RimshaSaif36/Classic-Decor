import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// CSS loaded via index.html to avoid dev aborted logs
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
