'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { getLocalDateString } from '@/lib/date'
import {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  loadCustomCategories,
  saveCustomCategories,
  type CustomCategory,
} from '@/lib/categories'
import Button from '@/components/ui/Button'
import StarRating from '@/components/ui/StarRating'
import type { Transaction, Plan } from '@/types'

interface TransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (
    transaction: Omit<Transaction, 'id' | 'created_at' | 'user_id'>
  ) => Promise<Transaction | null>
  plans: Plan[]
  currentBalance: number
  daysSinceLastIncome: number | null
  daysUntilNextPayday: number
  currentFortnight: number
}

export default function TransactionModal({
  isOpen,
  onClose,
  onSave,
  plans,
  currentBalance,
  daysSinceLastIncome,
  daysUntilNextPayday,
  currentFortnight,
}: TransactionModalProps) {
  const [step, setStep] = useState(1)
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [categoryId, setCategoryId] = useState('')
  const [categoryLabel, setCategoryLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [rating, setRating] = useState(0)
  const [saving, setSaving] = useState(false)
  const [categoryChanges, setCategoryChanges] = useState(0)
  const [date, setDate] = useState('')

  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({})

  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([])
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customEmoji, setCustomEmoji] = useState('')
  const [customName, setCustomName] = useState('')

  const openTimeRef = useRef(0)
  const prevCategoryRef = useRef('')
  const savedIdRef = useRef<string | null>(null)
  const emojiInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setCustomCategories(loadCustomCategories())
      openTimeRef.current = Date.now()
      setStep(1)
      setType('expense')
      setCategoryId('')
      setCategoryLabel('')
      setAmount('')
      setNote('')
      setRating(0)
      setSaving(false)
      setCategoryChanges(0)
      prevCategoryRef.current = ''
      savedIdRef.current = null
      setDate(getLocalDateString())
      setShowCustomForm(false)
      setCustomEmoji('')
      setCustomName('')

      const supabase = createClient()
      supabase
        .from('transactions')
        .select('category_id, type')
        .then(({ data }) => {
          if (!data) return
          const counts: Record<string, number> = {}
          for (const row of data) {
            counts[row.category_id] = (counts[row.category_id] || 0) + 1
          }
          setCategoryCounts(counts)
        })
    }
  }, [isOpen])

  const handleCategorySelect = (id: string, label: string) => {
    if (prevCategoryRef.current && prevCategoryRef.current !== id) {
      setCategoryChanges((c) => c + 1)
    }
    prevCategoryRef.current = id
    setCategoryId(id)
    setCategoryLabel(label)
    setStep(3)
  }

  const handleAddCustomCategory = () => {
    if (!customName.trim()) return
    const emoji = customEmoji.trim() || '📦'
    const newCat: CustomCategory = {
      id: `custom-${Date.now()}`,
      label: customName.trim(),
      emoji,
      type,
    }
    const fresh = loadCustomCategories()
    const updated = [...fresh, newCat]
    saveCustomCategories(updated)
    setCustomCategories(updated)
    setShowCustomForm(false)
    setCustomEmoji('')
    setCustomName('')
    handleCategorySelect(newCat.id, newCat.label)
  }

  const handleSave = async () => {
    const parsed = parseFloat(amount)
    if (!parsed || parsed <= 0) return
    setSaving(true)

    const entrySeconds = Math.round((Date.now() - openTimeRef.current) / 1000)
    const now = new Date()
    const balanceBefore = currentBalance
    const balanceAfter =
      currentBalance + (type === 'income' ? parsed : -parsed)

    let geoLat: number | null = null
    let geoLng: number | null = null
    let geoAccuracy: number | null = null

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
        })
      )
      geoLat = pos.coords.latitude
      geoLng = pos.coords.longitude
      geoAccuracy = pos.coords.accuracy
    } catch {
      // Geolocation unavailable or denied
    }

    const selectedDate = date || getLocalDateString(now)
    const dateObj = new Date(selectedDate + 'T12:00:00')

    const transaction: Omit<Transaction, 'id' | 'created_at' | 'user_id'> = {
      type,
      category_id: categoryId,
      category_label: categoryLabel,
      amount: parsed,
      note: note.trim() || null,
      rating: null,
      date: selectedDate,
      weekday: dateObj.getDay(),
      hour: now.getHours(),
      is_weekend: dateObj.getDay() === 0 || dateObj.getDay() === 6,
      fortnight: currentFortnight,
      geo_lat: geoLat,
      geo_lng: geoLng,
      geo_accuracy: geoAccuracy,
      platform: navigator.userAgent,
      entry_seconds: entrySeconds,
      category_changes: categoryChanges,
      had_note: note.trim().length > 0,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      days_since_last_income:
        type === 'income' ? 0 : daysSinceLastIncome,
      days_until_next_payday: daysUntilNextPayday,
    }

    const result = await onSave(transaction)
    setSaving(false)

    if (result) {
      savedIdRef.current = result.id
      setStep(4)
    }
  }

  const handleRatingDone = async () => {
    if (savedIdRef.current && rating > 0) {
      const supabase = createClient()
      const { error } = await supabase
        .from('transactions')
        .update({ rating })
        .eq('id', savedIdRef.current)
      if (error) {
        console.error('Error updating rating:', JSON.stringify(error))
      }
    }
    onClose()
  }

  if (!isOpen) return null

  const defaultCategories =
    type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const customForType = customCategories.filter((c) => c.type === type)
  const allCategories = [...defaultCategories, ...customForType]

  const used = allCategories
    .filter((c) => (categoryCounts[c.id] || 0) > 0)
    .sort((a, b) => (categoryCounts[b.id] || 0) - (categoryCounts[a.id] || 0))
  const unused = allCategories.filter((c) => !categoryCounts[c.id])
  const categories = [...used, ...unused]

  const totalSavings = plans.reduce(
    (sum, p) => sum + p.amount_per_fortnight,
    0
  )
  const showSavingsNote =
    categoryId === 'quincena' && plans.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={step < 4 ? onClose : undefined}
      />
      <div className="relative w-full max-w-app bg-[var(--bg-card)] rounded-t-[24px] p-6 pb-8 animate-slide-up">
        {/* Progress indicator */}
        {step < 4 && (
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
        )}

        {/* Step 1: Type */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-bold mb-4">Tipo de movimiento</h2>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                className={`p-4 rounded-card text-center font-semibold transition-all ${
                  type === 'income'
                    ? 'bg-positive/10 text-positive border-2 border-positive'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-2 border-transparent'
                }`}
                onClick={() => setType('income')}
              >
                Ingreso
              </button>
              <button
                className={`p-4 rounded-card text-center font-semibold transition-all ${
                  type === 'expense'
                    ? 'bg-negative/10 text-negative border-2 border-negative'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-2 border-transparent'
                }`}
                onClick={() => setType('expense')}
              >
                Gasto
              </button>
            </div>
            <Button fullWidth onClick={() => setStep(2)}>
              Siguiente
            </Button>
          </div>
        )}

        {/* Step 2: Category — auto-advances on tap */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-bold mb-4">Categoría</h2>

            {!showCustomForm && (
              <div className="grid grid-cols-4 gap-3 mb-4">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    className="flex flex-col items-center gap-1 p-3 rounded-card transition-all bg-[var(--bg-secondary)] border-2 border-transparent active:border-positive active:bg-positive/10"
                    onClick={() => handleCategorySelect(cat.id, cat.label)}
                  >
                    <span className="text-2xl">{cat.emoji}</span>
                    <span className="text-[11px] font-medium">{cat.label}</span>
                  </button>
                ))}
                <button
                  className="flex flex-col items-center justify-center gap-1 p-3 rounded-card transition-all bg-[var(--bg-secondary)] border-2 border-dashed border-[var(--border-color)] active:border-positive"
                  onClick={() => setShowCustomForm(true)}
                >
                  <span className="text-2xl">+</span>
                  <span className="text-[11px] font-medium">Nueva</span>
                </button>
              </div>
            )}

            {showCustomForm && (
              <div className="mb-4 space-y-3">
                <button
                  className="text-xs text-[var(--text-secondary)] font-medium"
                  onClick={() => { setShowCustomForm(false); setCustomEmoji(''); setCustomName('') }}
                >
                  ← Cancelar
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => emojiInputRef.current?.focus()}
                    className="flex items-center justify-center shrink-0 w-12 h-12 rounded-btn bg-[var(--bg-secondary)] border border-[var(--border-color)] text-2xl active:border-positive"
                  >
                    {customEmoji || '📦'}
                  </button>
                  <input
                    ref={emojiInputRef}
                    type="text"
                    value=""
                    onChange={(e) => {
                      const val = e.target.value
                      if (val) setCustomEmoji(val)
                    }}
                    maxLength={2}
                    style={{ width: 0, height: 0, opacity: 0, position: 'absolute', pointerEvents: 'none' }}
                  />
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Nombre de la categoría"
                    className="input-field flex-1"
                    autoFocus
                  />
                </div>
                <Button
                  fullWidth
                  disabled={!customName.trim()}
                  onClick={handleAddCustomCategory}
                >
                  Agregar
                </Button>
              </div>
            )}

            <Button variant="secondary" onClick={() => setStep(1)}>
              Atrás
            </Button>
          </div>
        )}

        {/* Step 3: Amount + Note */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-bold mb-4">Monto</h2>
            {showSavingsNote && (
              <p className="text-sm text-positive bg-positive/10 p-3 rounded-btn mb-4">
                Se apartarán ${totalSavings.toLocaleString()} para tus{' '}
                {plans.length} planes de ahorro
              </p>
            )}
            <div className="flex items-center justify-center mb-4">
              <span className="text-4xl font-bold mr-1">$</span>
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="text-4xl font-bold w-48 bg-transparent outline-none text-center"
                autoFocus
              />
            </div>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nota (opcional)"
              className="input-field mb-3"
            />
            <label className="block text-xs text-[var(--text-secondary)] mb-1">
              Fecha
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={getLocalDateString()}
              className="input-field mb-6"
            />
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(2)}>
                Atrás
              </Button>
              <Button
                fullWidth
                disabled={!amount || parseFloat(amount) <= 0 || saving}
                onClick={handleSave}
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Rating */}
        {step === 4 && (
          <div className="text-center">
            <h2 className="text-lg font-bold mb-2">
              {type === 'expense'
                ? '¿Fue necesario este gasto?'
                : '¿Qué tan satisfecho te sientes?'}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              {type === 'expense'
                ? 'Califica qué tan necesario fue'
                : 'Califica qué tan satisfecho te sientes'}
            </p>
            <StarRating value={rating} onChange={setRating} />
            <div className="mt-6">
              <Button fullWidth onClick={handleRatingDone}>
                Listo
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
