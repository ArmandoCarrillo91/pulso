'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  loadCustomCategories,
  saveCustomCategories,
  loadHiddenDefaults,
  saveHiddenDefaults,
  loadOverrides,
  saveOverrides,
  type CustomCategory,
} from '@/lib/categories'
import SwipeableRow from '@/components/ui/SwipeableRow'

export default function CategoriesPage() {
  const supabase = createClient()

  const [catTab, setCatTab] = useState<'expense' | 'income'>('expense')
  const [customCats, setCustomCats] = useState(() => loadCustomCategories())
  const [hiddenDefaults, setHiddenDefaults] = useState(() => loadHiddenDefaults())
  const [overrides, setOverrides] = useState(() => loadOverrides())
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editCatEmoji, setEditCatEmoji] = useState('')
  const [editCatName, setEditCatName] = useState('')

  // Add new custom category
  const [showNewForm, setShowNewForm] = useState(false)
  const [newEmoji, setNewEmoji] = useState('')
  const [newName, setNewName] = useState('')

  const defaults = catTab === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
  const visibleDefaults = defaults
    .filter((c) => !hiddenDefaults.includes(c.id))
    .map((c) => {
      const ov = overrides.find((o) => o.id === c.id)
      return ov ? { ...c, emoji: ov.emoji, label: ov.label } : c
    })
  const customForTab = customCats.filter((c) => c.type === catTab)
  const allCats = [...visibleDefaults, ...customForTab]

  const isDefaultId = (id: string) =>
    [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].some((c) => c.id === id)

  const startEdit = (cat: { id: string; emoji: string; label: string }) => {
    setEditingCatId(cat.id)
    setEditCatEmoji(cat.emoji)
    setEditCatName(cat.label)
  }

  const saveEdit = async () => {
    if (!editingCatId || !editCatName.trim()) return
    const newLabel = editCatName.trim()
    const emoji = editCatEmoji.trim() || '📦'

    if (isDefaultId(editingCatId)) {
      const updated = [
        ...overrides.filter((o) => o.id !== editingCatId),
        { id: editingCatId, emoji, label: newLabel },
      ]
      saveOverrides(updated)
      setOverrides(updated)
    } else {
      const updated = customCats.map((c) =>
        c.id === editingCatId ? { ...c, label: newLabel, emoji } : c
      )
      saveCustomCategories(updated)
      setCustomCats(updated)
    }

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
      const ov = overrides.filter((o) => o.id !== id)
      saveOverrides(ov)
      setOverrides(ov)
    } else {
      const updated = customCats.filter((c) => c.id !== id)
      saveCustomCategories(updated)
      setCustomCats(updated)
    }
  }

  const handleAddNew = () => {
    if (!newName.trim()) return
    const cat: CustomCategory = {
      id: `custom-${Date.now()}`,
      emoji: newEmoji.trim() || '📦',
      label: newName.trim(),
      type: catTab,
    }
    const fresh = loadCustomCategories()
    const updated = [...fresh, cat]
    saveCustomCategories(updated)
    setCustomCats(updated)
    setShowNewForm(false)
    setNewEmoji('')
    setNewName('')
  }

  return (
    <div className="min-h-screen p-4" style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="p-2 -ml-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold">Categorías</h1>
        </div>
        {!showNewForm && (
          <button className="text-sm text-positive font-semibold" onClick={() => setShowNewForm(true)}>
            + Nueva
          </button>
        )}
      </div>

      {/* Tabs */}
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

      {/* New category form */}
      {showNewForm && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-card bg-[var(--bg-card)]" style={{ border: '0.5px solid var(--pill-border)' }}>
          <input
            type="text"
            value={newEmoji}
            onChange={(e) => setNewEmoji(e.target.value)}
            placeholder="📦"
            className="input-field w-12 text-center text-lg px-1 py-1"
          />
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre"
            className="input-field flex-1 py-1"
            autoFocus
          />
          <button
            className="text-positive font-semibold text-xs px-2 disabled:opacity-50"
            disabled={!newName.trim()}
            onClick={handleAddNew}
          >
            ✓
          </button>
          <button
            className="text-[var(--text-muted)] text-xs px-2"
            onClick={() => { setShowNewForm(false); setNewEmoji(''); setNewName('') }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Category list */}
      <div className="space-y-1.5">
        {allCats.map((cat) =>
          editingCatId === cat.id ? (
            <div
              key={cat.id}
              className="flex items-center gap-2 p-3 rounded-card bg-[var(--bg-card)]"
              style={{ border: '0.5px solid var(--pill-border)' }}
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
              <button className="text-positive font-semibold text-xs px-2" onClick={saveEdit}>
                ✓
              </button>
              <button className="text-[var(--text-muted)] text-xs px-2" onClick={() => setEditingCatId(null)}>
                ✕
              </button>
            </div>
          ) : (
            <SwipeableRow
              key={cat.id}
              onEdit={() => startEdit(cat)}
              onDelete={() => deleteCat(cat.id)}
            >
              <div
                className="flex items-center gap-3 p-3 rounded-card bg-[var(--bg-card)]"
                style={{ border: '0.5px solid var(--pill-border)' }}
              >
                <span className="text-lg">{cat.emoji}</span>
                <p className="text-sm font-medium flex-1">{cat.label}</p>
              </div>
            </SwipeableRow>
          )
        )}
      </div>
    </div>
  )
}
