export const INCOME_CATEGORIES = [
  { id: 'quincena', label: 'Quincena', emoji: '💼' },
  { id: 'bono', label: 'Bono', emoji: '🎯' },
  { id: 'freelance', label: 'Freelance', emoji: '⚡' },
  { id: 'otro-ingreso', label: 'Otro', emoji: '📩' },
]

export const EXPENSE_CATEGORIES = [
  { id: 'comida', label: 'Comida', emoji: '🍔' },
  { id: 'transporte', label: 'Transporte', emoji: '🚗' },
  { id: 'servicios', label: 'Servicios', emoji: '💡' },
  { id: 'ocio', label: 'Ocio', emoji: '🎬' },
  { id: 'salud', label: 'Salud', emoji: '💊' },
  { id: 'compras', label: 'Compras', emoji: '🛍' },
  { id: 'renta', label: 'Renta', emoji: '🏠' },
  { id: 'otro-gasto', label: 'Otro', emoji: '📦' },
]

export const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]
