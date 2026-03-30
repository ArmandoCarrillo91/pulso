'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { Transaction } from '@/types'

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchTransactions = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching transactions:', JSON.stringify(error))
    } else if (data) {
      setTransactions(data)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
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

  const createTransaction = async (
    transaction: Omit<Transaction, 'id' | 'created_at' | 'user_id'>
  ) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('transactions')
      .insert({ ...transaction, user_id: user.id })
      .select()
      .single()

    if (error) {
      console.error('Error creating transaction:', JSON.stringify(error))
      return null
    }
    return data as Transaction
  }

  const updateTransaction = async (
    id: string,
    updates: Partial<Transaction>
  ) => {
    const { error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)

    if (error) {
      console.error('Error updating transaction:', JSON.stringify(error))
      return false
    }
    await fetchTransactions()
    return true
  }

  const deleteTransaction = async (id: string) => {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting transaction:', JSON.stringify(error))
      return false
    }
    await fetchTransactions()
    return true
  }

  const daysSinceLastIncome = (() => {
    const lastIncome = transactions.find((t) => t.type === 'income')
    if (!lastIncome) return null
    const diffMs = Date.now() - new Date(lastIncome.date).getTime()
    return Math.floor(diffMs / (1000 * 60 * 60 * 24))
  })()

  return {
    transactions,
    loading,
    currentBalance,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    daysSinceLastIncome,
    refetch: fetchTransactions,
  }
}
