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
	Share2,
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
	useCapture,
	useCircles,
	useShareToCircle,
	type Item,
	type Runbook,
	type RunbookStep,
} from '@devdeck/api-client'
import { NotesEditor } from '../components/NotesEditor'
import { TagsEditor } from '../components/TagsEditor'
import { TeamReviewCard } from '../components/TeamReviewCard'
import { AppShell } from '../components/AppShell'
import { ShareToCirclePanel } from '../components/ShareToCirclePanel'
import { useTranslation } from '@devdeck/i18n'

export function ItemDetailPage() {
	const { t } = useTranslation()
	const { id } = useParams<{ id: string }>()
	const navigate = useNavigate()
	const [activeTab, setActiveTab] = useState<'notes' | 'runbooks'>('notes')
	const { data: item, isLoading, error } = useItem(id)
	const updateItem = useUpdateItem()
	const deleteItem = useDeleteItem()
	const aiEnrich = useAIEnrichItem()
	const reviewAITags = useReviewItemAITags()

	const currentItem = item

	async function toggleFavorite() {
		if (!currentItem) return
		await updateItem.mutateAsync({
			id: currentItem.id,
			input: { is_favorite: !currentItem.is_favorite },
		})
	}

	async function rerunAI() {
		await aiEnrich.mutateAsync(currentItem!.id)
		showToast(t('item_detail.rerun_ai_toast'))
	}

	async function markForTeamReview() {
		try {
			await updateItem.mutateAsync({
				id: currentItem!.id,
				input: { tags: [...currentItem!.tags, 'team-review'] },
			})
			showToast(t('item_detail.mark_review_toast'))
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
			showToast(t('item_detail.remove_review_toast'))
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
			showToast(t('item_detail.approve_review_toast'))
		} catch (e) {
			showToast((e as Error).message, 'error')
		}
	}

	async function copyShareSummary() {
		try {
			await navigator.clipboard.writeText(buildShareSummary(currentItem!, t))
			showToast(t('item_detail.copy_summary_toast'))
		} catch {
			showToast(t('item_detail.copy_summary_error'), 'error')
		}
	}

	// Cmd+D: Toggle favorite
	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
				e.preventDefault()
				toggleFavorite()
			}
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentItem?.id, currentItem?.is_favorite])

	async function saveAITags(next: string[]) {
		try {
			await reviewAITags.mutateAsync({ id: currentItem!.id, input: { ai_tags: next, apply: false } })
			showToast(t('item_detail.save_ai_tags_toast'))
		} catch (e) {
			showToast((e as Error).message, 'error')
		}
	}

	async function applyAITags(next: string[]) {
		try {
			await reviewAITags.mutateAsync({ id: currentItem!.id, input: { ai_tags: next, apply: true } })
			showToast(t('item_detail.apply_ai_tags_toast'))
		} catch (e) {
			showToast((e as Error).message, 'error')
		}
	}

	async function onDelete() {
		const ok = await confirm({
			title: t('item_detail.delete_item_title'),
			message: t('item_detail.delete_item_confirm', { title: currentItem?.title || t('common.untitled') }),
			confirmLabel: t('common.delete'),
			cancelLabel: t('common.cancel'),
			variant: 'danger',
		})
		if (!ok) return
		try {
			await deleteItem.mutateAsync(currentItem!.id)
			showToast(t('item_detail.delete_item_success'))
			navigate('/items', { replace: true })
		} catch (e) {
			showToast((e as Error).message, 'error')
		}
	}

	if (isLoading) {
		return (
			<AppShell contentClassName="flex-1 overflow-y-auto">
				<div className="min-h-full p-12 text-center animate-pulse">{t('item_detail.loading_item')}</div>
			</AppShell>
		)
	}
	if (error || !currentItem) {
		return (
			<AppShell contentClassName="flex-1 overflow-y-auto">
				<div className="min-h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
					<p className="font-display font-black text-3xl uppercase">{t('item_detail.item_not_found_title')}</p>
					<p className="font-mono text-sm text-ink-soft max-w-md">
						{t('item_detail.item_not_found_desc')}
					</p>
					<Button variant="primary" onClick={() => navigate('/items', { replace: true })}>
						{t('item_detail.back_to_items')}
					</Button>
				</div>
			</AppShell>
		)
	}

	const saveNotes = async (next: string) => { await updateItem.mutateAsync({ id: currentItem.id, input: { notes: next } }) }
	const saveTags = async (next: string[]) => { await updateItem.mutateAsync({ id: currentItem.id, input: { tags: next } }) }
	const saveField = async (field: string, val: string) => { await updateItem.mutateAsync({ id: currentItem.id, input: { [field]: val } }) }

	return (
		<AppShell contentClassName="flex-1 overflow-y-auto">
		<div className="min-h-full bg-bg-primary">
			<header className="border-b-3 border-ink bg-bg-card px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
				<button
					type="button"
					onClick={() => navigate('/items')}
					className="border-3 border-ink p-2 bg-bg-card shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm transition-all duration-150"
					aria-label={t('common.back')}
				>
					<ArrowLeft size={20} strokeWidth={3} />
				</button>
				<div className="min-w-0 flex-1">
					<p className="font-mono text-xs text-ink-soft mb-1">{currentItem.item_type}</p>
					<h1 className="font-display font-black text-2xl uppercase tracking-tight truncate">{currentItem.title || `(${t('common.untitled')})`}</h1>
				</div>
			</header>

			<div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2 space-y-6">
					<ItemHero item={currentItem} onRerunAI={rerunAI} rerunning={aiEnrich.isPending} />
					<InlineTextCard
						title={t('item_detail.why_saved_title')}
						value={currentItem.why_saved}
						placeholder={t('item_detail.why_saved_placeholder')}
						onSave={(next) => saveField('why_saved', next)}
						saving={updateItem.isPending}
					/>
					<InlineTextCard
						title={t('item_detail.when_to_use_title')}
						value={currentItem.when_to_use}
						placeholder={t('item_detail.when_to_use_placeholder')}
						onSave={(next) => saveField('when_to_use', next)}
						saving={updateItem.isPending}
					/>
					
					{/* Tabs */}
					<div className="flex border-b-3 border-ink">
						<TabButton
							active={activeTab === 'notes'}
							onClick={() => setActiveTab('notes')}
							label={t('item_detail.notes_tab')}
							icon={<FileText size={16} />}
						/>
						<TabButton
							active={activeTab === 'runbooks'}
							onClick={() => setActiveTab('runbooks')}
							label={t('item_detail.runbooks_tab')}
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
							<h3 className="font-display font-black uppercase text-sm tracking-widest mb-3">{t('item_detail.actions_title')}</h3>
							<div className="flex flex-col gap-3">
							{currentItem.url && (
								<Button type="button" variant="secondary" onClick={() => window.open(currentItem.url!, '_blank', 'noopener')}>
										<span className="flex items-center gap-2"><ExternalLink size={16} strokeWidth={3} />{t('item_detail.open_source')}</span>
									</Button>
							)}
								<Button type="button" variant={currentItem.is_favorite ? 'accent' : 'secondary'} onClick={toggleFavorite}>
									<span className="flex items-center gap-2">
										<Sparkles size={16} strokeWidth={3} className={currentItem.is_favorite ? 'fill-ink' : ''} />
										{currentItem.is_favorite ? t('item_detail.favorite') : t('item_detail.mark_favorite')}
									</span>
								</Button>
								<div className="h-px bg-ink/10 my-1" />
								<button
									onClick={onDelete}
									className="flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase text-accent-pink hover:bg-accent-pink/10 transition-colors text-left"
								>
									<Trash2 size={16} />
									{t('item_detail.delete_forever')}
								</button>
							</div>
						</div>
					</div>
				</aside>
			</div>
		</div>
		</AppShell>
	)
}

function TabButton({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
	return (
		<button
			onClick={onClick}
			className={`flex-1 flex items-center justify-center gap-2 py-3 font-display font-black uppercase text-xs tracking-widest transition-all
				${active ? 'bg-accent-yellow border-x-3 border-ink -mb-[3px]' : 'bg-bg-card text-ink-soft hover:bg-bg-elevated'}
			`}
		>
			{icon}
			{label}
		</button>
	)
}

function RunbookList({ itemId }: { itemId: string | undefined }) {
	const { t } = useTranslation()
	const { data: runbooks = [], isLoading } = useItemRunbooks(itemId)
	const createRunbook = useCreateRunbook()

	async function handleAdd() {
		const title = window.prompt(t('item_detail.runbook.new_prompt'))
		if (!title || !itemId) return
		await createRunbook.mutateAsync({ itemId, title })
	}

	if (isLoading) return <div className="font-mono text-sm animate-pulse p-8 text-center">{t('item_detail.runbook.loading')}</div>

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
				{t('item_detail.runbook.new_button')}
			</button>
		</div>
	)
}

function RunbookCard({ runbook }: { runbook: Runbook }) {
	const { t } = useTranslation()
	const addStep = useAddRunbookStep()
	const deleteRunbook = useDeleteRunbook()
	const capture = useCapture()
	const { data: circles = [] } = useCircles()
	const shareToCircle = useShareToCircle()
	const [shareOpen, setShareOpen] = useState(false)

	async function handleAddStep() {
		const label = window.prompt(t('item_detail.runbook.step_label_prompt'))
		if (!label) return
		await addStep.mutateAsync({ runbookId: runbook.id, label })
	}

	async function handleDelete() {
		const ok = await confirm({
			title: t('item_detail.runbook.delete_title'),
			message: t('item_detail.runbook.delete_confirm', { title: runbook.title }),
			variant: 'danger'
		})
		if (!ok) return
		await deleteRunbook.mutateAsync({ id: runbook.id, itemId: runbook.item_id })
	}

	async function handleShare({ circleId, context }: { circleId: string; context: string }) {
		const text = formatRunbookForSharing(runbook)
		try {
			const captured = await capture.mutateAsync({
				source: 'manual',
				text,
				title_hint: `Runbook: ${runbook.title}`,
				type_hint: 'workflow',
				tags: ['runbook', 'circle-share'],
				why_saved: context,
			})
			const itemId = captured.item?.id || captured.duplicate_of
			if (!itemId) throw new Error('Could not capture runbook before sharing.')

			await shareToCircle.mutateAsync({ circleId, itemId })
			showToast('Runbook shared to Circle', 'success')
			setShareOpen(false)
		} catch (err) {
			showToast((err as Error).message || 'Could not share runbook', 'error')
		}
	}

	return (
		<div className="bg-bg-card border-3 border-ink shadow-hard overflow-hidden">
			<header className="bg-bg-elevated border-b-3 border-ink p-4 flex items-center justify-between">
				<div className="flex items-center gap-3">
					<Library size={18} strokeWidth={3} />
					<h3 className="font-display font-black uppercase text-sm">{runbook.title}</h3>
				</div>
				<div className="flex items-center gap-2">
					<button
						onClick={() => setShareOpen((open) => !open)}
						disabled={circles.length === 0}
						title="Share runbook to Circle"
						className="p-1 border-2 border-transparent hover:border-ink hover:bg-accent-yellow transition-colors disabled:opacity-40"
					>
						<Share2 size={16} />
					</button>
					<button onClick={handleDelete} className="p-1 hover:bg-accent-pink transition-colors">
						<Trash2 size={16} />
					</button>
				</div>
			</header>

			<div className="p-4 space-y-4">
				{shareOpen && (
					<ShareToCirclePanel
						circles={circles}
						isSharing={capture.isPending || shareToCircle.isPending}
						title="Share runbook to Circle"
						description="Add context so the Circle knows when to use this runbook."
						submitLabel="Save and share runbook"
						onClose={() => setShareOpen(false)}
						onShare={handleShare}
					/>
				)}

				{runbook.steps.map((st) => (
					<RunbookStepItem key={st.id} step={st} />
				))}

				{runbook.steps.length === 0 && (
					<p className="text-center py-4 text-xs font-mono text-ink-soft italic">{t('item_detail.runbook.empty_steps')}</p>
				)}

				<button
					onClick={handleAddStep}
					className="w-full mt-2 py-2 border-2 border-ink border-dashed text-[10px] font-mono uppercase font-bold text-ink-soft hover:text-ink hover:bg-bg-primary transition-all"
				>
					{t('item_detail.runbook.add_step')}
				</button>
			</div>
		</div>
	)
}

function formatRunbookForSharing(runbook: Runbook): string {
	const lines = [`# ${runbook.title}`]
	if (runbook.description) {
		lines.push('', runbook.description)
	}
	if (runbook.steps.length > 0) {
		lines.push('', '## Steps')
		runbook.steps.forEach((step, index) => {
			lines.push('', `${index + 1}. ${step.label}`)
			if (step.command) {
				lines.push('', '```bash', step.command, '```')
			}
			if (step.description) {
				lines.push('', step.description)
			}
		})
	}
	return lines.join('\n')
}

function RunbookStepItem({ step }: { step: RunbookStep }) {
	const { t } = useTranslation()
	const updateStep = useUpdateRunbookStep()
	const [running, setRunning] = useState(false)
	const isDesktop = typeof (window as any).electronAPI !== 'undefined'

	async function handleRun() {
		if (!step.command || !isDesktop) return
		setRunning(true)
		try {
			const output = await (window as any).electronAPI.shell.runCommand(step.command)
			showToast(t('item_detail.runbook.execution_success'))
			if (output) console.log('[shell output]', output)
		} catch (err) {
			showToast(`${t('common.error')}: ${err}`, 'error')
		} finally {
			setRunning(false)
		}
	}

	return (
		<div className="group border-2 border-ink bg-bg-primary p-3 shadow-hard-sm">
			<div className="flex items-start justify-between gap-3">
				<div className="flex-1 min-w-0">
					<p className="font-display font-bold text-xs uppercase mb-2">{step.label}</p>
					<textarea
						value={step.command || ''}
						onChange={(e) => updateStep.mutate({ id: step.id, input: { command: e.target.value } })}
						placeholder="docker-compose up -d..."
						className="w-full bg-ink text-bg-primary font-mono text-[10px] p-2 border-2 border-ink focus:outline-none focus:bg-accent-yellow/5 resize-none h-12"
					/>
				</div>
				<div className="flex flex-col gap-1">
					{step.command && (
						<div className="flex gap-1">
							{isDesktop && (
								<button
									onClick={handleRun}
									disabled={running}
									title={t('agent.run')}
									className="p-1 border-2 border-ink bg-bg-card hover:bg-accent-lime transition-all disabled:opacity-50"
								>
									<Play size={12} strokeWidth={3} className={running ? 'animate-pulse' : ''} />
								</button>
							)}
							<button
								onClick={() => {
									navigator.clipboard.writeText(step.command!)
									showToast(t('item_detail.runbook.copy_command_toast'))
								}}
								className="p-1 border-2 border-ink bg-bg-card hover:bg-accent-yellow transition-all"
							>
								<Clipboard size={12} strokeWidth={3} />
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

function RelatedItemsCard({ id }: { id: string | undefined }) {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const { data, isLoading } = useRelatedItems(id)
	const related = data?.related || []

	if (isLoading) return null
	if (related.length === 0) return null

	return (
		<div className="bg-bg-card border-3 border-ink shadow-hard p-5">
			<h3 className="font-display font-black uppercase text-sm tracking-widest mb-4 flex items-center gap-2">
				<Sparkles size={16} strokeWidth={3} className="text-accent-lavender" />
				{t('explore.also_interested')}
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
							{r.why_saved || t('common.no_description')}
						</p>
						<div className="mt-1 h-0.5 w-0 group-hover:w-full bg-accent-lavender transition-all duration-300" />
					</button>
				))}
			</div>
		</div>
	)
}

function ItemHero({ item, onRerunAI, rerunning }: { item: Item; onRerunAI: () => void; rerunning: boolean }) {
	const { t } = useTranslation()
	const statusTone = useMemo(() => {
		if (item.tags.includes('team-review')) return 'bg-accent-yellow/10'
		if (item.is_favorite) return 'bg-accent-lavender/10'
		return 'bg-bg-card'
	}, [item.tags, item.is_favorite])

	return (
		<div className={`border-3 border-ink p-6 shadow-hard ${statusTone} transition-colors`}>
			<div className="flex items-start justify-between gap-4 mb-4">
				<div className="flex items-center gap-3">
					<div className="w-12 h-12 border-3 border-ink bg-white flex items-center justify-center shadow-hard-sm">
						{item.item_type === 'repo' ? <Users size={24} /> : <Brain size={24} />}
					</div>
					<div>
						<h2 className="font-display font-black uppercase text-xl leading-none">{item.title || t('common.untitled')}</h2>
						<p className="font-mono text-[10px] text-ink-soft mt-1">{item.url}</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					{item.is_favorite && (
						<div className="bg-accent-lavender border-2 border-ink p-1 shadow-hard-sm">
							<Sparkles size={14} className="fill-ink" />
						</div>
					)}
					<button
						onClick={onRerunAI}
						disabled={rerunning}
						className="border-2 border-ink p-1.5 bg-bg-card hover:bg-accent-yellow transition-all disabled:opacity-50"
						title="Rerun AI analysis"
					>
						<Sparkles size={14} className={rerunning ? 'animate-spin' : ''} />
					</button>
				</div>
			</div>
			<p className="text-sm font-medium leading-relaxed mb-4">{item.ai_summary || item.description || t('item_detail.no_summary')}</p>
			{item.url && (
				<a
					href={item.url}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-2 text-xs font-mono font-black uppercase text-accent-pink hover:underline"
				>
					<ExternalLink size={12} />
					Visit source
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
	const { t } = useTranslation()
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
						{t('item_detail.edit_button')}
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
							{saving ? t('common.loading') : t('common.save')}
						</Button>
						<Button size="sm" variant="secondary" onClick={() => setEditing(false)}>
							{t('common.cancel')}
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
	const { t } = useTranslation()
	const [tags, setTags] = useState(value)

	useEffect(() => {
		setTags(value)
	}, [value])

	if (tags.length === 0) return null

	return (
		<div className="bg-bg-elevated border-3 border-ink shadow-hard p-5">
			<div className="flex items-center gap-2 mb-4">
				<Sparkles size={18} strokeWidth={3} className="text-accent-pink" />
				<h3 className="font-display font-black uppercase text-sm tracking-widest">{t('item_detail.ai_suggestions_title')}</h3>
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
					{t('item_detail.accept_apply')}
				</Button>
				<Button size="sm" onClick={() => onSave(tags)} disabled={saving} variant="secondary">
					{t('item_detail.save_draft')}
				</Button>
			</div>
		</div>
	)
}

function buildShareSummary(item: Item, t: any): string {
	let s = `# ${item.title}\n`
	if (item.url) s += `${item.url}\n`
	if (item.why_saved) s += `\n${t('item_detail.summary_why_label')}${item.why_saved}\n`
	s += `\n${item.ai_summary || item.description || ''}\n`
	if (item.tags.length > 0) {
		const tags = item.tags.filter((t: string) => t !== 'team-review')
		if (tags.length > 0) s += `\nTags: ${tags.join(', ')}`
	}
	return s
}
