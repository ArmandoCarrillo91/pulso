'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { getCategoryEmoji } from '@/lib/categories'
import { getLocalDateString } from '@/lib/date'
import { fixedExpensesInPeriod } from '@/lib/calculations'
import { useTransactions } from '@/hooks/useTransactions'
import { usePlans } from '@/hooks/usePlans'
import { useFixedExpenses } from '@/hooks/useFixedExpenses'
import { usePayday } from '@/hooks/usePayday'
import TransactionModal from '@/components/modals/TransactionModal'
import EditTransactionModal from '@/components/modals/EditTransactionModal'
import SwipeableRow from '@/components/ui/SwipeableRow'
import Toast from '@/components/ui/Toast'
import type { Transaction } from '@/types'
import Button from '@/components/ui/Button'

const MONTHS_SHORT = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
]

interface LogEntry {
  id: string
  kind: 'transaction' | 'fixed' | 'plan'
  date: string
  label: string
  subtitle?: string
  amount: number
  type: 'income' | 'expense'
  badge?: string
  projected: boolean
  transaction?: Transaction
}

function formatMoney(amount: number): string {
  const abs = Math.abs(amount)
  const formatted = abs.toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return amount < 0 ? `−$${formatted}` : `$${formatted}`
}

function formatEntryDate(dateStr: string): string {
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

function formatSectionDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function shiftMonth(m: number, y: number, delta: number) {
  let month = m + delta
  let year = y
  while (month < 0) { month += 12; year-- }
  while (month > 11) { month -= 12; year++ }
  return { month, year }
}

export default function HomePage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [userName, setUserName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  const now = new Date()
  const [activeMonth, setActiveMonth] = useState({
    month: now.getMonth(),
    year: now.getFullYear(),
  })

  const {
    transactions,
    loading,
    currentBalance,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    daysSinceLastIncome,
    toastMsg,
    clearToast,
  } = useTransactions()
  const { plans, totalSavingsPerFortnight } = usePlans()
  const { expenses, createExpense } = useFixedExpenses()
  const { daysRemaining, progress, previousPayday, currentFortnight, nextPayday } = usePayday()

  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserName(user.user_metadata?.full_name || '')
    })
  }, [supabase])

  useEffect(() => {
    if (editingName && nameInputRef.current) nameInputRef.current.focus()
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
    await supabase.auth.updateUser({ data: { full_name: trimmed } })
  }

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveName()
    if (e.key === 'Escape') setEditingName(false)
  }

  // Build unified log entries
  const todayStr = getLocalDateString()

  const logEntries = useMemo(() => {
    const { month: am, year: ay } = activeMonth
    const lastDay = new Date(ay, am + 1, 0).getDate()

    // A) Real transactions for active month
    const txEntries: LogEntry[] = transactions
      .filter((t) => {
        const d = new Date(t.date + 'T12:00:00')
        return d.getMonth() === am && d.getFullYear() === ay
      })
      .map((t) => ({
        id: t.id,
        kind: 'transaction' as const,
        date: t.date,
        label: t.category_label,
        amount: t.amount,
        type: t.type,
        projected: false,
        transaction: t,
      }))

    // B) Projected fixed expenses (today or future only)
    const fixedEntries: LogEntry[] = expenses
      .map((exp) => {
        const day = Math.min(exp.day_of_month, lastDay)
        const dateStr = `${ay}-${pad2(am + 1)}-${pad2(day)}`
        return {
          id: `fixed-${exp.id}`,
          kind: 'fixed' as const,
          date: dateStr,
          label: exp.name,
          subtitle: `día ${exp.day_of_month}`,
          amount: exp.amount,
          type: 'expense' as const,
          badge: 'gasto fijo',
          projected: true,
        }
      })
      .filter((e) => e.date >= todayStr)

    // C) Projected savings plans at fortnight dates (today or future only)
    const planEntries: LogEntry[] = plans.flatMap((plan) => {
      const dates = [
        `${ay}-${pad2(am + 1)}-15`,
        `${ay}-${pad2(am + 1)}-${pad2(lastDay)}`,
      ]
      return dates
        .filter((d) => d >= todayStr)
        .map((d, i) => ({
          id: `plan-${plan.id}-${i}`,
          kind: 'plan' as const,
          date: d,
          label: plan.name,
          subtitle: 'Plan de ahorro',
          amount: plan.amount_per_fortnight,
          type: 'expense' as const,
          badge: 'ahorro',
          projected: true,
        }))
    })

    return [...txEntries, ...fixedEntries, ...planEntries]
  }, [transactions, expenses, plans, activeMonth, todayStr])

  // Group entries into sections
  const sections = useMemo(() => {
    const yesterdayDate = new Date()
    yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    const yesterdayStr = getLocalDateString(yesterdayDate)

    const future = logEntries
      .filter((e) => e.date > todayStr)
      .sort((a, b) => a.date.localeCompare(b.date))
    const todayEntries = logEntries.filter((e) => e.date === todayStr)
    const yesterdayEntries = logEntries.filter((e) => e.date === yesterdayStr)
    const past = logEntries
      .filter((e) => e.date < yesterdayStr)
      .sort((a, b) => b.date.localeCompare(a.date))

    const groups: { label: string; entries: LogEntry[] }[] = []

    if (future.length > 0) groups.push({ label: 'Próximos', entries: future })
    if (todayEntries.length > 0)
      groups.push({
        label: `Hoy · ${formatSectionDate(todayStr)}`,
        entries: todayEntries,
      })
    if (yesterdayEntries.length > 0)
      groups.push({
        label: `Ayer · ${formatSectionDate(yesterdayStr)}`,
        entries: yesterdayEntries,
      })

    // Past grouped by date
    const byDate = new Map<string, LogEntry[]>()
    for (const e of past) {
      const arr = byDate.get(e.date) || []
      arr.push(e)
      byDate.set(e.date, arr)
    }
    for (const [date, entries] of byDate) {
      groups.push({ label: formatSectionDate(date), entries })
    }

    return groups
  }, [logEntries, todayStr])

  // Month navigation
  const prev = shiftMonth(activeMonth.month, activeMonth.year, -1)
  const next = shiftMonth(activeMonth.month, activeMonth.year, 1)
  const isCurrentMonth =
    activeMonth.month === new Date().getMonth() &&
    activeMonth.year === new Date().getFullYear()
  const todaySectionRef = useRef<HTMLDivElement>(null)

  const goToToday = () => {
    setActiveMonth({ month: new Date().getMonth(), year: new Date().getFullYear() })
    setTimeout(() => todaySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  const fixedThisPeriod = fixedExpensesInPeriod(expenses, new Date(), nextPayday)

  const dailyBudget =
    daysRemaining > 0
      ? (currentBalance - totalSavingsPerFortnight - fixedThisPeriod) / daysRemaining
      : 0

  // Carryover: balance from before current fortnight's income
  const lastQuincena = transactions.find(
    (t) => t.type === 'income' && t.category_id === 'quincena'
  )
  const carryover = lastQuincena
    ? lastQuincena.balance_before
    : null

  // Burn rate
  const prevPaydayStr = getLocalDateString(previousPayday)
  const spentThisPeriod = transactions
    .filter((t) => t.type === 'expense' && t.date >= prevPaydayStr)
    .reduce((sum, t) => sum + t.amount, 0)
  const totalAvailable = currentBalance + spentThisPeriod
  const burnPct = totalAvailable > 0 ? spentThisPeriod / totalAvailable : 0
  const timePct = progress

  let burnColor = '#f59e0b' // amber — on pace
  if (burnPct < timePct - 0.1) burnColor = '#16a34a' // green — ahead
  else if (burnPct > timePct + 0.1) burnColor = '#dc2626' // red — overspending

  // Trend: compare spending vs previous fortnight
  // Previous fortnight = transactions between the payday before previousPayday and previousPayday
  const prevPrevPayday = new Date(previousPayday)
  prevPrevPayday.setDate(prevPrevPayday.getDate() - 15)
  const prevPrevStr = getLocalDateString(prevPrevPayday)
  const lastFortnightSpent = transactions
    .filter(
      (t) =>
        t.type === 'expense' &&
        t.date >= prevPrevStr &&
        t.date < prevPaydayStr
    )
    .reduce((sum, t) => sum + t.amount, 0)
  const trendDiff = lastFortnightSpent > 0 ? spentThisPeriod - lastFortnightSpent : null

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
    <div className="flex flex-col min-h-screen p-4" style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
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
          <button onClick={startEditing} className="text-lg font-bold text-left">
            {userName || (
              <span className="text-[var(--text-muted)]">Tu nombre</span>
            )}
          </button>
        )}
        <span className="text-sm text-[var(--text-secondary)] capitalize">
          {dateStr}
        </span>
      </div>

      {/* Hero */}
      <div className="text-center mb-8">
        <p className="text-sm text-[var(--text-secondary)] mb-2">
          Disponible por día
        </p>
        <p
          className={`text-5xl font-bold mb-5 ${
            dailyBudget >= 0 ? 'text-positive' : 'text-negative'
          }`}
        >
          {formatMoney(dailyBudget)}
        </p>

        <p className="text-xs text-[var(--text-muted)] mb-1.5">
          {daysRemaining} {daysRemaining === 1 ? 'día restante' : 'días restantes'}
        </p>
        <p className="text-sm font-semibold text-[var(--text-secondary)] mb-1.5">
          {formatMoney(currentBalance)} disponibles hasta quincena
        </p>
        {trendDiff !== null && (
          <p
            className={`text-xs ${
              trendDiff > 0 ? 'text-negative' : 'text-positive'
            }`}
          >
            {trendDiff > 0
              ? `↑ ${formatMoney(trendDiff)} más que la quincena pasada`
              : `↓ ${formatMoney(Math.abs(trendDiff))} menos que la quincena pasada`}
          </p>
        )}
      </div>

      <div className="mb-6">
        <div className="h-1.5 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(burnPct, 1) * 100}%`,
              backgroundColor: burnColor,
            }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[11px] text-[var(--text-muted)]">
            Gastado {formatMoney(spentThisPeriod)}
          </span>
          <span className="text-[11px] text-[var(--text-muted)]">
            Disponible {formatMoney(currentBalance)}
          </span>
        </div>
      </div>

      <Button fullWidth onClick={() => setModalOpen(true)}>
        + Anotar
      </Button>

      {/* Movimientos */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-4">
          Movimientos
        </h2>

        {/* Month Navigator */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => setActiveMonth(prev)} className="p-2 text-[var(--text-muted)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            {!isCurrentMonth && (
              <button
                onClick={goToToday}
                className="text-[10px] font-medium text-positive px-2 py-0.5 rounded-full"
                style={{ border: '0.5px solid rgba(22, 163, 74, 0.4)' }}
              >
                Hoy
              </button>
            )}
            <button onClick={() => setActiveMonth(prev)} className="px-3 py-1 rounded-full text-xs font-medium text-[var(--text-muted)]">
              {MONTHS_SHORT[prev.month]}
            </button>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[var(--bg-secondary)] text-[var(--text-primary)]">
              {MONTHS_SHORT[activeMonth.month]} {activeMonth.year !== today.getFullYear() ? activeMonth.year : ''}
            </span>
            <button onClick={() => setActiveMonth(next)} className="px-3 py-1 rounded-full text-xs font-medium text-[var(--text-muted)]">
              {MONTHS_SHORT[next.month]}
            </button>
          </div>

          <button onClick={() => setActiveMonth(next)} className="p-2 text-[var(--text-muted)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* Unified List */}
        {sections.length === 0 && (
          <p className="text-center text-[var(--text-muted)] text-sm py-8">
            Sin movimientos en {MONTHS_SHORT[activeMonth.month]}
          </p>
        )}

        {sections.map((section) => {
          const isTodaySection = section.label.startsWith('Hoy')
          return (
            <div key={section.label} className="mb-4" ref={isTodaySection ? todaySectionRef : undefined}>
              <p
                className="text-[10px] font-medium uppercase mb-2"
                style={{ letterSpacing: '2px', color: 'var(--section-label)' }}
              >
                {section.label}
              </p>

              <div className="space-y-1.5">
                {section.entries.map((entry) => {
                  const isTransaction = entry.kind === 'transaction'

                  const rowContent = (
                    <div
                      className="flex items-center gap-3 p-3 rounded-btn bg-[var(--bg-secondary)]"
                      style={{ opacity: entry.projected ? 0.5 : 1 }}
                    >
                      {entry.projected ? (
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ border: '1.5px dashed var(--text-muted)' }} />
                      ) : (
                        <span className={`w-2 h-2 rounded-full shrink-0 ${entry.type === 'income' ? 'bg-positive' : 'bg-negative'}`} />
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {isTransaction && (
                            <span className="text-sm">{getCategoryEmoji(entry.transaction!.category_id)}</span>
                          )}
                          <p className="text-sm font-medium truncate">{entry.label}</p>
                          {entry.badge && (
                            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--border-color)] text-[var(--text-muted)] shrink-0">
                              {entry.badge}
                            </span>
                          )}
                        </div>
                        {entry.subtitle && (
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{entry.subtitle}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`font-semibold text-sm ${entry.type === 'income' ? 'text-positive' : entry.projected ? 'text-[var(--text-secondary)]' : 'text-negative'}`}>
                          {entry.type === 'income' ? '+' : '−'}${entry.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)] w-11 text-right">
                          {formatEntryDate(entry.date)}
                        </span>
                      </div>
                    </div>
                  )

                  if (isTransaction) {
                    return (
                      <SwipeableRow
                        key={entry.id}
                        onEdit={() => setEditingTransaction(entry.transaction!)}
                        onDelete={() => deleteTransaction(entry.transaction!.id)}
                      >
                        {rowContent}
                      </SwipeableRow>
                    )
                  }
                  return <div key={entry.id}>{rowContent}</div>
                })}
              </div>
            </div>
          )
        })}
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
        onCreateFixedExpense={createExpense}
        plans={plans}
        currentBalance={currentBalance}
        daysSinceLastIncome={daysSinceLastIncome}
        daysUntilNextPayday={daysRemaining}
        currentFortnight={currentFortnight}
      />

      <Toast message={toastMsg} visible={!!toastMsg} onHide={clearToast} />
    </div>
  )
}
