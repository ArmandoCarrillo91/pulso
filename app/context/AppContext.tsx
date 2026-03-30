'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { createClient } from '@/lib/supabase'
import type { Transaction, Plan, FixedExpense, Category } from '@/types'

interface AppContextValue {
  // Categories
  categories: Category[]
  incomeCategories: Category[]
  expenseCategories: Category[]
  categoriesLoading: boolean
  createCategory: (
    data: Pick<Category, 'label' | 'emoji' | 'type' | 'parent_id'>
  ) => Promise<Category | null>
  updateCategory: (
    id: string,
    updates: Partial<Pick<Category, 'label' | 'emoji' | 'sort_order'>>
  ) => Promise<void>
  deleteCategory: (id: string) => Promise<void>

  // Transactions
  transactions: Transaction[]
  transactionsLoading: boolean
  currentBalance: number
  daysSinceLastIncome: number | null
  createTransaction: (
    t: Omit<Transaction, 'id' | 'created_at' | 'user_id' | 'category'>
  ) => Promise<Transaction | null>
  updateTransaction: (
    id: string,
    updates: Partial<Transaction>
  ) => Promise<boolean>
  deleteTransaction: (id: string) => Promise<boolean>
  transactionToast: string
  clearTransactionToast: () => void

  // Plans
  plans: Plan[]
  plansLoading: boolean
  totalSavingsPerFortnight: number
  createPlan: (plan: Omit<Plan, 'id' | 'user_id'>) => Promise<Plan | null>
  updatePlan: (id: string, updates: Partial<Plan>) => Promise<void>
  deletePlan: (id: string) => Promise<void>
  reorderPlans: (reordered: Plan[]) => Promise<void>
  planToast: string
  clearPlanToast: () => void

  // Fixed Expenses
  expenses: FixedExpense[]
  expensesLoading: boolean
  createExpense: (
    e: Omit<FixedExpense, 'id' | 'user_id' | 'category'>
  ) => Promise<FixedExpense | null>
  updateExpense: (
    id: string,
    updates: Partial<FixedExpense>
  ) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient()

  // Cache user ID so we only call getUser() once on mount
  const userIdRef = useRef<string | null>(null)

  const getUserId = useCallback(async () => {
    if (userIdRef.current) return userIdRef.current
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) userIdRef.current = user.id
    return user?.id ?? null
  }, [supabase])

  // ─── Categories ───
  const [categories, setCategories] = useState<Category[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)

  const fetchCategories = useCallback(async () => {
    const userId = await getUserId()
    if (!userId) return

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching categories:', JSON.stringify(error))
    } else if (data) {
      setCategories(data)
    }
    setCategoriesLoading(false)
  }, [supabase, getUserId])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const incomeCategories = categories.filter((c) => c.type === 'income' && !c.parent_id)
  const expenseCategories = categories.filter((c) => c.type === 'expense' && !c.parent_id)

  const createCategory = useCallback(
    async (data: Pick<Category, 'label' | 'emoji' | 'type' | 'parent_id'>) => {
      const userId = await getUserId()
      if (!userId) return null

      const slug = data.label
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        + '-' + Date.now().toString(36)

      const tempId = `temp-${Date.now()}`
      const optimistic = {
        ...data,
        id: tempId,
        user_id: userId,
        slug,
        sort_order: categories.length,
        created_at: new Date().toISOString(),
      } as Category
      setCategories((prev) => [...prev, optimistic])

      const { data: result, error } = await supabase
        .from('categories')
        .insert({
          user_id: userId,
          slug,
          label: data.label,
          emoji: data.emoji || '📦',
          type: data.type,
          parent_id: data.parent_id,
          sort_order: categories.length,
        })
        .select()
        .single()

      if (error) {
        setCategories((prev) => prev.filter((c) => c.id !== tempId))
        console.error('Error creating category:', JSON.stringify(error))
        return null
      }

      setCategories((prev) =>
        prev.map((c) => (c.id === tempId ? result : c))
      )
      return result as Category
    },
    [supabase, getUserId, categories.length]
  )

  const updateCategory = useCallback(
    async (
      id: string,
      updates: Partial<Pick<Category, 'label' | 'emoji' | 'sort_order'>>
    ) => {
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
      )

      const { error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)

      if (error) {
        await fetchCategories()
      }
    },
    [supabase, fetchCategories]
  )

  const deleteCategory = useCallback(
    async (id: string) => {
      let removed: Category | undefined
      setCategories((prev) => {
        removed = prev.find((c) => c.id === id)
        return prev.filter((c) => c.id !== id)
      })

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)

      if (error) {
        if (removed) setCategories((prev) => [...prev, removed!])
        console.error('Error deleting category:', JSON.stringify(error))
      }
    },
    [supabase]
  )

  // ─── Transactions ───
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(true)
  const [transactionToast, setTransactionToast] = useState('')

  const fetchTransactions = useCallback(async () => {
    const userId = await getUserId()
    if (!userId) return

    const { data, error } = await supabase
      .from('transactions')
      .select('*, category:categories(id, slug, label, emoji, parent_id)')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching transactions:', JSON.stringify(error))
    } else if (data) {
      setTransactions(data as Transaction[])
    }
    setTransactionsLoading(false)
  }, [supabase, getUserId])

  useEffect(() => {
    // Keepalive: fire-and-forget ping to wake Supabase free-tier DB
    supabase.from('transactions').select('id').limit(1).then(() => {})

    fetchTransactions()

    const channel = supabase
      .channel('transactions-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'pulso', table: 'transactions' },
        () => fetchTransactions()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchTransactions])

  const currentBalance = transactions.reduce(
    (sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount),
    0
  )

  const createTransaction = useCallback(
    async (
      transaction: Omit<Transaction, 'id' | 'created_at' | 'user_id' | 'category'>
    ) => {
      const userId = await getUserId()
      if (!userId) return null

      const tempId = `temp-${Date.now()}`
      // Find category from context for optimistic display
      const cat = categories.find((c) => c.id === transaction.category_id)
      const optimistic = {
        ...transaction,
        id: tempId,
        user_id: userId,
        created_at: new Date().toISOString(),
        category: cat || undefined,
      } as Transaction

      setTransactions((prev) => [optimistic, ...prev])

      // Don't send category to insert — it's a joined field
      const { category: _, ...insertData } = transaction as Transaction & { category?: unknown }
      const { data, error } = await supabase
        .from('transactions')
        .insert({ ...insertData, user_id: userId })
        .select('*, category:categories(id, slug, label, emoji, parent_id)')
        .single()

      if (error) {
        setTransactions((prev) => prev.filter((t) => t.id !== tempId))
        setTransactionToast('Error al guardar. Intenta de nuevo.')
        console.error('Error creating transaction:', JSON.stringify(error))
        return null
      }

      setTransactions((prev) =>
        prev.map((t) => (t.id === tempId ? (data as Transaction) : t))
      )
      return data as Transaction
    },
    [supabase, getUserId, categories]
  )

  const updateTransaction = useCallback(
    async (id: string, updates: Partial<Transaction>) => {
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
      )

      // Strip joined fields before sending to DB
      const { category: _, ...dbUpdates } = updates as Transaction & { category?: unknown }

      const { error } = await supabase
        .from('transactions')
        .update(dbUpdates)
        .eq('id', id)

      if (error) {
        console.error('Error updating transaction:', JSON.stringify(error))
        await fetchTransactions()
        return false
      }
      await fetchTransactions()
      return true
    },
    [supabase, fetchTransactions]
  )

  const deleteTransaction = useCallback(
    async (id: string) => {
      let removed: Transaction | undefined
      setTransactions((prev) => {
        removed = prev.find((t) => t.id === id)
        return prev.filter((t) => t.id !== id)
      })

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)

      if (error) {
        if (removed) setTransactions((prev) => [removed!, ...prev])
        setTransactionToast('Error al eliminar. Intenta de nuevo.')
        console.error('Error deleting transaction:', JSON.stringify(error))
        return false
      }
      return true
    },
    [supabase]
  )

  const daysSinceLastIncome = (() => {
    const lastIncome = transactions.find((t) => t.type === 'income')
    if (!lastIncome) return null
    const diffMs = Date.now() - new Date(lastIncome.date).getTime()
    return Math.floor(diffMs / (1000 * 60 * 60 * 24))
  })()

  // ─── Plans ───
  const [plans, setPlans] = useState<Plan[]>([])
  const [plansLoading, setPlansLoading] = useState(true)
  const [planToast, setPlanToast] = useState('')

  const fetchPlans = useCallback(async () => {
    const userId = await getUserId()
    if (!userId) return

    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('user_id', userId)
      .order('priority', { ascending: true })

    if (error) {
      console.error('Error fetching plans:', JSON.stringify(error))
    } else if (data) {
      setPlans(data)
    }
    setPlansLoading(false)
  }, [supabase, getUserId])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  const totalSavingsPerFortnight = plans.reduce(
    (sum, p) => sum + p.amount_per_fortnight,
    0
  )

  const createPlan = useCallback(
    async (plan: Omit<Plan, 'id' | 'user_id'>) => {
      const userId = await getUserId()
      if (!userId) return null

      const tempId = `temp-${Date.now()}`
      const optimistic = { ...plan, id: tempId, user_id: userId } as Plan
      setPlans((prev) => [...prev, optimistic])

      const { data, error } = await supabase
        .from('plans')
        .insert({ ...plan, user_id: userId })
        .select()
        .single()

      if (error) {
        setPlans((prev) => prev.filter((p) => p.id !== tempId))
        setPlanToast('Error al crear plan. Intenta de nuevo.')
        console.error('Error creating plan:', JSON.stringify(error))
        return null
      }

      setPlans((prev) => prev.map((p) => (p.id === tempId ? data : p)))
      return data
    },
    [supabase, getUserId]
  )

  const updatePlan = useCallback(
    async (id: string, updates: Partial<Plan>) => {
      setPlans((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
      )

      const { error } = await supabase
        .from('plans')
        .update(updates)
        .eq('id', id)

      if (error) {
        await fetchPlans()
      } else {
        await fetchPlans()
      }
    },
    [supabase, fetchPlans]
  )

  const deletePlan = useCallback(
    async (id: string) => {
      let removed: Plan | undefined
      setPlans((prev) => {
        removed = prev.find((p) => p.id === id)
        return prev.filter((p) => p.id !== id)
      })

      const { error } = await supabase.from('plans').delete().eq('id', id)
      if (error) {
        if (removed) setPlans((prev) => [...prev, removed!])
        setPlanToast('Error al eliminar. Intenta de nuevo.')
        console.error('Error deleting plan:', JSON.stringify(error))
      }
    },
    [supabase]
  )

  const reorderPlans = useCallback(
    async (reordered: Plan[]) => {
      setPlans(reordered)
      for (let i = 0; i < reordered.length; i++) {
        await supabase
          .from('plans')
          .update({ priority: i + 1 })
          .eq('id', reordered[i].id)
      }
    },
    [supabase]
  )

  // ─── Fixed Expenses ───
  const [expenses, setExpenses] = useState<FixedExpense[]>([])
  const [expensesLoading, setExpensesLoading] = useState(true)

  const fetchExpenses = useCallback(async () => {
    const userId = await getUserId()
    if (!userId) return

    const { data, error } = await supabase
      .from('fixed_expenses')
      .select('*, category:categories(id, slug, label, emoji)')
      .eq('user_id', userId)
      .order('day_of_month', { ascending: true })

    if (error) {
      console.error('Error fetching fixed expenses:', JSON.stringify(error))
    } else if (data) {
      setExpenses(data as FixedExpense[])
    }
    setExpensesLoading(false)
  }, [supabase, getUserId])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  const createExpense = useCallback(
    async (expense: Omit<FixedExpense, 'id' | 'user_id' | 'category'>) => {
      const userId = await getUserId()
      if (!userId) return null

      const tempId = `temp-${Date.now()}`
      const cat = categories.find((c) => c.id === expense.category_id)
      const optimistic = {
        ...expense,
        id: tempId,
        user_id: userId,
        category: cat || undefined,
      } as FixedExpense
      setExpenses((prev) => [...prev, optimistic])

      const { category: _, ...insertData } = expense as FixedExpense & { category?: unknown }
      const { data, error } = await supabase
        .from('fixed_expenses')
        .insert({ ...insertData, user_id: userId })
        .select('*, category:categories(id, slug, label, emoji)')
        .single()

      if (error) {
        setExpenses((prev) => prev.filter((e) => e.id !== tempId))
        console.error('Error creating expense:', JSON.stringify(error))
        return null
      }

      setExpenses((prev) =>
        prev.map((e) => (e.id === tempId ? (data as FixedExpense) : e))
      )
      return data as FixedExpense
    },
    [supabase, getUserId, categories]
  )

  const updateExpense = useCallback(
    async (id: string, updates: Partial<FixedExpense>) => {
      setExpenses((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
      )

      const { category: _, ...dbUpdates } = updates as FixedExpense & { category?: unknown }

      const { error } = await supabase
        .from('fixed_expenses')
        .update(dbUpdates)
        .eq('id', id)

      if (error) {
        await fetchExpenses()
      } else {
        await fetchExpenses()
      }
    },
    [supabase, fetchExpenses]
  )

  const deleteExpense = useCallback(
    async (id: string) => {
      let removed: FixedExpense | undefined
      setExpenses((prev) => {
        removed = prev.find((e) => e.id === id)
        return prev.filter((e) => e.id !== id)
      })

      const { error } = await supabase
        .from('fixed_expenses')
        .delete()
        .eq('id', id)

      if (error) {
        if (removed) setExpenses((prev) => [...prev, removed!])
        console.error('Error deleting expense:', JSON.stringify(error))
      }
    },
    [supabase]
  )

  return (
    <AppContext.Provider
      value={{
        categories,
        incomeCategories,
        expenseCategories,
        categoriesLoading,
        createCategory,
        updateCategory,
        deleteCategory,

        transactions,
        transactionsLoading,
        currentBalance,
        daysSinceLastIncome,
        createTransaction,
        updateTransaction,
        deleteTransaction,
        transactionToast,
        clearTransactionToast: () => setTransactionToast(''),

        plans,
        plansLoading,
        totalSavingsPerFortnight,
        createPlan,
        updatePlan,
        deletePlan,
        reorderPlans,
        planToast,
        clearPlanToast: () => setPlanToast(''),

        expenses,
        expensesLoading,
        createExpense,
        updateExpense,
        deleteExpense,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used within AppProvider')
  return ctx
}
