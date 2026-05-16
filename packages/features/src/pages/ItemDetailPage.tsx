import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
	ArrowLeft,
	Brain,
	CheckCircle2,
	Clipboard,
	ExternalLink,
	FileText,
	Library,
	Plus,
	Play,
	Sparkles,
	Trash2,
	Users,
} from 'lucide-react'
import { Button, TagChip, confirm, hashIndex, showToast } from '@devdeck/ui'
import {
	useAIEnrichItem,
	useDeleteItem,
	useItem,
	useRelatedItems,
	useReviewItemAITags,
	useItemRunbooks,
	useCreateRunbook,
	useAddRunbookStep,
	useUpdateRunbookStep,
	useDeleteRunbook,
	useUpdateItem,
	type Item,
	type Runbook,
	type RunbookStep,
} from '@devdeck/api-client'
import { NotesEditor } from '../components/NotesEditor'
import { TagsEditor } from '../components/TagsEditor'
import { TeamReviewCard } from '../components/TeamReviewCard'

export function ItemDetailPage() {
	const { id } = useParams<{ id: string }>()
	const navigate = useNavigate()
	const [activeTab, setActiveTab] = useState<'notes' | 'runbooks'>('notes')
	const { data: item, isLoading, error } = useItem(id)
	const updateItem = useUpdateItem()
	const deleteItem = useDeleteItem()
	const aiEnrich = useAIEnrichItem()
	const reviewAITags = useReviewItemAITags()

	const currentItem = item

	async function saveNotes(next: string) {
		await updateItem.mutateAsync({ id: currentItem!.id, input: { notes: next } })
	}

	async function saveTags(next: string[]) {
		await updateItem.mutateAsync({ id: currentItem!.id, input: { tags: next } })
	}

	async function saveField(field: string, val: string) {
		await updateItem.mutateAsync({ id: currentItem!.id, input: { [field]: val } })
	}

	async function toggleFavorite() {
		await updateItem.mutateAsync({
			id: currentItem!.id,
			input: { is_favorite: !currentItem!.is_favorite },
		})
	}

	async function rerunAI() {
		await aiEnrich.mutateAsync(currentItem!.id)
		showToast('Análisis en curso...')
	}

	async function markForTeamReview() {
		try {
			await updateItem.mutateAsync({
				id: currentItem!.id,
				input: { tags: [...currentItem!.tags, 'team-review'] },
			})
			showToast('Marcado para revisión de equipo')
		} catch (e) {
			showToast((e as Error).message, 'error')
		}
	}

	async function removeFromTeamReview() {
		try {
			await updateItem.mutateAsync({
				id: currentItem!.id,
				input: { tags: currentItem!.tags.filter((tag) => tag !== 'team-review') },
			})
			showToast('Quitado de revisión')
		} catch (e) {
			showToast((e as Error).message, 'error')
		}
	}

	async function approveTeamReview() {
		try {
			await updateItem.mutateAsync({
				id: currentItem!.id,
				input: {
					tags: currentItem!.tags.filter((tag) => tag !== 'team-review'),
					is_favorite: true,
				},
			})
			showToast('Aprobado para el vault del equipo')
		} catch (e) {
			showToast((e as Error).message, 'error')
		}
	}

	async function copyShareSummary() {
		try {
			await navigator.clipboard.writeText(buildShareSummary(currentItem!))
			showToast('Resumen copiado')
		} catch {
			showToast('No se pudo copiar', 'error')
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
	}, [currentItem?.id, currentItem?.is_favorite])

	async function saveAITags(next: string[]) {
		try {
			await reviewAITags.mutateAsync({ id: currentItem!.id, input: { ai_tags: next, apply: false } })
			showToast('Sugerencias guardadas')
		} catch (e) {
			showToast((e as Error).message, 'error')
		}
	}

	async function applyAITags(next: string[]) {
		try {
			await reviewAITags.mutateAsync({ id: currentItem!.id, input: { ai_tags: next, apply: true } })
			showToast('Tags sugeridos aplicados')
		} catch (e) {
			showToast((e as Error).message, 'error')
		}
	}

	async function onDelete() {
		const ok = await confirm({
			title: 'Borrar item',
			message: `Esto va a eliminar "${currentItem?.title || '(sin título)'}" para siempre. No se puede deshacer.`,
			confirmLabel: 'Borrar',
			cancelLabel: 'Cancelar',
			variant: 'danger',
		})
		if (!ok) return
		try {
			await deleteItem.mutateAsync(currentItem!.id)
			showToast('Item borrado')
			navigate('/items')
		} catch (e) {
			showToast((e as Error).message, 'error')
		}
	}

	if (isLoading) return <div className="p-12 text-center animate-pulse">Cargando item…</div>
	if (error || !currentItem) return <div className="p-12 text-center text-accent-pink">Error al cargar el item.</div>

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
					
					{/* Tabs */}
					<div className="flex border-b-3 border-ink">
						<TabButton
							active={activeTab === 'notes'}
							onClick={() => setActiveTab('notes')}
							label="Notas"
							icon={<FileText size={16} />}
						/>
						<TabButton
							active={activeTab === 'runbooks'}
							onClick={() => setActiveTab('runbooks')}
							label="Runbooks"
							icon={<Library size={16} />}
						/>
					</div>

					{activeTab === 'notes' ? (
						<NotesEditor
							value={currentItem.notes}
							onSave={saveNotes}
							saving={updateItem.isPending}
							roomID={`item-${currentItem.id}`}
						/>

					) : (
						<RunbookList itemId={id} />
					)}

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
						<RelatedItemsCard id={id} />
						<TeamReviewCard
							item={currentItem}
							saving={updateItem.isPending}
							onMark={markForTeamReview}
							onApprove={approveTeamReview}
							onRemove={removeFromTeamReview}
							onCopy={copyShareSummary}
						/>
						<div className="bg-bg-card border-3 border-ink shadow-hard p-5">
							<h3 className="font-display font-black uppercase text-sm tracking-widest mb-3">Acciones</h3>
							<div className="flex flex-col gap-3">
							{currentItem.url && (
								<Button type="button" variant="secondary" onClick={() => window.open(currentItem.url!, '_blank', 'noopener')}>
										<span className="flex items-center gap-2"><ExternalLink size={16} strokeWidth={3} />Abrir fuente</span>
									</Button>
							)}
								<Button type="button" variant={currentItem.is_favorite ? 'accent' : 'secondary'} onClick={toggleFavorite}>
									<span className="flex items-center gap-2">
										<Sparkles size={16} strokeWidth={3} className={currentItem.is_favorite ? 'fill-ink' : ''} />
										{currentItem.is_favorite ? 'Favorito' : 'Marcar favorito'}
									</span>
								</Button>
								<div className="h-px bg-ink/10 my-1" />
								<button
									onClick={onDelete}
									className="flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase text-accent-pink hover:bg-accent-pink/10 transition-colors text-left"
								>
									<Trash2 size={16} />
									Borrar para siempre
								</button>
							</div>
						</div>
					</div>
				</aside>
			</div>
		</div>
	)
}

function TabButton({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
	return (
		<button
			onClick={onClick}
			className={`flex items-center gap-2 px-6 py-3 font-display font-black uppercase text-xs tracking-widest transition-all
				${active ? 'bg-bg-card border-x-3 border-t-3 border-ink -mb-[3px] z-10' : 'text-ink-soft hover:text-ink'}
			`}
		>
			{icon}
			{label}
		</button>
	)
}

function RunbookList({ itemId }: { itemId: string | undefined }) {
	const { data: runbooks = [], isLoading } = useItemRunbooks(itemId)
	const createRunbook = useCreateRunbook()

	async function handleAdd() {
		const title = window.prompt('Título del Runbook (ej: Setup Local)')
		if (!title || !itemId) return
		await createRunbook.mutateAsync({ itemId, title })
	}

	if (isLoading) return <div className="font-mono text-sm animate-pulse p-8 text-center">Cargando runbooks…</div>

	return (
		<div className="space-y-6">
			{runbooks.map((rb) => (
				<RunbookCard key={rb.id} runbook={rb} />
			))}

			<button
				onClick={handleAdd}
				className="w-full border-3 border-ink border-dashed p-8 font-display font-black uppercase text-sm tracking-widest text-ink-soft hover:text-ink hover:bg-bg-elevated transition-all flex items-center justify-center gap-2"
			>
				<Plus size={20} strokeWidth={3} />
				Nuevo Runbook
			</button>
		</div>
	)
}

function RunbookCard({ runbook }: { runbook: Runbook }) {
	const addStep = useAddRunbookStep()
	const deleteRunbook = useDeleteRunbook()

	async function handleAddStep() {
		const label = window.prompt('Etiqueta del paso (ej: Instalar dependencias)')
		if (!label) return
		await addStep.mutateAsync({ runbookId: runbook.id, label })
	}

	async function handleDelete() {
		const ok = await confirm({
			title: 'Borrar Runbook',
			message: `¿Estás seguro de que querés borrar "${runbook.title}" y todos sus pasos?`,
			variant: 'danger'
		})
		if (!ok) return
		await deleteRunbook.mutateAsync({ id: runbook.id, itemId: runbook.item_id })
	}

	return (
		<div className="bg-bg-card border-3 border-ink shadow-hard overflow-hidden">
			<div className="bg-bg-elevated border-b-3 border-ink p-4 flex items-center justify-between">
				<div>
					<h3 className="font-display font-black uppercase text-base tracking-tight">{runbook.title}</h3>
					{runbook.description && <p className="text-xs text-ink-soft mt-1">{runbook.description}</p>}
				</div>
				<button onClick={handleDelete} className="p-1.5 hover:bg-accent-pink border-2 border-transparent hover:border-ink transition-all">
					<Trash2 size={16} />
				</button>
			</div>

			<div className="p-4 space-y-2">
				{runbook.steps.map((st) => (
					<RunbookStepItem key={st.id} step={st} />
				))}

				{runbook.steps.length === 0 && (
					<p className="text-center py-4 text-xs font-mono text-ink-soft italic">Sin pasos todavía.</p>
				)}

				<button
					onClick={handleAddStep}
					className="w-full mt-2 py-2 border-2 border-ink border-dashed text-[10px] font-mono uppercase font-bold text-ink-soft hover:text-ink hover:bg-bg-primary transition-all"
				>
					+ Agregar paso
				</button>
			</div>
		</div>
	)
}

function RunbookStepItem({ step }: { step: RunbookStep }) {
	const updateStep = useUpdateRunbookStep()
	const [running, setRunning] = useState(false)
	const isDesktop = typeof (window as any).electronAPI !== 'undefined'

	async function handleRun() {
		if (!step.command || !isDesktop) return
		setRunning(true)
		try {
			const output = await (window as any).electronAPI.shell.runCommand(step.command)
			showToast('Ejecutado con éxito')
			if (output) console.log('[shell output]', output)
		} catch (err) {
			showToast(`Error: ${err}`, 'error')
		} finally {
			setRunning(false)
		}
	}
	
	return (
		<div className={`flex items-start gap-3 p-2 border-2 border-ink transition-colors ${step.is_completed ? 'bg-accent-lime/10' : 'bg-bg-primary'}`}>
			<button
				onClick={() => updateStep.mutate({ id: step.id, input: { is_completed: !step.is_completed } })}
				className={`mt-0.5 w-5 h-5 border-2 border-ink flex items-center justify-center transition-all ${step.is_completed ? 'bg-accent-lime' : 'bg-bg-card'}`}
			>
				{step.is_completed && <CheckCircle2 size={14} strokeWidth={4} />}
			</button>
			<div className="flex-1 min-w-0">
				<p className={`text-sm font-bold uppercase tracking-tight ${step.is_completed ? 'line-through text-ink-soft' : ''}`}>
					{step.label}
				</p>
				{step.description && <p className="text-[10px] text-ink-soft mt-0.5">{step.description}</p>}
				{step.command && (
					<div className="mt-2 flex items-center gap-2">
						<code className="text-[10px] font-mono bg-ink text-bg-primary px-2 py-1 flex-1 truncate">
							{step.command}
						</code>
						<div className="flex gap-1">
							{isDesktop && (
								<button
									onClick={handleRun}
									disabled={running}
									title="Ejecutar comando"
									className="p-1 border-2 border-ink bg-bg-card hover:bg-accent-lime transition-all disabled:opacity-50"
								>
									<Play size={12} strokeWidth={3} className={running ? 'animate-pulse' : ''} />
								</button>
							)}
							<button
								onClick={() => {
									navigator.clipboard.writeText(step.command!)
									showToast('Comando copiado')
								}}
								className="p-1 border-2 border-ink bg-bg-card hover:bg-accent-yellow transition-all"
							>
								<Clipboard size={12} strokeWidth={3} />
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}

function RelatedItemsCard({ id }: { id: string | undefined }) {
	const navigate = useNavigate()
	const { data, isLoading } = useRelatedItems(id)
	const related = data?.related || []

	if (isLoading) return null
	if (related.length === 0) return null

	return (
		<div className="bg-bg-card border-3 border-ink shadow-hard p-5">
			<h3 className="font-display font-black uppercase text-sm tracking-widest mb-4 flex items-center gap-2">
				<Sparkles size={16} strokeWidth={3} className="text-accent-lavender" />
				También te puede interesar
			</h3>
			<div className="space-y-3">
				{related.map((r) => (
					<button
						key={r.id}
						onClick={() => navigate(`/items/${r.id}`)}
						className="w-full text-left group"
					>
						<p className="font-display font-bold text-xs uppercase group-hover:text-accent-pink transition-colors truncate">
							{r.title}
						</p>
						<p className="font-mono text-[10px] text-ink-soft line-clamp-1">
							{r.why_saved || 'Sin descripción'}
						</p>
						<div className="mt-1 h-0.5 w-0 group-hover:w-full bg-accent-lavender transition-all duration-300" />
					</button>
				))}
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
				return 'bg-accent-pink'
			default:
				return 'bg-bg-elevated'
		}
	}, [item.enrichment_status])

	const Icon = item.is_favorite ? Sparkles : Brain

	return (
		<div className={`border-3 border-ink p-6 shadow-hard ${statusTone} transition-colors`}>
			<div className="flex items-start justify-between">
				<div className="p-3 border-3 border-ink bg-bg-card shadow-hard-sm mb-4">
					<Icon size={32} strokeWidth={3} className={item.is_favorite ? 'text-accent-yellow fill-accent-yellow' : ''} />
				</div>
				<div className="flex items-center gap-2">
					<span className="text-[10px] font-mono uppercase font-black px-2 py-0.5 border-2 border-ink bg-bg-card">
						{item.enrichment_status}
					</span>
					<button
						onClick={onRerunAI}
						disabled={rerunning}
						className="p-1.5 border-2 border-ink bg-bg-card hover:bg-accent-cyan transition-all disabled:opacity-50"
						title="Rerun AI Enrichment"
					>
						<Sparkles size={14} className={rerunning ? 'animate-spin' : ''} />
					</button>
				</div>
			</div>
			<p className="text-sm font-medium leading-relaxed mb-4">{item.ai_summary || item.description || 'Sin resumen disponible.'}</p>
			{item.url && (
				<a
					href={item.url}
					target="_blank"
					rel="noopener noreferrer"
					className="text-[10px] font-mono font-bold uppercase underline hover:text-accent-pink truncate block"
				>
					{item.url}
				</a>
			)}
		</div>
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
	value?: string
	placeholder: string
	onSave: (val: string) => void
	saving: boolean
}) {
	const [local, setLocal] = useState(value || '')
	const [editing, setEditing] = useState(false)

	useEffect(() => {
		setLocal(value || '')
	}, [value])

	function handleSave() {
		onSave(local)
		setEditing(false)
	}

	return (
		<div className="bg-bg-card border-3 border-ink shadow-hard p-5">
			<div className="flex items-center justify-between mb-3">
				<h3 className="font-display font-black uppercase text-xs tracking-widest text-ink-soft">{title}</h3>
				{!editing && (
					<button
						onClick={() => setEditing(true)}
						className="text-[10px] font-mono uppercase font-bold underline hover:text-accent-pink"
					>
						Editar
					</button>
				)}
			</div>
			{editing ? (
				<div className="space-y-3">
					<textarea
						value={local}
						onChange={(e) => setLocal(e.target.value)}
						className="w-full border-2 border-ink p-3 font-mono text-sm focus:outline-none focus:bg-accent-yellow/5"
						placeholder={placeholder}
						rows={3}
					/>
					<div className="flex gap-2">
						<Button size="sm" onClick={handleSave} disabled={saving}>
							{saving ? 'Guardando…' : 'Guardar'}
						</Button>
						<Button size="sm" variant="secondary" onClick={() => setEditing(false)}>
							Cancelar
						</Button>
					</div>
				</div>
			) : (
				<p className={`text-sm ${local ? 'font-medium' : 'text-ink-soft italic'}`}>
					{local ? `"${local}"` : placeholder}
				</p>
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
	onSave: (next: string[]) => void
	onApply: (next: string[]) => void
	saving: boolean
}) {
	const [tags, setTags] = useState(value)

	useEffect(() => {
		setTags(value)
	}, [value])

	if (tags.length === 0) return null

	return (
		<div className="bg-bg-elevated border-3 border-ink shadow-hard p-5">
			<div className="flex items-center gap-2 mb-4">
				<Sparkles size={18} strokeWidth={3} className="text-accent-pink" />
				<h3 className="font-display font-black uppercase text-sm tracking-widest">Sugerencias de IA</h3>
			</div>
			<div className="flex flex-wrap gap-2 mb-6">
				{tags.map((t, i) => (
					<button
						key={t}
						onClick={() => setTags(tags.filter((_, idx) => i !== idx))}
						className="group flex items-center gap-1.5 px-3 py-1 border-2 border-ink bg-bg-card font-mono text-xs font-bold uppercase hover:bg-accent-pink transition-all"
					>
						{t}
						<Trash2 size={10} className="opacity-0 group-hover:opacity-100" />
					</button>
				))}
			</div>
			<div className="flex flex-wrap gap-3">
				<Button size="sm" onClick={() => onApply(tags)} disabled={saving} variant="accent">
					Aceptar y aplicar
				</Button>
				<Button size="sm" onClick={() => onSave(tags)} disabled={saving} variant="secondary">
					Guardar borrador
				</Button>
			</div>
		</div>
	)
}

function buildShareSummary(item: Item): string {
	let s = `# ${item.title}\n`
	if (item.url) s += `${item.url}\n`
	if (item.why_saved) s += `\nPor qué importa: ${item.why_saved}\n`
	s += `\n${item.ai_summary || item.description || ''}\n`
	if (item.tags.length > 0) {
		const tags = item.tags.filter((t) => t !== 'team-review')
		if (tags.length > 0) s += `\nTags: ${tags.join(', ')}`
	}
	return s
}
