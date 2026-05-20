import type { Item } from '@devdeck/api-client'

export function detailPathForItem(item: Pick<Item, 'id' | 'item_type'> | null | undefined): string {
  if (!item) return '/items'
  if (item.item_type === 'repo') return `/repo/${item.id}`
  return `/items/${item.id}`
}
