export function calculatePlanContribution(
  goalAmount: number,
  startDate: Date,
  targetDate: Date,
  safetyMargin = 0.1
): { amountPerFortnight: number; fortnightsRemaining: number } {
  const msPerDay = 1000 * 60 * 60 * 24
  const totalDays = Math.max(
    Math.ceil((targetDate.getTime() - startDate.getTime()) / msPerDay),
    1
  )
  const fortnightsRemaining = Math.max(Math.ceil(totalDays / 15), 1)
  const amountPerFortnight =
    (goalAmount * (1 + safetyMargin)) / fortnightsRemaining

  return {
    amountPerFortnight: Math.ceil(amountPerFortnight * 100) / 100,
    fortnightsRemaining,
  }
}

export function fixedExpensesInPeriod(
  expenses: { amount: number; day_of_month: number }[],
  todayDate: Date,
  nextPayday: Date
): number {
  const todayDay = todayDate.getDate()
  const todayMonth = todayDate.getMonth()
  const todayYear = todayDate.getFullYear()
  const payMonth = nextPayday.getMonth()
  const payYear = nextPayday.getFullYear()
  const payDay = nextPayday.getDate()

  return expenses.reduce((sum, exp) => {
    const dom = exp.day_of_month
    // Check if day_of_month falls between today and payday (inclusive)
    // Handle same-month and cross-month periods
    if (todayMonth === payMonth && todayYear === payYear) {
      if (dom >= todayDay && dom <= payDay) return sum + exp.amount
    } else {
      // Cross-month: today..end-of-month OR 1..payDay
      const lastDayOfTodayMonth = new Date(todayYear, todayMonth + 1, 0).getDate()
      if (dom >= todayDay && dom <= lastDayOfTodayMonth) return sum + exp.amount
      if (dom >= 1 && dom <= payDay) return sum + exp.amount
    }
    return sum
  }, 0)
}

export function getNextOccurrence(month: number): Date {
  const today = new Date()
  const year = today.getFullYear()
  const target = new Date(year, month, 0) // last day of that month
  if (target <= today) target.setFullYear(year + 1)
  return target
}
