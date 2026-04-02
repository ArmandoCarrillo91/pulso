'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { getLocalDateString } from '@/lib/date'
import { detectPlatform } from '@/lib/utils'
import { useCategories } from '@/hooks/useCategories'
import { useBudgets } from '@/hooks/useBudgets'
import { useTransactions } from '@/hooks/useTransactions'
import Button from '@/components/ui/Button'
import StarRating from '@/components/ui/StarRating'
import type { Transaction, Category } from '@/types'

interface TransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (
    transaction: Omit<Transaction, 'id' | 'created_at' | 'user_id' | 'category'>
  ) => Promise<Transaction | null>
  currentBalance: number
  daysSinceLastIncome: number | null
  daysUntilNextPayday: number
  currentFortnight: number
}

export default function TransactionModal({
  isOpen,
  onClose,
  onSave,
  currentBalance,
  daysSinceLastIncome,
  daysUntilNextPayday,
  currentFortnight,
}: TransactionModalProps) {
  const [step, setStep] = useState(1)
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [rating, setRating] = useState(0)
  const [saving, setSaving] = useState(false)
  const [categoryChanges, setCategoryChanges] = useState(0)
  const [date, setDate] = useState('')

  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({})

  const [showCustomForm, setShowCustomForm] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [customEmoji, setCustomEmoji] = useState('')
  const [customName, setCustomName] = useState('')

  const openTimeRef = useRef(0)
  const prevCategoryRef = useRef<string | null>(null)
  const savedIdRef = useRef<string | null>(null)
  const emojiInputRef = useRef<HTMLInputElement>(null)

  const {
    incomeCategories,
    expenseCategories,
    createCategory,
  } = useCategories()
  const { budgets } = useBudgets()
  const { transactions: allTx } = useTransactions()

  // Compute budget remaining per category
  const budgetRemaining = useMemo(() => {
    const periodStart = allTx.find((t) => t.type === 'income')?.date
    if (!periodStart) return new Map<string, { remaining: number; pct: number }>()

    const map = new Map<string, { remaining: number; pct: number }>()
    for (const b of budgets) {
      const spent = allTx
        .filter((t) => t.type === 'expense' && t.date >= periodStart && t.category_id === b.category_id)
        .reduce((sum, t) => sum + t.amount, 0)
      const limit = b.frequency === 'monthly' ? b.amount / 2 : b.amount
      const remaining = Math.max(limit - spent, 0)
      const pct = limit > 0 ? remaining / limit : 1
      map.set(b.category_id, { remaining, pct })
    }
    return map
  }, [budgets, allTx])

  useEffect(() => {
    if (isOpen) {
      openTimeRef.current = Date.now()
      setStep(1)
      setType('expense')
      setCategoryId(null)
      setAmount('')
      setNote('')
      setRating(0)
      setSaving(false)
      setCategoryChanges(0)
      prevCategoryRef.current = null
      savedIdRef.current = null
      setDate(getLocalDateString())
      setShowCustomForm(false)
      setShowMore(false)
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
            if (row.category_id) {
              counts[row.category_id] = (counts[row.category_id] || 0) + 1
            }
          }
          setCategoryCounts(counts)
        })
    }
  }, [isOpen])

  const handleCategorySelect = (cat: Category) => {
    if (prevCategoryRef.current && prevCategoryRef.current !== cat.id) {
      setCategoryChanges((c) => c + 1)
    }
    prevCategoryRef.current = cat.id
    setCategoryId(cat.id)
    setStep(3)
  }

  const handleAddCustomCategory = async () => {
    if (!customName.trim()) return
    const emoji = customEmoji.trim() || '📦'
    const newCat = await createCategory({
      label: customName.trim(),
      emoji,
      type,
      parent_id: null,
    })
    if (newCat) {
      setShowCustomForm(false)
      setCustomEmoji('')
      setCustomName('')
      handleCategorySelect(newCat)
    }
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

    const transaction: Omit<Transaction, 'id' | 'created_at' | 'user_id' | 'category'> = {
      type,
      category_id: categoryId,
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
      platform: detectPlatform(),
      source: 'manual',
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

  const allCategories = type === 'income' ? incomeCategories : expenseCategories
  const hasNoCategories = allCategories.length === 0

  const hasAnyTransactions = Object.values(categoryCounts).some((c) => c > 0)
  const usedCategories = allCategories
    .filter((c) => (categoryCounts[c.id] || 0) > 0)
    .sort((a, b) => (categoryCounts[b.id] || 0) - (categoryCounts[a.id] || 0))
  const unusedCategories = allCategories.filter((c) => !categoryCounts[c.id])

  const isOnboarding = !hasAnyTransactions
  const gridCategories = isOnboarding ? allCategories : usedCategories
  const mainGrid = gridCategories.slice(0, 8)
  const overflowUsed = gridCategories.slice(8)
  const hasOverflow =
    overflowUsed.length > 0 ||
    (!isOnboarding && unusedCategories.length > 0)

  const selectedCat = allCategories.find((c) => c.id === categoryId)

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

            {/* No categories: show create form directly */}
            {hasNoCategories && !showCustomForm && (
              <div className="text-center mb-4">
                <p className="text-sm text-[var(--text-muted)] mb-4">
                  Aún no tienes categorías. Crea tu primera.
                </p>
                <Button onClick={() => setShowCustomForm(true)}>
                  + Nueva categoría
                </Button>
              </div>
            )}

            {!hasNoCategories && !showCustomForm && (
              <div className="mb-4">
                {/* Main grid: top 8 (or all if onboarding) */}
                <div className="grid grid-cols-4 gap-3">
                  {mainGrid.map((cat) => {
                    const bInfo = budgetRemaining.get(cat.id)
                    return (
                      <button
                        key={cat.id}
                        className="flex flex-col items-center gap-1 p-3 rounded-card transition-all bg-[var(--bg-secondary)] border-2 border-transparent active:border-positive active:bg-positive/10"
                        onClick={() => handleCategorySelect(cat)}
                      >
                        <span className="text-2xl">{cat.emoji}</span>
                        <span className="text-[11px] font-medium">{cat.label}</span>
                        {bInfo && (
                          <span className={`text-[9px] ${
                            bInfo.pct > 0.3 ? 'text-positive/70'
                            : bInfo.pct > 0.1 ? 'text-amber-500/70'
                            : 'text-negative/70'
                          }`}>
                            ${Math.round(bInfo.remaining)}
                          </span>
                        )}
                      </button>
                    )
                  })}
                  {/* Show + Nueva inline if grid has room (<8) and no overflow */}
                  {mainGrid.length < 8 && !hasOverflow && (
                    <button
                      className="flex flex-col items-center justify-center gap-1 p-3 rounded-card transition-all bg-[var(--bg-secondary)] border-2 border-dashed border-[var(--border-color)] active:border-positive"
                      onClick={() => setShowCustomForm(true)}
                    >
                      <span className="text-2xl">+</span>
                      <span className="text-[11px] font-medium">Nueva</span>
                    </button>
                  )}
                </div>

                {/* Ver más / Ver menos toggle */}
                {hasOverflow && (
                  <button
                    className="text-xs font-medium text-positive mt-3 mb-1"
                    onClick={() => setShowMore(!showMore)}
                  >
                    {showMore ? '− Ver menos' : '+ Ver más'}
                  </button>
                )}

                {/* Expanded section */}
                {showMore && (
                  <div
                    className="overflow-hidden transition-all duration-300"
                    style={{ maxHeight: showMore ? '600px' : '0' }}
                  >
                    {/* Overflow used categories */}
                    {overflowUsed.length > 0 && (
                      <div className="grid grid-cols-4 gap-3 mt-2">
                        {overflowUsed.map((cat) => (
                          <button
                            key={cat.id}
                            className="flex flex-col items-center gap-1 p-3 rounded-card transition-all bg-[var(--bg-secondary)] border-2 border-transparent active:border-positive active:bg-positive/10"
                            onClick={() => handleCategorySelect(cat)}
                          >
                            <span className="text-2xl">{cat.emoji}</span>
                            <span className="text-[11px] font-medium">{cat.label}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Unused categories */}
                    {!isOnboarding && unusedCategories.length > 0 && (
                      <>
                        <p
                          className="text-[10px] font-medium uppercase mt-4 mb-2"
                          style={{ letterSpacing: '1px', color: 'var(--text-muted)' }}
                        >
                          Nunca usadas
                        </p>
                        <div className="grid grid-cols-4 gap-3 opacity-50">
                          {unusedCategories.map((cat) => (
                            <button
                              key={cat.id}
                              className="flex flex-col items-center gap-1 p-3 rounded-card transition-all bg-[var(--bg-secondary)] border-2 border-transparent active:border-positive active:bg-positive/10"
                              onClick={() => handleCategorySelect(cat)}
                            >
                              <span className="text-2xl">{cat.emoji}</span>
                              <span className="text-[11px] font-medium">{cat.label}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {/* + Nueva in expanded view */}
                    <div className="mt-3">
                      <button
                        className="flex items-center gap-2 text-sm text-positive font-medium"
                        onClick={() => setShowCustomForm(true)}
                      >
                        + Nueva categoría
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {showCustomForm && (
              <div className="mb-4 space-y-3">
                {!hasNoCategories && (
                  <button
                    className="text-xs text-[var(--text-secondary)] font-medium"
                    onClick={() => { setShowCustomForm(false); setCustomEmoji(''); setCustomName('') }}
                  >
                    ← Cancelar
                  </button>
                )}
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
            {/* Sobre warning */}
            {(() => {
              if (!categoryId || type !== 'expense') return null
              const bInfo = budgetRemaining.get(categoryId)
              if (!bInfo) return null
              const parsed = parseFloat(amount) || 0
              if (parsed <= 0) return null
              const afterSpend = bInfo.remaining - parsed
              const catLabel = allCategories.find((c) => c.id === categoryId)?.label || ''
              if (afterSpend < 0) {
                return <p className="text-xs text-amber-500 text-center mb-2">Este gasto supera tu sobre de {catLabel} por ${Math.abs(Math.round(afterSpend)).toLocaleString()}</p>
              }
              if (afterSpend === 0) {
                return <p className="text-xs text-amber-500 text-center mb-2">Este gasto deja tu sobre de {catLabel} en $0</p>
              }
              return null
            })()}
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
              className="input-field mb-3"
            />

            <div className="mb-3" />
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
