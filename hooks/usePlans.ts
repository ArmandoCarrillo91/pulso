'use client'

import { useAppContext } from '@/app/context/AppContext'

export function usePlans() {
  const ctx = useAppContext()

  return {
    plans: ctx.plans,
    loading: ctx.plansLoading,
    totalSavingsPerFortnight: ctx.totalSavingsPerFortnight,
    createPlan: ctx.createPlan,
    updatePlan: ctx.updatePlan,
    deletePlan: ctx.deletePlan,
    reorderPlans: ctx.reorderPlans,
    toastMsg: ctx.planToast,
    clearToast: ctx.clearPlanToast,
    refetch: () => {},
  }
}
