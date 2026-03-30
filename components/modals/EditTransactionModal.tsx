'use client'

import { useState, useEffect } from 'react'
import { useCategories } from '@/hooks/useCategories'
import { getLocalDateString } from '@/lib/date'
import Button from '@/components/ui/Button'
import type { Transaction } from '@/types'

interface EditTransactionModalProps {
  transaction: Transaction | null
  onClose: () => void
  onUpdate: (id: string, updates: Partial<Transaction>) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
}

export default function EditTransactionModal({
  transaction,
  onClose,
  onUpdate,
  onDelete,
}: EditTransactionModalProps) {
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { incomeCategories, expenseCategories } = useCategories()

  useEffect(() => {
    if (transaction) {
      setType(transaction.type)
      setCategoryId(transaction.category_id)
      setAmount(String(transaction.amount))
      setNote(transaction.note || '')
      setDate(transaction.date)
      setConfirmDelete(false)
    }
  }, [transaction])

  if (!transaction) return null

  const categories = type === 'income' ? incomeCategories : expenseCategories

  const handleSave = async () => {
    const parsed = parseFloat(amount)
    if (!parsed || parsed <= 0) return
    setSaving(true)

    const dateObj = new Date(date + 'T12:00:00')

    const ok = await onUpdate(transaction.id, {
      type,
      category_id: categoryId,
      amount: parsed,
      note: note.trim() || null,
      date,
      weekday: dateObj.getDay(),
      is_weekend: dateObj.getDay() === 0 || dateObj.getDay() === 6,
    })
    setSaving(false)
    if (ok) onClose()
  }

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    const ok = await onDelete(transaction.id)
    if (ok) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-app bg-[var(--bg-card)] rounded-t-[24px] p-6 pb-8 animate-slide-up max-h-[85vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">Editar movimiento</h2>

        {/* Type toggle */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            className={`p-3 rounded-card text-center font-semibold text-sm transition-all ${
              type === 'income'
                ? 'bg-positive/10 text-positive border-2 border-positive'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-2 border-transparent'
            }`}
            onClick={() => setType('income')}
          >
            Ingreso
          </button>
          <button
            className={`p-3 rounded-card text-center font-semibold text-sm transition-all ${
              type === 'expense'
                ? 'bg-negative/10 text-negative border-2 border-negative'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-2 border-transparent'
            }`}
            onClick={() => setType('expense')}
          >
            Gasto
          </button>
        </div>

        {/* Category grid */}
        <label className="block text-xs text-[var(--text-secondary)] mb-2">
          Categoría
        </label>
        {categories.length > 0 ? (
          <div className="grid grid-cols-4 gap-2 mb-4">
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`flex flex-col items-center gap-1 p-2 rounded-card transition-all ${
                  categoryId === cat.id
                    ? 'bg-positive/10 border-2 border-positive'
                    : 'bg-[var(--bg-secondary)] border-2 border-transparent'
                }`}
                onClick={() => setCategoryId(cat.id)}
              >
                <span className="text-lg">{cat.emoji}</span>
                <span className="text-[10px] font-medium">{cat.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Sin categorías de {type === 'income' ? 'ingreso' : 'gasto'}
          </p>
        )}

        {/* Amount */}
        <label className="block text-xs text-[var(--text-secondary)] mb-1">
          Monto
        </label>
        <div className="flex items-center mb-3">
          <span className="text-lg font-bold mr-1">$</span>
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input-field flex-1"
          />
        </div>

        {/* Note */}
        <label className="block text-xs text-[var(--text-secondary)] mb-1">
          Nota
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Opcional"
          className="input-field mb-3"
        />

        {/* Date */}
        <label className="block text-xs text-[var(--text-secondary)] mb-1">
          Fecha
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          max={getLocalDateString()}
          className="input-field mb-6"
        />

        {/* Actions */}
        <div className="flex gap-3">
          <button
            className={`py-3 px-4 rounded-btn font-semibold text-sm transition-colors ${
              confirmDelete
                ? 'bg-negative text-white'
                : 'text-negative border border-negative'
            }`}
            onClick={handleDelete}
          >
            {confirmDelete ? '¿Seguro?' : 'Eliminar'}
          </button>
          <Button
            fullWidth
            disabled={
              !amount || parseFloat(amount) <= 0 || saving
            }
            onClick={handleSave}
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
