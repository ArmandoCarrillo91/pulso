interface ChipProps {
  label: string
  value: string
  className?: string
}

export default function Chip({ label, value, className = '' }: ChipProps) {
  return (
    <div className={`chip text-center ${className}`}>
      <span className="block text-[10px] uppercase tracking-wider opacity-70">
        {label}
      </span>
      <span className="block text-sm font-bold mt-0.5">{value}</span>
    </div>
  )
}
