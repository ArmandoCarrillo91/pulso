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
  is_commitment_payment?: boolean
  is_extraordinary?: boolean
}

export interface Commitment {
  id: string
  user_id: string
  name: string
  amount: number
  frequency: 'fortnight' | 'monthly' | 'once'
  end_type: 'indefinite' | 'date' | 'installments' | 'goal'
  end_date: string | null
  total_installments: number | null
  paid_installments: number
  goal_amount: number | null
  current_amount: number
  start_date: string
  day_of_month: number | null
  category_id: string | null
  category?: Category
  last_paid_date: string | null
  completed_at: string | null
  priority: number
  total_amount: number | null
  initial_balance: number
  balance_start_date: string | null
  created_at: string
}

export type CommitmentType = 'fixed' | 'msi' | 'savings_goal' | 'seasonal' | 'recurring_savings' | 'one_time'

export function getCommitmentType(c: Commitment): CommitmentType {
  if (c.frequency === 'monthly' && c.end_type === 'indefinite') return 'fixed'
  if (c.frequency === 'monthly' && c.end_type === 'installments') return 'msi'
  if (c.frequency === 'fortnight' && c.end_type === 'goal') return 'savings_goal'
  if (c.frequency === 'fortnight' && c.end_type === 'date') return 'seasonal'
  if (c.frequency === 'fortnight' && c.end_type === 'indefinite') return 'recurring_savings'
  return 'one_time'
}

export interface Budget {
  id: string
  user_id: string
  category_id: string
  category?: Category
  amount: number
  frequency: 'fortnight' | 'monthly'
  created_at: string
}

export interface User {
  id: string
  email: string
  first_name?: string
}
