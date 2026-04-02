'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useCommitments } from '@/hooks/useCommitments'
import { getLocalDateString } from '@/lib/date'
import { countFortnightsBetween } from '@/lib/calculations'
import type { Commitment } from '@/types'

function formatMoney(amount: number): string {
  return '$' + amount.toLocaleString('es-MX', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${d.getDate()} ${months[d.getMonth()]}`
}

interface AccountInfo {
  commitment: Commitment
  balance: number
  hasContribution: boolean
}

export default function CuentasPage() {
  const { commitments } = useCommitments()
  const todayStr = getLocalDateString()

  const accounts: AccountInfo[] = useMemo(() => {
    return commitments
      .filter((c) =>
        c.frequency === 'fortnight' &&
        (c.end_type === 'goal' || c.end_type === 'indefinite') &&
        (c.initial_balance > 0 || c.balance_start_date)
      )
      .map((c) => {
        const hasContribution = !!c.balance_start_date
        let balance = c.initial_balance || 0

        if (hasContribution && c.balance_start_date) {
          const fortnights = countFortnightsBetween(c.balance_start_date, todayStr)
          balance += c.amount * fortnights
        }

        return { commitment: c, balance, hasContribution }
      })
  }, [commitments, todayStr])

  const total = accounts.reduce((sum, a) => sum + a.balance, 0)

  return (
    <div className="min-h-screen p-4" style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="p-2 -ml-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-lg font-bold">Mis cuentas</h1>
      </div>

      {/* Total */}
      {accounts.length > 0 && (
        <div className="text-center mb-6">
          <p className="text-xs text-[var(--text-muted)] mb-1">Total en apartados</p>
          <p className="text-3xl font-bold">{formatMoney(total)}</p>
        </div>
      )}

      {accounts.length === 0 && (
        <p className="text-center text-[var(--text-muted)] text-sm py-8">
          No hay cuentas configuradas
        </p>
      )}

      {/* Account cards */}
      <div className="space-y-3">
        {accounts.map((a) => {
          const c = a.commitment
          const hasGoal = c.end_type === 'goal' && c.goal_amount && c.goal_amount > 0
          const progressPct = hasGoal ? Math.min(a.balance / c.goal_amount!, 1) : 0

          return (
            <div
              key={c.id}
              className="p-4 rounded-card bg-[var(--bg-card)]"
              style={{ border: '0.5px solid var(--pill-border)' }}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏦</span>
                  <p className="text-sm font-semibold">{c.name}</p>
                </div>
              </div>

              <p className="text-2xl font-bold mb-1.5">{formatMoney(a.balance)}</p>

              <p className="text-xs text-[var(--text-muted)]">
                {a.hasContribution && (
                  <>{'+' + formatMoney(c.amount)}/quincena</>
                )}
                {a.hasContribution && c.balance_start_date && ' · '}
                {a.hasContribution && c.balance_start_date && (
                  <>desde {formatShortDate(c.balance_start_date)}</>
                )}
                {!a.hasContribution && 'Sin aportación'}
                {hasGoal && (
                  <> · {formatMoney(c.goal_amount!)} meta</>
                )}
              </p>

              {hasGoal && (
                <div className="mt-2.5">
                  <div className="h-1.5 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-positive transition-all duration-500"
                      style={{ width: `${progressPct * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-[var(--text-muted)]">{Math.round(progressPct * 100)}%</span>
                    <span className="text-[10px] text-[var(--text-muted)]">{formatMoney(c.goal_amount!)}</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
