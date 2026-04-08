import type { MascotMood } from '@devdeck/api-client'

interface Props {
  mood: MascotMood
}

/**
 * Snarkel — DevDeck's axolotl mascot. Pure SVG so it's lightweight,
 * scalable, and easy to tweak. Mood changes the eyes/mouth/eyebrow.
 */
export function MascotSVG({ mood }: Props) {
  return (
    <svg
      viewBox="0 0 120 120"
      className="w-full h-full"
      aria-hidden="true"
      style={{ overflow: 'visible' }}
    >
      {/* Hard drop shadow imitation */}
      <ellipse cx="63" cy="73" rx="42" ry="38" fill="#0A0A0A" />

      {/* Body — pink blob */}
      <ellipse
        cx="60"
        cy="70"
        rx="42"
        ry="38"
        fill="#FF5C8A"
        stroke="#0A0A0A"
        strokeWidth="3"
      />

      {/* Gills (left) */}
      <path
        d="M22 58 Q10 50 12 38 Q22 42 26 54"
        fill="#FFB1CC"
        stroke="#0A0A0A"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M22 72 Q8 72 6 60 Q18 58 26 66"
        fill="#FFB1CC"
        stroke="#0A0A0A"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Gills (right) */}
      <path
        d="M98 58 Q110 50 108 38 Q98 42 94 54"
        fill="#FFB1CC"
        stroke="#0A0A0A"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M98 72 Q112 72 114 60 Q102 58 94 66"
        fill="#FFB1CC"
        stroke="#0A0A0A"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Cheeks */}
      <circle cx="38" cy="78" r="5" fill="#FFD23F" stroke="#0A0A0A" strokeWidth="2" />
      <circle cx="82" cy="78" r="5" fill="#FFD23F" stroke="#0A0A0A" strokeWidth="2" />

      {/* Eyes — mood aware */}
      {mood === 'sleeping' ? (
        <>
          <path d="M42 64 Q50 60 58 64" stroke="#0A0A0A" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M62 64 Q70 60 78 64" stroke="#0A0A0A" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      ) : mood === 'happy' || mood === 'celebrating' ? (
        <>
          <path d="M42 66 Q50 58 58 66" stroke="#0A0A0A" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M62 66 Q70 58 78 66" stroke="#0A0A0A" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="50" cy="64" r="4" fill="#0A0A0A" />
          <circle cx="70" cy="64" r="4" fill="#0A0A0A" />
          {/* Tiny shine */}
          <circle cx="51.5" cy="62.5" r="1.2" fill="#FFFFFF" />
          <circle cx="71.5" cy="62.5" r="1.2" fill="#FFFFFF" />
        </>
      )}

      {/* Judging eyebrow */}
      {mood === 'judging' && (
        <line
          x1="62"
          y1="52"
          x2="78"
          y2="58"
          stroke="#0A0A0A"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}

      {/* Mouth */}
      {mood === 'happy' || mood === 'celebrating' ? (
        <path
          d="M48 82 Q60 92 72 82"
          stroke="#0A0A0A"
          strokeWidth="3"
          fill="#0A0A0A"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : mood === 'sleeping' ? (
        <path
          d="M55 84 Q60 87 65 84"
          stroke="#0A0A0A"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      ) : mood === 'judging' ? (
        <line
          x1="50"
          y1="84"
          x2="70"
          y2="84"
          stroke="#0A0A0A"
          strokeWidth="3"
          strokeLinecap="round"
        />
      ) : (
        <line
          x1="54"
          y1="84"
          x2="66"
          y2="84"
          stroke="#0A0A0A"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}

      {/* Sleeping Z's */}
      {mood === 'sleeping' && (
        <g>
          <text x="92" y="32" fontFamily="Space Grotesk, sans-serif" fontSize="14" fontWeight="900" fill="#0A0A0A">
            z
          </text>
          <text x="100" y="22" fontFamily="Space Grotesk, sans-serif" fontSize="18" fontWeight="900" fill="#0A0A0A">
            Z
          </text>
        </g>
      )}
    </svg>
  )
}
