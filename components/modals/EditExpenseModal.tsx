'use client'

import { useState, useEffect } from 'react'
import { EXPENSE_CATEGORIES } from '@/lib/categories'
import Button from '@/components/ui/Button'
import type { FixedExpense } from '@/types'

interface EditExpenseModalProps {
  expense: FixedExpense | null
  onClose: () => void
  onUpdate: (id: string, updates: Partial<FixedExpense>) => Promise<void>
}

export default function EditExpenseModal({
  expense,
  onClose,
  onUpdate,
}: EditExpenseModalProps) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [dayOfMonth, setDayOfMonth] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [categoryLabel, setCategoryLabel] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (expense) {
      setName(expense.name)
      setAmount(String(expense.amount))
      setDayOfMonth(String(expense.day_of_month))
      setCategoryId(expense.category_id || '')
      setCategoryLabel(expense.category_label || '')
    }
  }, [expense])

  if (!expense) return null

  const handleSave = async () => {
    const amt = parseFloat(amount)
    const day = parseInt(dayOfMonth)
    if (!name.trim() || !amt || !day) return
    setSaving(true)

    await onUpdate(expense.id, {
      name: name.trim(),
      amount: amt,
      day_of_month: day,
      category_id: categoryId || null,
      category_label: categoryLabel || null,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-app bg-[var(--bg-card)] rounded-t-[24px] p-6 pb-8 animate-slide-up max-h-[85vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">Editar gasto fijo</h2>

        <label className="block text-xs text-[var(--text-secondary)] mb-1">Nombre</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field mb-3" />

        <label className="block text-xs text-[var(--text-secondary)] mb-1">Monto</label>
        <div className="flex items-center mb-3">
          <span className="text-lg font-bold mr-1">$</span>
          <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="input-field flex-1" />
        </div>

        <label className="block text-xs text-[var(--text-secondary)] mb-1">Día del mes</label>
        <input type="number" inputMode="numeric" value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} min={1} max={31} className="input-field mb-3" />

        <label className="block text-xs text-[var(--text-secondary)] mb-2">Categoría</label>
        <div className="grid grid-cols-4 gap-2 mb-6">
          {EXPENSE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`flex flex-col items-center gap-1 p-2 rounded-card transition-all ${
                categoryId === cat.id
                  ? 'bg-positive/10 border-2 border-positive'
                  : 'bg-[var(--bg-secondary)] border-2 border-transparent'
              }`}
              onClick={() => { setCategoryId(cat.id); setCategoryLabel(cat.label) }}
            >
              <span className="text-lg">{cat.emoji}</span>
              <span className="text-[10px] font-medium">{cat.label}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button fullWidth disabled={!name.trim() || saving} onClick={handleSave}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
