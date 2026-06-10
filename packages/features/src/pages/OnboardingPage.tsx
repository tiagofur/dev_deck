import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Rocket, Box, Check, ArrowRight, Loader2, Plus, Search, Wrench } from 'lucide-react'
import { Button, showToast } from '@devdeck/ui'
import { 
  useOnboardingKits, 
  useInstallStarterKit, 
  useCompleteOnboarding,
  useMe
} from '@devdeck/api-client'
import { useTranslation } from '@devdeck/i18n'

export function OnboardingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: user } = useMe()
  const { data: kitsRes, isLoading: loadingKits } = useOnboardingKits()
  const installKit = useInstallStarterKit()
  const completeOnboarding = useCompleteOnboarding()
  
  const [step, setStep] = useState(1)
  const [selectedKit, setSelectedKit] = useState<string | null>(null)
  const [installing, setInstalling] = useState(false)

  const kits = kitsRes?.kits || []

  async function handleFinish() {
    setInstalling(true)
    try {
      if (selectedKit) {
        await installKit.mutateAsync(selectedKit)
      }
      await completeOnboarding.mutateAsync()
      showToast(t('onboarding.finish_toast'))
      navigate('/items')
    } catch (err) {
      showToast((err as Error).message, 'error')
    } finally {
      setInstalling(false)
    }
  }

  if (loadingKits) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <Loader2 className="animate-spin text-ink-soft" size={32} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-bg-card border-4 border-ink shadow-hard p-10 relative overflow-hidden">
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-bg-primary">
            <motion.div 
              className="h-full bg-accent-pink border-r-4 border-ink"
              initial={{ width: '0%' }}
              animate={{ width: `${(step / 3) * 100}%` }}
            />
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-8 py-4"
            >
              <div className="space-y-4">
                <div className="w-16 h-16 bg-accent-yellow border-3 border-ink flex items-center justify-center shadow-hard-sm">
                   <Rocket size={32} strokeWidth={3} />
                </div>
                <h1 className="font-display font-black text-4xl uppercase tracking-tighter">
                  {t('onboarding.welcome_title', { name: user?.display_name || 'Developer' })}
                </h1>
                <p className="text-xl font-mono leading-relaxed">
                  {t('onboarding.welcome_desc')}
                </p>
              </div>

              <Button size="lg" onClick={() => setStep(2)} className="w-full sm:w-auto">
                 {t('onboarding.start_button')} <ArrowRight size={20} strokeWidth={3} className="ml-2" />
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-8 py-4"
            >
              <div className="space-y-2">
                <h2 className="font-display font-black text-2xl uppercase tracking-tight">{t('onboarding.choose_pack_title')}</h2>
                <p className="font-mono text-sm text-ink-soft">
                  {t('onboarding.choose_pack_desc')}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 {kits.map(k => (
                   <button
                    key={k.id}
                    onClick={() => setSelectedKit(selectedKit === k.id ? null : k.id)}
                    className={`text-left p-4 border-3 transition-all duration-200 group relative
                      ${selectedKit === k.id ? 'bg-accent-lavender border-ink shadow-hard-sm' : 'bg-bg-primary border-ink/20 hover:border-ink hover:bg-bg-elevated shadow-none'}
                    `}
                   >
                     <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 border-2 border-ink bg-white p-1.5 shadow-hard-sm">
                           <img src={k.icon} alt={k.name} className="w-full h-full object-contain" />
                        </div>
                        {selectedKit === k.id && <Check size={20} strokeWidth={4} className="text-ink" />}
                     </div>
                     <h4 className="font-display font-black text-xs uppercase mb-1">{k.name}</h4>
                     <p className="text-[10px] font-mono text-ink-soft leading-tight">{k.description}</p>
                   </button>
                 ))}
                 
                 <button
                    onClick={() => setSelectedKit(null)}
                    className={`text-left p-4 border-3 transition-all duration-200
                      ${selectedKit === null ? 'bg-bg-card border-ink shadow-hard-sm' : 'bg-bg-primary border-ink/20 hover:border-ink shadow-none'}
                    `}
                   >
                     <div className="w-10 h-10 border-2 border-ink bg-white flex items-center justify-center mb-3 shadow-hard-sm">
                        <Box size={20} />
                     </div>
                     <h4 className="font-display font-black text-xs uppercase mb-1">{t('onboarding.empty_vault_title')}</h4>
                     <p className="text-[10px] font-mono text-ink-soft leading-tight">{t('onboarding.empty_vault_desc')}</p>
                 </button>
              </div>

              <div className="flex gap-4">
                 <Button variant="secondary" onClick={() => setStep(1)}>{t('onboarding.back_button')}</Button>
                 <Button onClick={() => setStep(3)} className="flex-1">{t('onboarding.continue_button')}</Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-8 py-4"
            >
              <div className="space-y-2">
                <h2 className="font-display font-black text-3xl uppercase tracking-tighter">{t('onboarding.loop_title')}</h2>
                <p className="font-mono text-sm text-ink-soft">{t('onboarding.loop_subtitle')}</p>
              </div>

              <div className="space-y-4">
                <LoopStep
                  number={1}
                  icon={<Plus size={20} strokeWidth={3} />}
                  color="bg-accent-yellow"
                  title={t('onboarding.loop_capture')}
                  desc={t('onboarding.loop_capture_desc')}
                />
                <LoopStep
                  number={2}
                  icon={<Search size={20} strokeWidth={3} />}
                  color="bg-accent-cyan"
                  title={t('onboarding.loop_retrieve')}
                  desc={t('onboarding.loop_retrieve_desc')}
                  kbd="Ctrl+K"
                />
                <LoopStep
                  number={3}
                  icon={<Wrench size={20} strokeWidth={3} />}
                  color="bg-accent-lime"
                  title={t('onboarding.loop_reuse')}
                  desc={t('onboarding.loop_reuse_desc')}
                />
              </div>

              {selectedKit === 'devdeck-demo' && (
                <p className="border-3 border-ink bg-accent-lavender/40 p-4 font-mono text-sm">
                  {t('onboarding.loop_demo_hint')}
                </p>
              )}

              <div className="flex gap-4">
                 <Button variant="secondary" onClick={() => setStep(2)}>{t('onboarding.back_button')}</Button>
                 <Button
                    onClick={handleFinish}
                    className="flex-1 bg-accent-pink"
                    disabled={installing}
                 >
                    {installing ? <Loader2 className="animate-spin" /> : t('onboarding.enter_button')}
                 </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function LoopStep({
  number,
  icon,
  color,
  title,
  desc,
  kbd,
}: {
  number: number
  icon: React.ReactNode
  color: string
  title: string
  desc: string
  kbd?: string
}) {
  return (
    <div className="flex items-start gap-4 border-3 border-ink bg-bg-primary p-4 shadow-hard-sm">
      <div className={`w-10 h-10 border-2 border-ink ${color} flex items-center justify-center shrink-0 shadow-hard-sm`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display font-black uppercase text-sm tracking-tight">
          {number}. {title}
          {kbd && (
            <kbd className="ml-2 border-2 border-ink bg-bg-card px-1.5 py-0.5 font-mono text-[10px] shadow-hard-sm align-middle">
              {kbd}
            </kbd>
          )}
        </p>
        <p className="font-mono text-xs text-ink-soft mt-1 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}
