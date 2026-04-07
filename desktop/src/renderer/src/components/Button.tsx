import { ButtonHTMLAttributes, forwardRef } from 'react'
import clsx from 'clsx'

type Variant = 'primary' | 'secondary' | 'accent' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variantClasses: Record<Variant, string> = {
  primary:   'bg-accent-pink text-ink',
  secondary: 'bg-bg-card text-ink',
  accent:    'bg-accent-yellow text-ink',
  danger:    'bg-danger text-white',
  ghost:     'bg-transparent text-ink',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-3 text-sm',
  lg: 'px-7 py-4 text-base',
}

/**
 * Brutalist button. Hard shadow that lifts on hover and "pushes in" on
 * active. The 3px black border is mandatory by the design system.
 */
export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={clsx(
        'border-3 border-ink shadow-hard font-display font-bold uppercase tracking-wide',
        'transition-all duration-150 ease-out',
        'hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg',
        'active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm',
        'disabled:opacity-50 disabled:pointer-events-none',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
})
