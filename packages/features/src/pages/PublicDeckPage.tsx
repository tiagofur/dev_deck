import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, ExternalLink, Library, Sparkles } from 'lucide-react'
import { usePublicDeck, useImportDeck, isLoggedIn } from '@devdeck/api-client'
import { Button, TagChip, hashIndex, showToast } from '@devdeck/ui'

export function PublicDeckPage() {
	const { slug } = useParams<{ slug: string }>()
	const navigate = useNavigate()
	const { data, isLoading, error } = usePublicDeck(slug || '')
	const importDeck = useImportDeck()

	const deck = data?.deck
	const items = data?.items || []

	async function handleImport() {
		if (!isLoggedIn()) {
			showToast('Iniciá sesión para importar este deck', 'error')
			navigate('/login')
			return
		}

		if (!deck) return

		try {
			const res = await importDeck.mutateAsync(deck.id)
			showToast(`¡Listo! Se importaron ${res.imported} items a tu vault.`, 'success')
			navigate('/items')
		} catch (err) {
			showToast((err as Error).message, 'error')
		}
	}

	if (isLoading) {
		return (
			<div className="min-h-screen bg-bg-primary p-8 flex items-center justify-center">
				<div className="font-mono text-sm animate-pulse">Cargando deck público…</div>
			</div>
		)
	}

	if (error || !deck) {
		return (
			<div className="min-h-screen bg-bg-primary p-8 flex flex-col items-center justify-center gap-4">
				<p className="font-display font-black text-2xl uppercase">Deck no encontrado</p>
				<Button onClick={() => navigate('/')}>Volver al inicio</Button>
			</div>
		)
	}

	return (
		<div className="min-h-screen bg-bg-primary">
			<header className="border-b-3 border-ink bg-bg-card px-6 py-4 flex items-center justify-between">
				<div className="flex items-center gap-4">
					<button
						onClick={() => navigate(-1)}
						className="border-3 border-ink p-2 bg-bg-card shadow-hard
											 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg
											 active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm
											 transition-all duration-150"
						aria-label="Volver"
					>
						<ArrowLeft size={20} strokeWidth={3} />
					</button>
					<div>
						<h1 className="font-display font-black text-2xl uppercase tracking-tight">
							{deck.title}
						</h1>
						<p className="text-[10px] font-mono text-ink-soft uppercase font-bold flex items-center gap-1.5">
							<Library size={10} /> Deck Público
						</p>
					</div>
				</div>

				<Button
					onClick={handleImport}
					disabled={importDeck.isPending}
					variant="accent"
					className="hidden sm:flex"
				>
					<span className="flex items-center gap-2">
						<Download size={18} strokeWidth={3} />
						{importDeck.isPending ? 'Importando…' : 'Importar a mi vault'}
					</span>
				</Button>
			</header>

			<main className="max-w-4xl mx-auto p-6 space-y-8">
				{deck.description && (
					<div className="bg-bg-elevated border-3 border-ink p-6 shadow-hard">
						<p className="text-lg font-medium leading-relaxed italic border-l-4 border-ink pl-4">
							"{deck.description}"
						</p>
					</div>
				)}

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{items.map((it) => (
						<div
							key={it.id}
							className="bg-bg-card border-3 border-ink p-5 shadow-hard flex flex-col justify-between"
						>
							<div>
								<div className="flex justify-between items-start mb-2">
									<h3 className="font-display font-black uppercase text-base leading-tight">
										{it.title}
									</h3>
									{it.url && (
										<a
											href={it.url}
											target="_blank"
											rel="noopener noreferrer"
											className="text-ink-soft hover:text-accent-pink"
										>
											<ExternalLink size={16} />
										</a>
									)}
								</div>
								<p className="text-sm text-ink-soft mb-4 line-clamp-2">
									{it.ai_summary || it.description || 'Sin descripción'}
								</p>
							</div>
							<div className="flex flex-wrap gap-1.5 mt-auto">
								{it.tags.slice(0, 4).map((tag) => (
									<TagChip key={tag} label={tag} colorIndex={hashIndex(tag)} />
								))}
							</div>
						</div>
					))}
				</div>

				{items.length === 0 && (
					<div className="text-center py-20 border-3 border-ink border-dashed rounded-xl">
						<p className="font-mono text-ink-soft">Este deck está vacío.</p>
					</div>
				)}

				<div className="sm:hidden fixed bottom-6 left-6 right-6">
					<Button
						onClick={handleImport}
						disabled={importDeck.isPending}
						variant="accent"
						className="w-full shadow-hard-lg"
					>
						<span className="flex items-center justify-center gap-2">
							<Download size={18} strokeWidth={3} />
							{importDeck.isPending ? 'Importando…' : 'Importar a mi vault'}
						</span>
					</Button>
				</div>
			</main>

			<footer className="max-w-4xl mx-auto p-12 text-center">
				<p className="text-[10px] font-mono text-ink-soft uppercase tracking-widest flex items-center justify-center gap-2">
					<Sparkles size={12} className="text-accent-pink" />
					Powered by DevDeck.ai
				</p>
			</footer>
		</div>
	)
}
