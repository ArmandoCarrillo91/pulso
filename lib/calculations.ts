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

export function getNextOccurrence(month: number): Date {
  const today = new Date()
  const year = today.getFullYear()
  const target = new Date(year, month, 0) // last day of that month
  if (target <= today) target.setFullYear(year + 1)
  return target
}
