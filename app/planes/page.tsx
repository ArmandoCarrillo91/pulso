'use client'

import { useState } from 'react'
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
import type { Plan, PlanType } from '@/types'

const TYPE_BADGE: Record<PlanType, { label: string; emoji: string; cls: string }> = {
  meta: { label: 'Meta', emoji: '🎯', cls: 'text-positive bg-positive/10' },
  anual: { label: 'Anual', emoji: '📅', cls: 'text-amber-500 bg-amber-500/10' },
  estacional: { label: 'Estacional', emoji: '🌊', cls: 'text-purple-500 bg-purple-500/10' },
}

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

function planProgress(plan: Plan) {
  if (!plan.goal_amount) return 0
  return Math.min((plan.current_amount || 0) / plan.goal_amount, 1)
}

function planEta(plan: Plan): string {
  const parts: string[] = []
  parts.push(`$${fmt(plan.current_amount || 0)} de $${fmt(plan.goal_amount)}`)

  const remaining = plan.goal_amount - (plan.current_amount || 0)
  if (plan.amount_per_fortnight > 0 && remaining > 0) {
    const fn = Math.ceil(remaining / plan.amount_per_fortnight)
    parts.push(`faltan ${fn} quincenas`)
  }

  if (plan.target_date) {
    const d = new Date(plan.target_date + 'T12:00:00')
    parts.push(`vence ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`)
  }

  return parts.join(' · ')
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
  const { currentBalance } = useTransactions()
  const { daysRemaining, nextPayday } = usePayday()
  const [wizardOpen, setWizardOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)

  return (
    <div className="min-h-screen p-4" style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
      <div className="mb-6">
        <h1 className="text-lg font-bold">Mis planes</h1>
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
          const badge = TYPE_BADGE[plan.plan_type] || TYPE_BADGE.meta
          const progress = planProgress(plan)

          return (
            <SwipeableRow
              key={plan.id}
              onEdit={() => setEditingPlan(plan)}
              onDelete={() => deletePlan(plan.id)}
            >
              <div className="card">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{badge.emoji}</span>
                  <p className="font-semibold text-sm flex-1">{plan.name}</p>
                  <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mb-2">
                  ${fmt(plan.amount_per_fortnight)}/quincena · {plan.time_value} quincenas
                </p>
                <ProgressBar progress={progress} className="mb-1.5" />
                <p className="text-[11px] text-[var(--text-muted)]">{planEta(plan)}</p>
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
      />

      <Toast message={toastMsg} visible={!!toastMsg} onHide={clearToast} />
    </div>
  )
}
