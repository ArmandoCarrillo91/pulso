'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useCategories } from '@/hooks/useCategories'
import SwipeableRow from '@/components/ui/SwipeableRow'
import type { Category } from '@/types'

export default function CategoriesPage() {
  const {
    categories,
    incomeCategories,
    expenseCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategories()

  const [catTab, setCatTab] = useState<'expense' | 'income'>('expense')
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editCatEmoji, setEditCatEmoji] = useState('')
  const [editCatName, setEditCatName] = useState('')

  const [showNewForm, setShowNewForm] = useState(false)
  const [newEmoji, setNewEmoji] = useState('')
  const [newName, setNewName] = useState('')
  const [newParentId, setNewParentId] = useState<string | null>(null)

  // Expanded parents (to show subcategories)
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set())

  const topLevel = catTab === 'expense' ? expenseCategories : incomeCategories

  // Get subcategories for a parent
  const getSubcategories = (parentId: string) =>
    categories.filter((c) => c.parent_id === parentId)

  const hasSubcategories = (parentId: string) =>
    categories.some((c) => c.parent_id === parentId)

  const toggleExpand = (id: string) => {
    setExpandedParents((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const startEdit = (cat: Category) => {
    setEditingCatId(cat.id)
    setEditCatEmoji(cat.emoji)
    setEditCatName(cat.label)
  }

  const saveEdit = async () => {
    if (!editingCatId || !editCatName.trim()) return
    await updateCategory(editingCatId, {
      label: editCatName.trim(),
      emoji: editCatEmoji.trim() || '📦',
    })
    setEditingCatId(null)
  }

  const handleAddNew = async () => {
    if (!newName.trim()) return
    await createCategory({
      emoji: newEmoji.trim() || '📦',
      label: newName.trim(),
      type: catTab,
      parent_id: newParentId,
    })
    setShowNewForm(false)
    setNewEmoji('')
    setNewName('')
    setNewParentId(null)
  }

  const startAddSubcategory = (parentId: string) => {
    setNewParentId(parentId)
    setShowNewForm(true)
    setNewEmoji('')
    setNewName('')
    // Expand parent to show subcategories
    setExpandedParents((prev) => new Set(prev).add(parentId))
  }

  const renderCategoryRow = (cat: Category, indented = false) => {
    if (editingCatId === cat.id) {
      return (
        <div
          key={cat.id}
          className={`flex items-center gap-2 p-3 rounded-card bg-[var(--bg-card)] ${indented ? 'ml-6' : ''}`}
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
      )
    }

    const hasSubs = hasSubcategories(cat.id)
    const isExpanded = expandedParents.has(cat.id)

    return (
      <div key={cat.id}>
        <SwipeableRow
          onEdit={() => startEdit(cat)}
          onDelete={() => deleteCategory(cat.id)}
        >
          <div
            className={`flex items-center gap-3 p-3 rounded-card bg-[var(--bg-card)] ${indented ? 'ml-6' : ''}`}
            style={{ border: '0.5px solid var(--pill-border)' }}
          >
            <span className="text-lg">{cat.emoji}</span>
            <p className="text-sm font-medium flex-1">{cat.label}</p>
            {!indented && (
              <button
                className="text-[var(--text-muted)] p-1"
                onClick={(e) => { e.stopPropagation(); toggleExpand(cat.id) }}
              >
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}
          </div>
        </SwipeableRow>

        {/* Subcategories */}
        {!indented && isExpanded && (
          <div className="space-y-1.5 mt-1.5">
            {getSubcategories(cat.id).map((sub) => renderCategoryRow(sub, true))}
            <button
              className="ml-6 flex items-center gap-2 text-xs text-positive font-medium py-2"
              onClick={() => startAddSubcategory(cat.id)}
            >
              + Subcategoría
            </button>
          </div>
        )}
      </div>
    )
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
          <button className="text-sm text-positive font-semibold" onClick={() => { setShowNewForm(true); setNewParentId(null) }}>
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
            placeholder={newParentId ? 'Subcategoría' : 'Nombre'}
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
            onClick={() => { setShowNewForm(false); setNewEmoji(''); setNewName(''); setNewParentId(null) }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Category list */}
      <div className="space-y-1.5">
        {topLevel.map((cat) => renderCategoryRow(cat))}
        {topLevel.length === 0 && !showNewForm && (
          <div className="text-center py-12">
            <p className="text-[var(--text-muted)] text-sm mb-4">
              Sin categorías de {catTab === 'expense' ? 'gasto' : 'ingreso'}
            </p>
            <button
              className="text-sm text-positive font-semibold"
              onClick={() => { setShowNewForm(true); setNewParentId(null) }}
            >
              + Crear primera categoría
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
