'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useBudgets } from '@/hooks/useBudgets'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useCommitments } from '@/hooks/useCommitments'
import SwipeableRow from '@/components/ui/SwipeableRow'
import ProgressBar from '@/components/ui/ProgressBar'
import Button from '@/components/ui/Button'
import type { Budget } from '@/types'

function fmt(n: number) {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function BudgetsPage() {
  const { budgets, createBudget, updateBudget, deleteBudget } = useBudgets()
  const { transactions } = useTransactions()
  const { expenseCategories } = useCategories()
  const { commitments } = useCommitments()

  const [editing, setEditing] = useState<Budget | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [addCatId, setAddCatId] = useState('')
  const [addAmount, setAddAmount] = useState('')

  // Period start = last income date
  const periodStartStr = useMemo(() => {
    const income = transactions.find((t) => t.type === 'income')
    return income?.date ?? null
  }, [transactions])

  // Spending per category since last income
  const spentByCategory = useMemo(() => {
    if (!periodStartStr) return new Map<string, number>()
    const map = new Map<string, number>()
    for (const t of transactions) {
      if (t.type !== 'expense' || t.date < periodStartStr || !t.category_id) continue
      map.set(t.category_id, (map.get(t.category_id) || 0) + t.amount)
    }
    return map
  }, [transactions, periodStartStr])

  // Budget data with computed fields
  const budgetData = useMemo(() => {
    return budgets.map((b) => {
      const spent = spentByCategory.get(b.category_id) || 0
      const budgetPerFortnight = b.frequency === 'monthly' ? b.amount / 2 : b.amount
      const remaining = Math.max(budgetPerFortnight - spent, 0)
      const pctUsed = budgetPerFortnight > 0 ? spent / budgetPerFortnight : 0
      return { ...b, spent, remaining, pctUsed, budgetPerFortnight }
    })
  }, [budgets, spentByCategory])

  // Auto-suggestions for categories without budgets
  const suggestions = useMemo(() => {
    if (budgets.length > 0) return []
    if (!periodStartStr) return []

    const lastIncome = transactions.find((t) => t.type === 'income')
    if (!lastIncome) return []

    const activeCommitments = commitments.filter((c) => !c.completed_at)
    const fortnightDeduction = activeCommitments.reduce((sum, c) => {
      if (c.frequency === 'fortnight') return sum + c.amount
      if (c.frequency === 'monthly') return sum + c.amount / 2
      return sum
    }, 0)

    const libre = lastIncome.amount - fortnightDeduction
    if (libre <= 0) return []

    const daysElapsed = Math.max(
      Math.ceil((Date.now() - new Date(periodStartStr + 'T12:00:00').getTime()) / 86400000), 1
    )

    const catSuggestions: { categoryId: string; emoji: string; label: string; amount: number }[] = []

    for (const cat of expenseCategories) {
      const spent = spentByCategory.get(cat.id) || 0
      if (spent <= 0) continue
      const avgPerFortnight = (spent / daysElapsed) * 14
      const suggested = Math.ceil(avgPerFortnight * 1.1 / 10) * 10 // round up to nearest 10
      catSuggestions.push({ categoryId: cat.id, emoji: cat.emoji, label: cat.label, amount: suggested })
    }

    return catSuggestions.sort((a, b) => b.amount - a.amount)
  }, [budgets, periodStartStr, transactions, commitments, expenseCategories, spentByCategory])

  // Categories available for new budget (not already budgeted)
  const availableCategories = expenseCategories.filter(
    (c) => !budgets.some((b) => b.category_id === c.id)
  )

  const handleAdd = async () => {
    const amt = parseFloat(addAmount)
    if (!addCatId || !amt) return
    await createBudget({ category_id: addCatId, amount: amt, frequency: 'fortnight' })
    setShowAdd(false)
    setAddCatId('')
    setAddAmount('')
  }

  const handleAcceptSuggestion = async (s: typeof suggestions[0]) => {
    await createBudget({ category_id: s.categoryId, amount: s.amount, frequency: 'fortnight' })
  }

  const handleEditSave = async () => {
    if (!editing) return
    const amt = parseFloat(editAmount)
    if (!amt) return
    await updateBudget(editing.id, { amount: amt })
    setEditing(null)
  }

  const progressColor = (pct: number) => {
    if (pct > 0.9) return 'red'
    if (pct > 0.7) return 'amber'
    return 'green'
  }

  return (
    <div className="min-h-screen p-4" style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="p-2 -ml-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold">Mis sobres</h1>
        </div>
        {!showAdd && availableCategories.length > 0 && (
          <button className="text-sm text-positive font-semibold" onClick={() => setShowAdd(true)}>
            + Nuevo
          </button>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="rounded-card p-4 mb-4 space-y-3 bg-[var(--bg-card)]" style={{ border: '0.5px solid var(--pill-border)' }}>
          <label className="block text-xs text-[var(--text-secondary)]">Categoría</label>
          <div className="grid grid-cols-4 gap-2">
            {availableCategories.map((cat) => (
              <button
                key={cat.id}
                className={`flex flex-col items-center gap-1 p-2 rounded-card transition-all ${
                  addCatId === cat.id
                    ? 'bg-positive/10 border-2 border-positive'
                    : 'bg-[var(--bg-secondary)] border-2 border-transparent'
                }`}
                onClick={() => setAddCatId(cat.id)}
              >
                <span className="text-lg">{cat.emoji}</span>
                <span className="text-[10px] font-medium">{cat.label}</span>
              </button>
            ))}
          </div>
          <label className="block text-xs text-[var(--text-secondary)]">Presupuesto por quincena</label>
          <div className="flex items-center">
            <span className="text-lg font-bold mr-1">$</span>
            <input type="number" inputMode="decimal" value={addAmount} onChange={(e) => setAddAmount(e.target.value)} placeholder="0" className="input-field flex-1" />
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button fullWidth disabled={!addCatId || !parseFloat(addAmount)} onClick={handleAdd}>Agregar</Button>
          </div>
        </div>
      )}

      {/* Auto-suggestions (when no budgets) */}
      {budgets.length === 0 && suggestions.length > 0 && !showAdd && (
        <div className="mb-6">
          <p className="text-xs text-[var(--text-muted)] mb-3">Basado en tu historial sugerimos:</p>
          <div className="space-y-2">
            {suggestions.map((s) => (
              <div key={s.categoryId} className="flex items-center gap-3 p-3 rounded-card bg-[var(--bg-card)]" style={{ border: '0.5px solid var(--pill-border)' }}>
                <span className="text-lg">{s.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-xs text-[var(--text-muted)]">${fmt(s.amount)}/quincena</p>
                </div>
                <button
                  className="text-xs text-positive font-semibold px-3 py-1 rounded-btn"
                  style={{ border: '0.5px solid rgba(22, 163, 74, 0.3)' }}
                  onClick={() => handleAcceptSuggestion(s)}
                >
                  Aceptar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Budget list */}
      <div className="space-y-2">
        {budgetData.map((b) => {
          const color = progressColor(b.pctUsed)
          return (
            <SwipeableRow
              key={b.id}
              onEdit={() => { setEditing(b); setEditAmount(String(b.amount)) }}
              onDelete={() => deleteBudget(b.id)}
            >
              <div className="p-4 rounded-card bg-[var(--bg-card)]" style={{ border: '0.5px solid var(--pill-border)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{b.category?.emoji || '📦'}</span>
                  <p className="text-sm font-semibold flex-1">{b.category?.label || 'Sin nombre'}</p>
                  <span className="text-xs text-[var(--text-muted)]">${fmt(b.remaining)} restante</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1">
                    <div className="h-1.5 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(b.pctUsed, 1) * 100}%`,
                          backgroundColor: color === 'red' ? '#dc2626' : color === 'amber' ? '#f59e0b' : '#16a34a',
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] font-medium w-8 text-right">
                    {Math.round(Math.min(b.pctUsed, 1) * 100)}%
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  ${fmt(b.spent)} gastado de ${fmt(b.budgetPerFortnight)}
                </p>
              </div>
            </SwipeableRow>
          )
        })}
      </div>

      {budgets.length === 0 && suggestions.length === 0 && !showAdd && (
        <div className="text-center py-12">
          <p className="text-[var(--text-muted)] text-sm mb-4">Sin sobres configurados</p>
          {availableCategories.length > 0 && (
            <Button onClick={() => setShowAdd(true)}>+ Nuevo sobre</Button>
          )}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditing(null)} />
          <div className="relative w-full max-w-app bg-[var(--bg-card)] rounded-t-[24px] p-6 pb-8 animate-slide-up">
            <h2 className="text-lg font-bold mb-4">Editar sobre</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              {editing.category?.emoji} {editing.category?.label}
            </p>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Presupuesto por quincena</label>
            <div className="flex items-center mb-4">
              <span className="text-lg font-bold mr-1">$</span>
              <input type="number" inputMode="decimal" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="input-field flex-1" autoFocus />
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button fullWidth disabled={!parseFloat(editAmount)} onClick={handleEditSave}>Guardar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
