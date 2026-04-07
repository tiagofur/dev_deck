import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { RepoCommand } from '../../features/commands/types'
import { CommandCard } from './CommandCard'

interface Props {
  commands: RepoCommand[]
  onReorder: (orderedIds: string[]) => void
  onEdit: (cmd: RepoCommand) => void
  onDelete: (cmd: RepoCommand) => void
}

export function CommandsList({ commands, onReorder, onEdit, onDelete }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = commands.findIndex((c) => c.id === active.id)
    const newIndex = commands.findIndex((c) => c.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const reordered = arrayMove(commands, oldIndex, newIndex)
    onReorder(reordered.map((c) => c.id))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={commands.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {commands.map((cmd) => (
            <SortableCommandRow
              key={cmd.id}
              command={cmd}
              onEdit={() => onEdit(cmd)}
              onDelete={() => onDelete(cmd)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

interface RowProps {
  command: RepoCommand
  onEdit: () => void
  onDelete: () => void
}

function SortableCommandRow({ command, onEdit, onDelete }: RowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: command.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <CommandCard
        command={command}
        dragHandleProps={{ ...attributes, ...listeners }}
        onEdit={onEdit}
        onDelete={onDelete}
        isDragging={isDragging}
      />
    </div>
  )
}
