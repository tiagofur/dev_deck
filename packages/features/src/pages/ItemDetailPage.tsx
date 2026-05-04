import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Brain, ExternalLink, Sparkles, Trash2 } from 'lucide-react'
import { Button, TagChip, confirm, hashIndex, showToast } from '@devdeck/ui'
import {
	useAIEnrichItem,
	useDeleteItem,
	useItem,
	useReviewItemAITags,
	useUpdateItem,
	type Item,
} from '@devdeck/api-client'
import { NotesEditor } from '../components/NotesEditor'
import { TagsEditor } from '../components/TagsEditor'

export function ItemDetailPage() {
	const { id } = useParams<{ id: string }>()
	const navigate = useNavigate()
	const { data: item, isLoading, error } = useItem(id)
	const updateItem = useUpdateItem()
	const deleteItem = useDeleteItem()
	const aiEnrich = useAIEnrichItem()
	const reviewAITags = useReviewItemAITags()

	if (isLoading) {
		return <div className="min-h-screen flex items-center justify-center font-mono text-ink-soft">Cargando…</div>
	}
	if (error || !item) {
		return (
			<div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
				<p className="font-display font-black text-3xl uppercase">Item no encontrado</p>
				<Button variant="primary" onClick={() => navigate('/items')}>Volver a items</Button>
			</div>
		)
	}
	const currentItem = item

	async function saveField(field: 'why_saved' | 'when_to_use', next: string) {
		try {
			await updateItem.mutateAsync({ id: currentItem.id, input: { [field]: next } })
			showToast(field === 'why_saved' ? 'Motivo guardado' : 'Cuándo usarlo guardado')
		} catch (e) {
			showToast((e as Error).message, 'error')
		}
	}

	async function saveNotes(next: string) {
		try {
			await updateItem.mutateAsync({ id: currentItem.id, input: { notes: next } })
			showToast('Notas guardadas')
		} catch (e) {
			showToast((e as Error).message, 'error')
		}
	}

	async function saveTags(next: string[]) {
		try {
			await updateItem.mutateAsync({ id: currentItem.id, input: { tags: next } })
			showToast('Tags guardados')
		} catch (e) {
			showToast((e as Error).message, 'error')
		}
	}

	async function rerunAI() {
		try {
			await aiEnrich.mutateAsync(currentItem.id)
			showToast('Análisis encolado')
		} catch (e) {
			showToast((e as Error).message, 'error')
		}
	}

	async function toggleFavorite() {
		try {
			await updateItem.mutateAsync({ id: currentItem.id, input: { is_favorite: !currentItem.is_favorite } })
			showToast(currentItem.is_favorite ? 'Eliminado de favoritos' : 'Agregado a favoritos')
		} catch (e) {
			showToast((e as Error).message, 'error')
		}
	}

	// Cmd+D: Toggle favorite
	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
			const modKey = isMac ? e.metaKey : e.ctrlKey
			if (modKey && e.key.toLowerCase() === 'd') {
				e.preventDefault()
				toggleFavorite()
			}
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [currentItem.id, currentItem.is_favorite])

	async function saveAITags(next: string[]) {
		try {
			await reviewAITags.mutateAsync({ id: currentItem.id, input: { ai_tags: next, apply: false } })
			showToast('Sugerencias guardadas')
		} catch (e) {
			showToast((e as Error).message, 'error')
		}
	}

	async function applyAITags(next: string[]) {
		try {
			await reviewAITags.mutateAsync({ id: currentItem.id, input: { ai_tags: next, apply: true } })
			showToast('Tags sugeridos aplicados')
		} catch (e) {
			showToast((e as Error).message, 'error')
		}
	}

	async function onDelete() {
		const ok = await confirm({
			title: 'Borrar item',
			message: `Esto va a eliminar "${currentItem.title || '(sin título)'}" para siempre. No se puede deshacer.`,
			confirmLabel: 'Borrar',
			cancelLabel: 'Cancelar',
			variant: 'danger',
		})
		if (!ok) return
		try {
			await deleteItem.mutateAsync(currentItem.id)
			showToast('Item borrado')
			navigate('/items')
		} catch (e) {
			showToast((e as Error).message, 'error')
		}
	}

	return (
		<div className="min-h-screen bg-bg-primary">
			<header className="border-b-3 border-ink bg-bg-card px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
				<button
					type="button"
					onClick={() => navigate('/items')}
					className="border-3 border-ink p-2 bg-bg-card shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm transition-all duration-150"
					aria-label="Volver"
				>
					<ArrowLeft size={20} strokeWidth={3} />
				</button>
				<div className="min-w-0 flex-1">
					<p className="font-mono text-xs text-ink-soft mb-1">{currentItem.item_type}</p>
					<h1 className="font-display font-black text-2xl uppercase tracking-tight truncate">{currentItem.title || '(sin título)'}</h1>
				</div>
			</header>

			<div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2 space-y-6">
					<ItemHero item={currentItem} onRerunAI={rerunAI} rerunning={aiEnrich.isPending} />
					<InlineTextCard
						title="Por qué lo guardaste"
						value={currentItem.why_saved}
						placeholder="Ej: para migrar el deploy, para revisar después, para onboarding..."
						onSave={(next) => saveField('why_saved', next)}
						saving={updateItem.isPending}
					/>
					<InlineTextCard
						title="Cuándo usarlo"
						value={currentItem.when_to_use}
						placeholder="Ej: debugging, deploy, terminal, onboarding..."
						onSave={(next) => saveField('when_to_use', next)}
						saving={updateItem.isPending}
					/>
					<NotesEditor value={currentItem.notes} onSave={saveNotes} saving={updateItem.isPending} />
					<TagsEditor value={currentItem.tags} onChange={saveTags} saving={updateItem.isPending} />
					<AITagsReviewCard
						value={currentItem.ai_tags}
						onSave={saveAITags}
						onApply={applyAITags}
						saving={reviewAITags.isPending}
					/>
				</div>

				<aside>
					<div className="lg:sticky lg:top-24 space-y-4">
						<div className="bg-bg-card border-3 border-ink shadow-hard p-5">
							<h3 className="font-display font-black uppercase text-sm tracking-widest mb-3">Acciones</h3>
							<div className="flex flex-col gap-3">
							{currentItem.url && (
								<Button type="button" variant="secondary" onClick={() => window.open(currentItem.url!, '_blank', 'noopener')}>
										<span className="flex items-center gap-2"><ExternalLink size={16} strokeWidth={3} />Abrir fuente</span>
									</Button>
								)}
								<Button type="button" variant="accent" onClick={rerunAI} disabled={aiEnrich.isPending}>
									<span className="flex items-center gap-2"><Brain size={16} strokeWidth={3} />{aiEnrich.isPending ? 'Analizando…' : 'Re-ejecutar IA'}</span>
								</Button>
								<Button type="button" variant="danger" onClick={onDelete} disabled={deleteItem.isPending}>
									<span className="flex items-center gap-2"><Trash2 size={16} strokeWidth={3} />Borrar item</span>
								</Button>
							</div>
						</div>
					</div>
				</aside>
			</div>
		</div>
	)
}

function ItemHero({ item, onRerunAI, rerunning }: { item: Item; onRerunAI: () => void; rerunning: boolean }) {
	const statusTone = useMemo(() => {
		switch (item.enrichment_status) {
			case 'queued':
				return 'bg-accent-yellow'
			case 'error':
				return 'bg-danger text-white'
			case 'ok':
				return 'bg-accent-lime'
			default:
				return 'bg-bg-elevated'
		}
	}, [item.enrichment_status])

	return (
		<section className="bg-bg-card border-3 border-ink shadow-hard p-6 space-y-4">
			<div className="flex items-start justify-between gap-4">
				<div className="min-w-0 flex-1">
					{item.ai_summary ? (
						<p className="text-lg text-ink leading-relaxed">{item.ai_summary}</p>
					) : item.description ? (
						<p className="text-lg text-ink-soft leading-relaxed">{item.description}</p>
					) : (
						<p className="font-mono text-sm text-ink-soft italic">Todavía no hay summary.</p>
					)}
				</div>
				<div className={`px-3 py-1 text-xs font-display font-black uppercase border-3 border-ink shrink-0 ${statusTone}`}>
					{item.enrichment_status}
				</div>
			</div>
			{item.url && (
				<p className="font-mono text-xs text-ink-soft break-all">{item.url}</p>
			)}
			<div className="flex flex-wrap gap-2">
				{item.ai_tags.length > 0 ? item.ai_tags.map((tag) => (
					<TagChip key={tag} label={tag} colorIndex={hashIndex(tag)} />
				)) : <span className="font-mono text-sm text-ink-soft italic">Sin sugerencias todavía.</span>}
			</div>
			{item.enrichment_status === 'error' && (
				<Button type="button" variant="accent" size="sm" onClick={onRerunAI} disabled={rerunning}>
					<span className="flex items-center gap-2"><Sparkles size={14} strokeWidth={3} />Reintentar análisis</span>
				</Button>
			)}
		</section>
	)
}

function InlineTextCard({
	title,
	value,
	placeholder,
	onSave,
	saving,
}: {
	title: string
	value: string
	placeholder: string
	onSave: (next: string) => Promise<void> | void
	saving?: boolean
}) {
	const [editing, setEditing] = useState(false)
	const [draft, setDraft] = useState(value)

	useEffect(() => {
		if (!editing) setDraft(value)
	}, [editing, value])

	async function save() {
		await onSave(draft)
		setEditing(false)
	}

	return (
		<div className="bg-bg-card border-3 border-ink shadow-hard p-5">
			<div className="flex items-center justify-between mb-3 gap-3">
				<h3 className="font-display font-black uppercase text-sm tracking-widest">{title}</h3>
				{editing ? (
					<div className="flex gap-2">
						<Button type="button" variant="secondary" size="sm" onClick={() => { setDraft(value); setEditing(false) }} disabled={saving}>Cancelar</Button>
						<Button type="button" variant="accent" size="sm" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
					</div>
				) : (
					<Button type="button" variant="secondary" size="sm" onClick={() => setEditing(true)}>Editar</Button>
				)}
			</div>
			{editing ? (
				<textarea
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					rows={3}
					placeholder={placeholder}
					className="w-full border-2 border-ink p-3 font-mono text-sm focus:outline-none focus:bg-accent-yellow/10 resize-y"
				/>
			) : value.trim() ? (
				<p className="font-mono text-sm leading-relaxed">{value}</p>
			) : (
				<p className="font-mono text-sm text-ink-soft italic">{placeholder}</p>
			)}
		</div>
	)
}

function AITagsReviewCard({
	value,
	onSave,
	onApply,
	saving,
}: {
	value: string[]
	onSave: (next: string[]) => Promise<void> | void
	onApply: (next: string[]) => Promise<void> | void
	saving?: boolean
}) {
	const [draft, setDraft] = useState('')
	const [tags, setTags] = useState(value)

	useEffect(() => {
		setTags(value)
	}, [value])

	function normalize(raw: string) {
		return raw.trim().toLowerCase().replace(/\s+/g, '-')
	}

	function addTag(raw: string) {
		const next = normalize(raw)
		if (!next || tags.includes(next)) {
			setDraft('')
			return
		}
		setTags([...tags, next].sort())
		setDraft('')
	}

	function removeTag(tag: string) {
		setTags(tags.filter((t) => t !== tag))
	}

	return (
		<div className="bg-bg-card border-3 border-ink shadow-hard p-5">
			<div className="flex items-center justify-between mb-3 gap-3">
				<div>
					<h3 className="font-display font-black uppercase text-sm tracking-widest">Tags sugeridos por IA</h3>
					<p className="font-mono text-xs text-ink-soft mt-1">La IA propone. Vos confirmás o editás.</p>
				</div>
				<div className="flex gap-2">
					<Button type="button" variant="secondary" size="sm" onClick={() => void onSave(tags)} disabled={saving}>Guardar sugerencias</Button>
					<Button type="button" variant="accent" size="sm" onClick={() => void onApply(tags)} disabled={saving}>Aplicar a mis tags</Button>
				</div>
			</div>

			<div className="flex flex-wrap gap-2 mb-3">
				{tags.length === 0 ? (
					<p className="font-mono text-sm text-ink-soft italic">— sin sugerencias —</p>
				) : tags.map((tag) => (
					<span key={tag} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 text-xs font-mono font-semibold border-2 border-ink shadow-hard-sm bg-accent-cyan">
						{tag}
						<button type="button" onClick={() => removeTag(tag)} disabled={saving} className="border-l-2 border-ink/40 ml-1 pl-1 hover:text-danger">×</button>
					</span>
				))}
			</div>

			<input
				type="text"
				value={draft}
				onChange={(e) => setDraft(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === 'Enter' || e.key === ',') {
						e.preventDefault()
						addTag(draft)
					}
				}}
				placeholder="Editar sugerencias (Enter)"
				disabled={saving}
				className="w-full border-2 border-ink px-2 py-1 font-mono text-sm focus:outline-none focus:bg-accent-yellow/10"
			/>
		</div>
	)
}
