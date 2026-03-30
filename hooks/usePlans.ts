'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { Plan } from '@/types'

export function usePlans() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [toastMsg, setToastMsg] = useState('')
  const supabase = createClient()

  const fetchPlans = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('user_id', user.id)
      .order('priority', { ascending: true })

    if (error) {
      console.error('Error fetching plans:', JSON.stringify(error))
    } else if (data) {
      setPlans(data)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  const totalSavingsPerFortnight = plans.reduce(
    (sum, p) => sum + p.amount_per_fortnight,
    0
  )

  const createPlan = async (plan: Omit<Plan, 'id' | 'user_id'>) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    // Optimistic
    const tempId = `temp-${Date.now()}`
    const optimistic = { ...plan, id: tempId, user_id: user.id } as Plan
    setPlans((prev) => [...prev, optimistic])

    const { data, error } = await supabase
      .from('plans')
      .insert({ ...plan, user_id: user.id })
      .select()
      .single()

    if (error) {
      setPlans((prev) => prev.filter((p) => p.id !== tempId))
      setToastMsg('Error al crear plan. Intenta de nuevo.')
      console.error('Error creating plan:', JSON.stringify(error))
      return null
    }

    setPlans((prev) => prev.map((p) => (p.id === tempId ? data : p)))
    return data
  }

  const updatePlan = async (id: string, updates: Partial<Plan>) => {
    const { error } = await supabase.from('plans').update(updates).eq('id', id)
    if (!error) await fetchPlans()
  }

  const deletePlan = async (id: string) => {
    const removed = plans.find((p) => p.id === id)
    setPlans((prev) => prev.filter((p) => p.id !== id))

    const { error } = await supabase.from('plans').delete().eq('id', id)
    if (error) {
      if (removed) setPlans((prev) => [...prev, removed])
      setToastMsg('Error al eliminar. Intenta de nuevo.')
      console.error('Error deleting plan:', JSON.stringify(error))
    }
  }

  const reorderPlans = async (reordered: Plan[]) => {
    setPlans(reordered)
    for (let i = 0; i < reordered.length; i++) {
      await supabase
        .from('plans')
        .update({ priority: i + 1 })
        .eq('id', reordered[i].id)
    }
  }

  return {
    plans,
    loading,
    totalSavingsPerFortnight,
    createPlan,
    updatePlan,
    deletePlan,
    reorderPlans,
    toastMsg,
    clearToast: () => setToastMsg(''),
    refetch: fetchPlans,
  }
}
