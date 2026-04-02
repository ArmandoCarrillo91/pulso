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
import type { Transaction, Commitment, Category, Budget } from '@/types'

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

  // Commitments
  commitments: Commitment[]
  commitmentsLoading: boolean
  createCommitment: (
    c: Omit<Commitment, 'id' | 'user_id' | 'category' | 'created_at'>
  ) => Promise<Commitment | null>
  updateCommitment: (
    id: string,
    updates: Partial<Commitment>
  ) => Promise<void>
  deleteCommitment: (id: string) => Promise<void>
  commitmentToast: string
  clearCommitmentToast: () => void

  // Budgets
  budgets: Budget[]
  budgetsLoading: boolean
  createBudget: (b: Omit<Budget, 'id' | 'user_id' | 'category' | 'created_at'>) => Promise<Budget | null>
  updateBudget: (id: string, updates: Partial<Budget>) => Promise<void>
  deleteBudget: (id: string) => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient()

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
        ...data, id: tempId, user_id: userId, slug,
        sort_order: categories.length, created_at: new Date().toISOString(),
      } as Category
      setCategories((prev) => [...prev, optimistic])

      const { data: result, error } = await supabase
        .from('categories')
        .insert({
          user_id: userId, slug, label: data.label,
          emoji: data.emoji || '📦', type: data.type,
          parent_id: data.parent_id, sort_order: categories.length,
        })
        .select()
        .single()

      if (error) {
        setCategories((prev) => prev.filter((c) => c.id !== tempId))
        console.error('Error creating category:', JSON.stringify(error))
        return null
      }

      setCategories((prev) => prev.map((c) => (c.id === tempId ? result : c)))
      return result as Category
    },
    [supabase, getUserId, categories.length]
  )

  const updateCategory = useCallback(
    async (id: string, updates: Partial<Pick<Category, 'label' | 'emoji' | 'sort_order'>>) => {
      setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)))
      const { error } = await supabase.from('categories').update(updates).eq('id', id)
      if (error) await fetchCategories()
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
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error && removed) setCategories((prev) => [...prev, removed!])
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
    supabase.from('transactions').select('id').limit(1).then(() => {})
    fetchTransactions()

    const channel = supabase
      .channel('transactions-realtime')
      .on('postgres_changes', { event: '*', schema: 'pulso', table: 'transactions' }, () => fetchTransactions())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, fetchTransactions])

  const currentBalance = transactions.reduce(
    (sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0
  )

  const createTransaction = useCallback(
    async (transaction: Omit<Transaction, 'id' | 'created_at' | 'user_id' | 'category'>) => {
      const userId = await getUserId()
      if (!userId) return null

      const tempId = `temp-${Date.now()}`
      const cat = categories.find((c) => c.id === transaction.category_id)
      const optimistic = {
        ...transaction, id: tempId, user_id: userId,
        created_at: new Date().toISOString(), category: cat || undefined,
      } as Transaction

      setTransactions((prev) => [optimistic, ...prev])

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

      setTransactions((prev) => prev.map((t) => (t.id === tempId ? (data as Transaction) : t)))
      return data as Transaction
    },
    [supabase, getUserId, categories]
  )

  const updateTransaction = useCallback(
    async (id: string, updates: Partial<Transaction>) => {
      setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)))
      const { category: _, ...dbUpdates } = updates as Transaction & { category?: unknown }
      const { error } = await supabase.from('transactions').update(dbUpdates).eq('id', id)
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
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) {
        if (removed) setTransactions((prev) => [removed!, ...prev])
        setTransactionToast('Error al eliminar. Intenta de nuevo.')
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

  // ─── Commitments ───
  const [commitments, setCommitments] = useState<Commitment[]>([])
  const [commitmentsLoading, setCommitmentsLoading] = useState(true)
  const [commitmentToast, setCommitmentToast] = useState('')

  const fetchCommitments = useCallback(async () => {
    const userId = await getUserId()
    if (!userId) return

    const { data, error } = await supabase
      .from('commitments')
      .select('*, category:categories(id, slug, label, emoji)')
      .eq('user_id', userId)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching commitments:', JSON.stringify(error))
    } else if (data) {
      setCommitments(data as Commitment[])
    }
    setCommitmentsLoading(false)
  }, [supabase, getUserId])

  useEffect(() => {
    fetchCommitments()
  }, [fetchCommitments])

  const createCommitment = useCallback(
    async (commitment: Omit<Commitment, 'id' | 'user_id' | 'category' | 'created_at'>) => {
      const userId = await getUserId()
      if (!userId) return null

      const tempId = `temp-${Date.now()}`
      const cat = categories.find((c) => c.id === commitment.category_id)
      const optimistic = {
        ...commitment, id: tempId, user_id: userId,
        created_at: new Date().toISOString(), category: cat || undefined,
      } as Commitment
      setCommitments((prev) => [...prev, optimistic])

      const { category: _, ...insertData } = commitment as Commitment & { category?: unknown }
      const { data, error } = await supabase
        .from('commitments')
        .insert({ ...insertData, user_id: userId })
        .select('*, category:categories(id, slug, label, emoji)')
        .single()

      if (error) {
        setCommitments((prev) => prev.filter((c) => c.id !== tempId))
        setCommitmentToast('Error al crear. Intenta de nuevo.')
        console.error('Error creating commitment:', JSON.stringify(error))
        return null
      }

      setCommitments((prev) => prev.map((c) => (c.id === tempId ? (data as Commitment) : c)))
      return data as Commitment
    },
    [supabase, getUserId, categories]
  )

  const updateCommitment = useCallback(
    async (id: string, updates: Partial<Commitment>) => {
      setCommitments((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)))
      const { category: _, ...dbUpdates } = updates as Commitment & { category?: unknown }
      const { error } = await supabase.from('commitments').update(dbUpdates).eq('id', id)
      if (error) await fetchCommitments()
      else await fetchCommitments()
    },
    [supabase, fetchCommitments]
  )

  const deleteCommitment = useCallback(
    async (id: string) => {
      let removed: Commitment | undefined
      setCommitments((prev) => {
        removed = prev.find((c) => c.id === id)
        return prev.filter((c) => c.id !== id)
      })
      const { error } = await supabase.from('commitments').delete().eq('id', id)
      if (error) {
        if (removed) setCommitments((prev) => [...prev, removed!])
        setCommitmentToast('Error al eliminar. Intenta de nuevo.')
      }
    },
    [supabase]
  )

  // ─── Budgets ───
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [budgetsLoading, setBudgetsLoading] = useState(true)

  const fetchBudgets = useCallback(async () => {
    const userId = await getUserId()
    if (!userId) return

    const { data, error } = await supabase
      .from('budgets')
      .select('*, category:categories(id, slug, label, emoji)')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching budgets:', JSON.stringify(error))
    } else if (data) {
      setBudgets(data as Budget[])
    }
    setBudgetsLoading(false)
  }, [supabase, getUserId])

  useEffect(() => {
    fetchBudgets()
  }, [fetchBudgets])

  const createBudget = useCallback(
    async (budget: Omit<Budget, 'id' | 'user_id' | 'category' | 'created_at'>) => {
      const userId = await getUserId()
      if (!userId) return null

      const tempId = `temp-${Date.now()}`
      const cat = categories.find((c) => c.id === budget.category_id)
      const optimistic = { ...budget, id: tempId, user_id: userId, created_at: new Date().toISOString(), category: cat || undefined } as Budget
      setBudgets((prev) => [...prev, optimistic])

      const { category: _, ...insertData } = budget as Budget & { category?: unknown }
      const { data, error } = await supabase
        .from('budgets')
        .insert({ ...insertData, user_id: userId })
        .select('*, category:categories(id, slug, label, emoji)')
        .single()

      if (error) {
        setBudgets((prev) => prev.filter((b) => b.id !== tempId))
        console.error('Error creating budget:', JSON.stringify(error))
        return null
      }

      setBudgets((prev) => prev.map((b) => (b.id === tempId ? (data as Budget) : b)))
      return data as Budget
    },
    [supabase, getUserId, categories]
  )

  const updateBudget = useCallback(
    async (id: string, updates: Partial<Budget>) => {
      setBudgets((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)))
      const { category: _, ...dbUpdates } = updates as Budget & { category?: unknown }
      const { error } = await supabase.from('budgets').update(dbUpdates).eq('id', id)
      if (error) await fetchBudgets()
    },
    [supabase, fetchBudgets]
  )

  const deleteBudget = useCallback(
    async (id: string) => {
      let removed: Budget | undefined
      setBudgets((prev) => {
        removed = prev.find((b) => b.id === id)
        return prev.filter((b) => b.id !== id)
      })
      const { error } = await supabase.from('budgets').delete().eq('id', id)
      if (error && removed) setBudgets((prev) => [...prev, removed!])
    },
    [supabase]
  )

  return (
    <AppContext.Provider
      value={{
        categories, incomeCategories, expenseCategories, categoriesLoading,
        createCategory, updateCategory, deleteCategory,

        transactions, transactionsLoading, currentBalance, daysSinceLastIncome,
        createTransaction, updateTransaction, deleteTransaction,
        transactionToast, clearTransactionToast: () => setTransactionToast(''),

        commitments, commitmentsLoading,
        createCommitment, updateCommitment, deleteCommitment,
        commitmentToast, clearCommitmentToast: () => setCommitmentToast(''),

        budgets, budgetsLoading,
        createBudget, updateBudget, deleteBudget,
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
