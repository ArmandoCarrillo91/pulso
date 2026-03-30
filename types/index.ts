export interface Category {
  id: string
  user_id: string
  slug: string
  label: string
  emoji: string
  type: 'income' | 'expense'
  parent_id: string | null
  sort_order: number
  created_at: string
  subcategories?: Category[]
}

export interface Transaction {
  id: string
  user_id: string
  type: 'income' | 'expense'
  category_id: string | null
  category?: Category
  amount: number
  note: string | null
  rating: number | null
  date: string
  created_at: string
  weekday?: number
  hour?: number
  is_weekend?: boolean
  fortnight?: number
  geo_lat?: number | null
  geo_lng?: number | null
  geo_accuracy?: number | null
  platform?: string
  entry_seconds?: number
  category_changes?: number
  had_note?: boolean
  balance_before?: number
  balance_after?: number
  days_since_last_income?: number | null
  days_until_next_payday?: number
  source: 'manual' | 'automated' | 'api' | 'import'
}

export interface Plan {
  id: string
  user_id: string
  name: string
  amount_per_fortnight: number
  goal_amount: number
  priority: number
  start_date: string
  target_date: string | null
  current_amount: number
  created_at?: string
}

export interface FixedExpense {
  id: string
  user_id: string
  name: string
  amount: number
  day_of_month: number
  category_id: string | null
  category?: Category
  next_payment_date: string | null
  end_date: string | null
  last_paid_date: string | null
  start_date: string | null
  total_installments: number | null
  paid_installments: number
  expense_type: 'fixed' | 'msi'
  completed_at: string | null
  total_amount: number | null
}

export interface User {
  id: string
  email: string
  first_name?: string
}
