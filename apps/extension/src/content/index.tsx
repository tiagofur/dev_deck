import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { Sparkles, X, ExternalLink } from 'lucide-react'

function CopilotWidget() {
  const [item, setItem] = useState<any>(null)
  const [visible, setVisible] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    // Check if current URL is in DevDeck
    const url = window.location.href
    chrome.runtime.sendMessage({ type: 'CHECK_URL', url }, (response) => {
      if (response?.item) {
        setItem(response.item)
        setVisible(true)
        // Auto-show for a few seconds then collapse
        setExpanded(true)
        setTimeout(() => setExpanded(false), 5000)
      }
    })
  }, [])

  if (!visible) return null

  return (
    <div className="fixed bottom-6 right-6 z-[999999] flex flex-col items-end gap-3 font-sans antialiased text-black">
      {expanded && item && (
        <div className="w-72 bg-white border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono font-bold uppercase bg-yellow-400 border border-black px-1.5 py-0.5">
              En tu vault
            </span>
            <button onClick={() => setExpanded(false)} className="text-gray-400 hover:text-black">
              <X size={14} />
            </button>
          </div>
          
          <h4 className="font-black text-sm uppercase mb-2 truncate">{item.title}</h4>
          
          {item.notes ? (
            <p className="text-xs text-gray-600 italic border-l-2 border-black pl-2 mb-4 line-clamp-3">
              "{item.notes}"
            </p>
          ) : (
            <p className="text-[10px] text-gray-400 mb-4 italic">Sin notas personales.</p>
          )}

          <div className="flex gap-2">
             <a 
              href={`http://localhost:5173/items/${item.id}`} 
              target="_blank" 
              className="flex-1 bg-black text-white text-[10px] font-bold uppercase py-2 text-center hover:bg-gray-800 transition-colors flex items-center justify-center gap-1"
             >
                Abrir <ExternalLink size={10} />
             </a>
          </div>
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-12 h-12 rounded-full border-3 border-black flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
          ${expanded ? 'bg-pink-400' : 'bg-white'}
        `}
      >
        <Sparkles size={24} className={expanded ? 'text-white' : 'text-yellow-500'} />
      </button>
    </div>
  )
}

// Inyectar en Shadow DOM para evitar que el CSS de la página rompa el widget
const container = document.createElement('div')
container.id = 'devdeck-copilot-root'
document.body.appendChild(container)

const shadow = container.attachShadow({ mode: 'open' })
const styleSlot = document.createElement('div')
const rootSlot = document.createElement('div')
shadow.appendChild(styleSlot)
shadow.appendChild(rootSlot)

// Inyectar Tailwind (esto es simplificado, en un setup real usaríamos un plugin de Vite para inyectar el CSS en el Shadow DOM)
// Para el prototipo, usaremos un link al CDN de Tailwind o inyectaremos el bundle
const link = document.createElement('link')
link.rel = 'stylesheet'
link.href = 'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css'
styleSlot.appendChild(link)

ReactDOM.createRoot(rootSlot).render(<CopilotWidget />)
