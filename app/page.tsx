'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { getCategoryEmoji } from '@/lib/categories'
import { useTransactions } from '@/hooks/useTransactions'
import { usePlans } from '@/hooks/usePlans'
import { usePayday } from '@/hooks/usePayday'
import TransactionModal from '@/components/modals/TransactionModal'
import EditTransactionModal from '@/components/modals/EditTransactionModal'
import type { Transaction } from '@/types'
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

function formatTransactionDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  const today = new Date()
  if (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  ) {
    return today.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}`
}

export default function HomePage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [userName, setUserName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const {
    transactions,
    loading,
    currentBalance,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    daysSinceLastIncome,
  } = useTransactions()
  const { plans, totalSavingsPerFortnight } = usePlans()
  const { daysRemaining, progress, currentFortnight } = usePayday()

  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserName(user.user_metadata?.full_name || '')
      }
    })
  }, [supabase])

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus()
    }
  }, [editingName])

  const startEditing = () => {
    setNameInput(userName)
    setEditingName(true)
  }

  const saveName = async () => {
    const trimmed = nameInput.trim()
    setEditingName(false)
    if (trimmed === userName) return

    setUserName(trimmed)
    await supabase.auth.updateUser({
      data: { full_name: trimmed },
    })
  }

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveName()
    if (e.key === 'Escape') setEditingName(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

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
    <div className="flex flex-col min-h-screen p-4 pb-24">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-8">
        {editingName ? (
          <input
            ref={nameInputRef}
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={saveName}
            onKeyDown={handleNameKeyDown}
            placeholder="Tu nombre"
            className="text-lg font-bold bg-transparent outline-none border-b-2 border-positive w-40"
          />
        ) : (
          <button
            onClick={startEditing}
            className="text-lg font-bold text-left"
          >
            {userName || (
              <span className="text-[var(--text-muted)]">Tu nombre</span>
            )}
          </button>
        )}
        <span className="text-sm text-[var(--text-secondary)] capitalize">
          {dateStr}
        </span>
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

      {/* Chip */}
      <div className="flex justify-center mb-6">
        <Chip label="Días restantes" value={`${daysRemaining}`} />
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
          Movimientos
        </h2>
        <div className="h-[200px] overflow-y-auto space-y-2">
          {transactions.length === 0 && (
            <p className="text-center text-[var(--text-muted)] text-sm py-8">
              No hay movimientos aún
            </p>
          )}
          {transactions.map((t, i) => {
            const opacity = Math.max(1 - i * 0.12, 0.3)
            return (
              <button
                key={t.id}
                className="flex items-center justify-between p-3 rounded-btn bg-[var(--bg-secondary)] w-full text-left"
                style={{ opacity }}
                onClick={() => setEditingTransaction(t)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">
                    {getCategoryEmoji(t.category_id)}
                  </span>
                  <p className="text-sm font-medium">{t.category_label}</p>
                </div>
                <div className="flex items-center gap-3">
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
                  <span className="text-xs text-[var(--text-muted)] w-12 text-right">
                    {formatTransactionDate(t.date)}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Floating Bottom Pill */}
      <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4">
        <div
          className="mx-auto max-w-app flex items-center justify-between rounded-[20px] px-8 py-3 backdrop-blur-xl"
          style={{
            background: 'var(--pill-bg)',
            border: '0.5px solid var(--pill-border)',
          }}
        >
          <Link
            href="/settings"
            className="flex flex-col items-center gap-1"
            style={{ color: 'var(--pill-text)' }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span className="text-[10px] font-medium">Ajustes</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-1"
            style={{ color: 'var(--pill-text)' }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="text-[10px] font-medium">Salir</span>
          </button>
        </div>
      </div>

      {/* Edit Transaction Modal */}
      <EditTransactionModal
        transaction={editingTransaction}
        onClose={() => setEditingTransaction(null)}
        onUpdate={updateTransaction}
        onDelete={deleteTransaction}
      />

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
