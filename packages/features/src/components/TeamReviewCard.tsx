import { CheckCircle2, Clipboard, Users, X } from 'lucide-react'
import { Button } from '@devdeck/ui'
import type { Item } from '@devdeck/api-client'

interface Props {
	item: Item
	saving: boolean
	onMark: () => void
	onApprove: () => void
	onRemove: () => void
	onCopy: () => void
}

export function TeamReviewCard({
	item,
	saving,
	onMark,
	onApprove,
	onRemove,
	onCopy,
}: Props) {
	const isInReview = item.tags.includes('team-review')

	return (
		<div className="bg-bg-card border-3 border-ink shadow-hard p-5">
			<div className="flex items-center gap-2 mb-4">
				<Users size={18} strokeWidth={3} className="text-accent-cyan" />
				<h3 className="font-display font-black uppercase text-sm tracking-widest">
					Equipo
				</h3>
			</div>

			{isInReview ? (
				<div className="space-y-4">
					<div className="bg-accent-yellow/20 border-2 border-ink border-dashed p-3">
						<p className="text-[10px] font-mono uppercase font-bold text-ink-soft">
							Estado: En revisión
						</p>
						<p className="text-xs mt-1">
							Este item está en la cola de curación del equipo.
						</p>
					</div>

					<div className="grid grid-cols-1 gap-2">
						<Button variant="primary" onClick={onApprove} disabled={saving}>
							<span className="flex items-center justify-center gap-2">
								<CheckCircle2 size={16} strokeWidth={3} />
								Aprobar y destacar
							</span>
						</Button>
						<Button variant="secondary" onClick={onRemove} disabled={saving}>
							<span className="flex items-center justify-center gap-2">
								<X size={16} strokeWidth={3} />
								Quitar de revisión
							</span>
						</Button>
					</div>
				</div>
			) : (
				<div className="space-y-4">
					<p className="text-xs text-ink-soft">
						¿Este item es útil para todo el equipo? Marcalo para que otros lo revisen y cataloguen.
					</p>
					<Button variant="secondary" onClick={onMark} disabled={saving}>
						<span className="flex items-center justify-center gap-2">
							<Users size={16} strokeWidth={3} />
							Marcar para revisión
						</span>
					</Button>
				</div>
			)}

			<div className="mt-4 pt-4 border-t-2 border-ink/10">
				<button
					onClick={onCopy}
					className="w-full flex items-center justify-center gap-2 py-2 border-2 border-ink border-dashed text-[10px] font-mono uppercase font-bold text-ink-soft hover:text-ink hover:bg-bg-elevated transition-all"
				>
					<Clipboard size={12} strokeWidth={3} />
					Copiar resumen para Slack/Discord
				</button>
			</div>
		</div>
	)
}
