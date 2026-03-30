'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePlans } from '@/hooks/usePlans'
import { useFixedExpenses } from '@/hooks/useFixedExpenses'
import Button from '@/components/ui/Button'
import ProgressBar from '@/components/ui/ProgressBar'
import type { Plan, FixedExpense } from '@/types'

function PlanForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Plan
  onSubmit: (data: Omit<Plan, 'id' | 'user_id'>) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name || '')
  const [amountPerFortnight, setAmountPerFortnight] = useState(
    initial?.amount_per_fortnight?.toString() || ''
  )
  const [goalAmount, setGoalAmount] = useState(
    initial?.goal_amount?.toString() || ''
  )
  const [timeValue, setTimeValue] = useState(
    initial?.time_value?.toString() || ''
  )
  const [timeUnit, setTimeUnit] = useState<Plan['time_unit']>(
    initial?.time_unit || 'fortnights'
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      name,
      amount_per_fortnight: parseFloat(amountPerFortnight),
      goal_amount: parseFloat(goalAmount),
      time_value: parseInt(timeValue),
      time_unit: timeUnit,
      priority: initial?.priority || 999,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 card mb-4">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre del plan"
        className="input-field"
        required
      />
      <input
        type="number"
        inputMode="decimal"
        value={amountPerFortnight}
        onChange={(e) => setAmountPerFortnight(e.target.value)}
        placeholder="Monto por quincena"
        className="input-field"
        required
      />
      <input
        type="number"
        inputMode="decimal"
        value={goalAmount}
        onChange={(e) => setGoalAmount(e.target.value)}
        placeholder="Meta total"
        className="input-field"
        required
      />
      <div className="flex gap-3">
        <input
          type="number"
          inputMode="numeric"
          value={timeValue}
          onChange={(e) => setTimeValue(e.target.value)}
          placeholder="Duración"
          className="input-field flex-1"
          required
        />
        <select
          value={timeUnit}
          onChange={(e) => setTimeUnit(e.target.value as Plan['time_unit'])}
          className="input-field flex-1"
        >
          <option value="fortnights">Quincenas</option>
          <option value="months">Meses</option>
          <option value="days">Días</option>
        </select>
      </div>
      <div className="flex gap-3">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button fullWidth type="submit">
          {initial ? 'Actualizar' : 'Agregar'}
        </Button>
      </div>
    </form>
  )
}

function ExpenseForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: FixedExpense
  onSubmit: (data: Omit<FixedExpense, 'id' | 'user_id'>) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name || '')
  const [amount, setAmount] = useState(initial?.amount?.toString() || '')
  const [dayOfMonth, setDayOfMonth] = useState(
    initial?.day_of_month?.toString() || ''
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      name,
      amount: parseFloat(amount),
      day_of_month: parseInt(dayOfMonth),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 card mb-4">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre del gasto"
        className="input-field"
        required
      />
      <input
        type="number"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Monto"
        className="input-field"
        required
      />
      <input
        type="number"
        inputMode="numeric"
        value={dayOfMonth}
        onChange={(e) => setDayOfMonth(e.target.value)}
        placeholder="Día del mes (1-31)"
        className="input-field"
        min={1}
        max={31}
        required
      />
      <div className="flex gap-3">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button fullWidth type="submit">
          {initial ? 'Actualizar' : 'Agregar'}
        </Button>
      </div>
    </form>
  )
}

export default function SettingsPage() {
  const {
    plans,
    createPlan,
    updatePlan,
    deletePlan,
    reorderPlans,
  } = usePlans()
  const {
    expenses,
    createExpense,
    updateExpense,
    deleteExpense,
  } = useFixedExpenses()

  const [showPlanForm, setShowPlanForm] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<FixedExpense | null>(
    null
  )

  const handleCreatePlan = async (data: Omit<Plan, 'id' | 'user_id'>) => {
    await createPlan({ ...data, priority: plans.length + 1 })
    setShowPlanForm(false)
  }

  const handleUpdatePlan = async (data: Omit<Plan, 'id' | 'user_id'>) => {
    if (!editingPlan) return
    await updatePlan(editingPlan.id, data)
    setEditingPlan(null)
  }

  const movePlan = (index: number, direction: 'up' | 'down') => {
    const newPlans = [...plans]
    const swapIdx = direction === 'up' ? index - 1 : index + 1
    if (swapIdx < 0 || swapIdx >= newPlans.length) return
    ;[newPlans[index], newPlans[swapIdx]] = [newPlans[swapIdx], newPlans[index]]
    reorderPlans(newPlans)
  }

  const handleCreateExpense = async (
    data: Omit<FixedExpense, 'id' | 'user_id'>
  ) => {
    await createExpense(data)
    setShowExpenseForm(false)
  }

  const handleUpdateExpense = async (
    data: Omit<FixedExpense, 'id' | 'user_id'>
  ) => {
    if (!editingExpense) return
    await updateExpense(editingExpense.id, data)
    setEditingExpense(null)
  }

  const getPlanProgress = (plan: Plan) => {
    let totalFortnights = plan.time_value
    if (plan.time_unit === 'months') totalFortnights = plan.time_value * 2
    else if (plan.time_unit === 'days')
      totalFortnights = plan.time_value / 15

    const projected = plan.amount_per_fortnight * totalFortnights
    return Math.min(projected / plan.goal_amount, 1)
  }

  return (
    <div className="min-h-screen p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/"
          className="p-2 -ml-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-lg font-bold">Configuración</h1>
      </div>

      {/* Savings Plans */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold">Planes de ahorro</h2>
          {!showPlanForm && !editingPlan && (
            <button
              className="text-sm text-positive font-semibold"
              onClick={() => setShowPlanForm(true)}
            >
              + Agregar
            </button>
          )}
        </div>

        {showPlanForm && (
          <PlanForm
            onSubmit={handleCreatePlan}
            onCancel={() => setShowPlanForm(false)}
          />
        )}

        {editingPlan && (
          <PlanForm
            initial={editingPlan}
            onSubmit={handleUpdatePlan}
            onCancel={() => setEditingPlan(null)}
          />
        )}

        <div className="space-y-3">
          {plans.map((plan, index) => (
            <div key={plan.id} className="card">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-semibold text-sm">{plan.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    ${plan.amount_per_fortnight.toLocaleString()}/quincena →
                    Meta: ${plan.goal_amount.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30"
                    onClick={() => movePlan(index, 'up')}
                    disabled={index === 0}
                  >
                    ▲
                  </button>
                  <button
                    className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30"
                    onClick={() => movePlan(index, 'down')}
                    disabled={index === plans.length - 1}
                  >
                    ▼
                  </button>
                </div>
              </div>
              <ProgressBar progress={getPlanProgress(plan)} className="mb-2" />
              <div className="flex gap-3 text-xs">
                <button
                  className="text-positive font-medium"
                  onClick={() => setEditingPlan(plan)}
                >
                  Editar
                </button>
                <button
                  className="text-negative font-medium"
                  onClick={() => deletePlan(plan.id)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
          {plans.length === 0 && !showPlanForm && (
            <p className="text-sm text-[var(--text-muted)] text-center py-4">
              No tienes planes de ahorro
            </p>
          )}
        </div>
      </section>

      {/* Fixed Expenses */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold">Gastos fijos</h2>
          {!showExpenseForm && !editingExpense && (
            <button
              className="text-sm text-positive font-semibold"
              onClick={() => setShowExpenseForm(true)}
            >
              + Agregar
            </button>
          )}
        </div>

        {showExpenseForm && (
          <ExpenseForm
            onSubmit={handleCreateExpense}
            onCancel={() => setShowExpenseForm(false)}
          />
        )}

        {editingExpense && (
          <ExpenseForm
            initial={editingExpense}
            onSubmit={handleUpdateExpense}
            onCancel={() => setEditingExpense(null)}
          />
        )}

        <div className="space-y-3">
          {expenses.map((expense) => (
            <div key={expense.id} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{expense.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    ${expense.amount.toLocaleString()} · Día{' '}
                    {expense.day_of_month}
                  </p>
                </div>
                <div className="flex gap-3 text-xs">
                  <button
                    className="text-positive font-medium"
                    onClick={() => setEditingExpense(expense)}
                  >
                    Editar
                  </button>
                  <button
                    className="text-negative font-medium"
                    onClick={() => deleteExpense(expense.id)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
          {expenses.length === 0 && !showExpenseForm && (
            <p className="text-sm text-[var(--text-muted)] text-center py-4">
              No tienes gastos fijos
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
