'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getLocalDateString } from '@/lib/date'
import { useFixedExpenses } from '@/hooks/useFixedExpenses'
import { useCategories } from '@/hooks/useCategories'
import EditExpenseModal from '@/components/modals/EditExpenseModal'
import SwipeableRow from '@/components/ui/SwipeableRow'
import Button from '@/components/ui/Button'
import type { FixedExpense } from '@/types'

const END_DATE_OPTIONS = [
  { label: 'Sin fecha de fin', value: '' },
  { label: '3 meses', months: 3 },
  { label: '6 meses', months: 6 },
  { label: '1 año', months: 12 },
  { label: '2 años', months: 24 },
  { label: 'Fecha específica', value: 'custom' },
]

export default function FixedExpensesPage() {
  const { expenses, createExpense, updateExpense, deleteExpense } =
    useFixedExpenses()
  const { expenseCategories } = useCategories()

  const [editingExpense, setEditingExpense] = useState<FixedExpense | null>(null)
  const [showAdd, setShowAdd] = useState(false)
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

  const handleAdd = async (e: React.FormEvent) => {
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
    })
    setShowAdd(false)
    setNewName('')
    setNewAmount('')
    setNewCatId(null)
  }

  return (
    <div className="min-h-screen p-4" style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="p-2 -ml-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold">Gastos fijos</h1>
        </div>
        {!showAdd && (
          <button className="text-sm text-positive font-semibold" onClick={() => setShowAdd(true)}>
            + Agregar
          </button>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="rounded-card p-4 mb-4 space-y-3 bg-[var(--bg-card)]" style={{ border: '0.5px solid var(--pill-border)' }}>
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
            <Button variant="secondary" type="button" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button fullWidth type="submit">Agregar</Button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="space-y-2">
        {expenses.map((expense) => (
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
        {expenses.length === 0 && !showAdd && (
          <div className="text-center py-12">
            <p className="text-[var(--text-muted)] text-sm mb-4">Sin gastos fijos</p>
            <Button onClick={() => setShowAdd(true)}>+ Agregar</Button>
          </div>
        )}
      </div>

      <EditExpenseModal
        expense={editingExpense}
        onClose={() => setEditingExpense(null)}
        onUpdate={updateExpense}
      />
    </div>
  )
}
