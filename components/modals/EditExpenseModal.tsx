'use client'

import { useState, useEffect } from 'react'
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
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (expense) {
      setName(expense.name)
      setAmount(String(expense.amount))
      setDayOfMonth(String(expense.day_of_month))
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
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-app bg-[var(--bg-card)] rounded-t-[24px] p-6 pb-8 animate-slide-up">
        <h2 className="text-lg font-bold mb-4">Editar gasto fijo</h2>

        <label className="block text-xs text-[var(--text-secondary)] mb-1">Nombre</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field mb-3" />

        <label className="block text-xs text-[var(--text-secondary)] mb-1">Monto</label>
        <div className="flex items-center mb-3">
          <span className="text-lg font-bold mr-1">$</span>
          <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="input-field flex-1" />
        </div>

        <label className="block text-xs text-[var(--text-secondary)] mb-1">Día del mes</label>
        <input type="number" inputMode="numeric" value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} min={1} max={31} className="input-field mb-6" />

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
