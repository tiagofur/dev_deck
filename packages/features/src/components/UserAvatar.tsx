import { useEffect, useMemo, useState } from 'react'
import { User } from 'lucide-react'

interface UserAvatarProps {
  src?: string | null
  alt: string
  className?: string
  imageClassName?: string
  fallbackClassName?: string
  iconSize?: number
}

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

export function getAvatarImageCandidates(src?: string | null, origin = globalThis.location?.origin): string[] {
  if (!src) return []

  const candidates = [src]
  if (!src.startsWith('/uploads/') || !origin) return candidates

  try {
    const originUrl = new URL(origin)
    if (!originUrl.hostname.startsWith('api.') && !isLocalHost(originUrl.hostname)) {
      candidates.push(`${originUrl.protocol}//api.${originUrl.host}${src}`)
    }
  } catch {
    // Keep the original URL candidate when the runtime origin is not parseable.
  }

  return [...new Set(candidates)]
}

export function UserAvatar({
  src,
  alt,
  className = 'h-full w-full',
  imageClassName = 'h-full w-full object-cover',
  fallbackClassName = 'h-full w-full flex items-center justify-center bg-bg-elevated text-ink-soft',
  iconSize = 18,
}: UserAvatarProps) {
  const candidates = useMemo(() => getAvatarImageCandidates(src), [src])
  const [candidateIndex, setCandidateIndex] = useState(0)

  useEffect(() => {
    setCandidateIndex(0)
  }, [src])

  const activeSrc = candidates[candidateIndex]

  if (activeSrc) {
    return (
      <img
        src={activeSrc}
        alt={alt}
        className={imageClassName}
        onError={() => setCandidateIndex((current) => current + 1)}
      />
    )
  }

  return (
    <div role="img" aria-label={alt} className={`${className} ${fallbackClassName}`}>
      <User size={iconSize} strokeWidth={3} aria-hidden="true" />
    </div>
  )
}
