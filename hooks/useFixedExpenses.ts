'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { FixedExpense } from '@/types'

export function useFixedExpenses() {
  const [expenses, setExpenses] = useState<FixedExpense[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchExpenses = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('fixed_expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('day_of_month', { ascending: true })

    if (error) {
      console.error('Error fetching fixed expenses:', JSON.stringify(error))
    } else if (data) {
      setExpenses(data)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  const createExpense = async (
    expense: Omit<FixedExpense, 'id' | 'user_id'>
  ) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('fixed_expenses')
      .insert({ ...expense, user_id: user.id })
      .select()
      .single()

    if (error) {
      console.error('Error creating expense:', JSON.stringify(error))
      return null
    }
    await fetchExpenses()
    return data
  }

  const updateExpense = async (
    id: string,
    updates: Partial<FixedExpense>
  ) => {
    const { error } = await supabase
      .from('fixed_expenses')
      .update(updates)
      .eq('id', id)
    if (!error) await fetchExpenses()
  }

  const deleteExpense = async (id: string) => {
    const { error } = await supabase
      .from('fixed_expenses')
      .delete()
      .eq('id', id)
    if (!error) await fetchExpenses()
  }

  return {
    expenses,
    loading,
    createExpense,
    updateExpense,
    deleteExpense,
    refetch: fetchExpenses,
  }
}
