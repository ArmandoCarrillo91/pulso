'use client'

import { useState, useMemo } from 'react'
import { useCommitments } from '@/hooks/useCommitments'
import { useTransactions } from '@/hooks/useTransactions'
import { usePayday } from '@/hooks/usePayday'
import SwipeableRow from '@/components/ui/SwipeableRow'
import Toast from '@/components/ui/Toast'
import ProgressBar from '@/components/ui/ProgressBar'
import Button from '@/components/ui/Button'
import { getLocalDateString } from '@/lib/date'
import { calculatePlanContribution } from '@/lib/calculations'
import type { Commitment } from '@/types'
import { getCommitmentType } from '@/types'

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

function typeBadge(c: Commitment): { label: string; cls: string } {
  const t = getCommitmentType(c)
  switch (t) {
    case 'fixed': return { label: 'mensual', cls: 'bg-[var(--border-color)] text-[var(--text-muted)]' }
    case 'msi': return { label: `${c.paid_installments}/${c.total_installments} pagos`, cls: 'bg-amber-500/10 text-amber-500' }
    case 'savings_goal': return { label: `hasta $${fmt(c.goal_amount || 0)}`, cls: 'bg-positive/10 text-positive' }
    case 'seasonal': return { label: c.end_date ? `hasta ${fmtDate(c.end_date)}` : 'fecha', cls: 'bg-positive/10 text-positive' }
    case 'recurring_savings': return { label: 'recurrente', cls: 'bg-positive/10 text-positive' }
    default: return { label: 'único', cls: 'bg-[var(--border-color)] text-[var(--text-muted)]' }
  }
}

export default function CompromisosPage() {
  const {
    commitments,
    loading,
    createCommitment,
    updateCommitment,
    deleteCommitment,
    toastMsg,
    clearToast,
  } = useCommitments()
  const { transactions, currentBalance } = useTransactions()

  const lastIncomeDate = useMemo(() => {
    const income = transactions.find((t) => t.type === 'income')
    return income?.date ?? null
  }, [transactions])

  const { daysRemaining, nextPayday } = usePayday(lastIncomeDate)

  // ─── Wizard state ───
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [wizardName, setWizardName] = useState('')
  const [wizardAmount, setWizardAmount] = useState('')
  const [wizardFreq, setWizardFreq] = useState<'fortnight' | 'monthly'>('monthly')
  const [wizardEndType, setWizardEndType] = useState<string>('')
  const [wizardInstallments, setWizardInstallments] = useState('')
  const [wizardNextDate, setWizardNextDate] = useState('')
  const [wizardGoalAmount, setWizardGoalAmount] = useState('')
  const [wizardEndDate, setWizardEndDate] = useState('')
  const [wizardSaving, setWizardSaving] = useState(false)

  // ─── Edit state ───
  const [editing, setEditing] = useState<Commitment | null>(null)
  const [editName, setEditName] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editEndDate, setEditEndDate] = useState('')
  const [editGoalAmount, setEditGoalAmount] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  const openWizard = () => {
    setWizardOpen(true)
    setWizardStep(1)
    setWizardName('')
    setWizardAmount('')
    setWizardFreq('monthly')
    setWizardEndType('')
    setWizardInstallments('')
    setWizardGoalAmount('')
    setWizardEndDate('')
    const d = new Date()
    d.setMonth(d.getMonth() + 1)
    d.setDate(15)
    setWizardNextDate(getLocalDateString(d))
  }

  const openEdit = (c: Commitment) => {
    setEditing(c)
    setEditName(c.name)
    setEditAmount(String(c.amount))
    setEditEndDate(c.end_date || '')
    setEditGoalAmount(c.goal_amount ? String(c.goal_amount) : '')
  }

  // ─── Wizard computed values ───
  const wizardComputed = useMemo(() => {
    const amt = parseFloat(wizardAmount)
    if (!amt) return null

    const perFortnight = wizardFreq === 'monthly' ? amt / 2 : amt

    let endType = wizardEndType as Commitment['end_type']
    if (!endType) {
      endType = wizardFreq === 'monthly' ? 'indefinite' : 'goal'
    }

    let autoLabel = ''
    if (wizardFreq === 'monthly' && endType === 'indefinite') autoLabel = 'Gasto fijo'
    else if (wizardFreq === 'monthly' && endType === 'installments') autoLabel = 'MSI'
    else if (wizardFreq === 'fortnight' && endType === 'goal') autoLabel = 'Meta de ahorro'
    else if (wizardFreq === 'fortnight' && endType === 'date') autoLabel = 'Plan estacional'
    else if (wizardFreq === 'fortnight' && endType === 'indefinite') autoLabel = 'Ahorro recurrente'

    return { perFortnight, endType, autoLabel }
  }, [wizardAmount, wizardFreq, wizardEndType])

  const handleWizardSave = async () => {
    if (!wizardComputed || !wizardName.trim()) return
    setWizardSaving(true)

    const amt = parseFloat(wizardAmount)
    const endType = wizardComputed.endType

    let endDate: string | null = null
    let totalInstallments: number | null = null
    let goalAmount: number | null = null
    let dayOfMonth: number | null = null
    let totalAmount: number | null = null
    let startDate = getLocalDateString(nextPayday)

    if (endType === 'installments') {
      totalInstallments = parseInt(wizardInstallments) || null
      if (wizardNextDate) {
        const nd = new Date(wizardNextDate + 'T12:00:00')
        dayOfMonth = nd.getDate()
        startDate = wizardNextDate
      }
      if (totalInstallments && wizardNextDate) {
        const ed = new Date(wizardNextDate + 'T12:00:00')
        ed.setMonth(ed.getMonth() + totalInstallments)
        endDate = getLocalDateString(ed)
      }
      totalAmount = totalInstallments ? amt * totalInstallments : null
    } else if (endType === 'date') {
      endDate = wizardEndDate || null
    } else if (endType === 'goal') {
      goalAmount = parseFloat(wizardGoalAmount) || null
    }

    if (wizardFreq === 'monthly' && endType !== 'installments') {
      dayOfMonth = new Date().getDate()
    }

    await createCommitment({
      name: wizardName.trim(),
      amount: amt,
      frequency: wizardFreq,
      end_type: endType,
      end_date: endDate,
      total_installments: totalInstallments,
      paid_installments: 0,
      goal_amount: goalAmount,
      current_amount: 0,
      start_date: startDate,
      day_of_month: dayOfMonth,
      category_id: null,
      last_paid_date: null,
      completed_at: null,
      priority: commitments.length,
      total_amount: totalAmount,
    })

    setWizardSaving(false)
    setWizardOpen(false)
  }

  const handleEditSave = async () => {
    if (!editing) return
    setEditSaving(true)
    const updates: Partial<Commitment> = {
      name: editName.trim(),
      amount: parseFloat(editAmount) || editing.amount,
    }
    if (editEndDate) updates.end_date = editEndDate
    if (editGoalAmount) updates.goal_amount = parseFloat(editGoalAmount)
    await updateCommitment(editing.id, updates)
    setEditSaving(false)
    setEditing(null)
  }

  // ─── Split into pasivos and activos ───
  const active = commitments.filter((c) => !c.completed_at)
  const pasivos = active.filter((c) => c.frequency === 'monthly')
  const activos = active.filter((c) => c.frequency === 'fortnight')

  return (
    <div className="min-h-screen p-4" style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold">Compromisos</h1>
        <button className="text-sm text-positive font-semibold" onClick={openWizard}>
          + Nueva
        </button>
      </div>

      {/* ─── Section 1: Lo que debo ─── */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-3">
          Lo que debo
        </p>

        {pasivos.length === 0 && (
          <p className="text-center text-[var(--text-muted)] text-sm py-4">
            Sin compromisos fijos
          </p>
        )}

        <div className="space-y-2">
          {pasivos.map((c) => {
            const badge = typeBadge(c)
            const isMsi = getCommitmentType(c) === 'msi'
            const total = c.total_installments || 1
            const paid = c.paid_installments || 0
            const msiProgress = isMsi ? Math.min(paid / total, 1) : 0

            return (
              <SwipeableRow key={c.id} onEdit={() => openEdit(c)} onDelete={() => deleteCommitment(c.id)}>
                <div className="p-4 rounded-card bg-[var(--bg-card)]" style={{ border: '0.5px solid var(--pill-border)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold flex-1">{c.name}</p>
                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    ${fmt(c.amount)}/mes
                  </p>
                  {isMsi && (
                    <>
                      <div className="flex items-center gap-2 mt-2 mb-1">
                        <div className="flex-1"><ProgressBar progress={msiProgress} /></div>
                        <span className="text-[10px] text-[var(--text-muted)] font-medium w-8 text-right">
                          {Math.round(msiProgress * 100)}%
                        </span>
                      </div>
                      {(() => {
                        const remaining = total - paid
                        if (remaining === 1) {
                          return <p className="text-[11px] text-positive font-medium mt-1">🎉 Último pago — terminas este mes</p>
                        }
                        const dailyImpact = c.amount / 2 / 15
                        return <p className="text-[11px] text-positive font-medium mt-1">En {remaining} meses terminas · +${fmt(dailyImpact)}/día</p>
                      })()}
                    </>
                  )}
                </div>
              </SwipeableRow>
            )
          })}
        </div>
      </div>

      {/* ─── Section 2: Lo que construyo ─── */}
      <div>
        <p className="text-xs font-semibold text-positive uppercase tracking-wider mb-3">
          Lo que construyo
        </p>

        {activos.length === 0 && (
          <p className="text-center text-[var(--text-muted)] text-sm py-4">
            Sin metas activas — ¿qué quieres lograr?
          </p>
        )}

        <div className="space-y-2">
          {activos.map((c) => {
            const badge = typeBadge(c)
            const hasGoal = c.goal_amount && c.goal_amount > 0
            const goalProgress = hasGoal ? Math.min(c.current_amount / c.goal_amount!, 1) : 0

            return (
              <SwipeableRow key={c.id} onEdit={() => openEdit(c)} onDelete={() => deleteCommitment(c.id)}>
                <div className="p-4 rounded-card bg-[var(--bg-card)]" style={{ border: '0.5px solid var(--pill-border)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold flex-1">{c.name}</p>
                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    ${fmt(c.amount)}/quincena
                  </p>
                  {hasGoal && (
                    <>
                      <div className="flex items-center gap-2 mt-2 mb-1">
                        <div className="flex-1"><ProgressBar progress={goalProgress} /></div>
                        <span className="text-[10px] text-[var(--text-muted)] font-medium w-8 text-right">
                          {Math.round(goalProgress * 100)}%
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        ${fmt(c.current_amount)} de ${fmt(c.goal_amount!)}
                      </p>
                    </>
                  )}
                  {c.end_date && (
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">
                      Vence: {fmtDate(c.end_date)}
                    </p>
                  )}
                </div>
              </SwipeableRow>
            )
          })}
        </div>
      </div>

      {/* ─── Wizard Modal ─── */}
      {wizardOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setWizardOpen(false)} />
          <div className="relative w-full max-w-app bg-[var(--bg-card)] rounded-t-[24px] p-6 pb-8 animate-slide-up max-h-[85vh] overflow-y-auto">
            {/* Progress */}
            <div className="flex gap-2 mb-6">
              {[1, 2, 3].map((s) => (
                <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= wizardStep ? 'bg-positive' : 'bg-[var(--bg-secondary)]'}`} />
              ))}
            </div>

            {/* Step 1: Name */}
            {wizardStep === 1 && (
              <div>
                <h2 className="text-lg font-bold mb-6 text-center">Nuevo compromiso</h2>
                <input
                  type="text"
                  value={wizardName}
                  onChange={(e) => setWizardName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && wizardName.trim()) setWizardStep(2) }}
                  placeholder="¿Qué es este compromiso?"
                  className="w-full text-center text-xl font-semibold bg-transparent outline-none border-b-2 border-[var(--border-color)] focus:border-positive pb-3 mb-8 transition-colors"
                  autoFocus
                />
                <Button fullWidth disabled={!wizardName.trim()} onClick={() => setWizardStep(2)}>
                  Siguiente
                </Button>
              </div>
            )}

            {/* Step 2: Amount + Frequency */}
            {wizardStep === 2 && (
              <div>
                <h2 className="text-lg font-bold mb-4">{wizardName}</h2>

                <div className="flex items-center justify-center mb-4">
                  <span className="text-3xl font-bold mr-1">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={wizardAmount}
                    onChange={(e) => setWizardAmount(e.target.value)}
                    placeholder="0.00"
                    className="text-3xl font-bold w-40 bg-transparent outline-none text-center"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    className={`py-3 rounded-btn text-sm font-semibold text-center transition-all ${
                      wizardFreq === 'fortnight'
                        ? 'bg-positive/10 text-positive border-2 border-positive'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-2 border-transparent'
                    }`}
                    onClick={() => setWizardFreq('fortnight')}
                  >
                    Cada quincena
                  </button>
                  <button
                    className={`py-3 rounded-btn text-sm font-semibold text-center transition-all ${
                      wizardFreq === 'monthly'
                        ? 'bg-positive/10 text-positive border-2 border-positive'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-2 border-transparent'
                    }`}
                    onClick={() => setWizardFreq('monthly')}
                  >
                    Cada mes
                  </button>
                </div>

                {wizardComputed && parseFloat(wizardAmount) > 0 && (
                  <p className="text-xs text-[var(--text-muted)] text-center mb-4">
                    {wizardFreq === 'monthly'
                      ? `= $${fmt(wizardComputed.perFortnight)} cada quincena`
                      : `$${fmt(wizardComputed.perFortnight)} cada quincena`}
                  </p>
                )}

                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => setWizardStep(1)}>Atrás</Button>
                  <Button fullWidth disabled={!parseFloat(wizardAmount)} onClick={() => { setWizardEndType(''); setWizardStep(3) }}>
                    Siguiente
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: End condition */}
            {wizardStep === 3 && (
              <div>
                <h2 className="text-lg font-bold mb-4">¿Termina?</h2>

                <div className="space-y-2 mb-4">
                  {wizardFreq === 'monthly' ? (
                    <>
                      <button
                        className={`w-full text-left p-3 rounded-btn text-sm transition-all ${wizardEndType === 'indefinite' ? 'bg-positive/10 text-positive border border-positive' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-transparent'}`}
                        onClick={() => setWizardEndType('indefinite')}
                      >
                        No termina
                      </button>
                      <button
                        className={`w-full text-left p-3 rounded-btn text-sm transition-all ${wizardEndType === 'installments' ? 'bg-positive/10 text-positive border border-positive' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-transparent'}`}
                        onClick={() => setWizardEndType('installments')}
                      >
                        En X pagos (MSI)
                      </button>
                      {wizardEndType === 'installments' && (
                        <div className="pl-4 space-y-2">
                          <input type="number" inputMode="numeric" value={wizardInstallments} onChange={(e) => setWizardInstallments(e.target.value)} placeholder="¿Cuántos pagos?" className="input-field" min={1} />
                          <label className="block text-xs text-[var(--text-secondary)]">Próximo pago</label>
                          <input type="date" value={wizardNextDate} onChange={(e) => setWizardNextDate(e.target.value)} className="input-field" />
                        </div>
                      )}
                      <button
                        className={`w-full text-left p-3 rounded-btn text-sm transition-all ${wizardEndType === 'date' ? 'bg-positive/10 text-positive border border-positive' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-transparent'}`}
                        onClick={() => setWizardEndType('date')}
                      >
                        En una fecha
                      </button>
                      {wizardEndType === 'date' && (
                        <div className="pl-4">
                          <input type="date" value={wizardEndDate} onChange={(e) => setWizardEndDate(e.target.value)} min={getLocalDateString()} className="input-field" />
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        className={`w-full text-left p-3 rounded-btn text-sm transition-all ${wizardEndType === 'goal' ? 'bg-positive/10 text-positive border border-positive' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-transparent'}`}
                        onClick={() => setWizardEndType('goal')}
                      >
                        Al juntar cierta cantidad
                      </button>
                      {wizardEndType === 'goal' && (
                        <div className="pl-4 flex items-center">
                          <span className="text-lg font-bold mr-1">$</span>
                          <input type="number" inputMode="decimal" value={wizardGoalAmount} onChange={(e) => setWizardGoalAmount(e.target.value)} placeholder="¿Cuánto necesitas?" className="input-field flex-1" />
                        </div>
                      )}
                      <button
                        className={`w-full text-left p-3 rounded-btn text-sm transition-all ${wizardEndType === 'date' ? 'bg-positive/10 text-positive border border-positive' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-transparent'}`}
                        onClick={() => setWizardEndType('date')}
                      >
                        En una fecha
                      </button>
                      {wizardEndType === 'date' && (
                        <div className="pl-4">
                          <input type="date" value={wizardEndDate} onChange={(e) => setWizardEndDate(e.target.value)} min={getLocalDateString()} className="input-field" />
                        </div>
                      )}
                      <button
                        className={`w-full text-left p-3 rounded-btn text-sm transition-all ${wizardEndType === 'indefinite' ? 'bg-positive/10 text-positive border border-positive' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-transparent'}`}
                        onClick={() => setWizardEndType('indefinite')}
                      >
                        No termina
                      </button>
                    </>
                  )}
                </div>

                {/* Confirmation summary */}
                {wizardEndType && wizardComputed && (
                  <div className="rounded-btn bg-[var(--bg-secondary)] p-4 mb-4">
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-positive/10 text-positive">
                      {wizardComputed.autoLabel}
                    </span>
                    <p className="font-bold mt-2">{wizardName}</p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      ${fmt(parseFloat(wizardAmount) || 0)} cada {wizardFreq === 'monthly' ? 'mes' : 'quincena'}
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => setWizardStep(2)}>Atrás</Button>
                  <Button fullWidth disabled={!wizardEndType || wizardSaving} onClick={handleWizardSave}>
                    {wizardSaving ? 'Guardando...' : 'Activar'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Edit Modal ─── */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditing(null)} />
          <div className="relative w-full max-w-app bg-[var(--bg-card)] rounded-t-[24px] p-6 pb-8 animate-slide-up">
            <h2 className="text-lg font-bold mb-4">Editar compromiso</h2>

            <label className="block text-xs text-[var(--text-secondary)] mb-1">Nombre</label>
            <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="input-field mb-3" />

            <label className="block text-xs text-[var(--text-secondary)] mb-1">Monto</label>
            <div className="flex items-center mb-3">
              <span className="text-lg font-bold mr-1">$</span>
              <input type="number" inputMode="decimal" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="input-field flex-1" />
            </div>

            {editing.end_type === 'goal' && (
              <>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Meta</label>
                <div className="flex items-center mb-3">
                  <span className="text-lg font-bold mr-1">$</span>
                  <input type="number" inputMode="decimal" value={editGoalAmount} onChange={(e) => setEditGoalAmount(e.target.value)} className="input-field flex-1" />
                </div>
              </>
            )}

            {(editing.end_type === 'date' || editing.end_type === 'installments') && (
              <>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Fecha límite</label>
                <input type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} min={getLocalDateString()} className="input-field mb-3" />
              </>
            )}

            <div className="flex gap-3 mt-3">
              <Button variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button fullWidth disabled={!editName.trim() || editSaving} onClick={handleEditSave}>
                {editSaving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toastMsg} visible={!!toastMsg} onHide={clearToast} />
    </div>
  )
}
