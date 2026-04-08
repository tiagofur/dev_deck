import { Button } from './Button'

interface Props {
  onAdd: () => void
}

export function EmptyState({ onAdd }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-8xl mb-6 select-none">🦎</div>
      <h2 className="font-display font-black text-4xl uppercase mb-3">
        Todavía no hay nada
      </h2>
      <p className="font-mono text-ink-soft mb-8 max-w-md">
        Pegá el link de un repo que un amigo te recomendó y empezá tu colección.
      </p>
      <Button onClick={onAdd} size="lg">
        Agregar primero
      </Button>
    </div>
  )
}
