interface ProgressBarProps {
  progress: number
  colorMode?: 'static' | 'dynamic'
  className?: string
}

export default function ProgressBar({
  progress,
  colorMode = 'static',
  className = '',
}: ProgressBarProps) {
  const clamped = Math.min(Math.max(progress, 0), 1)

  let barColor = 'bg-positive'
  if (colorMode === 'dynamic') {
    if (clamped > 0.75) barColor = 'bg-red-500'
    else if (clamped > 0.5) barColor = 'bg-amber-500'
  }

  return (
    <div
      className={`h-2 rounded-full bg-[var(--bg-secondary)] overflow-hidden ${className}`}
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
        style={{ width: `${clamped * 100}%` }}
      />
    </div>
  )
}
