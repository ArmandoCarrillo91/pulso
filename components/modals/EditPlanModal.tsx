'use client'

import { useState, useEffect } from 'react'
import { getLocalDateString } from '@/lib/date'
import Button from '@/components/ui/Button'
import type { Plan } from '@/types'

interface EditPlanModalProps {
  plan: Plan | null
  onClose: () => void
  onUpdate: (id: string, updates: Partial<Plan>) => Promise<void>
}

export default function EditPlanModal({
  plan,
  onClose,
  onUpdate,
}: EditPlanModalProps) {
  const [name, setName] = useState('')
  const [goalAmount, setGoalAmount] = useState('')
  const [amountPerFortnight, setAmountPerFortnight] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (plan) {
      setName(plan.name)
      setGoalAmount(String(plan.goal_amount))
      setAmountPerFortnight(String(plan.amount_per_fortnight))
      setTargetDate(plan.target_date || '')
    }
  }, [plan])

  if (!plan) return null

  const handleSave = async () => {
    const goal = parseFloat(goalAmount)
    const perFn = parseFloat(amountPerFortnight)
    if (!name.trim() || !goal || !perFn) return
    setSaving(true)

    await onUpdate(plan.id, {
      name: name.trim(),
      goal_amount: goal,
      amount_per_fortnight: perFn,
      target_date: targetDate || null,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-app bg-[var(--bg-card)] rounded-t-[24px] p-6 pb-8 animate-slide-up max-h-[85vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">Editar plan</h2>

        <label className="block text-xs text-[var(--text-secondary)] mb-1">Nombre</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field mb-3" />

        <label className="block text-xs text-[var(--text-secondary)] mb-1">Meta</label>
        <div className="flex items-center mb-3">
          <span className="text-lg font-bold mr-1">$</span>
          <input type="number" inputMode="decimal" value={goalAmount} onChange={(e) => setGoalAmount(e.target.value)} className="input-field flex-1" />
        </div>

        <label className="block text-xs text-[var(--text-secondary)] mb-1">Por quincena</label>
        <div className="flex items-center mb-3">
          <span className="text-lg font-bold mr-1">$</span>
          <input type="number" inputMode="decimal" value={amountPerFortnight} onChange={(e) => setAmountPerFortnight(e.target.value)} className="input-field flex-1" />
        </div>

        <label className="block text-xs text-[var(--text-secondary)] mb-1">Fecha límite</label>
        <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} min={getLocalDateString()} className="input-field mb-6" />

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
