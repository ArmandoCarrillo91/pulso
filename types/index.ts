export interface Transaction {
  id: string
  user_id: string
  type: 'income' | 'expense'
  category_id: string
  category_label: string
  amount: number
  note: string | null
  rating: number | null
  date: string
  created_at: string
  weekday: number
  hour: number
  is_weekend: boolean
  fortnight: number
  geo_lat: number | null
  geo_lng: number | null
  geo_accuracy: number | null
  platform: string
  entry_seconds: number
  category_changes: number
  had_note: boolean
  balance_before: number
  balance_after: number
  days_since_last_income: number | null
  days_until_next_payday: number
}

export type PlanType = 'meta' | 'anual' | 'estacional'

export interface Plan {
  id: string
  user_id: string
  name: string
  amount_per_fortnight: number
  goal_amount: number
  time_value: number
  time_unit: 'fortnights' | 'months' | 'days'
  priority: number
  plan_type: PlanType
  start_date: string
  target_date: string | null
  current_amount: number
  recurrence_month: number | null
}

export interface FixedExpense {
  id: string
  user_id: string
  name: string
  amount: number
  day_of_month: number
}

export interface User {
  id: string
  email: string
  first_name?: string
}
