'use client'

import { useAppContext } from '@/app/context/AppContext'

export function useBudgets() {
  const ctx = useAppContext()

  return {
    budgets: ctx.budgets,
    loading: ctx.budgetsLoading,
    createBudget: ctx.createBudget,
    updateBudget: ctx.updateBudget,
    deleteBudget: ctx.deleteBudget,
  }
}
