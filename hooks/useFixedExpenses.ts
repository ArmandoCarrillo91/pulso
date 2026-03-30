'use client'

import { useAppContext } from '@/app/context/AppContext'

export function useFixedExpenses() {
  const ctx = useAppContext()

  return {
    expenses: ctx.expenses,
    loading: ctx.expensesLoading,
    createExpense: ctx.createExpense,
    updateExpense: ctx.updateExpense,
    deleteExpense: ctx.deleteExpense,
    refetch: () => {},
  }
}
