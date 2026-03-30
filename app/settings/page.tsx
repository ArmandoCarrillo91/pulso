'use client'

import { useState } from 'react'
import Link from 'next/link'
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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(newAmount)
    const day = parseInt(newDay)
    if (!newName.trim() || !amt || !day) return
    await createExpense({ name: newName.trim(), amount: amt, day_of_month: day })
    setShowAdd(false)
    setNewName('')
    setNewAmount('')
    setNewDay('')
  }

  return (
    <div className="min-h-screen p-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="p-2 -ml-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-lg font-bold">Configuración</h1>
      </div>

      {/* Fixed Expenses */}
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
                <p className="font-semibold text-sm">{expense.name}</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  ${expense.amount.toLocaleString()} · Día {expense.day_of_month}
                </p>
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

      {/* Edit Expense Modal */}
      <EditExpenseModal
        expense={editingExpense}
        onClose={() => setEditingExpense(null)}
        onUpdate={updateExpense}
      />
    </div>
  )
}
