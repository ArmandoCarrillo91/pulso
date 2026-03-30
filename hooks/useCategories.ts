'use client'

import { useAppContext } from '@/app/context/AppContext'

export function useCategories() {
  const ctx = useAppContext()

  return {
    categories: ctx.categories,
    incomeCategories: ctx.incomeCategories,
    expenseCategories: ctx.expenseCategories,
    loading: ctx.categoriesLoading,
    createCategory: ctx.createCategory,
    updateCategory: ctx.updateCategory,
    deleteCategory: ctx.deleteCategory,
  }
}
