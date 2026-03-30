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

export function getCategoryEmoji(categoryId: string): string {
  const found = ALL_CATEGORIES.find((c) => c.id === categoryId)
  if (found) return found.emoji

  const custom = loadCustomCategories()
  const customFound = custom.find((c) => c.id === categoryId)
  return customFound?.emoji || '📄'
}
