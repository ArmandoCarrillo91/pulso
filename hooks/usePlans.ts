'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { Plan } from '@/types'

export function usePlans() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
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

    const { data, error } = await supabase
      .from('plans')
      .insert({ ...plan, user_id: user.id })
      .select()
      .single()

    if (error) {
      console.error('Error creating plan:', JSON.stringify(error))
      return null
    }
    await fetchPlans()
    return data
  }

  const updatePlan = async (id: string, updates: Partial<Plan>) => {
    const { error } = await supabase.from('plans').update(updates).eq('id', id)
    if (!error) await fetchPlans()
  }

  const deletePlan = async (id: string) => {
    const { error } = await supabase.from('plans').delete().eq('id', id)
    if (!error) await fetchPlans()
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
    refetch: fetchPlans,
  }
}
