'use client'

import { useAppContext } from '@/app/context/AppContext'

export function useTransactions() {
  const ctx = useAppContext()

  return {
    transactions: ctx.transactions,
    loading: ctx.transactionsLoading,
    currentBalance: ctx.currentBalance,
    createTransaction: ctx.createTransaction,
    updateTransaction: ctx.updateTransaction,
    deleteTransaction: ctx.deleteTransaction,
    daysSinceLastIncome: ctx.daysSinceLastIncome,
    toastMsg: ctx.transactionToast,
    clearToast: ctx.clearTransactionToast,
    refetch: () => {},
  }
}
