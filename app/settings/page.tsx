'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  getCategoryEmoji,
  loadCustomCategories,
  saveCustomCategories,
  loadHiddenDefaults,
  saveHiddenDefaults,
  loadOverrides,
  saveOverrides,
  getVisibleDefaults,
  type CustomCategory,
  type CategoryOverride,
} from '@/lib/categories'
import { getLocalDateString } from '@/lib/date'
import { useFixedExpenses } from '@/hooks/useFixedExpenses'
import EditExpenseModal from '@/components/modals/EditExpenseModal'
import SwipeableRow from '@/components/ui/SwipeableRow'
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

export default function SettingsPage() {
  const { expenses, createExpense, updateExpense, deleteExpense } =
    useFixedExpenses()
  const supabase = createClient()

  // Expense form state
  const [editingExpense, setEditingExpense] = useState<FixedExpense | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newNextDate, setNewNextDate] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 1)
    return getLocalDateString(d)
  })
  const [newEndOption, setNewEndOption] = useState('')
  const [newCustomEnd, setNewCustomEnd] = useState('')
  const [newCatId, setNewCatId] = useState('')
  const [newCatLabel, setNewCatLabel] = useState('')

  // Categories management
  const [catTab, setCatTab] = useState<'expense' | 'income'>('expense')
  const [customCats, setCustomCats] = useState(() => loadCustomCategories())
  const [hiddenDefaults, setHiddenDefaults] = useState(() => loadHiddenDefaults())
  const [overrides, setOverrides] = useState(() => loadOverrides())
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editCatEmoji, setEditCatEmoji] = useState('')
  const [editCatName, setEditCatName] = useState('')

  const resolveEndDate = (): string | null => {
    if (!newEndOption) return null
    if (newEndOption === 'custom') return newCustomEnd || null
    const opt = END_DATE_OPTIONS.find(
      (o) => 'months' in o && o.label === newEndOption
    )
    if (opt && 'months' in opt) {
      const d = new Date()
      d.setMonth(d.getMonth() + opt.months!)
      return getLocalDateString(d)
    }
    return null
  }

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(newAmount)
    if (!newName.trim() || !amt) return
    const payDate = newNextDate
      ? new Date(newNextDate + 'T12:00:00')
      : new Date()

    await createExpense({
      name: newName.trim(),
      amount: amt,
      day_of_month: payDate.getDate(),
      category_id: newCatId || null,
      category_label: newCatLabel || null,
      next_payment_date: newNextDate || null,
      end_date: resolveEndDate(),
    })
    setShowAdd(false)
    setNewName('')
    setNewAmount('')
    setNewCatId('')
    setNewCatLabel('')
  }

  // Category management helpers
  const defaults = catTab === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
  const visibleDefaults = defaults
    .filter((c) => !hiddenDefaults.includes(c.id))
    .map((c) => {
      const ov = overrides.find((o) => o.id === c.id)
      return ov ? { ...c, emoji: ov.emoji, label: ov.label } : c
    })
  const customForTab = customCats.filter((c) => c.type === catTab)
  const allCatsForTab = [...visibleDefaults, ...customForTab]

  const isDefaultId = (id: string) =>
    [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].some((c) => c.id === id)

  const startEditCat = (cat: { id: string; emoji: string; label: string }) => {
    setEditingCatId(cat.id)
    setEditCatEmoji(cat.emoji)
    setEditCatName(cat.label)
  }

  const saveEditCat = async () => {
    if (!editingCatId || !editCatName.trim()) return
    const newLabel = editCatName.trim()
    const newEmoji = editCatEmoji.trim() || '📦'

    if (isDefaultId(editingCatId)) {
      // Save as override
      const updated = [
        ...overrides.filter((o) => o.id !== editingCatId),
        { id: editingCatId, emoji: newEmoji, label: newLabel },
      ]
      saveOverrides(updated)
      setOverrides(updated)
    } else {
      // Update custom category
      const updated = customCats.map((c) =>
        c.id === editingCatId ? { ...c, label: newLabel, emoji: newEmoji } : c
      )
      saveCustomCategories(updated)
      setCustomCats(updated)
    }

    // Update label on existing transactions
    await supabase
      .from('transactions')
      .update({ category_label: newLabel })
      .eq('category_id', editingCatId)

    setEditingCatId(null)
  }

  const deleteCat = (id: string) => {
    if (isDefaultId(id)) {
      const updated = [...hiddenDefaults, id]
      saveHiddenDefaults(updated)
      setHiddenDefaults(updated)
      // Also remove any override
      const ov = overrides.filter((o) => o.id !== id)
      saveOverrides(ov)
      setOverrides(ov)
    } else {
      const updated = customCats.filter((c) => c.id !== id)
      saveCustomCategories(updated)
      setCustomCats(updated)
    }
  }

  return (
    <div className="min-h-screen p-4" style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/"
          className="p-2 -ml-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-lg font-bold">Configuración</h1>
      </div>

      {/* Fixed Expenses */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold">Gastos fijos</h2>
          {!showAdd && (
            <button
              className="text-sm text-positive font-semibold"
              onClick={() => setShowAdd(true)}
            >
              + Agregar
            </button>
          )}
        </div>

        {showAdd && (
          <form onSubmit={handleAddExpense} className="card mb-4 space-y-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre del gasto"
              className="input-field"
              required
            />
            <input
              type="number"
              inputMode="decimal"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              placeholder="Monto"
              className="input-field"
              required
            />

            <label className="block text-xs text-[var(--text-secondary)]">
              Próximo pago
            </label>
            <input
              type="date"
              value={newNextDate}
              onChange={(e) => setNewNextDate(e.target.value)}
              className="input-field"
            />

            <label className="block text-xs text-[var(--text-secondary)]">
              ¿Hasta cuándo?
            </label>
            <select
              value={newEndOption}
              onChange={(e) => setNewEndOption(e.target.value)}
              className="input-field"
            >
              {END_DATE_OPTIONS.map((opt) => (
                <option
                  key={opt.label}
                  value={'months' in opt ? opt.label : opt.value}
                >
                  {opt.label}
                </option>
              ))}
            </select>
            {newEndOption === 'custom' && (
              <input
                type="date"
                value={newCustomEnd}
                onChange={(e) => setNewCustomEnd(e.target.value)}
                className="input-field"
              />
            )}

            <label className="block text-xs text-[var(--text-secondary)]">
              Categoría
            </label>
            <div className="grid grid-cols-4 gap-2">
              {EXPENSE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`flex flex-col items-center gap-1 p-2 rounded-card transition-all ${
                    newCatId === cat.id
                      ? 'bg-positive/10 border-2 border-positive'
                      : 'bg-[var(--bg-secondary)] border-2 border-transparent'
                  }`}
                  onClick={() => {
                    setNewCatId(cat.id)
                    setNewCatLabel(cat.label)
                  }}
                >
                  <span className="text-lg">{cat.emoji}</span>
                  <span className="text-[10px] font-medium">{cat.label}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setShowAdd(false)}
              >
                Cancelar
              </Button>
              <Button fullWidth type="submit">
                Agregar
              </Button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {expenses.map((expense) => (
            <SwipeableRow
              key={expense.id}
              onEdit={() => setEditingExpense(expense)}
              onDelete={() => deleteExpense(expense.id)}
            >
              <div className="card">
                <div className="flex items-center gap-2">
                  {expense.category_id && (
                    <span className="text-lg">
                      {getCategoryEmoji(expense.category_id)}
                    </span>
                  )}
                  <div>
                    <p className="font-semibold text-sm">{expense.name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      ${expense.amount.toLocaleString()} · Día{' '}
                      {expense.day_of_month}
                    </p>
                  </div>
                </div>
              </div>
            </SwipeableRow>
          ))}
          {expenses.length === 0 && !showAdd && (
            <p className="text-sm text-[var(--text-muted)] text-center py-4">
              No tienes gastos fijos
            </p>
          )}
        </div>
      </section>

      {/* Categories Management */}
      <section>
        <h2 className="text-base font-bold mb-4">Categorías</h2>

        <div className="flex gap-2 mb-4">
          <button
            className={`flex-1 py-2 text-sm font-semibold rounded-btn transition-colors ${
              catTab === 'expense'
                ? 'bg-positive/10 text-positive'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
            }`}
            onClick={() => setCatTab('expense')}
          >
            Gastos
          </button>
          <button
            className={`flex-1 py-2 text-sm font-semibold rounded-btn transition-colors ${
              catTab === 'income'
                ? 'bg-positive/10 text-positive'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
            }`}
            onClick={() => setCatTab('income')}
          >
            Ingresos
          </button>
        </div>

        <div className="space-y-1.5">
          {allCatsForTab.map((cat) =>
            editingCatId === cat.id ? (
              <div
                key={cat.id}
                className="flex items-center gap-2 p-2 rounded-btn bg-[var(--bg-secondary)]"
              >
                <input
                  type="text"
                  value={editCatEmoji}
                  onChange={(e) => setEditCatEmoji(e.target.value)}
                  className="input-field w-12 text-center text-lg px-1 py-1"
                />
                <input
                  type="text"
                  value={editCatName}
                  onChange={(e) => setEditCatName(e.target.value)}
                  className="input-field flex-1 py-1"
                  autoFocus
                />
                <button
                  className="text-positive font-semibold text-xs px-2"
                  onClick={saveEditCat}
                >
                  ✓
                </button>
                <button
                  className="text-[var(--text-muted)] text-xs px-2"
                  onClick={() => setEditingCatId(null)}
                >
                  ✕
                </button>
              </div>
            ) : (
              <SwipeableRow
                key={cat.id}
                onEdit={() => startEditCat(cat)}
                onDelete={() => deleteCat(cat.id)}
              >
                <div className="flex items-center gap-3 p-3 rounded-btn bg-[var(--bg-secondary)]">
                  <span className="text-lg">{cat.emoji}</span>
                  <p className="text-sm font-medium flex-1">{cat.label}</p>
                </div>
              </SwipeableRow>
            )
          )}
        </div>
      </section>

      <EditExpenseModal
        expense={editingExpense}
        onClose={() => setEditingExpense(null)}
        onUpdate={updateExpense}
      />
    </div>
  )
}
