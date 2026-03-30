'use client'

import { useState, useEffect } from 'react'
import { useCategories } from '@/hooks/useCategories'
import { getLocalDateString } from '@/lib/date'
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
  const [nextPaymentDate, setNextPaymentDate] = useState('')
  const [endDateOption, setEndDateOption] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const { expenseCategories } = useCategories()

  useEffect(() => {
    if (expense) {
      setName(expense.name)
      setAmount(String(expense.amount))
      setCategoryId(expense.category_id)

      if (expense.next_payment_date) {
        setNextPaymentDate(expense.next_payment_date)
      } else {
        const d = new Date()
        d.setMonth(d.getMonth() + 1)
        d.setDate(expense.day_of_month)
        setNextPaymentDate(getLocalDateString(d))
      }

      if (expense.end_date) {
        setEndDateOption('custom')
        setCustomEndDate(expense.end_date)
      } else {
        setEndDateOption('')
      }
    }
  }, [expense])

  if (!expense) return null

  const resolveEndDate = (): string | null => {
    if (!endDateOption) return null
    if (endDateOption === 'custom') return customEndDate || null
    const opt = END_DATE_OPTIONS.find((o) => 'months' in o && o.label === endDateOption)
    if (opt && 'months' in opt) {
      const d = new Date()
      d.setMonth(d.getMonth() + opt.months!)
      return getLocalDateString(d)
    }
    return null
  }

  const handleSave = async () => {
    const amt = parseFloat(amount)
    if (!name.trim() || !amt) return
    setSaving(true)

    const payDate = nextPaymentDate ? new Date(nextPaymentDate + 'T12:00:00') : new Date()

    await onUpdate(expense.id, {
      name: name.trim(),
      amount: amt,
      day_of_month: payDate.getDate(),
      category_id: categoryId,
      next_payment_date: nextPaymentDate || null,
      end_date: resolveEndDate(),
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

        <label className="block text-xs text-[var(--text-secondary)] mb-1">Próximo pago</label>
        <input type="date" value={nextPaymentDate} onChange={(e) => setNextPaymentDate(e.target.value)} className="input-field mb-3" />

        <label className="block text-xs text-[var(--text-secondary)] mb-1">¿Hasta cuándo?</label>
        <select
          value={endDateOption}
          onChange={(e) => setEndDateOption(e.target.value)}
          className="input-field mb-3"
        >
          {END_DATE_OPTIONS.map((opt) => (
            <option key={opt.label} value={'months' in opt ? opt.label : opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {endDateOption === 'custom' && (
          <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="input-field mb-3" />
        )}

        {expenseCategories.length > 0 && (
          <>
            <label className="block text-xs text-[var(--text-secondary)] mb-2">Categoría</label>
            <div className="grid grid-cols-4 gap-2 mb-6">
              {expenseCategories.map((cat) => (
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
          </>
        )}

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
