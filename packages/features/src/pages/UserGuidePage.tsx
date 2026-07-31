import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Boxes,
  Folder,
  Wrench,
  Share2,
  Users,
  Settings,
  Rocket,
  Plus,
  Search,
  Download,
  Globe,
  Smartphone,
  Terminal,
  Zap,
  Shield,
  Star,
  Hash,
  Link,
  ChevronRight,
  BookMarked,
  Compass,
  Activity,
  Eye,
  Key,
  Brain,
  FileText,
  Database,
  Lock,
} from 'lucide-react'
import { AppShell } from '../components/AppShell'

type SectionId =
  | 'getting-started'
  | 'vault'
  | 'capture'
  | 'search'
  | 'workbench'
  | 'cheatsheets'
  | 'runbooks'
  | 'circles'
  | 'teams'
  | 'sync'
  | 'shortcuts'
  | 'settings'

interface GuideSection {
  id: SectionId
  label: string
  icon: typeof Boxes
}

const sections: GuideSection[] = [
  { id: 'getting-started', label: 'Getting Started', icon: Rocket },
  { id: 'vault', label: 'Your Vault', icon: Boxes },
  { id: 'capture', label: 'Capturing Items', icon: Plus },
  { id: 'search', label: 'Search & Retrieve', icon: Search },
  { id: 'workbench', label: 'Developer Workbench', icon: Wrench },
  { id: 'cheatsheets', label: 'Cheat Sheets', icon: BookOpen },
  { id: 'runbooks', label: 'Runbooks', icon: BookMarked },
  { id: 'circles', label: 'Circles (Social)', icon: Share2 },
  { id: 'teams', label: 'Teams & Orgs', icon: Users },
  { id: 'sync', label: 'Sync & Offline', icon: Database },
  { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Key },
  { id: 'settings', label: 'Settings & Profile', icon: Settings },
]

export function UserGuidePage() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState<SectionId>('getting-started')

  return (
    <AppShell contentClassName="flex-1 overflow-auto">
      <main className="min-h-full overflow-x-hidden bg-bg-primary p-4 sm:p-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <header className="flex flex-col gap-3 border-b-3 border-ink pb-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 border-3 border-ink bg-accent-pink px-3 py-1 font-display text-xs font-black uppercase shadow-hard-sm text-white">
                <BookOpen size={15} strokeWidth={3} />
                User Guide
              </div>
              <h1 className="font-display text-4xl font-black uppercase tracking-tight">
                DevDeck Manual
              </h1>
              <p className="mt-2 max-w-3xl font-mono text-sm text-ink-soft">
                Everything you need to know about DevDeck — your AI-powered external memory for development.
                Capture, organize, retrieve, and reuse knowledge across all your projects.
              </p>
            </div>
          </header>

          <div className="grid min-w-0 gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="border-3 border-ink bg-bg-card p-3 shadow-hard lg:sticky lg:top-5 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto">
              <div className="flex gap-2 overflow-x-auto pb-1 lg:grid lg:overflow-visible lg:pb-0">
                {sections.map((section) => {
                  const Icon = section.icon
                  const active = activeSection === section.id
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActiveSection(section.id)}
                      className={`flex min-w-[11rem] items-start gap-3 border-2 border-ink p-3 text-left transition-all lg:min-w-0 ${
                        active
                          ? 'bg-accent-yellow shadow-hard-sm'
                          : 'bg-bg-elevated hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm'
                      }`}
                    >
                      <Icon size={18} strokeWidth={3} className="mt-0.5 shrink-0" />
                      <span>
                        <span className="block font-display text-sm font-black uppercase">
                          {section.label}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </aside>

            <section className="min-w-0 overflow-hidden border-3 border-ink bg-bg-card shadow-hard p-6 sm:p-8">
              {activeSection === 'getting-started' && <GettingStarted navigate={navigate} />}
              {activeSection === 'vault' && <VaultSection />}
              {activeSection === 'capture' && <CaptureSection />}
              {activeSection === 'search' && <SearchSection />}
              {activeSection === 'workbench' && <WorkbenchSection />}
              {activeSection === 'cheatsheets' && <CheatsheetsSection />}
              {activeSection === 'runbooks' && <RunbooksSection />}
              {activeSection === 'circles' && <CirclesSection />}
              {activeSection === 'teams' && <TeamsSection />}
              {activeSection === 'sync' && <SyncSection />}
              {activeSection === 'shortcuts' && <ShortcutsSection />}
              {activeSection === 'settings' && <SettingsSection />}
            </section>
          </div>
        </div>
      </main>
    </AppShell>
  )
}

/* ─── Reusable helpers ─── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-3xl font-black uppercase tracking-tight mb-4">{children}</h2>
}

function SectionDesc({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-sm text-ink-soft leading-relaxed mb-6">{children}</p>
}

function FeatureCard({
  icon,
  color,
  title,
  children,
}: {
  icon: React.ReactNode
  color: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="border-3 border-ink bg-bg-primary p-4 shadow-hard-sm">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 border-2 border-ink ${color} flex items-center justify-center shrink-0 shadow-hard-sm`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-black uppercase text-sm tracking-tight">{title}</h3>
          <p className="font-mono text-xs text-ink-soft mt-1 leading-relaxed">{children}</p>
        </div>
      </div>
    </div>
  )
}

function StepList({ steps }: { steps: { num: number; title: string; desc: string; kbd?: string }[] }) {
  return (
    <div className="space-y-3">
      {steps.map((step) => (
        <div key={step.num} className="flex items-start gap-4 border-2 border-ink/20 bg-bg-primary p-3">
          <div className="w-8 h-8 border-2 border-ink bg-accent-yellow flex items-center justify-center shrink-0 shadow-hard-sm font-display font-black text-sm">
            {step.num}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display font-black uppercase text-sm tracking-tight">
              {step.title}
              {step.kbd && (
                <kbd className="ml-2 border-2 border-ink bg-bg-card px-1.5 py-0.5 font-mono text-[10px] shadow-hard-sm align-middle">
                  {step.kbd}
                </kbd>
              )}
            </p>
            <p className="font-mono text-xs text-ink-soft mt-1 leading-relaxed">{step.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-l-4 border-accent-lime bg-accent-lime/10 p-4 font-mono text-sm mt-4">
      <span className="font-display font-black text-xs uppercase text-accent-lime">Tip:</span>{' '}
      {children}
    </div>
  )
}

/* ─── Section: Getting Started ─── */

function GettingStarted({ navigate }: { navigate: (path: string) => void }) {
  return (
    <>
      <SectionTitle>Welcome to DevDeck</SectionTitle>
      <SectionDesc>
        DevDeck is your AI-powered external memory for development work. Save repos, CLIs,
        snippets, cheat sheets, prompts, workflows, and anything else you want to reuse —
        then retrieve it instantly with semantic search and AI assistance.
      </SectionDesc>

      <div className="border-3 border-ink bg-accent-pink/10 p-6 mb-6">
        <h3 className="font-display font-black text-lg uppercase mb-2">The DevDeck Loop</h3>
        <p className="font-mono text-sm text-ink-soft mb-4">
          DevDeck works as a simple three-step loop:
        </p>
        <StepList
          steps={[
            { num: 1, title: 'Capture', desc: 'Save anything — URLs, repos, commands, snippets, notes. Use the + button, keyboard shortcuts, the browser extension, or the CLI.' },
            { num: 2, title: 'Retrieve', desc: 'Find it instantly with search (Ctrl+K). AI-powered semantic search understands what you mean, not just keywords.', kbd: 'Ctrl+K' },
            { num: 3, title: 'Reuse', desc: 'Copy commands, expand snippets, share with teams, run tools in the Workbench. Everything stays in your vault.' },
          ]}
        />
      </div>

      <h3 className="font-display font-black text-lg uppercase mb-3">What Can You Save?</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <FeatureCard icon={<Folder size={18} strokeWidth={3} />} color="bg-accent-lavender" title="Repos & Projects">
          GitHub repos, local projects, Git URLs — enriched with stars, language, topics.
        </FeatureCard>
        <FeatureCard icon={<Terminal size={18} strokeWidth={3} />} color="bg-accent-lime" title="CLIs & Tools">
          Command-line tools, scripts, plugins — with usage patterns and shortcuts.
        </FeatureCard>
        <FeatureCard icon={<FileText size={18} strokeWidth={3} />} color="bg-accent-cyan" title="Snippets & Notes">
          Code snippets, API requests, notes, documentation — searchable and taggable.
        </FeatureCard>
        <FeatureCard icon={<Brain size={18} strokeWidth={3} />} color="bg-accent-orange" title="Prompts & Agents">
          AI prompts, agent configs, workflow templates — ready to reuse.
        </FeatureCard>
      </div>

      <Tip>
        Press <kbd className="border-2 border-ink bg-bg-card px-1 py-0.5 font-mono text-[10px] shadow-hard-sm mx-1">?</kbd> anywhere in the app to open the keyboard shortcuts reference.
      </Tip>
    </>
  )
}

/* ─── Section: Vault ─── */

function VaultSection() {
  return (
    <>
      <SectionTitle>Your Vault</SectionTitle>
      <SectionDesc>
        The Vault is where all your saved items live. Access it from the sidebar under "Vault" —
        it shows Items, Repos, Cheat Sheets, and Runbooks.
      </SectionDesc>

      <h3 className="font-display font-black text-lg uppercase mb-3">Items View</h3>
      <p className="font-mono text-sm text-ink-soft mb-4">
        The main Items page shows everything in your vault as a filterable card grid. Each card
        shows the item type (REPO, CLI, SNIPPET, etc.), title, description, tags, and enrichment status.
      </p>

      <div className="space-y-3 mb-6">
        <FeatureCard icon={<Boxes size={18} strokeWidth={3} />} color="bg-accent-lavender" title="Filter by Type">
          Use the type tabs (ALL, REPO, CLI, SNIPPET, etc.) to narrow down what you see. The count badge shows how many items of each type you have.
        </FeatureCard>
        <FeatureCard icon={<Hash size={18} strokeWidth={3} />} color="bg-accent-cyan" title="Filter by Stack">
          Use the stack pills (go, node, python, rust, typescript, react, etc.) to find items by technology.
        </FeatureCard>
        <FeatureCard icon={<Users size={18} strokeWidth={3} />} color="bg-accent-yellow" title="Team Review">
          Filter by "team review" workflow to see items your team needs to review or approve.
        </FeatureCard>
      </div>

      <h3 className="font-display font-black text-lg uppercase mb-3">Item Details</h3>
      <p className="font-mono text-sm text-ink-soft mb-4">
        Click any card to open its detail view. Here you can see full metadata, edit tags,
        view commands, access linked cheat sheets, and more — depending on the item type.
      </p>

      <h3 className="font-display font-black text-lg uppercase mb-3">Repos View</h3>
      <p className="font-mono text-sm text-ink-soft mb-4">
        The Repos page is a legacy view showing only repository items. It includes repo-specific
        features like linked commands, cheatsheets, and GitHub enrichment data (stars, language, topics).
      </p>

      <Tip>
        Tags are your best friend. Add meaningful tags to items so you can filter and find them later. AI can also suggest tags automatically.
      </Tip>
    </>
  )
}

/* ─── Section: Capture ─── */

function CaptureSection() {
  return (
    <>
      <SectionTitle>Capturing Items</SectionTitle>
      <SectionDesc>
        DevDeck gives you multiple ways to save items — from any device, in seconds.
      </SectionDesc>

      <h3 className="font-display font-black text-lg uppercase mb-3">Capture Methods</h3>
      <div className="space-y-3 mb-6">
        <FeatureCard icon={<Plus size={18} strokeWidth={3} />} color="bg-accent-pink" title="In-App Capture (+ Button)">
          Click the pink + button in the top bar, or press Ctrl+N / Cmd+N. Paste a URL and DevDeck will auto-detect the type and enrich it.
        </FeatureCard>
        <FeatureCard icon={<Globe size={18} strokeWidth={3} />} color="bg-accent-cyan" title="Browser Extension">
          Use the DevDeck browser extension to capture the current page with one click. It pre-fills the URL and title automatically.
        </FeatureCard>
        <FeatureCard icon={<Terminal size={18} strokeWidth={3} />} color="bg-accent-lime" title="CLI">
          Use the DevDeck CLI to capture from your terminal: <code className="bg-bg-elevated px-1 border border-ink/20">devdeck capture &lt;url&gt;</code>. Perfect for scripting.
        </FeatureCard>
        <FeatureCard icon={<Smartphone size={18} strokeWidth={3} />} color="bg-accent-yellow" title="Mobile Share Target">
          On mobile (PWA or desktop), use your OS share sheet to send URLs directly to DevDeck. The app auto-opens the capture modal.
        </FeatureCard>
        <FeatureCard icon={<Link size={18} strokeWidth={3} />} color="bg-accent-orange" title="Share Link">
          Share items publicly via /deck/:slug URLs. Anyone with the link can view your public deck.
        </FeatureCard>
      </div>

      <h3 className="font-display font-black text-lg uppercase mb-3">Auto-Enrichment</h3>
      <p className="font-mono text-sm text-ink-soft mb-4">
        When you capture a URL, DevDeck automatically fetches metadata: OpenGraph data, GitHub stars,
        language, topics, README content. The AI then generates tags, a summary, and categorizes the item.
      </p>

      <h3 className="font-display font-black text-lg uppercase mb-3">Item Types</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {['REPO', 'CLI', 'PLUGIN', 'SHORTCUT', 'SNIPPET', 'AGENT', 'PROMPT', 'ARTICLE', 'TOOL', 'WORKFLOW', 'NOTE'].map((type) => (
          <div key={type} className="border-2 border-ink bg-bg-elevated px-3 py-2 font-mono text-xs font-bold uppercase text-center">
            {type}
          </div>
        ))}
      </div>

      <Tip>
        Capture items early and often. The AI enrichment gets better with more context. Add a "why I saved this" note for even better retrieval later.
      </Tip>
    </>
  )
}

/* ─── Section: Search ─── */

function SearchSection() {
  return (
    <>
      <SectionTitle>Search & Retrieve</SectionTitle>
      <SectionDesc>
        DevDeck offers powerful search to find anything in your vault instantly.
      </SectionDesc>

      <div className="space-y-3 mb-6">
        <FeatureCard icon={<Search size={18} strokeWidth={3} />} color="bg-accent-cyan" title="Global Search (Ctrl+K)">
          Press Ctrl+K (or Cmd+K) to open the unified command palette. Search across all items, navigate to pages, or trigger actions — all from one place.
        </FeatureCard>
        <FeatureCard icon={<Brain size={18} strokeWidth={3} />} color="bg-accent-orange" title="Semantic Search">
          DevDeck uses AI embeddings (1536-dim pgvector) to understand meaning, not just keywords. Search "how to deploy a Go API" and find your deployment runbook.
        </FeatureCard>
        <FeatureCard icon={<Zap size={18} strokeWidth={3} />} color="bg-accent-yellow" title="Text Search">
          Full-text ILIKE search on titles, descriptions, tags, and notes. Fast and exact.
        </FeatureCard>
        <FeatureCard icon={<Eye size={18} strokeWidth={3} />} color="bg-accent-lime" title="Hybrid Search">
          The Explore page combines text and semantic search for the best results. Great for discovery.
        </FeatureCard>
      </div>

      <h3 className="font-display font-black text-lg uppercase mb-3">Ask AI</h3>
      <p className="font-mono text-sm text-ink-soft mb-4">
        Use the AI agent to ask natural language questions about your vault. "What CLI tools do I
        have for JSON processing?" or "Show me my Docker runbooks." The agent searches your vault
        and provides contextual answers.
      </p>

      <Tip>
        Add "why_saved" and "when_to_use" notes to your items — the AI uses these to provide better answers.
      </Tip>
    </>
  )
}

/* ─── Section: Workbench ─── */

function WorkbenchSection() {
  return (
    <>
      <SectionTitle>Developer Workbench</SectionTitle>
      <SectionDesc>
        The Workbench is a collection of offline developer utilities that run entirely in your
        browser. No data leaves your device unless you choose to save an output.
      </SectionDesc>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <FeatureCard icon={<Zap size={18} strokeWidth={3} />} color="bg-accent-yellow" title="JSON Formatter">
          Format, minify, and validate JSON payloads. Paste raw JSON and get pretty-printed output.
        </FeatureCard>
        <FeatureCard icon={<Key size={18} strokeWidth={3} />} color="bg-accent-pink" title="JWT Decoder">
          Decode JWT tokens — view header, payload, and expiration. No signature verification (read-only).
        </FeatureCard>
        <FeatureCard icon={<Link size={18} strokeWidth={3} />} color="bg-accent-cyan" title="Base64 / URL Encoder">
          Encode or decode Base64 strings and URL components. Useful for API debugging.
        </FeatureCard>
        <FeatureCard icon={<Hash size={18} strokeWidth={3} />} color="bg-accent-lime" title="UUID Generator">
          Generate UUID v4 values for IDs, tokens, and unique identifiers.
        </FeatureCard>
        <FeatureCard icon={<Zap size={18} strokeWidth={3} />} color="bg-accent-orange" title="Timestamp Converter">
          Convert between UNIX timestamps and human-readable dates.
        </FeatureCard>
        <FeatureCard icon={<Shield size={18} strokeWidth={3} />} color="bg-bg-elevated" title="Hash Generator">
          Generate SHA-256, SHA-512, and MD5 hashes from text input.
        </FeatureCard>
        <FeatureCard icon={<Search size={18} strokeWidth={3} />} color="bg-accent-lavender" title="Regex Tester">
          Test regular expressions against sample text with real-time matching.
        </FeatureCard>
        <FeatureCard icon={<Shield size={18} strokeWidth={3} />} color="bg-accent-pink" title="Secret Scanner">
          Scan text for accidentally exposed API keys, tokens, and secrets.
        </FeatureCard>
        <FeatureCard icon={<Globe size={18} strokeWidth={3} />} color="bg-accent-cyan" title="API Tester">
          Send HTTP requests (GET, POST, etc.) directly from the Workbench. Save request configs to your vault.
        </FeatureCard>
        <FeatureCard icon={<Folder size={18} strokeWidth={3} />} color="bg-accent-yellow" title="Project Context">
          Surface context for a repo — commands, notes, and related items.
        </FeatureCard>
        <FeatureCard icon={<FileText size={18} strokeWidth={3} />} color="bg-accent-lime" title="Snippet Expander">
          Preview and expand snippet aliases. Great for code templates.
        </FeatureCard>
      </div>

      <Tip>
        Save Workbench outputs directly to your vault. API requests become reusable items, and generated values get tagged automatically.
      </Tip>
    </>
  )
}

/* ─── Section: Cheat Sheets ─── */

function CheatsheetsSection() {
  return (
    <>
      <SectionTitle>Cheat Sheets</SectionTitle>
      <SectionDesc>
        Cheat sheets are structured reference cards with entries (commands, shortcuts, patterns).
        Create, fork, and share them with your team.
      </SectionDesc>

      <div className="space-y-3 mb-6">
        <FeatureCard icon={<BookOpen size={18} strokeWidth={3} />} color="bg-accent-orange" title="Create Cheat Sheets">
          Create new cheat sheets with a title, description, icon, and color. Each cheat sheet contains ordered entries with labels, commands, descriptions, and tags.
        </FeatureCard>
        <FeatureCard icon={<Star size={18} strokeWidth={3} />} color="bg-accent-yellow" title="Fork & Customize">
          Fork official cheat sheets to create your own version. Customize entries for your workflow.
        </FeatureCard>
        <FeatureCard icon={<Share2 size={18} strokeWidth={3} />} color="bg-accent-pink" title="Share & Export">
          Share cheat sheets via public URLs or export as JSON/Markdown. Perfect for team onboarding.
        </FeatureCard>
        <FeatureCard icon={<Eye size={18} strokeWidth={3} />} color="bg-accent-cyan" title="Explore">
          Browse official and community cheat sheets. Find references for tools you're learning.
        </FeatureCard>
      </div>

      <Tip>
        Tag your cheat sheet entries with technologies (docker, k8s, git, etc.) so they appear in the sidebar filter on the cheat sheets list page.
      </Tip>
    </>
  )
}

/* ─── Section: Runbooks ─── */

function RunbooksSection() {
  return (
    <>
      <SectionTitle>Runbooks</SectionTitle>
      <SectionDesc>
        Runbooks are step-by-step procedures saved as items. Perfect for deployment guides,
        incident response, setup procedures, and repeatable workflows.
      </SectionDesc>

      <div className="space-y-3 mb-6">
        <FeatureCard icon={<BookMarked size={18} strokeWidth={3} />} color="bg-accent-lavender" title="Create Runbooks">
          Save multi-step procedures as items with type "workflow". Add detailed notes explaining each step.
        </FeatureCard>
        <FeatureCard icon={<Link size={18} strokeWidth={3} />} color="bg-accent-cyan" title="Link to Items">
          Runbooks can reference repos, CLIs, and other items in your vault for context.
        </FeatureCard>
        <FeatureCard icon={<Share2 size={18} strokeWidth={3} />} color="bg-accent-pink" title="Team Sharing">
          Share runbooks with your team via Circles. Everyone stays on the same page during incidents.
        </FeatureCard>
      </div>

      <Tip>
        Tag runbooks with "team-review" to queue them for team approval before they go live.
      </Tip>
    </>
  )
}

/* ─── Section: Circles ─── */

function CirclesSection() {
  return (
    <>
      <SectionTitle>Circles (Social)</SectionTitle>
      <SectionDesc>
        Circles are interest-based groups where developers share items, discuss tools,
        and collaborate on curated collections.
      </SectionDesc>

      <div className="space-y-3 mb-6">
        <FeatureCard icon={<Share2 size={18} strokeWidth={3} />} color="bg-accent-pink" title="Create Circles">
          Create public or private circles around topics: "Go DevOps", "React ecosystem", "AI tools", etc.
        </FeatureCard>
        <FeatureCard icon={<Users size={18} strokeWidth={3} />} color="bg-accent-yellow" title="Join via Invite">
          Join circles through invite links (/circles/join/:code). Admins approve new members.
        </FeatureCard>
        <FeatureCard icon={<Star size={18} strokeWidth={3} />} color="bg-accent-lime" title="Share Items">
          Share items from your vault to circles with context explaining why they're useful.
        </FeatureCard>
        <FeatureCard icon={<Compass size={18} strokeWidth={3} />} color="bg-accent-cyan" title="Discover">
          Browse trending items and popular circles. Find new tools and workflows from the community.
        </FeatureCard>
      </div>

      <h3 className="font-display font-black text-lg uppercase mb-3">How Circles Work</h3>
      <StepList
        steps={[
          { num: 1, title: 'Create a Circle', desc: 'Choose a name, description, and visibility (public/private). You become the admin.' },
          { num: 2, title: 'Invite Members', desc: 'Generate an invite link and share it. Members request to join; admins approve.' },
          { num: 3, title: 'Share Items', desc: 'Share items from your vault with context. The circle feed shows all shared items.' },
          { num: 4, title: 'Collaborate', desc: 'Discuss items, curate collections, and build shared knowledge together.' },
        ]}
      />

      <Tip>
        Circles are great for team onboarding. Create a circle for new hires and share your best cheat sheets, runbooks, and tool recommendations.
      </Tip>
    </>
  )
}

/* ─── Section: Teams ─── */

function TeamsSection() {
  return (
    <>
      <SectionTitle>Teams & Organizations</SectionTitle>
      <SectionDesc>
        DevDeck supports multi-tenant organizations with team features, shared vaults,
        and role-based access control.
      </SectionDesc>

      <div className="space-y-3 mb-6">
        <FeatureCard icon={<Users size={18} strokeWidth={3} />} color="bg-accent-yellow" title="Organizations">
          Create or join an organization. Org members share a common workspace with team feeds and reviews.
        </FeatureCard>
        <FeatureCard icon={<Activity size={18} strokeWidth={3} />} color="bg-accent-lime" title="Team Feed">
          See what your team is capturing, updating, and sharing in real-time. Stay in sync.
        </FeatureCard>
        <FeatureCard icon={<Eye size={18} strokeWidth={3} />} color="bg-accent-cyan" title="Team Review">
          Queue items for team review. Team members approve or suggest changes before items go live.
        </FeatureCard>
        <FeatureCard icon={<Shield size={18} strokeWidth={3} />} color="bg-accent-pink" title="Roles & Permissions">
          Admins manage members and settings. Members capture, share, and review. Read-only viewers can browse without editing.
        </FeatureCard>
      </div>

      <h3 className="font-display font-black text-lg uppercase mb-3">Team Features</h3>
      <div className="space-y-2 mb-6">
        <div className="flex items-center gap-3 border-2 border-ink/20 bg-bg-primary p-3">
          <Lock size={16} strokeWidth={3} className="shrink-0" />
          <div>
            <p className="font-display font-bold text-sm">SCIM Provisioning</p>
            <p className="font-mono text-xs text-ink-soft">Enterprise SSO with automatic user provisioning via SCIM.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 border-2 border-ink/20 bg-bg-primary p-3">
          <Key size={16} strokeWidth={3} className="shrink-0" />
          <div>
            <p className="font-display font-bold text-sm">API Keys</p>
            <p className="font-mono text-xs text-ink-soft">Generate API keys for programmatic access. Use with CLI and integrations.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 border-2 border-ink/20 bg-bg-primary p-3">
          <Database size={16} strokeWidth={3} className="shrink-0" />
          <div>
            <p className="font-display font-bold text-sm">Custom Enrichers</p>
            <p className="font-mono text-xs text-ink-soft">Add custom metadata enrichers for your organization's specific needs.</p>
          </div>
        </div>
      </div>

      <Tip>
        Use the workspace switcher in the top bar to switch between personal and organization contexts. Your vault items are scoped to the active workspace.
      </Tip>
    </>
  )
}

/* ─── Section: Sync ─── */

function SyncSection() {
  return (
    <>
      <SectionTitle>Sync & Offline</SectionTitle>
      <SectionDesc>
        DevDeck works offline with local-first storage. Your data syncs automatically when
        you're back online.
      </SectionDesc>

      <div className="space-y-3 mb-6">
        <FeatureCard icon={<Database size={18} strokeWidth={3} />} color="bg-accent-cyan" title="Local-First">
          All data is stored locally first (IndexedDB on web, SQLite on desktop). You can browse and search your vault offline.
        </FeatureCard>
        <FeatureCard icon={<Zap size={18} strokeWidth={3} />} color="bg-accent-yellow" title="Auto-Sync">
          When online, changes sync automatically via batch and delta sync. Conflict resolution uses CRDT-like strategies.
        </FeatureCard>
        <FeatureCard icon={<Smartphone size={18} strokeWidth={3} />} color="bg-accent-lime" title="Multi-Device">
          Your vault stays in sync across web, desktop, and mobile. Start on your laptop, continue on your phone.
        </FeatureCard>
        <FeatureCard icon={<Shield size={18} strokeWidth={3} />} color="bg-accent-pink" title="Conflict Resolution">
          If the same item is edited on two devices, DevDeck merges changes intelligently. Manual resolution for complex conflicts.
        </FeatureCard>
      </div>

      <Tip>
        The sync status indicator in the top bar shows your connection status. Green = synced, yellow = syncing, red = offline.
      </Tip>
    </>
  )
}

/* ─── Section: Shortcuts ─── */

function ShortcutsSection() {
  const shortcuts = [
    { keys: ['Ctrl', 'K'], desc: 'Open global search / command palette' },
    { keys: ['Ctrl', 'N'], desc: 'Open capture modal' },
    { keys: ['?'], desc: 'Show keyboard shortcuts reference' },
    { keys: ['/'], desc: 'Focus search bar (on Items page)' },
    { keys: ['Esc'], desc: 'Close modal / dropdown' },
    { keys: ['D'], desc: 'Navigate to Discovery page' },
  ]

  return (
    <>
      <SectionTitle>Keyboard Shortcuts</SectionTitle>
      <SectionDesc>
        DevDeck is keyboard-first. These shortcuts work everywhere in the app.
      </SectionDesc>

      <div className="space-y-2 mb-6">
        {shortcuts.map((shortcut) => (
          <div key={shortcut.desc} className="flex items-center justify-between border-2 border-ink/20 bg-bg-primary p-3">
            <p className="font-mono text-sm">{shortcut.desc}</p>
            <div className="flex gap-1">
              {shortcut.keys.map((key) => (
                <kbd
                  key={key}
                  className="border-2 border-ink bg-bg-card px-2 py-1 font-mono text-xs font-bold shadow-hard-sm"
                >
                  {key}
                </kbd>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Tip>
        Press ? at any time to open the full shortcuts reference modal with all available shortcuts.
      </Tip>
    </>
  )
}

/* ─── Section: Settings ─── */

function SettingsSection() {
  return (
    <>
      <SectionTitle>Settings & Profile</SectionTitle>
      <SectionDesc>
        Manage your account, preferences, and workspace settings.
      </SectionDesc>

      <div className="space-y-3 mb-6">
        <FeatureCard icon={<Settings size={18} strokeWidth={3} />} color="bg-bg-elevated" title="Profile">
          Edit your display name, bio, avatar, and social links. Your public profile is visible at /u/:username.
        </FeatureCard>
        <FeatureCard icon={<Globe size={18} strokeWidth={3} />} color="bg-accent-cyan" title="Public Deck">
          Your public deck (/deck/:slug) showcases your saved items to the world. Choose what to share.
        </FeatureCard>
        <FeatureCard icon={<Shield size={18} strokeWidth={3} />} color="bg-accent-pink" title="Authentication">
          DevDeck supports multiple auth methods: email/password, GitHub OAuth, and SAML SSO for enterprise.
        </FeatureCard>
        <FeatureCard icon={<Database size={18} strokeWidth={3} />} color="bg-accent-lime" title="Data Management">
          Export your vault as JSON or Markdown. Import from GitHub stars. Full data portability.
        </FeatureCard>
      </div>

      <Tip>
        Set up GitHub OAuth in settings for one-click login. It's the fastest way to get started.
      </Tip>
    </>
  )
}
