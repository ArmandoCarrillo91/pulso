export const INCOME_CATEGORIES = [
  { id: 'quincena', label: 'Quincena', emoji: '💼' },
  { id: 'bono', label: 'Bono', emoji: '🎯' },
  { id: 'freelance', label: 'Freelance', emoji: '⚡' },
  { id: 'venta', label: 'Venta', emoji: '💸' },
  { id: 'renta-ingreso', label: 'Renta', emoji: '🏠' },
  { id: 'otro-ingreso', label: 'Otro ingreso', emoji: '📩' },
]

export const EXPENSE_CATEGORIES = [
  { id: 'comida', label: 'Comida', emoji: '🍔' },
  { id: 'restaurante', label: 'Restaurante', emoji: '🍽️' },
  { id: 'gasolina', label: 'Gasolina', emoji: '⛽' },
  { id: 'transporte', label: 'Transporte', emoji: '🚗' },
  { id: 'servicios', label: 'Servicios', emoji: '💡' },
  { id: 'suscripciones', label: 'Suscripciones', emoji: '📱' },
  { id: 'ocio', label: 'Ocio', emoji: '🎬' },
  { id: 'salud', label: 'Salud', emoji: '💊' },
  { id: 'compras', label: 'Compras', emoji: '🛍️' },
  { id: 'renta', label: 'Renta', emoji: '🏠' },
  { id: 'hipoteca', label: 'Hipoteca', emoji: '🏦' },
  { id: 'educacion', label: 'Educación', emoji: '📚' },
  { id: 'otro-gasto', label: 'Otro', emoji: '📦' },
]

export const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]

export interface Category {
  id: string
  label: string
  emoji: string
}

export interface CustomCategory extends Category {
  type: 'income' | 'expense'
}

const STORAGE_KEY = 'pulso_custom_categories'
const HIDDEN_KEY = 'pulso_hidden_defaults'
const OVERRIDES_KEY = 'pulso_category_overrides'

export function loadCustomCategories(): CustomCategory[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveCustomCategories(categories: CustomCategory[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(categories))
}

// Hidden defaults: default categories the user chose to delete
export function loadHiddenDefaults(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveHiddenDefaults(ids: string[]) {
  localStorage.setItem(HIDDEN_KEY, JSON.stringify(ids))
}

// Overrides: default categories the user edited (emoji/label changes)
export interface CategoryOverride {
  id: string
  emoji: string
  label: string
}

export function loadOverrides(): CategoryOverride[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(OVERRIDES_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveOverrides(overrides: CategoryOverride[]) {
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides))
}

// Get visible default categories with overrides applied
export function getVisibleDefaults(type: 'income' | 'expense'): Category[] {
  const defaults = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const hidden = loadHiddenDefaults()
  const overrides = loadOverrides()

  return defaults
    .filter((c) => !hidden.includes(c.id))
    .map((c) => {
      const ov = overrides.find((o) => o.id === c.id)
      return ov ? { ...c, emoji: ov.emoji, label: ov.label } : c
    })
}

export function getCategoryEmoji(categoryId: string): string {
  // Check overrides first
  const overrides = loadOverrides()
  const ov = overrides.find((o) => o.id === categoryId)
  if (ov) return ov.emoji

  const found = ALL_CATEGORIES.find((c) => c.id === categoryId)
  if (found) return found.emoji

  const custom = loadCustomCategories()
  const customFound = custom.find((c) => c.id === categoryId)
  return customFound?.emoji || '📄'
}
