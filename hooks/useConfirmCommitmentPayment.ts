'use client'

import { useCallback, useMemo } from 'react'
import { useTransactions } from '@/hooks/useTransactions'
import { useCommitments } from '@/hooks/useCommitments'
import { usePayday } from '@/hooks/usePayday'
import { detectPlatform } from '@/lib/utils'
import { getCommitmentType } from '@/types'
import type { Commitment, Transaction } from '@/types'

export function useConfirmCommitmentPayment() {
  const {
    transactions,
    currentBalance,
    daysSinceLastIncome,
    createTransaction,
  } = useTransactions()
  const { updateCommitment } = useCommitments()

  const lastIncomeDate = useMemo(() => {
    const income = transactions.find((t) => t.type === 'income')
    return income?.date ?? null
  }, [transactions])

  const { daysRemaining, currentFortnight } = usePayday(lastIncomeDate)

  return useCallback(
    async (
      commitment: Commitment,
      { date, note }: { date: string; note: string }
    ) => {
      const dateObj = new Date(date + 'T12:00:00')
      const nowTime = new Date()

      const transaction: Omit<
        Transaction,
        'id' | 'created_at' | 'user_id' | 'category'
      > = {
        type: 'expense',
        category_id: commitment.category_id,
        amount: commitment.amount,
        note: note.trim() || `Pago: ${commitment.name}`,
        rating: null,
        date,
        weekday: dateObj.getDay(),
        hour: nowTime.getHours(),
        is_weekend: dateObj.getDay() === 0 || dateObj.getDay() === 6,
        fortnight: currentFortnight,
        geo_lat: null,
        geo_lng: null,
        geo_accuracy: null,
        platform: detectPlatform(),
        source: 'manual',
        entry_seconds: 0,
        category_changes: 0,
        had_note: note.trim().length > 0,
        balance_before: currentBalance,
        balance_after: currentBalance - commitment.amount,
        days_since_last_income: daysSinceLastIncome,
        days_until_next_payday: daysRemaining,
        is_commitment_payment: true,
      }

      await createTransaction(transaction)

      const cType = getCommitmentType(commitment)
      const updates: Partial<Commitment> = { last_paid_date: date }

      if (cType === 'msi') {
        const newPaid = (commitment.paid_installments || 0) + 1
        const total = commitment.total_installments || 0
        updates.paid_installments = newPaid
        if (newPaid >= total) {
          updates.completed_at = new Date().toISOString()
        }
      } else if (
        cType === 'savings_goal' ||
        cType === 'seasonal' ||
        cType === 'recurring_savings'
      ) {
        updates.current_amount =
          (commitment.current_amount || 0) + commitment.amount
        if (
          commitment.goal_amount &&
          updates.current_amount >= commitment.goal_amount
        ) {
          updates.completed_at = new Date().toISOString()
        }
      }

      await updateCommitment(commitment.id, updates)
    },
    [
      createTransaction,
      updateCommitment,
      currentBalance,
      daysSinceLastIncome,
      currentFortnight,
      daysRemaining,
    ]
  )
}
