const MUSCLE_COLORS: Record<string, string> = {
  chest: '#e86a2e',
  back: '#3b82f6',
  shoulders: '#a855f7',
  biceps: '#ec4899',
  triceps: '#f59e0b',
  legs: '#10b981',
  core: '#06b6d4',
  cardio: '#ef4444',
  other: '#6b7280',
}

interface MusclePillProps {
  muscle: string
  small?: boolean
}

export default function MusclePill({ muscle, small = false }: MusclePillProps) {
  const color = MUSCLE_COLORS[muscle.toLowerCase()] ?? MUSCLE_COLORS.other

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium capitalize ${small ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1'}`}
      style={{
        backgroundColor: `${color}22`,
        color,
        border: `1px solid ${color}44`,
      }}
    >
      {muscle}
    </span>
  )
}
