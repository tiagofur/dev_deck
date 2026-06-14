import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles, Loader2, Play, Terminal, Shield, Check, X } from 'lucide-react'
import { Button, showToast } from '@devdeck/ui'
import { getAccessToken, getConfig } from '@devdeck/api-client'
import { useTranslation } from '@devdeck/i18n'

interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  name?: string
  tool_call_id?: string
  tool_calls?: ToolCall[]
}

interface ToolCall {
    id: string
    type: string
    function: {
        name: string
        arguments: string
    }
}

interface Props {
  initialQuery?: string
}

export function AgentChat({ initialQuery }: Props) {
  const { t } = useTranslation()
  const [messages, setMessages] = useState<Message[]>(
    initialQuery ? [{ role: 'user', content: initialQuery }] : []
  )
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [executingToolId, setExecutingToolId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isDesktop = typeof (window as any).electronAPI !== 'undefined'

  useEffect(() => {
    if (initialQuery) {
      sendMessage(initialQuery)
    }
  }, [])

  useEffect(() => {
    const node = scrollRef.current
    if (!node) return
    if (typeof node.scrollTo === 'function') {
      node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' })
    } else {
      node.scrollTop = node.scrollHeight
    }
  }, [messages])

  async function sendMessage(text: string, currentHistory?: Message[]) {
    if (!text.trim() && !currentHistory) return
    setLoading(true)

    const nextHistory = currentHistory || [...messages]
    if (!currentHistory && text !== initialQuery) {
        nextHistory.push({ role: 'user', content: text })
        setMessages(nextHistory)
        setInput('')
    }

    try {
      const { baseUrl } = getConfig()
      const token = getAccessToken()
      
      const response = await fetch(`${baseUrl}/api/agent/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ history: nextHistory })
      })

      if (!response.ok) throw new Error(t('agent.connection_error'))

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))
            if (data.error) {
               showToast(data.error, 'error')
            } else if (data.history) {
               setMessages(data.history)
            }
          }
        }
      }
    } catch (err) {
      showToast((err as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleExecuteTool(tc: ToolCall) {
    if (!isDesktop) {
        showToast(t('agent.desktop_only_execution'), 'error')
        return
    }

    const args = JSON.parse(tc.function.arguments)
    const cmd = args.command

    setExecutingToolId(tc.id)
    try {
        const output = await (window as any).electronAPI.shell.runCommand(cmd)
        const toolMessage: Message = {
            role: 'tool',
            tool_call_id: tc.id,
            name: tc.function.name,
            content: output || t('agent.execution_success_empty')
        }
        const nextHistory = [...messages, toolMessage]
        setMessages(nextHistory)
        sendMessage('', nextHistory)
    } catch (err) {
        const toolMessage: Message = {
            role: 'tool',
            tool_call_id: tc.id,
            name: tc.function.name,
            content: `${t('common.error')}: ${err}`
        }
        const nextHistory = [...messages, toolMessage]
        setMessages(nextHistory)
        sendMessage('', nextHistory)
    } finally {
        setExecutingToolId(null)
    }
  }

  return (
    <div className="flex flex-col h-[50vh]">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar border-b-3 border-ink bg-bg-primary/30"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-40 grayscale space-y-3">
             <Bot size={48} strokeWidth={1} />
             <p className="font-display font-black uppercase text-xs tracking-widest">{t('agent.welcome')}</p>
          </div>
        )}
        
        {messages.filter(m => m.role !== 'system' && m.role !== 'tool').map((m, i) => (
          <div 
            key={i} 
            className="space-y-4"
          >
            <div className={`flex items-start gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 border-2 border-ink flex items-center justify-center shadow-hard-sm shrink-0
                ${m.role === 'user' ? 'bg-accent-lavender' : 'bg-accent-yellow'}
                `}>
                {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`max-w-[80%] p-3 border-2 border-ink shadow-hard-sm text-sm font-mono leading-relaxed
                ${m.role === 'user' ? 'bg-white' : 'bg-bg-card'}
                `}>
                {m.content || (m.tool_calls ? t('agent.processing') : '')}
                </div>
            </div>

            {m.tool_calls?.map(tc => (
                <div key={tc.id} className="ml-11 mr-4 bg-bg-elevated border-3 border-ink p-4 shadow-hard animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="flex items-center gap-2 mb-3">
                        <Terminal size={14} className="text-accent-pink" />
                        <span className="font-display font-black uppercase text-[10px] tracking-widest">{t('agent.action_required', { name: tc.function.name })}</span>
                    </div>
                    
                    <code className="block bg-ink text-bg-primary p-3 text-xs font-mono mb-4 border-2 border-ink shadow-inner overflow-x-auto whitespace-pre">
                        {JSON.parse(tc.function.arguments).command}
                    </code>

                    <div className="flex gap-2">
                        <Button 
                            size="sm" 
                            variant="primary" 
                            onClick={() => handleExecuteTool(tc)}
                            disabled={!!executingToolId || messages.some(msg => msg.role === 'tool' && msg.tool_call_id === tc.id)}
                        >
                            {executingToolId === tc.id ? <Loader2 className="animate-spin" size={14} /> : <><Play size={14} strokeWidth={3} /> {t('agent.run')}</>}
                        </Button>
                        <Button 
                            size="sm" 
                            variant="secondary"
                            disabled={!!executingToolId}
                            onClick={() => showToast(t('agent.action_cancelled'))}
                        >
                            <X size={14} strokeWidth={3} /> {t('agent.ignore')}
                        </Button>
                    </div>
                    
                    <div className="mt-3 flex items-center gap-2 text-[8px] font-mono text-ink-soft uppercase font-bold opacity-60">
                        <Shield size={10} /> {t('agent.local_execution_only')}
                    </div>
                </div>
            ))}
          </div>
        ))}

        {loading && !executingToolId && (
          <div className="flex items-center gap-3 animate-pulse">
             <div className="w-8 h-8 border-2 border-ink flex items-center justify-center bg-bg-elevated shadow-hard-sm">
                <Loader2 size={16} className="animate-spin" />
             </div>
             <div className="text-[10px] font-mono font-black uppercase tracking-widest text-ink-soft">
                {t('agent.thinking')}
             </div>
          </div>
        )}
      </div>

      <form 
        onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
        className="p-3 bg-bg-card flex gap-3"
      >
        <input 
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={t('agent.placeholder')}
          className="flex-1 border-3 border-ink p-3 font-mono text-xs focus:outline-none focus:bg-accent-yellow/5"
          disabled={loading}
        />
        <button 
          type="submit" 
          disabled={loading || !input.trim()}
          className="bg-accent-pink border-3 border-ink p-3 shadow-hard active:shadow-none active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 disabled:grayscale transition-all"
        >
          <Send size={18} strokeWidth={3} className="text-white" />
        </button>
      </form>
    </div>
  )
}
