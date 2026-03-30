'use client'

import { useState, useEffect, useMemo } from 'react'
import { getLocalDateString } from '@/lib/date'
import { calculatePlanContribution } from '@/lib/calculations'
import Button from '@/components/ui/Button'
import type { Plan } from '@/types'

interface PlanWizardModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (plan: Omit<Plan, 'id' | 'user_id'>) => Promise<unknown>
  currentBalance: number
  totalSavingsPerFortnight: number
  daysRemaining: number
  nextPayday: Date
  plansCount: number
}

export default function PlanWizardModal({
  isOpen,
  onClose,
  onSave,
  currentBalance,
  totalSavingsPerFortnight,
  daysRemaining,
  nextPayday,
  plansCount,
}: PlanWizardModalProps) {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [goalAmount, setGoalAmount] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setName('')
      setGoalAmount('')
      setTargetDate('')
      setSaving(false)
    }
  }, [isOpen])

  // Compute contribution in real time
  const contribution = useMemo(() => {
    const goal = parseFloat(goalAmount)
    if (!goal || goal <= 0) return null
    if (!targetDate) return null

    const start = new Date()
    const end = new Date(targetDate + 'T12:00:00')
    if (end <= start) return null

    return calculatePlanContribution(goal, start, end)
  }, [goalAmount, targetDate])

  // Impact preview
  const currentDaily =
    daysRemaining > 0
      ? (currentBalance - totalSavingsPerFortnight) / daysRemaining
      : 0

  const perFortnight = contribution?.amountPerFortnight ?? 0

  const newDaily =
    daysRemaining > 0 && perFortnight > 0
      ? (currentBalance - totalSavingsPerFortnight - perFortnight) / daysRemaining
      : currentDaily

  const handleConfirm = async () => {
    if (!name.trim() || !parseFloat(goalAmount)) return
    setSaving(true)

    await onSave({
      name: name.trim(),
      amount_per_fortnight: perFortnight,
      goal_amount: parseFloat(goalAmount),
      priority: plansCount,
      start_date: getLocalDateString(nextPayday),
      target_date: targetDate || null,
      current_amount: 0,
    })

    setSaving(false)
    onClose()
  }

  if (!isOpen) return null

  const todayMin = getLocalDateString()

  const fmt = (n: number) =>
    Math.abs(n).toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-app bg-[var(--bg-card)] rounded-t-[24px] p-6 pb-8 animate-slide-up max-h-[85vh] overflow-y-auto">
        {/* Progress */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-positive' : 'bg-[var(--bg-secondary)]'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Name */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-bold mb-6 text-center">
              Nuevo plan de ahorro
            </h2>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) setStep(2)
              }}
              placeholder="¿Para qué estás ahorrando?"
              className="w-full text-center text-xl font-semibold bg-transparent outline-none border-b-2 border-[var(--border-color)] focus:border-positive pb-3 mb-8 transition-colors"
              autoFocus
            />
            <Button
              fullWidth
              disabled={!name.trim()}
              onClick={() => setStep(2)}
            >
              Siguiente
            </Button>
          </div>
        )}

        {/* Step 2: Amount + Date */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-bold mb-4">{name}</h2>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  ¿Cuánto necesitas?
                </label>
                <div className="flex items-center">
                  <span className="text-lg font-bold mr-1">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={goalAmount}
                    onChange={(e) => setGoalAmount(e.target.value)}
                    placeholder="0.00"
                    className="input-field flex-1"
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  ¿Para cuándo?
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  min={todayMin}
                  placeholder="Sin fecha límite"
                  className="input-field"
                />
              </div>
            </div>

            {/* Live calculation */}
            <div className="bg-[var(--bg-secondary)] rounded-btn p-3 mb-4 min-h-[52px] flex items-center justify-center">
              {contribution ? (
                <p className="text-sm text-positive font-semibold text-center">
                  Apartarás ${fmt(contribution.amountPerFortnight)} cada quincena
                </p>
              ) : targetDate && parseFloat(goalAmount) > 0 ? (
                <p className="text-sm text-negative text-center">
                  La fecha debe ser futura
                </p>
              ) : !targetDate && parseFloat(goalAmount) > 0 ? (
                <p className="text-sm text-[var(--text-muted)] text-center">
                  Tú decides cuándo termina
                </p>
              ) : (
                <p className="text-sm text-[var(--text-muted)] text-center">
                  Ingresa monto y fecha para calcular
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(1)}>
                Atrás
              </Button>
              <Button
                fullWidth
                disabled={!parseFloat(goalAmount)}
                onClick={() => setStep(3)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Impact confirmation */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-bold mb-4">Confirmar plan</h2>

            <div className="card mb-4">
              <p className="font-bold mb-3">{name}</p>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Meta</span>
                  <span className="font-semibold">${fmt(parseFloat(goalAmount) || 0)}</span>
                </div>
                {contribution && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Por quincena</span>
                      <span className="font-semibold text-positive">
                        ${fmt(contribution.amountPerFortnight)}
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      incluye 10% margen de seguridad
                    </p>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Fecha límite</span>
                  <span>
                    {targetDate
                      ? new Date(targetDate + 'T12:00:00').toLocaleDateString(
                          'es-MX',
                          { day: 'numeric', month: 'short', year: 'numeric' }
                        )
                      : 'Sin fecha límite'}
                  </span>
                </div>
              </div>
            </div>

            {/* Impact preview */}
            <div className="card mb-6">
              <p className="text-xs text-[var(--text-secondary)] mb-2 font-medium uppercase tracking-wider">
                Impacto en tu día
              </p>
              <div className="flex items-center justify-center gap-3">
                <div className="text-center">
                  <p className="text-xs text-[var(--text-muted)]">Actual</p>
                  <p
                    className={`text-lg font-bold ${
                      currentDaily >= 0 ? 'text-positive' : 'text-negative'
                    }`}
                  >
                    ${fmt(currentDaily)}
                  </p>
                </div>
                <span className="text-[var(--text-muted)]">→</span>
                <div className="text-center">
                  <p className="text-xs text-[var(--text-muted)]">Nuevo</p>
                  <p
                    className={`text-lg font-bold ${
                      newDaily >= 0 ? 'text-positive' : 'text-negative'
                    }`}
                  >
                    ${fmt(newDaily)}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-[var(--text-muted)] text-center mb-4">
              Empieza a descontar en tu próxima quincena:{' '}
              <span className="font-semibold text-[var(--text-secondary)]">
                {nextPayday.toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            </p>

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(2)}>
                Atrás
              </Button>
              <Button fullWidth disabled={saving} onClick={handleConfirm}>
                {saving ? 'Guardando...' : 'Activar plan'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
