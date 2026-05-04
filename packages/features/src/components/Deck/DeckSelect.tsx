import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Plus, Search, X } from 'lucide-react'
import { Button } from '@devdeck/ui'
import {
  type Deck,
  useDecks,
  useCreateDeck,
  addRecentDeck,
  getLastUsedDeck,
  setLastUsedDeck,
  getRecentDeckIds,
} from '@devdeck/api-client'
import { showToast } from '@devdeck/ui'

interface DeckSelectProps {
  value: string | null
  onChange: (deckId: string | null) => void
}

export function DeckSelect({ value, onChange }: DeckSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newDeckTitle, setNewDeckTitle] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const { data: decks, isLoading } = useDecks()
  const createDeckMutation = useCreateDeck()

  // Sort: recent first, then by updated_at
  const sortedDecks = useMemo(() => {
    if (!decks) return []
    
    const recentIds = getRecentDeckIds()
    const lastUsed = getLastUsedDeck()
    
    return [...decks].sort((a, b) => {
      // Last used first
      if (a.id === lastUsed && b.id !== lastUsed) return -1
      if (b.id === lastUsed && a.id !== lastUsed) return 1
      
      // Recent second
      const aIdx = recentIds.indexOf(a.id)
      const bIdx = recentIds.indexOf(b.id)
      if (aIdx !== -1 && bIdx === -1) return -1
      if (bIdx !== -1 && aIdx === -1) return 1
      if (aIdx !== -1 && bIdx !== -1 && aIdx !== bIdx) return aIdx - bIdx
      
      // Then by updated_at
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
  }, [decks])

  // Filter by search
  const filteredDecks = useMemo(() => {
    if (!search.trim()) return sortedDecks
    const q = search.toLowerCase()
    return sortedDecks.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q))
  }, [sortedDecks, search])

  // Current selection as Deck object
  const selectedDeck = useMemo(() => {
    if (!value || !decks) return null
    return decks.find((d) => d.id === value) || null
  }, [value, decks])

  // Reset search when closed
  useEffect(() => {
    if (!isOpen) {
      setSearch('')
      setShowCreate(false)
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', onClickOutside)
      return () => document.removeEventListener('mousedown', onClickOutside)
    }
  }, [isOpen])

  // Keyboard navigation
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!isOpen) return

      // Don't handle if typing in search
      if (document.activeElement === inputRef.current) return

      const maxIndex = filteredDecks.length + (showCreate ? 0 : 1) - 1
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((i) => Math.min(i + 1, maxIndex))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((i) => Math.max(i - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (showCreate && newDeckTitle.trim()) {
            handleCreateNew()
          } else if (filteredDecks[selectedIndex]) {
            handleSelect(filteredDecks[selectedIndex])
          }
          break
        case 'Escape':
          setIsOpen(false)
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, selectedIndex, filteredDecks, showCreate, newDeckTitle])

  async function handleSelect(deck: Deck) {
    onChange(deck.id)
    addRecentDeck(deck.id)
    setLastUsedDeck(deck.id)
    setIsOpen(false)
    showToast(`Asignado a "${deck.title}"`, 'success')
  }

  async function handleCreateNew() {
    if (!newDeckTitle.trim()) return
    
    try {
      const deck = await createDeckMutation.mutateAsync({
        title: newDeckTitle.trim(),
        is_public: false,
      })
      onChange(deck.id)
      setShowCreate(false)
      setNewDeckTitle('')
      setIsOpen(false)
      showToast(`Deck "${deck.title}" creado`, 'success')
    } catch {
      showToast('Error creando deck', 'error')
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full border-3 border-ink p-3 text-left flex items-center justify-between
                   font-mono text-sm hover:bg-accent-yellow/20 transition-colors
                   ${selectedDeck ? 'bg-accent-lime/30' : 'bg-bg-card'}`}
      >
        <span className={selectedDeck ? '' : 'opacity-40'}>
          {selectedDeck ? selectedDeck.title : 'Sin deck (click para asignar)'}
        </span>
        <ChevronDown
          size={18}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-bg-card border-5 border-ink shadow-hard-xl max-h-80 overflow-hidden flex flex-col">
          {/* Search input */}
          <div className="p-2 border-b-3 border-ink">
            <div className="flex items-center gap-2">
              <Search size={16} className="opacity-40" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Buscar deck..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent font-mono text-sm focus:outline-none"
                autoFocus
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="p-1 hover:bg-accent-yellow/30"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Deck list */}
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="p-4 text-center opacity-50 font-mono text-sm">
                Cargando...
              </div>
            ) : filteredDecks.length === 0 && !showCreate ? (
              <div className="p-4 text-center opacity-50 font-mono text-sm">
                No hay decks
              </div>
            ) : (
              filteredDecks.map((deck, idx) => (
                <button
                  key={deck.id}
                  type="button"
                  onClick={() => handleSelect(deck)}
                  className={`w-full p-3 text-left font-mono text-sm border-b-2 border-ink/20
                             hover:bg-accent-yellow/30 transition-colors
                             ${idx === selectedIndex ? 'bg-accent-lime/50' : ''}
                             ${deck.id === value ? 'bg-accent-lime/30' : ''}`}
                >
                  <div className="font-bold truncate">{deck.title}</div>
                  {deck.description && (
                    <div className="text-xs opacity-60 truncate mt-0.5">
                      {deck.description}
                    </div>
                  )}
                </button>
              ))
            )}

            {/* Create new option */}
            {!showCreate && (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="w-full p-3 text-left font-mono text-sm border-t-3 border-ink
                           bg-accent-cyan/20 hover:bg-accent-cyan/40 transition-colors
                           flex items-center gap-2"
              >
                <Plus size={16} />
                <span>Crear nuevo deck...</span>
              </button>
            )}

            {/* Create new form */}
            {showCreate && (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleCreateNew()
                }}
                className="p-3 border-t-3 border-ink bg-accent-cyan/20"
              >
                <input
                  type="text"
                  placeholder="Nombre del nuevo deck"
                  value={newDeckTitle}
                  onChange={(e) => setNewDeckTitle(e.target.value)}
                  className="w-full border-3 border-ink p-2 font-mono text-sm mb-2
                             focus:outline-none focus:bg-accent-yellow/20"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowCreate(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!newDeckTitle.trim()}
                  >
                    Crear
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
