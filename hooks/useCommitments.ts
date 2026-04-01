'use client'

import { useAppContext } from '@/app/context/AppContext'

export function useCommitments() {
  const ctx = useAppContext()

  return {
    commitments: ctx.commitments,
    loading: ctx.commitmentsLoading,
    createCommitment: ctx.createCommitment,
    updateCommitment: ctx.updateCommitment,
    deleteCommitment: ctx.deleteCommitment,
    toastMsg: ctx.commitmentToast,
    clearToast: ctx.clearCommitmentToast,
  }
}
