'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { getLocalDateString } from '@/lib/date'
import { useFixedExpenses } from '@/hooks/useFixedExpenses'
import { useCategories } from '@/hooks/useCategories'
import EditExpenseModal from '@/components/modals/EditExpenseModal'
import SwipeableRow from '@/components/ui/SwipeableRow'
import Button from '@/components/ui/Button'
import ProgressBar from '@/components/ui/ProgressBar'
import type { FixedExpense } from '@/types'

const END_DATE_OPTIONS = [
  { label: 'Sin fecha de fin', value: '' },
  { label: '3 meses', months: 3 },
  { label: '6 meses', months: 6 },
  { label: '1 año', months: 12 },
  { label: '2 años', months: 24 },
  { label: 'Fecha específica', value: 'custom' },
]

function fmt(n: number) {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function FixedExpensesPage() {
  const { expenses, createExpense, updateExpense, deleteExpense } =
    useFixedExpenses()
  const { expenseCategories } = useCategories()

  const [editingExpense, setEditingExpense] = useState<FixedExpense | null>(null)

  // Fixed expense form state
  const [showAddFixed, setShowAddFixed] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newNextDate, setNewNextDate] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 1)
    return getLocalDateString(d)
  })
  const [newEndOption, setNewEndOption] = useState('')
  const [newCustomEnd, setNewCustomEnd] = useState('')
  const [newCatId, setNewCatId] = useState<string | null>(null)

  // MSI form state
  const [showAddMsi, setShowAddMsi] = useState(false)
  const [msiName, setMsiName] = useState('')
  const [msiAmount, setMsiAmount] = useState('')
  const [msiMonths, setMsiMonths] = useState('')
  const [msiNextDate, setMsiNextDate] = useState(() => {
    // Default: 15th of next month
    const d = new Date()
    d.setMonth(d.getMonth() + 1)
    d.setDate(15)
    return getLocalDateString(d)
  })

  const fixedExpenses = useMemo(
    () => expenses.filter((e) => e.expense_type !== 'msi'),
    [expenses]
  )
  const msiExpenses = useMemo(
    () => expenses.filter((e) => e.expense_type === 'msi'),
    [expenses]
  )

  const resolveEndDate = (): string | null => {
    if (!newEndOption) return null
    if (newEndOption === 'custom') return newCustomEnd || null
    const opt = END_DATE_OPTIONS.find(
      (o) => 'months' in o && o.label === newEndOption
    )
    if (opt && 'months' in opt) {
      const d = new Date()
      d.setMonth(d.getMonth() + opt.months!)
      return getLocalDateString(d)
    }
    return null
  }

  const handleAddFixed = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(newAmount)
    if (!newName.trim() || !amt) return
    const payDate = newNextDate
      ? new Date(newNextDate + 'T12:00:00')
      : new Date()

    await createExpense({
      name: newName.trim(),
      amount: amt,
      day_of_month: payDate.getDate(),
      category_id: newCatId,
      next_payment_date: newNextDate || null,
      end_date: resolveEndDate(),
      last_paid_date: null,
      start_date: null,
      total_installments: null,
      paid_installments: 0,
      expense_type: 'fixed',
      completed_at: null,
      total_amount: null,
    })
    setShowAddFixed(false)
    setNewName('')
    setNewAmount('')
    setNewCatId(null)
  }

  // MSI auto-calculations from 4 fields
  const msiCalc = useMemo(() => {
    const totalAmt = parseFloat(msiAmount)
    const months = parseInt(msiMonths)
    if (!totalAmt || !months || months < 1 || !msiNextDate) return null

    const monthly = Math.ceil((totalAmt / months) * 100) / 100
    const nextDate = new Date(msiNextDate + 'T12:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Estimate start: next_payment_date - total_installments months
    const estimatedStart = new Date(nextDate)
    estimatedStart.setMonth(estimatedStart.getMonth() - months)

    // Count months elapsed between estimated start and today
    const monthsElapsed = (today.getFullYear() - estimatedStart.getFullYear()) * 12
      + (today.getMonth() - estimatedStart.getMonth())
    const paidInstallments = Math.max(0, Math.min(monthsElapsed, months))
    const remaining = months - paidInstallments

    // End date: next_payment_date + (remaining - 1) months
    const endDate = new Date(nextDate)
    endDate.setMonth(endDate.getMonth() + Math.max(remaining - 1, 0))

    // Last paid date: one month before next_payment_date (if any paid)
    let lastPaidDate: string | null = null
    if (paidInstallments > 0) {
      const lpd = new Date(nextDate)
      lpd.setMonth(lpd.getMonth() - 1)
      lastPaidDate = getLocalDateString(lpd)
    }

    return {
      monthly,
      paidInstallments,
      remaining,
      startDate: getLocalDateString(estimatedStart),
      endDate: getLocalDateString(endDate),
      lastPaidDate,
    }
  }, [msiAmount, msiMonths, msiNextDate])

  const handleAddMsi = async (e: React.FormEvent) => {
    e.preventDefault()
    const totalAmt = parseFloat(msiAmount)
    const months = parseInt(msiMonths)
    if (!msiName.trim() || !totalAmt || !months || months < 1 || !msiCalc) return

    const nextD = new Date(msiNextDate + 'T12:00:00')

    await createExpense({
      name: msiName.trim(),
      amount: msiCalc.monthly,
      day_of_month: nextD.getDate(),
      category_id: null,
      next_payment_date: msiNextDate,
      start_date: msiCalc.startDate,
      end_date: msiCalc.endDate,
      last_paid_date: msiCalc.lastPaidDate,
      total_installments: months,
      paid_installments: msiCalc.paidInstallments,
      expense_type: 'msi',
      completed_at: null,
      total_amount: totalAmt,
    })
    setShowAddMsi(false)
    setMsiName('')
    setMsiAmount('')
    setMsiMonths('')
  }

  return (
    <div className="min-h-screen p-4" style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="p-2 -ml-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-lg font-bold">Gastos y MSI</h1>
      </div>

      {/* ─── SECTION 1: Fixed Expenses ─── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)]">Gastos fijos</h2>
          {!showAddFixed && (
            <button className="text-xs text-positive font-semibold" onClick={() => setShowAddFixed(true)}>
              + Agregar
            </button>
          )}
        </div>

        {showAddFixed && (
          <form onSubmit={handleAddFixed} className="rounded-card p-4 mb-3 space-y-3 bg-[var(--bg-card)]" style={{ border: '0.5px solid var(--pill-border)' }}>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre del gasto" className="input-field" required />
            <input type="number" inputMode="decimal" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="Monto" className="input-field" required />

            <label className="block text-xs text-[var(--text-secondary)]">Próximo pago</label>
            <input type="date" value={newNextDate} onChange={(e) => setNewNextDate(e.target.value)} className="input-field" />

            <label className="block text-xs text-[var(--text-secondary)]">¿Hasta cuándo?</label>
            <select value={newEndOption} onChange={(e) => setNewEndOption(e.target.value)} className="input-field">
              {END_DATE_OPTIONS.map((opt) => (
                <option key={opt.label} value={'months' in opt ? opt.label : opt.value}>{opt.label}</option>
              ))}
            </select>
            {newEndOption === 'custom' && (
              <input type="date" value={newCustomEnd} onChange={(e) => setNewCustomEnd(e.target.value)} className="input-field" />
            )}

            {expenseCategories.length > 0 && (
              <>
                <label className="block text-xs text-[var(--text-secondary)]">Categoría</label>
                <div className="grid grid-cols-4 gap-2">
                  {expenseCategories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className={`flex flex-col items-center gap-1 p-2 rounded-card transition-all ${
                        newCatId === cat.id
                          ? 'bg-positive/10 border-2 border-positive'
                          : 'bg-[var(--bg-secondary)] border-2 border-transparent'
                      }`}
                      onClick={() => setNewCatId(cat.id)}
                    >
                      <span className="text-lg">{cat.emoji}</span>
                      <span className="text-[10px] font-medium">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="flex gap-3">
              <Button variant="secondary" type="button" onClick={() => setShowAddFixed(false)}>Cancelar</Button>
              <Button fullWidth type="submit">Agregar</Button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {fixedExpenses.map((expense) => (
            <SwipeableRow
              key={expense.id}
              onEdit={() => setEditingExpense(expense)}
              onDelete={() => deleteExpense(expense.id)}
            >
              <div className="flex items-center gap-3 p-4 rounded-card bg-[var(--bg-card)]" style={{ border: '0.5px solid var(--pill-border)' }}>
                {expense.category?.emoji && (
                  <span className="text-lg">{expense.category.emoji}</span>
                )}
                <div className="flex-1">
                  <p className="text-sm font-semibold">{expense.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    ${expense.amount.toLocaleString()} · Día {expense.day_of_month}
                  </p>
                </div>
              </div>
            </SwipeableRow>
          ))}
          {fixedExpenses.length === 0 && !showAddFixed && (
            <p className="text-center text-[var(--text-muted)] text-sm py-4">Sin gastos fijos</p>
          )}
        </div>
      </div>

      {/* ─── SECTION 2: MSI ─── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)]">Compras a MSI</h2>
          {!showAddMsi && (
            <button className="text-xs text-positive font-semibold" onClick={() => setShowAddMsi(true)}>
              + Agregar
            </button>
          )}
        </div>

        {showAddMsi && (
          <form onSubmit={handleAddMsi} className="rounded-card p-4 mb-3 space-y-3 bg-[var(--bg-card)]" style={{ border: '0.5px solid var(--pill-border)' }}>
            <input type="text" value={msiName} onChange={(e) => setMsiName(e.target.value)} placeholder="¿Qué compraste?" className="input-field" required autoFocus />

            <label className="block text-xs text-[var(--text-secondary)]">Total de la compra</label>
            <div className="flex items-center">
              <span className="text-lg font-bold mr-1">$</span>
              <input type="number" inputMode="decimal" value={msiAmount} onChange={(e) => setMsiAmount(e.target.value)} placeholder="1,199" className="input-field flex-1" required />
            </div>

            <label className="block text-xs text-[var(--text-secondary)]">Meses totales</label>
            <input type="number" inputMode="numeric" value={msiMonths} onChange={(e) => setMsiMonths(e.target.value)} placeholder="3" min={1} className="input-field" required />

            <label className="block text-xs text-[var(--text-secondary)]">Próximo cargo</label>
            <input type="date" value={msiNextDate} onChange={(e) => setMsiNextDate(e.target.value)} className="input-field" required />

            {/* Real-time preview */}
            {msiCalc && (
              <div className="bg-positive/10 rounded-btn p-3 text-center">
                <p className="text-xs text-positive font-semibold">
                  ${fmt(msiCalc.monthly)}/mes · {msiCalc.paidInstallments > 0 ? `${msiCalc.paidInstallments} pagados · ` : ''}{msiCalc.remaining} restantes · termina {new Date(msiCalc.endDate + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="secondary" type="button" onClick={() => setShowAddMsi(false)}>Cancelar</Button>
              <Button fullWidth type="submit" disabled={!msiCalc}>Agregar</Button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {[...msiExpenses]
            .sort((a, b) => {
              const aComplete = (a.paid_installments || 0) >= (a.total_installments || 1) ? 1 : 0
              const bComplete = (b.paid_installments || 0) >= (b.total_installments || 1) ? 1 : 0
              return aComplete - bComplete
            })
            .map((msi) => {
            const total = msi.total_installments || 1
            const paid = msi.paid_installments || 0
            const progress = Math.min(paid / total, 1)
            const isComplete = paid >= total
            const totalAmount = msi.total_amount || msi.amount * total
            const paidAmount = msi.amount * paid

            return (
              <SwipeableRow
                key={msi.id}
                onEdit={() => setEditingExpense(msi)}
                onDelete={() => deleteExpense(msi.id)}
              >
                <div
                  className="p-4 rounded-card bg-[var(--bg-card)]"
                  style={{
                    border: '0.5px solid var(--pill-border)',
                    opacity: isComplete ? 0.5 : 1,
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold flex-1">{msi.name}</p>
                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                      isComplete
                        ? 'bg-positive/10 text-positive'
                        : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      {isComplete ? '✓ Pagado' : 'MSI'}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mb-2">
                    ${fmt(msi.amount)}/mes · {paid} de {total} pagos
                  </p>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1">
                      <ProgressBar progress={progress} />
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] font-medium w-8 text-right">
                      {Math.round(progress * 100)}%
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Total: ${fmt(totalAmount)} · Pagado: ${fmt(paidAmount)}
                  </p>
                  {isComplete ? (
                    <p className="text-[11px] text-positive font-medium mt-1.5">
                      🎉 ¡Completado! Ahorraste ${fmt(msi.amount)}/mes
                    </p>
                  ) : (() => {
                    const remaining = total - paid
                    if (remaining === 1) {
                      return (
                        <p className="text-[11px] text-positive font-medium mt-1.5">
                          🎉 Último pago — terminas este mes
                        </p>
                      )
                    }
                    const dailyImpact = msi.amount / 2 / 15
                    return (
                      <p className="text-[11px] text-positive font-medium mt-1.5">
                        En {remaining} meses terminas · tu número grande sube ${fmt(dailyImpact)}/día
                      </p>
                    )
                  })()}
                </div>
              </SwipeableRow>
            )
          })}
          {msiExpenses.length === 0 && !showAddMsi && (
            <p className="text-center text-[var(--text-muted)] text-sm py-4">Sin compras a MSI</p>
          )}
        </div>
      </div>

      <EditExpenseModal
        expense={editingExpense}
        onClose={() => setEditingExpense(null)}
        onUpdate={updateExpense}
      />
    </div>
  )
}
