'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { getLocalDateString } from '@/lib/date'
import { detectPlatform } from '@/lib/utils'
import { useTransactions } from '@/hooks/useTransactions'
import { useCommitments } from '@/hooks/useCommitments'
import { useBudgets } from '@/hooks/useBudgets'
import { usePayday } from '@/hooks/usePayday'
import TransactionModal from '@/components/modals/TransactionModal'
import EditTransactionModal from '@/components/modals/EditTransactionModal'
import SwipeableRow from '@/components/ui/SwipeableRow'
import Toast from '@/components/ui/Toast'
import type { Transaction, Commitment } from '@/types'
import { getCommitmentType } from '@/types'
import Button from '@/components/ui/Button'
import { HeroSkeleton, BurnBarSkeleton, TransactionListSkeleton } from '@/components/ui/Skeleton'

const MONTHS_SHORT = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
]

interface LogEntry {
  id: string
  kind: 'transaction' | 'commitment'
  date: string
  label: string
  emoji?: string
  subtitle?: string
  amount: number
  type: 'income' | 'expense'
  badge?: string
  badgeColor?: 'muted' | 'amber' | 'positive'
  projected: boolean
  commitmentKind?: 'savings' | 'msi' | 'fixed'
  transaction?: Transaction
  commitment?: Commitment
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

  const [confirmingCommitment, setConfirmingCommitment] = useState<Commitment | null>(null)
  const [confirmNote, setConfirmNote] = useState('')
  const [confirmDate, setConfirmDate] = useState('')
  const [confirmSaving, setConfirmSaving] = useState(false)

  const now = new Date()
  const [activeMonth, setActiveMonth] = useState({
    month: now.getMonth(),
    year: now.getFullYear(),
  })

  const {
    transactions, loading, currentBalance,
    createTransaction, updateTransaction, deleteTransaction,
    daysSinceLastIncome, toastMsg, clearToast,
  } = useTransactions()
  const { commitments, updateCommitment } = useCommitments()
  const { budgets } = useBudgets()

  const lastIncomeDate = useMemo(() => {
    const income = transactions.find((t) => t.type === 'income')
    return income?.date ?? null
  }, [transactions])

  const { daysRemaining, progress, currentFortnight, nextPayday } = usePayday(lastIncomeDate)

  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserName(user.user_metadata?.full_name || '')
    })
  }, [supabase])

  useEffect(() => {
    if (editingName && nameInputRef.current) nameInputRef.current.focus()
  }, [editingName])

  const startEditing = () => { setNameInput(userName); setEditingName(true) }

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

  // ─── Confirm payment handler ───
  const handleConfirmPayment = async () => {
    if (!confirmingCommitment) return
    setConfirmSaving(true)

    const selectedDate = confirmDate || getLocalDateString()
    const dateObj = new Date(selectedDate + 'T12:00:00')
    const nowTime = new Date()

    // Use commitment's category, or null (user can assign later)
    const txCategoryId = confirmingCommitment.category_id

    const transaction: Omit<Transaction, 'id' | 'created_at' | 'user_id' | 'category'> = {
      type: 'expense',
      category_id: txCategoryId,
      amount: confirmingCommitment.amount,
      note: confirmNote.trim() || `Pago: ${confirmingCommitment.name}`,
      rating: null,
      date: selectedDate,
      weekday: dateObj.getDay(),
      hour: nowTime.getHours(),
      is_weekend: dateObj.getDay() === 0 || dateObj.getDay() === 6,
      fortnight: currentFortnight,
      geo_lat: null, geo_lng: null, geo_accuracy: null,
      platform: detectPlatform(),
      source: 'manual',
      entry_seconds: 0, category_changes: 0,
      had_note: confirmNote.trim().length > 0,
      balance_before: currentBalance,
      balance_after: currentBalance - confirmingCommitment.amount,
      days_since_last_income: daysSinceLastIncome,
      days_until_next_payday: daysRemaining,
      is_commitment_payment: true,
    }

    await createTransaction(transaction)

    const cType = getCommitmentType(confirmingCommitment)
    const updates: Partial<Commitment> = { last_paid_date: selectedDate }

    if (cType === 'msi') {
      const newPaid = (confirmingCommitment.paid_installments || 0) + 1
      const total = confirmingCommitment.total_installments || 0
      updates.paid_installments = newPaid
      if (newPaid >= total) {
        updates.completed_at = new Date().toISOString()
      }
    } else if (cType === 'savings_goal' || cType === 'seasonal' || cType === 'recurring_savings') {
      updates.current_amount = (confirmingCommitment.current_amount || 0) + confirmingCommitment.amount
      if (confirmingCommitment.goal_amount && updates.current_amount >= confirmingCommitment.goal_amount) {
        updates.completed_at = new Date().toISOString()
      }
    }

    await updateCommitment(confirmingCommitment.id, updates)

    setConfirmSaving(false)
    setConfirmingCommitment(null)
    setConfirmNote('')
    setConfirmDate('')
  }

  // ─── Build log entries ───
  const todayStr = getLocalDateString()

  const logEntries = useMemo(() => {
    const { month: am, year: ay } = activeMonth
    const lastDay = new Date(ay, am + 1, 0).getDate()

    // A) Real transactions
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

    // B) Projected commitments — three visual types:
    //   savings (automatic, muted) | msi (amber, confirm) | fixed (gray, confirm)
    const commitmentEntries: LogEntry[] = commitments.flatMap((c): LogEntry[] => {
      if (c.completed_at) return []

      const cType = getCommitmentType(c)

      // ── TYPE 1: Savings (fortnight, automatic transfers) ──
      if (cType === 'savings_goal' || cType === 'recurring_savings' || cType === 'seasonal') {
        const fortnightDates = [
          `${ay}-${pad2(am + 1)}-15`,
          `${ay}-${pad2(am + 1)}-${pad2(lastDay)}`,
        ]

        const nextDate = fortnightDates.find((d) => {
          if (d < todayStr) return false
          if (d < c.start_date) return false
          if (c.end_date && d > c.end_date) return false
          return true
        })

        if (!nextDate) return []

        const projectedAmount = (cType === 'savings_goal' && c.goal_amount && c.amount > c.goal_amount)
          ? c.goal_amount : c.amount

        return [{
          id: `c-${c.id}-${am}`,
          kind: 'commitment' as const,
          date: nextDate,
          label: c.name,
          subtitle: cType === 'savings_goal' ? 'meta' : 'automático',
          amount: projectedAmount,
          type: 'expense' as const,
          commitmentKind: 'savings',
          projected: true,
          commitment: c,
        }]
      }

      // ── Monthly types (MSI & Fixed) ──
      const day = Math.min(c.day_of_month || 1, lastDay)
      const dateStr = `${ay}-${pad2(am + 1)}-${pad2(day)}`

      if (dateStr < todayStr) return []

      // MSI bounds
      if (cType === 'msi') {
        if (c.start_date && dateStr < c.start_date.slice(0, 7) + '-01') return []
        if (c.end_date && dateStr > c.end_date) return []
      }

      // Already paid this month → skip
      if (c.last_paid_date && isInMonth(c.last_paid_date, am, ay)) return []

      // ── TYPE 2: MSI ──
      if (cType === 'msi') {
        return [{
          id: `c-${c.id}`,
          kind: 'commitment' as const,
          date: dateStr,
          label: c.name,
          emoji: c.category?.emoji,
          subtitle: `${c.paid_installments || 0}/${c.total_installments || 0} pagos`,
          amount: c.amount,
          type: 'expense' as const,
          badge: 'MSI',
          badgeColor: 'amber' as const,
          commitmentKind: 'msi',
          projected: true,
          commitment: c,
        }]
      }

      // ── TYPE 3: Fixed expenses ──
      return [{
        id: `c-${c.id}`,
        kind: 'commitment' as const,
        date: dateStr,
        label: c.name,
        emoji: c.category?.emoji,
        subtitle: `día ${c.day_of_month || 1}`,
        amount: c.amount,
        type: 'expense' as const,
        badge: 'fijo',
        badgeColor: 'muted' as const,
        commitmentKind: 'fixed',
        projected: true,
        commitment: c,
      }]
    })

    return [...txEntries, ...commitmentEntries]
  }, [transactions, commitments, activeMonth, todayStr])

  // ─── Group entries ───
  const sections = useMemo(() => {
    const yesterdayDate = new Date()
    yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    const yesterdayStr = getLocalDateString(yesterdayDate)

    const future = logEntries.filter((e) => e.date > todayStr).sort((a, b) => a.date.localeCompare(b.date))
    const todayEntries = logEntries.filter((e) => e.date === todayStr)
    const yesterdayEntries = logEntries.filter((e) => e.date === yesterdayStr)
    const past = logEntries.filter((e) => e.date < yesterdayStr).sort((a, b) => b.date.localeCompare(a.date))

    // Calculate daily net for section headers
    const dailyNet = (entries: LogEntry[]): number =>
      entries.reduce((sum, e) => {
        if (e.projected) return sum
        return sum + (e.type === 'income' ? e.amount : -e.amount)
      }, 0)

    const groups: { label: string; entries: LogEntry[]; net?: number }[] = []
    if (future.length > 0) groups.push({ label: 'Próximos', entries: future })
    if (todayEntries.length > 0) groups.push({ label: `Hoy · ${formatSectionDate(todayStr)}`, entries: todayEntries, net: dailyNet(todayEntries) })
    if (yesterdayEntries.length > 0) groups.push({ label: `Ayer · ${formatSectionDate(yesterdayStr)}`, entries: yesterdayEntries, net: dailyNet(yesterdayEntries) })

    const byDate = new Map<string, LogEntry[]>()
    for (const e of past) {
      const arr = byDate.get(e.date) || []
      arr.push(e)
      byDate.set(e.date, arr)
    }
    for (const [date, entries] of byDate) groups.push({ label: formatSectionDate(date), entries, net: dailyNet(entries) })

    return groups
  }, [logEntries, todayStr])

  // ─── Navigation ───
  const prev = shiftMonth(activeMonth.month, activeMonth.year, -1)
  const next = shiftMonth(activeMonth.month, activeMonth.year, 1)
  const isCurrentMonth = activeMonth.month === new Date().getMonth() && activeMonth.year === new Date().getFullYear()
  const todaySectionRef = useRef<HTMLDivElement>(null)

  const goToToday = () => {
    setActiveMonth({ month: new Date().getMonth(), year: new Date().getFullYear() })
    setTimeout(() => todaySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  // ─── Income-based period ───
  const lastQuincenaIncome = useMemo(() => transactions.find((t) => t.type === 'income') ?? null, [transactions])
  const hasIncome = !!lastQuincenaIncome
  const periodStartStr = lastQuincenaIncome?.date ?? null

  // Per-fortnight deductions from active commitments
  const activeCommitments = commitments.filter((c) => !c.completed_at)

  // Per-fortnight contribution for each active commitment.
  // For goal-type: if amount > goal_amount, the fields are swapped in the DB —
  // use the smaller value as the periodic contribution.
  const getPerFortnight = (c: Commitment): number => {
    if (c.frequency === 'fortnight') {
      if (c.end_type === 'goal' && c.goal_amount && c.amount > c.goal_amount) {
        return c.goal_amount // fields were swapped — goal_amount is actually the contribution
      }
      return c.amount
    }
    if (c.frequency === 'monthly') return c.amount / 2
    return 0
  }

  const fortnightDeduction = activeCommitments.reduce((sum, c) => sum + getPerFortnight(c), 0)


  const ingresado = lastQuincenaIncome?.amount ?? 0
  const committedThisFortnight = fortnightDeduction

  const periodExpenses = periodStartStr
    ? transactions.filter((t) => t.type === 'expense' && t.date >= periodStartStr)
    : []
  const gastado = periodExpenses.reduce((sum, t) => sum + t.amount, 0)
  const gastadoExtra = periodExpenses.filter((t) => t.is_extraordinary).reduce((sum, t) => sum + t.amount, 0)

  const freeThisFortnight = ingresado - gastado - committedThisFortnight

  const dailyBudget = hasIncome && daysRemaining > 0 ? freeThisFortnight / daysRemaining : 0

  // Burn rate excludes extraordinary expenses
  const ordinarySpent = gastado - gastadoExtra
  const ordinaryPool = ingresado - committedThisFortnight - gastadoExtra
  const burnPct = ordinaryPool > 0 ? ordinarySpent / ordinaryPool : 0
  const timePct = progress

  let burnColor = '#f59e0b'
  if (burnPct < timePct - 0.1) burnColor = '#16a34a'
  else if (burnPct > timePct + 0.1) burnColor = '#dc2626'

  const isEndOfFortnight = hasIncome && daysRemaining <= 3

  const today = new Date()
  const dateStr = today.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' })

  return (
    <div className="flex flex-col h-screen p-4 overflow-hidden" style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-8 shrink-0">
        {editingName ? (
          <input ref={nameInputRef} type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)} onBlur={saveName} onKeyDown={handleNameKeyDown} placeholder="Tu nombre" className="text-lg font-bold bg-transparent outline-none border-b-2 border-positive w-40" />
        ) : (
          <button onClick={startEditing} className="text-lg font-bold text-left">
            {userName || <span className="text-[var(--text-muted)]">Tu nombre</span>}
          </button>
        )}
        <span className="text-sm text-[var(--text-secondary)] capitalize">{dateStr}</span>
      </div>

      {/* Hero */}
      <div className="shrink-0">
      {loading ? (
        <><HeroSkeleton /><BurnBarSkeleton /></>
      ) : !hasIncome ? (
        <div className="text-center py-8 mb-4">
          <p className="text-lg font-bold mb-2">Registra tu quincena</p>
          <p className="text-sm text-[var(--text-muted)] mb-6">Anota tu ingreso para activar el cálculo</p>
          <Button onClick={() => setModalOpen(true)}>+ Anotar ingreso</Button>
        </div>
      ) : (
        <>
          <div className="text-center mb-4">
            <p className="text-sm text-[var(--text-secondary)] mb-2">
              {isEndOfFortnight ? 'Últimos días de quincena' : 'Disponible por día'}
            </p>
            <p className={`text-5xl font-bold mb-3 ${dailyBudget < 0 ? 'text-negative' : isEndOfFortnight ? 'text-amber-500' : 'text-positive'}`}>
              {formatMoney(dailyBudget)}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {daysRemaining} {daysRemaining === 1 ? 'día restante' : 'días restantes'}
            </p>
          </div>

          {/* Fortnight snapshot */}
          <div className="mb-4 py-3 px-3" style={isEndOfFortnight ? { borderLeft: '3px solid #f59e0b', paddingLeft: '11px' } : undefined}>
            <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
              <span>Ingresado</span>
              <span>{formatMoney(ingresado)}</span>
            </div>
            <div className="flex justify-between text-xs text-[var(--text-muted)]">
              <span>Comprometido</span>
              <span>{formatMoney(committedThisFortnight)}</span>
            </div>
            <div className="h-px bg-[var(--border-color)] mt-1.5" />
          </div>

          {isEndOfFortnight && (
            <p className="text-xs text-[var(--text-muted)] text-center mb-4">
              Quedan {daysRemaining} días — gasta con intención
            </p>
          )}

          <div className="mb-4">
            <div className="h-1.5 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(burnPct, 1) * 100}%`, backgroundColor: burnColor }} />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[11px] text-[var(--text-muted)]">Gastado {formatMoney(gastado)}</span>
              <span className="text-[11px] text-[var(--text-muted)]">Disponible {formatMoney(freeThisFortnight)}</span>
            </div>
          </div>

          {/* Sobre status — only show > 70% spent, max 3 */}
          {(() => {
            if (!periodStartStr || budgets.length === 0) return null
            const sobreStatus = budgets
              .map((b) => {
                const spent = transactions
                  .filter((t) => t.type === 'expense' && t.date >= periodStartStr! && t.category_id === b.category_id)
                  .reduce((sum, t) => sum + t.amount, 0)
                const limit = b.frequency === 'monthly' ? b.amount / 2 : b.amount
                const pct = limit > 0 ? spent / limit : 0
                const remaining = Math.max(limit - spent, 0)
                return { ...b, spent, pct, remaining }
              })
              .filter((s) => s.pct > 0.7)
              .sort((a, b) => b.pct - a.pct)
              .slice(0, 3)

            if (sobreStatus.length === 0) return null

            return (
              <div className="mb-2 space-y-1">
                {sobreStatus.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 text-[11px]">
                    <span>{s.category?.emoji || '📦'}</span>
                    <span className="text-[var(--text-muted)] flex-1">{s.category?.label}</span>
                    <div className="w-16 h-1 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(s.pct, 1) * 100}%`,
                          backgroundColor: s.pct > 0.9 ? '#dc2626' : '#f59e0b',
                        }}
                      />
                    </div>
                    <span className={`font-medium ${s.pct > 0.9 ? 'text-negative/70' : 'text-amber-500/70'}`}>
                      ${Math.round(s.remaining)}
                    </span>
                  </div>
                ))}
                <Link href="/budgets" className="text-[10px] text-positive font-medium">
                  Ver todos →
                </Link>
              </div>
            )
          })()}
        </>
      )}
      </div>

      <div className="shrink-0">
        <Button fullWidth onClick={() => setModalOpen(true)}>+ Anotar</Button>
      </div>

      {/* Movimientos */}
      <div className="mt-6 flex flex-col flex-1 min-h-0">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-4 shrink-0">Movimientos</h2>

        <div className="flex items-center justify-between mb-3 shrink-0">
          <button onClick={() => setActiveMonth(prev)} className="p-2 text-[var(--text-muted)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <div className="flex flex-col items-center gap-1">
            {!isCurrentMonth && (
              <button onClick={goToToday} className="text-[10px] font-medium text-positive px-2 py-0.5 rounded-full" style={{ border: '0.5px solid rgba(22, 163, 74, 0.4)' }}>Hoy</button>
            )}
            <div className="flex items-center gap-2">
              <button onClick={() => setActiveMonth(prev)} className="px-3 py-1 rounded-full text-xs font-medium text-[var(--text-muted)]">{MONTHS_SHORT[prev.month]}</button>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                {MONTHS_SHORT[activeMonth.month]} {activeMonth.year !== today.getFullYear() ? activeMonth.year : ''}
              </span>
              <button onClick={() => setActiveMonth(next)} className="px-3 py-1 rounded-full text-xs font-medium text-[var(--text-muted)]">{MONTHS_SHORT[next.month]}</button>
            </div>
          </div>
          <button onClick={() => setActiveMonth(next)} className="p-2 text-[var(--text-muted)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 -mx-4 px-4" style={{ paddingBottom: '16px' }}>
          {loading && <TransactionListSkeleton />}
          {!loading && sections.length === 0 && (
            <p className="text-center text-[var(--text-muted)] text-sm py-8">Sin movimientos en {MONTHS_SHORT[activeMonth.month]}</p>
          )}

          {sections.map((section) => {
            const isTodaySection = section.label.startsWith('Hoy')
            return (
              <div key={section.label} className="mb-4" ref={isTodaySection ? todaySectionRef : undefined}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-medium uppercase" style={{ letterSpacing: '2px', color: 'var(--section-label)' }}>{section.label}</p>
                  {section.net !== undefined && section.net !== 0 && (
                    <span className={`text-[11px] ${section.net < 0 ? 'text-negative/60' : 'text-positive/60'}`}>
                      {section.net < 0 ? '−' : '+'}${Math.abs(section.net).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {section.entries.map((entry) => {
                    const isTransaction = entry.kind === 'transaction'
                    const isSavings = entry.commitmentKind === 'savings'
                    const needsConfirm = entry.commitmentKind === 'msi' || entry.commitmentKind === 'fixed'

                    const rowContent = (
                      <div className="flex items-center gap-3 p-3 rounded-btn bg-[var(--bg-secondary)]" style={{ opacity: isSavings ? 0.5 : entry.projected && !needsConfirm ? 0.5 : 1 }}>
                        {isSavings ? (
                          <span className="text-sm shrink-0">🏦</span>
                        ) : entry.projected ? (
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ border: '1.5px dashed var(--text-muted)' }} />
                        ) : (
                          <span className={`w-2 h-2 rounded-full shrink-0 ${entry.type === 'income' ? 'bg-positive' : 'bg-negative'}`} />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {entry.transaction?.is_extraordinary && <span className="text-[11px] opacity-40">⚡</span>}
                            {entry.emoji && <span className="text-sm">{entry.emoji}</span>}
                            <p className="text-sm font-medium truncate">{entry.label}</p>
                            {entry.badge && (
                              <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
                                entry.badgeColor === 'amber' ? 'bg-amber-500/10 text-amber-500'
                                : entry.badgeColor === 'positive' ? 'bg-positive/10 text-positive'
                                : 'bg-[var(--border-color)] text-[var(--text-muted)]'
                              }`}>{entry.badge}</span>
                            )}
                            {isSavings && (
                              <span className="text-[9px] text-[var(--text-muted)] opacity-70">automático</span>
                            )}
                          </div>
                          {entry.subtitle && <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{entry.subtitle}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {needsConfirm && (
                            <button
                              className="text-[10px] font-semibold text-positive px-2 py-1 rounded-btn"
                              style={{ border: '0.5px solid rgba(22, 163, 74, 0.3)' }}
                              onClick={(e) => { e.stopPropagation(); setConfirmingCommitment(entry.commitment!); setConfirmDate(getLocalDateString()); setConfirmNote('') }}
                            >✓ Confirmar</button>
                          )}
                          <span className={`font-semibold text-sm ${entry.type === 'income' ? 'text-positive' : entry.projected ? 'text-[var(--text-secondary)]' : 'text-negative'}`}>
                            {entry.type === 'income' ? '+' : '−'}${entry.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[11px] text-[var(--text-muted)] w-11 text-right">{formatEntryDate(entry.date)}</span>
                        </div>
                      </div>
                    )

                    if (isTransaction) {
                      return (
                        <SwipeableRow key={entry.id} onEdit={() => setEditingTransaction(entry.transaction!)} onDelete={() => deleteTransaction(entry.transaction!.id)}>
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
      {confirmingCommitment && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmingCommitment(null)} />
          <div className="relative w-full max-w-app bg-[var(--bg-card)] rounded-t-[24px] p-6 pb-8 animate-slide-up">
            <h2 className="text-lg font-bold mb-1">¿Confirmar pago?</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">{confirmingCommitment.name}</p>
            <div className="flex items-center justify-center mb-4">
              <span className="text-3xl font-bold">{formatMoney(confirmingCommitment.amount)}</span>
            </div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Fecha</label>
            <input type="date" value={confirmDate} onChange={(e) => setConfirmDate(e.target.value)} max={getLocalDateString()} className="input-field mb-3" />
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Nota (opcional)</label>
            <input type="text" value={confirmNote} onChange={(e) => setConfirmNote(e.target.value)} placeholder={`Pago: ${confirmingCommitment.name}`} className="input-field mb-4" />
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setConfirmingCommitment(null)}>Cancelar</Button>
              <Button fullWidth disabled={confirmSaving} onClick={handleConfirmPayment}>{confirmSaving ? 'Guardando...' : 'Confirmar pago'}</Button>
            </div>
          </div>
        </div>
      )}

      <EditTransactionModal transaction={editingTransaction} onClose={() => setEditingTransaction(null)} onUpdate={updateTransaction} onDelete={deleteTransaction} />

      <TransactionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={createTransaction}
        currentBalance={currentBalance}
        daysSinceLastIncome={daysSinceLastIncome}
        daysUntilNextPayday={daysRemaining}
        currentFortnight={currentFortnight}
      />

      <Toast message={toastMsg} visible={!!toastMsg} onHide={clearToast} />
    </div>
  )
}
