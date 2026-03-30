'use client'

function Pulse({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-btn bg-[var(--bg-secondary)] animate-pulse ${className ?? ''}`}
    />
  )
}

export function HeroSkeleton() {
  return (
    <div className="text-center mb-8">
      <Pulse className="h-4 w-28 mx-auto mb-3" />
      <Pulse className="h-12 w-40 mx-auto mb-5" />
      <Pulse className="h-3 w-24 mx-auto mb-2" />
      <Pulse className="h-4 w-44 mx-auto" />
    </div>
  )
}

export function BurnBarSkeleton() {
  return (
    <div className="mb-6">
      <Pulse className="h-1.5 w-full rounded-full" />
      <div className="flex justify-between mt-1.5">
        <Pulse className="h-3 w-24" />
        <Pulse className="h-3 w-24" />
      </div>
    </div>
  )
}

export function TransactionRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-btn bg-[var(--bg-secondary)]">
      <Pulse className="w-2 h-2 rounded-full shrink-0" />
      <div className="flex-1 min-w-0">
        <Pulse className="h-4 w-24 mb-1" />
        <Pulse className="h-3 w-16" />
      </div>
      <Pulse className="h-4 w-16 shrink-0" />
    </div>
  )
}

export function TransactionListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="mt-6">
      <Pulse className="h-4 w-24 mb-4" />
      <div className="space-y-1.5">
        {Array.from({ length: count }).map((_, i) => (
          <TransactionRowSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

export function PlanCardSkeleton() {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-2">
        <Pulse className="w-7 h-7 rounded-full" />
        <Pulse className="h-4 w-32 flex-1" />
        <Pulse className="h-4 w-12 rounded-full" />
      </div>
      <Pulse className="h-3 w-40 mb-2" />
      <Pulse className="h-2 w-full rounded-full mb-1.5" />
      <Pulse className="h-3 w-48" />
    </div>
  )
}

export function PlanListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <PlanCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function SettingsRowSkeleton() {
  return (
    <div
      className="flex items-center gap-3 p-4 rounded-card bg-[var(--bg-card)]"
      style={{ border: '0.5px solid var(--pill-border)' }}
    >
      <Pulse className="w-7 h-7 rounded-full" />
      <div className="flex-1">
        <Pulse className="h-4 w-24 mb-1" />
        <Pulse className="h-3 w-16" />
      </div>
    </div>
  )
}
