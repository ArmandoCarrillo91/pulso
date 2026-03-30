'use client'

import { useState } from 'react'
import Link from 'next/link'
import { EXPENSE_CATEGORIES, getCategoryEmoji } from '@/lib/categories'
import { useFixedExpenses } from '@/hooks/useFixedExpenses'
import EditExpenseModal from '@/components/modals/EditExpenseModal'
import SwipeableRow from '@/components/ui/SwipeableRow'
import Button from '@/components/ui/Button'
import type { FixedExpense } from '@/types'

export default function SettingsPage() {
  const {
    expenses,
    createExpense,
    updateExpense,
    deleteExpense,
  } = useFixedExpenses()

  const [editingExpense, setEditingExpense] = useState<FixedExpense | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newDay, setNewDay] = useState('')
  const [newCatId, setNewCatId] = useState('')
  const [newCatLabel, setNewCatLabel] = useState('')

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(newAmount)
    const day = parseInt(newDay)
    if (!newName.trim() || !amt || !day) return
    await createExpense({
      name: newName.trim(),
      amount: amt,
      day_of_month: day,
      category_id: newCatId || null,
      category_label: newCatLabel || null,
    })
    setShowAdd(false)
    setNewName('')
    setNewAmount('')
    setNewDay('')
    setNewCatId('')
    setNewCatLabel('')
  }

  return (
    <div className="min-h-screen p-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="p-2 -ml-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-lg font-bold">Configuración</h1>
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold">Gastos fijos</h2>
          {!showAdd && (
            <button className="text-sm text-positive font-semibold" onClick={() => setShowAdd(true)}>
              + Agregar
            </button>
          )}
        </div>

        {showAdd && (
          <form onSubmit={handleAdd} className="card mb-4 space-y-3">
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre del gasto" className="input-field" required />
            <input type="number" inputMode="decimal" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="Monto" className="input-field" required />
            <input type="number" inputMode="numeric" value={newDay} onChange={(e) => setNewDay(e.target.value)} placeholder="Día del mes (1-31)" className="input-field" min={1} max={31} required />

            <label className="block text-xs text-[var(--text-secondary)]">Categoría</label>
            <div className="grid grid-cols-4 gap-2">
              {EXPENSE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`flex flex-col items-center gap-1 p-2 rounded-card transition-all ${
                    newCatId === cat.id
                      ? 'bg-positive/10 border-2 border-positive'
                      : 'bg-[var(--bg-secondary)] border-2 border-transparent'
                  }`}
                  onClick={() => { setNewCatId(cat.id); setNewCatLabel(cat.label) }}
                >
                  <span className="text-lg">{cat.emoji}</span>
                  <span className="text-[10px] font-medium">{cat.label}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" type="button" onClick={() => setShowAdd(false)}>Cancelar</Button>
              <Button fullWidth type="submit">Agregar</Button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {expenses.map((expense) => (
            <SwipeableRow
              key={expense.id}
              onTap={() => setEditingExpense(expense)}
              onDelete={() => deleteExpense(expense.id)}
            >
              <div className="card">
                <div className="flex items-center gap-2">
                  {expense.category_id && (
                    <span className="text-lg">{getCategoryEmoji(expense.category_id)}</span>
                  )}
                  <div>
                    <p className="font-semibold text-sm">{expense.name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      ${expense.amount.toLocaleString()} · Día {expense.day_of_month}
                    </p>
                  </div>
                </div>
              </div>
            </SwipeableRow>
          ))}
          {expenses.length === 0 && !showAdd && (
            <p className="text-sm text-[var(--text-muted)] text-center py-4">
              No tienes gastos fijos
            </p>
          )}
        </div>
      </section>

      <EditExpenseModal
        expense={editingExpense}
        onClose={() => setEditingExpense(null)}
        onUpdate={updateExpense}
      />
    </div>
  )
}
