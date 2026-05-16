import type { Item } from '@devdeck/api-client'
import { ItemCard } from './ItemCard'

interface Props {
  items: Item[]
  onSelect?: (item: Item) => void
}

export function ItemGrid({ items, onSelect }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {items.map((it) => (
        <ItemCard key={it.id} item={it} onClick={() => onSelect?.(it)} />
      ))}
    </div>
  )
}
