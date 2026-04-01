'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { getLocalDateString } from '@/lib/date'
import { detectPlatform } from '@/lib/utils'
import { useTransactions } from '@/hooks/useTransactions'
import { usePlans } from '@/hooks/usePlans'
import { useFixedExpenses } from '@/hooks/useFixedExpenses'
import { usePayday } from '@/hooks/usePayday'
import TransactionModal from '@/components/modals/TransactionModal'
import EditTransactionModal from '@/components/modals/EditTransactionModal'
import SwipeableRow from '@/components/ui/SwipeableRow'
import Toast from '@/components/ui/Toast'
import type { Transaction, FixedExpense } from '@/types'
import Button from '@/components/ui/Button'
import { HeroSkeleton, BurnBarSkeleton, TransactionListSkeleton } from '@/components/ui/Skeleton'

const MONTHS_SHORT = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
]

interface LogEntry {
  id: string
  kind: 'transaction' | 'fixed' | 'plan'
  date: string
  label: string
  emoji?: string
  subtitle?: string
  amount: number
  type: 'income' | 'expense'
  badge?: string
  badgeColor?: 'muted' | 'amber' | 'positive'
  projected: boolean
  transaction?: Transaction
  fixedExpense?: FixedExpense
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

/** Check if a YYYY-MM-DD date falls in a given month/year */
function isInMonth(dateStr: string, month: number, year: number): boolean {
  const d = new Date(dateStr + 'T12:00:00')
  return d.getMonth() === month && d.getFullYear() === year
}

export default function HomePage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [userName, setUserName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Confirm payment modal state
  const [confirmingExpense, setConfirmingExpense] = useState<FixedExpense | null>(null)
  const [confirmNote, setConfirmNote] = useState('')
  const [confirmDate, setConfirmDate] = useState('')
  const [confirmSaving, setConfirmSaving] = useState(false)

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
  const { expenses, createExpense, updateExpense: updateFixedExpense } = useFixedExpenses()

  // Find last income date (quincena/salary) to detect if current fortnight income is already registered
  const lastIncomeDate = useMemo(() => {
    const income = transactions.find((t) => t.type === 'income')
    return income?.date ?? null
  }, [transactions])

  const { daysRemaining, progress, previousPayday, currentFortnight, nextPayday } = usePayday(lastIncomeDate)

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

  // Confirm payment handler
  const handleConfirmPayment = async () => {
    if (!confirmingExpense) return
    setConfirmSaving(true)

    const selectedDate = confirmDate || getLocalDateString()
    const dateObj = new Date(selectedDate + 'T12:00:00')
    const nowTime = new Date()

    const transaction: Omit<Transaction, 'id' | 'created_at' | 'user_id' | 'category'> = {
      type: 'expense',
      category_id: confirmingExpense.category_id,
      amount: confirmingExpense.amount,
      note: confirmNote.trim() || `Pago: ${confirmingExpense.name}`,
      rating: null,
      date: selectedDate,
      weekday: dateObj.getDay(),
      hour: nowTime.getHours(),
      is_weekend: dateObj.getDay() === 0 || dateObj.getDay() === 6,
      fortnight: currentFortnight,
      geo_lat: null,
      geo_lng: null,
      geo_accuracy: null,
      platform: detectPlatform(),
      source: 'manual',
      entry_seconds: 0,
      category_changes: 0,
      had_note: confirmNote.trim().length > 0,
      balance_before: currentBalance,
      balance_after: currentBalance - confirmingExpense.amount,
      days_since_last_income: daysSinceLastIncome,
      days_until_next_payday: daysRemaining,
    }

    await createTransaction(transaction)

    // Update the fixed expense record via context (optimistic UI)
    const expenseUpdates: Partial<FixedExpense> = { last_paid_date: selectedDate }

    if (confirmingExpense.expense_type === 'msi') {
      const newPaid = (confirmingExpense.paid_installments || 0) + 1
      const total = confirmingExpense.total_installments || 0
      expenseUpdates.paid_installments = newPaid
      if (newPaid >= total) {
        expenseUpdates.completed_at = new Date().toISOString()
      } else {
        const nextDate = new Date(selectedDate + 'T12:00:00')
        nextDate.setMonth(nextDate.getMonth() + 1)
        expenseUpdates.next_payment_date = getLocalDateString(nextDate)
      }
    }

    await updateFixedExpense(confirmingExpense.id, expenseUpdates)

    setConfirmSaving(false)
    setConfirmingExpense(null)
    setConfirmNote('')
    setConfirmDate('')
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
        label: t.category?.label || 'Sin categoría',
        emoji: t.category?.emoji,
        amount: t.amount,
        type: t.type,
        projected: false,
        transaction: t,
      }))

    // B) Projected fixed expenses and MSI — show on their day_of_month
    const fixedEntries: LogEntry[] = expenses.flatMap((exp) => {
      const day = Math.min(exp.day_of_month, lastDay)
      const dateStr = `${ay}-${pad2(am + 1)}-${pad2(day)}`

      if (exp.expense_type === 'msi') {
        // MSI: only show between start_date and end_date, and not if fully paid
        const total = exp.total_installments || 1
        const paid = exp.paid_installments || 0
        if (paid >= total) return [] // completed

        if (exp.start_date && dateStr < exp.start_date.slice(0, 7) + '-01') return []
        if (exp.end_date && dateStr > exp.end_date) return []

        // Already paid this month → real transaction shows in history, skip projection
        const paidThisMonth = exp.last_paid_date
          ? isInMonth(exp.last_paid_date, am, ay)
          : false
        if (paidThisMonth) return []

        return [{
          id: `fixed-${exp.id}`,
          kind: 'fixed' as const,
          date: dateStr,
          label: exp.name,
          emoji: exp.category?.emoji,
          subtitle: `${paid} de ${total} pagos`,
          amount: exp.amount,
          type: 'expense' as const,
          badge: 'MSI',
          badgeColor: 'amber' as const,
          projected: true,
          fixedExpense: exp,
        }]
      }

      // Regular fixed expense — already paid this month → skip projection
      const paidThisMonth = exp.last_paid_date
        ? isInMonth(exp.last_paid_date, am, ay)
        : false
      if (paidThisMonth) return []

      return [{
        id: `fixed-${exp.id}`,
        kind: 'fixed' as const,
        date: dateStr,
        label: exp.name,
        emoji: exp.category?.emoji,
        subtitle: `día ${exp.day_of_month}`,
        amount: exp.amount,
        type: 'expense' as const,
        badge: 'gasto fijo',
        projected: true,
        fixedExpense: exp,
      }]
    })

    // C) Projected savings plans — max 2 per month (day 15 and last day)
    // Respect start_date and target_date bounds
    const planEntries: LogEntry[] = plans.flatMap((plan) => {
      const fortnightDates = [
        `${ay}-${pad2(am + 1)}-15`,
        `${ay}-${pad2(am + 1)}-${pad2(lastDay)}`,
      ]

      return fortnightDates
        .filter((d) => {
          // Must be on or after start_date
          if (d < plan.start_date) return false
          // Must be on or before target_date (if set)
          if (plan.target_date && d > plan.target_date) return false
          return true
        })
        .map((d, i) => ({
          id: `plan-${plan.id}-${am}-${i}`,
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

  // ─── Income-based period ───
  // Find most recent income (quincena/salary) — defines the period
  const lastQuincenaIncome = useMemo(() => {
    return transactions.find((t) => t.type === 'income') ?? null
  }, [transactions])

  const hasIncome = !!lastQuincenaIncome
  const periodStartStr = lastQuincenaIncome?.date ?? null

  // Fixed expenses per fortnight = half monthly amount for each active fixed expense
  const fixedPerFortnight = expenses
    .filter((e) => e.expense_type !== 'msi')
    .reduce((sum, e) => sum + e.amount / 2, 0)

  // MSI per fortnight = monthly amount (one payment per month, ~one per fortnight)
  const msiPerFortnight = expenses
    .filter((e) => {
      if (e.expense_type !== 'msi') return false
      const total = e.total_installments || 0
      const paid = e.paid_installments || 0
      if (paid >= total) return false
      if (e.start_date && todayStr < e.start_date) return false
      if (e.end_date && todayStr > e.end_date) return false
      return true
    })
    .reduce((sum, e) => sum + e.amount, 0)

  // Period calculations (only meaningful when income exists)
  const ingresado = lastQuincenaIncome?.amount ?? 0
  const committedThisFortnight = totalSavingsPerFortnight + fixedPerFortnight + msiPerFortnight

  const gastado = periodStartStr
    ? transactions
        .filter((t) => t.type === 'expense' && t.date >= periodStartStr)
        .reduce((sum, t) => sum + t.amount, 0)
    : 0

  const freeThisFortnight = ingresado - gastado - committedThisFortnight

  const dailyBudget =
    hasIncome && daysRemaining > 0
      ? freeThisFortnight / daysRemaining
      : 0

  // Burn rate: gastado / ingresado (only expenses since period start)
  const spentThisPeriod = gastado
  const burnPct = ingresado > 0 ? spentThisPeriod / ingresado : 0
  const timePct = progress

  let burnColor = '#f59e0b' // amber — on pace
  if (burnPct < timePct - 0.1) burnColor = '#16a34a' // green — ahead
  else if (burnPct > timePct + 0.1) burnColor = '#dc2626' // red — overspending

  // ─── Historical average daily spend ───
  const historicalAvgDaily = useMemo(() => {
    if (!periodStartStr) return null
    const prevExpenses = transactions.filter(
      (t) => t.type === 'expense' && t.date < periodStartStr
    )
    if (prevExpenses.length === 0) return null

    const totalPrevExpenses = prevExpenses.reduce((sum, t) => sum + t.amount, 0)

    const earliestDate = prevExpenses.reduce(
      (min, t) => (t.date < min ? t.date : min),
      prevExpenses[0].date
    )
    const earliest = new Date(earliestDate + 'T12:00:00')
    const periodEnd = new Date(periodStartStr + 'T12:00:00')
    const totalDaysHistory = Math.max(
      Math.ceil((periodEnd.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24)),
      1
    )

    return totalPrevExpenses / totalDaysHistory
  }, [transactions, periodStartStr])

  // ─── End of fortnight mode ───
  const isEndOfFortnight = hasIncome && daysRemaining <= 3

  const today = new Date()
  const dateStr = today.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })

  return (
    <div className="flex flex-col h-screen p-4 overflow-hidden" style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-8 shrink-0">
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
      <div className="shrink-0">
      {loading ? (
        <>
          <HeroSkeleton />
          <BurnBarSkeleton />
        </>
      ) : !hasIncome ? (
        /* Empty state — no income registered yet */
        <div className="text-center py-8 mb-4">
          <p className="text-lg font-bold mb-2">Registra tu quincena</p>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            Anota tu ingreso para activar el cálculo
          </p>
          <Button onClick={() => setModalOpen(true)}>
            + Anotar ingreso
          </Button>
        </div>
      ) : (
        <>
          <div className="text-center mb-4">
            <p className="text-sm text-[var(--text-secondary)] mb-2">
              {isEndOfFortnight ? 'Últimos días de quincena' : 'Disponible por día'}
            </p>
            <p
              className={`text-5xl font-bold mb-3 ${
                dailyBudget < 0
                  ? 'text-negative'
                  : isEndOfFortnight
                    ? 'text-amber-500'
                    : 'text-positive'
              }`}
            >
              {formatMoney(dailyBudget)}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {daysRemaining} {daysRemaining === 1 ? 'día restante' : 'días restantes'}
            </p>
          </div>

          {/* Three-line fortnight snapshot */}
          <div
            className="mb-4 py-3 px-3"
            style={isEndOfFortnight ? { borderLeft: '3px solid #f59e0b', paddingLeft: '11px' } : undefined}
          >
            <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
              <span>Ingresado</span>
              <span>{formatMoney(ingresado)}</span>
            </div>
            <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1.5">
              <span>Comprometido</span>
              <span>{formatMoney(committedThisFortnight)}</span>
            </div>
            <div className="h-px bg-[var(--border-color)] mb-1.5" />
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-secondary)] font-medium">Libre</span>
              <span className="text-[var(--text-secondary)] font-medium">{formatMoney(freeThisFortnight)}</span>
            </div>
          </div>

          {isEndOfFortnight && (
            <p className="text-xs text-[var(--text-muted)] text-center mb-4">
              Quedan {daysRemaining} días — gasta con intención
            </p>
          )}

          {/* Burn rate bar */}
          <div className="mb-4">
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
                Libre {formatMoney(freeThisFortnight)}
              </span>
            </div>
            {historicalAvgDaily !== null && (
              <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
                Promedio histórico: {formatMoney(historicalAvgDaily)}/día
              </p>
            )}
          </div>
        </>
      )}
      </div>

      <div className="shrink-0">
        <Button fullWidth onClick={() => setModalOpen(true)}>
          + Anotar
        </Button>
      </div>

      {/* Movimientos */}
      <div className="mt-6 flex flex-col flex-1 min-h-0">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-4 shrink-0">
          Movimientos
        </h2>

        {/* Month Navigator */}
        <div className="flex items-center justify-between mb-3 shrink-0">
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

        {/* Scrollable list — only this area scrolls */}
        <div className="flex-1 overflow-y-auto min-h-0 -mx-4 px-4" style={{ paddingBottom: '16px' }}>
          {loading && <TransactionListSkeleton />}
          {!loading && sections.length === 0 && (
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
                    const isFixedUnpaid = entry.kind === 'fixed' && entry.projected

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
                            {entry.emoji && (
                              <span className="text-sm">{entry.emoji}</span>
                            )}
                            <p className="text-sm font-medium truncate">{entry.label}</p>
                            {entry.badge && (
                              <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
                                entry.badgeColor === 'amber'
                                  ? 'bg-amber-500/10 text-amber-500'
                                  : 'bg-[var(--border-color)] text-[var(--text-muted)]'
                              }`}>
                                {entry.badge}
                              </span>
                            )}
                          </div>
                          {entry.subtitle && (
                            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{entry.subtitle}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isFixedUnpaid && (
                            <button
                              className="text-[10px] font-semibold text-positive px-2 py-1 rounded-btn"
                              style={{ border: '0.5px solid rgba(22, 163, 74, 0.3)' }}
                              onClick={(e) => {
                                e.stopPropagation()
                                setConfirmingExpense(entry.fixedExpense!)
                                setConfirmDate(getLocalDateString())
                                setConfirmNote('')
                              }}
                            >
                              ✓ Confirmar
                            </button>
                          )}
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
      </div>

      {/* Confirm Payment Modal */}
      {confirmingExpense && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmingExpense(null)} />
          <div className="relative w-full max-w-app bg-[var(--bg-card)] rounded-t-[24px] p-6 pb-8 animate-slide-up">
            <h2 className="text-lg font-bold mb-1">¿Confirmar pago?</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              {confirmingExpense.name}
            </p>

            <div className="flex items-center justify-center mb-4">
              <span className="text-3xl font-bold">
                {formatMoney(confirmingExpense.amount)}
              </span>
            </div>

            <label className="block text-xs text-[var(--text-secondary)] mb-1">
              Fecha
            </label>
            <input
              type="date"
              value={confirmDate}
              onChange={(e) => setConfirmDate(e.target.value)}
              max={getLocalDateString()}
              className="input-field mb-3"
            />

            <label className="block text-xs text-[var(--text-secondary)] mb-1">
              Nota (opcional)
            </label>
            <input
              type="text"
              value={confirmNote}
              onChange={(e) => setConfirmNote(e.target.value)}
              placeholder={`Pago: ${confirmingExpense.name}`}
              className="input-field mb-4"
            />

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setConfirmingExpense(null)}>
                Cancelar
              </Button>
              <Button fullWidth disabled={confirmSaving} onClick={handleConfirmPayment}>
                {confirmSaving ? 'Guardando...' : 'Confirmar pago'}
              </Button>
            </div>
          </div>
        </div>
      )}

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
