'use client'

import { useState, useMemo } from 'react'
import { usePlans } from '@/hooks/usePlans'
import { useTransactions } from '@/hooks/useTransactions'
import { usePayday } from '@/hooks/usePayday'
import PlanWizardModal from '@/components/modals/PlanWizardModal'
import EditPlanModal from '@/components/modals/EditPlanModal'
import SwipeableRow from '@/components/ui/SwipeableRow'
import Toast from '@/components/ui/Toast'
import ProgressBar from '@/components/ui/ProgressBar'
import Button from '@/components/ui/Button'
import { PlanListSkeleton } from '@/components/ui/Skeleton'
import type { Plan } from '@/types'

const MONTHS_SHORT = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
]

function fmt(n: number) {
  return Math.abs(n).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T12:00:00')
  return Math.max(Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)), 0)
}

function planProgress(plan: Plan) {
  if (!plan.goal_amount) return 0
  return Math.min((plan.current_amount || 0) / plan.goal_amount, 1)
}

export default function PlanesPage() {
  const {
    plans,
    loading,
    totalSavingsPerFortnight,
    createPlan,
    updatePlan,
    deletePlan,
    toastMsg,
    clearToast,
  } = usePlans()
  const { transactions, currentBalance } = useTransactions()

  const lastIncomeDate = useMemo(() => {
    const income = transactions.find((t) => t.type === 'income')
    return income?.date ?? null
  }, [transactions])

  const { daysRemaining, nextPayday } = usePayday(lastIncomeDate)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)

  return (
    <div className="min-h-screen p-4" style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
      {/* Header with + button */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold">Mis planes</h1>
        <button
          className="text-sm text-positive font-semibold"
          onClick={() => setWizardOpen(true)}
        >
          + Nueva
        </button>
      </div>

      {loading && <PlanListSkeleton />}

      {!loading && plans.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[var(--text-muted)] text-sm mb-4">
            No tienes planes de ahorro
          </p>
          <Button onClick={() => setWizardOpen(true)}>+ Nuevo plan</Button>
        </div>
      )}

      <div className="space-y-3">
        {plans.map((plan) => {
          const progress = planProgress(plan)
          const remaining = daysUntil(plan.target_date || '')

          return (
            <SwipeableRow
              key={plan.id}
              onEdit={() => setEditingPlan(plan)}
              onDelete={() => deletePlan(plan.id)}
            >
              <div
                className="rounded-card p-4 bg-[var(--bg-card)]"
                style={{ border: '0.5px solid var(--pill-border)' }}
              >
                <p className="font-semibold text-sm mb-1">{plan.name}</p>
                <p className="text-xs text-[var(--text-secondary)] mb-2">
                  ${fmt(plan.amount_per_fortnight)}/quincena
                </p>
                <ProgressBar progress={progress} className="mb-2" />
                <p className="text-[11px] text-[var(--text-muted)]">
                  ${fmt(plan.current_amount || 0)} de ${fmt(plan.goal_amount)}
                </p>
                <div className="mt-1.5 space-y-0.5">
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Inicia: {fmtDate(plan.start_date)}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Vence: {plan.target_date ? fmtDate(plan.target_date) : 'Sin fecha límite'}
                  </p>
                  {plan.target_date && (
                    <p className="text-[11px] text-[var(--text-secondary)] font-medium">
                      {remaining} días restantes
                    </p>
                  )}
                </div>
              </div>
            </SwipeableRow>
          )
        })}
      </div>

      <EditPlanModal
        plan={editingPlan}
        onClose={() => setEditingPlan(null)}
        onUpdate={updatePlan}
      />

      <PlanWizardModal
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSave={createPlan}
        currentBalance={currentBalance}
        totalSavingsPerFortnight={totalSavingsPerFortnight}
        daysRemaining={daysRemaining}
        nextPayday={nextPayday}
        plansCount={plans.length}
      />

      <Toast message={toastMsg} visible={!!toastMsg} onHide={clearToast} />
    </div>
  )
}
