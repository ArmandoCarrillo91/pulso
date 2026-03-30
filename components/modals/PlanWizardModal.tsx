'use client'

import { useState, useEffect, useMemo } from 'react'
import { getLocalDateString } from '@/lib/date'
import {
  calculatePlanContribution,
  getNextOccurrence,
} from '@/lib/calculations'
import Button from '@/components/ui/Button'
import type { Plan, PlanType } from '@/types'

const MONTHS_FULL = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const PLAN_TYPES: { id: PlanType; label: string; emoji: string; color: string }[] = [
  { id: 'meta', label: 'Meta', emoji: '🎯', color: 'text-positive border-positive bg-positive/10' },
  { id: 'anual', label: 'Anual', emoji: '📅', color: 'text-amber-500 border-amber-500 bg-amber-500/10' },
  { id: 'estacional', label: 'Estacional', emoji: '🌊', color: 'text-purple-500 border-purple-500 bg-purple-500/10' },
]

interface PlanWizardModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (plan: Omit<Plan, 'id' | 'user_id'>) => Promise<unknown>
  currentBalance: number
  totalSavingsPerFortnight: number
  daysRemaining: number
}

export default function PlanWizardModal({
  isOpen,
  onClose,
  onSave,
  currentBalance,
  totalSavingsPerFortnight,
  daysRemaining,
}: PlanWizardModalProps) {
  const [step, setStep] = useState(1)
  const [planType, setPlanType] = useState<PlanType>('meta')
  const [name, setName] = useState('')
  const [goalAmount, setGoalAmount] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [recurrenceMonth, setRecurrenceMonth] = useState(12)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setPlanType('meta')
      setName('')
      setGoalAmount('')
      setTargetDate('')
      setRecurrenceMonth(12)
      setSaving(false)
    }
  }, [isOpen])

  const handleTypeSelect = (type: PlanType) => {
    setPlanType(type)
    setStep(2)
  }

  // Compute contribution in real time
  const contribution = useMemo(() => {
    const goal = parseFloat(goalAmount)
    if (!goal || goal <= 0) return null

    const start = new Date()
    let end: Date

    if (planType === 'anual') {
      end = getNextOccurrence(recurrenceMonth)
    } else {
      if (!targetDate) return null
      end = new Date(targetDate + 'T12:00:00')
      if (end <= start) return null
    }

    return calculatePlanContribution(goal, start, end)
  }, [goalAmount, targetDate, recurrenceMonth, planType])

  const resolvedTargetDate = useMemo(() => {
    if (planType === 'anual') {
      return getLocalDateString(getNextOccurrence(recurrenceMonth))
    }
    return targetDate
  }, [planType, recurrenceMonth, targetDate])

  // Impact preview
  const currentDaily =
    daysRemaining > 0
      ? (currentBalance - totalSavingsPerFortnight) / daysRemaining
      : 0
  const newDaily =
    daysRemaining > 0 && contribution
      ? (currentBalance - totalSavingsPerFortnight - contribution.amountPerFortnight) / daysRemaining
      : currentDaily

  const handleConfirm = async () => {
    if (!contribution || !name.trim()) return
    setSaving(true)

    await onSave({
      name: name.trim(),
      amount_per_fortnight: contribution.amountPerFortnight,
      goal_amount: parseFloat(goalAmount),
      time_value: contribution.fortnightsRemaining,
      time_unit: 'fortnights',
      priority: 999,
      plan_type: planType,
      start_date: getLocalDateString(),
      target_date: resolvedTargetDate || null,
      current_amount: 0,
      recurrence_month: planType === 'anual' ? recurrenceMonth : null,
    })

    setSaving(false)
    onClose()
  }

  if (!isOpen) return null

  const typeInfo = PLAN_TYPES.find((t) => t.id === planType)!
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

        {/* Step 1: Type */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-bold mb-4">Tipo de plan</h2>
            <div className="space-y-3">
              {PLAN_TYPES.map((t) => (
                <button
                  key={t.id}
                  className={`w-full flex items-center gap-4 p-4 rounded-card border-2 transition-all ${t.color}`}
                  onClick={() => handleTypeSelect(t.id)}
                >
                  <span className="text-3xl">{t.emoji}</span>
                  <div className="text-left">
                    <p className="font-semibold">{t.label}</p>
                    <p className="text-xs opacity-70">
                      {t.id === 'meta' && 'Ahorra para una meta específica'}
                      {t.id === 'anual' && 'Gasto que se repite cada año'}
                      {t.id === 'estacional' && 'Ahorro por temporada'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-bold mb-4">Detalles del plan</h2>

            <label className="block text-xs text-[var(--text-secondary)] mb-1">
              Nombre
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                planType === 'meta'
                  ? 'Ej: Fondo de emergencia'
                  : planType === 'anual'
                    ? 'Ej: Seguro del auto'
                    : 'Ej: Vacaciones de verano'
              }
              className="input-field mb-3"
              autoFocus
            />

            <label className="block text-xs text-[var(--text-secondary)] mb-1">
              Monto meta
            </label>
            <div className="flex items-center mb-3">
              <span className="text-lg font-bold mr-1">$</span>
              <input
                type="number"
                inputMode="decimal"
                value={goalAmount}
                onChange={(e) => setGoalAmount(e.target.value)}
                placeholder="0.00"
                className="input-field flex-1"
              />
            </div>

            {planType === 'anual' ? (
              <>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  Mes de pago
                </label>
                <select
                  value={recurrenceMonth}
                  onChange={(e) => setRecurrenceMonth(parseInt(e.target.value))}
                  className="input-field mb-3"
                >
                  {MONTHS_FULL.map((m, i) => (
                    <option key={i} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  Fecha límite
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  min={todayMin}
                  className="input-field mb-3"
                />
              </>
            )}

            {/* Live calculation */}
            {contribution && (
              <div className="bg-positive/10 rounded-btn p-3 mb-4">
                <p className="text-sm text-positive font-semibold">
                  ${fmt(contribution.amountPerFortnight)}/quincena
                </p>
                <p className="text-xs text-positive/70">
                  {contribution.fortnightsRemaining} quincenas · incluye 10% de margen
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(1)}>
                Atrás
              </Button>
              <Button
                fullWidth
                disabled={!name.trim() || !contribution}
                onClick={() => setStep(3)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && contribution && (
          <div>
            <h2 className="text-lg font-bold mb-4">Confirmar plan</h2>

            <div className="card mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{typeInfo.emoji}</span>
                <p className="font-bold">{name}</p>
                <span
                  className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${typeInfo.color}`}
                >
                  {typeInfo.label}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Meta</span>
                  <span className="font-semibold">${fmt(parseFloat(goalAmount))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Por quincena</span>
                  <span className="font-semibold text-positive">
                    ${fmt(contribution.amountPerFortnight)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Duración</span>
                  <span>{contribution.fortnightsRemaining} quincenas</span>
                </div>
                {resolvedTargetDate && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Vence</span>
                    <span>
                      {new Date(resolvedTargetDate + 'T12:00:00').toLocaleDateString(
                        'es-MX',
                        { day: 'numeric', month: 'short', year: 'numeric' }
                      )}
                    </span>
                  </div>
                )}
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
