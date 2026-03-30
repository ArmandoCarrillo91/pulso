'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ALL_CATEGORIES } from '@/lib/categories'
import { useTransactions } from '@/hooks/useTransactions'
import { usePlans } from '@/hooks/usePlans'
import { usePayday } from '@/hooks/usePayday'
import TransactionModal from '@/components/modals/TransactionModal'
import Button from '@/components/ui/Button'
import Chip from '@/components/ui/Chip'
import ProgressBar from '@/components/ui/ProgressBar'

function formatMoney(amount: number): string {
  const abs = Math.abs(amount)
  const formatted = abs.toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return amount < 0 ? `−$${formatted}` : `$${formatted}`
}

export default function HomePage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [userName, setUserName] = useState('')

  const {
    transactions,
    loading,
    currentBalance,
    createTransaction,
    daysSinceLastIncome,
  } = useTransactions()
  const { plans, totalSavingsPerFortnight } = usePlans()
  const { daysRemaining, progress, currentFortnight } = usePayday()

  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserName(
          user.user_metadata?.first_name || user.email?.split('@')[0] || ''
        )
      }
    })
  }, [supabase])

  const dailyBudget =
    daysRemaining > 0
      ? (currentBalance - totalSavingsPerFortnight) / daysRemaining
      : 0

  const today = new Date()
  const dateStr = today.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-[var(--text-secondary)]">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen p-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-lg font-bold capitalize">{userName}</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--text-secondary)] capitalize">
            {dateStr}
          </span>
          <Link href="/settings" className="p-2 -mr-2">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Hero: Daily Budget */}
      <div className="text-center mb-6">
        <p className="text-sm text-[var(--text-secondary)] mb-2">
          Disponible por día
        </p>
        <p
          className={`text-5xl font-bold ${
            dailyBudget >= 0 ? 'text-positive' : 'text-negative'
          }`}
        >
          {formatMoney(dailyBudget)}
        </p>
      </div>

      {/* Chips */}
      <div className="flex justify-center gap-3 mb-6">
        <Chip label="Días restantes" value={`${daysRemaining}`} />
        <Chip label="Balance" value={formatMoney(currentBalance)} />
        <Chip label="Ahorro" value={formatMoney(totalSavingsPerFortnight)} />
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <ProgressBar progress={progress} colorMode="dynamic" />
        <p className="text-xs text-[var(--text-muted)] text-center mt-1">
          Quincena {currentFortnight}
        </p>
      </div>

      {/* Register Button */}
      <Button fullWidth onClick={() => setModalOpen(true)}>
        Registrar movimiento
      </Button>

      {/* Transaction History */}
      <div className="mt-6 flex-1">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">
          Historial
        </h2>
        <div className="h-[200px] overflow-y-auto space-y-2">
          {transactions.length === 0 && (
            <p className="text-center text-[var(--text-muted)] text-sm py-8">
              No hay movimientos aún
            </p>
          )}
          {transactions.map((t, i) => {
            const opacity = Math.max(1 - i * 0.12, 0.3)
            const cat = ALL_CATEGORIES.find((c) => c.id === t.category_id)
            return (
              <div
                key={t.id}
                className="flex items-center justify-between p-3 rounded-btn bg-[var(--bg-secondary)]"
                style={{ opacity }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{cat?.emoji || '📄'}</span>
                  <div>
                    <p className="text-sm font-medium">{t.category_label}</p>
                    {t.note && (
                      <p className="text-xs text-[var(--text-muted)] truncate max-w-[160px]">
                        {t.note}
                      </p>
                    )}
                  </div>
                </div>
                <span
                  className={`font-semibold text-sm ${
                    t.type === 'income' ? 'text-positive' : 'text-negative'
                  }`}
                >
                  {t.type === 'income' ? '+' : '−'}$
                  {t.amount.toLocaleString('es-MX', {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={createTransaction}
        plans={plans}
        currentBalance={currentBalance}
        daysSinceLastIncome={daysSinceLastIncome}
        daysUntilNextPayday={daysRemaining}
        currentFortnight={currentFortnight}
      />
    </div>
  )
}
