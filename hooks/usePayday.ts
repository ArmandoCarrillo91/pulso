'use client'

import { useMemo } from 'react'

function getAdjustedPayday(year: number, month: number, day: number): Date {
  const date = new Date(year, month, day)
  const dow = date.getDay()

  // Saturday → Friday
  if (dow === 6) date.setDate(date.getDate() - 1)
  // Sunday → Friday
  else if (dow === 0) date.setDate(date.getDate() - 2)

  return date
}

function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getPaydaysForMonth(year: number, month: number): [Date, Date] {
  const first = getAdjustedPayday(year, month, 15)
  const lastDay = getLastDayOfMonth(year, month)
  const second = getAdjustedPayday(year, month, lastDay)
  return [first, second]
}

/**
 * The payday (15th or last business day of the month) closest in time to
 * the given date — in either direction. Used to decide which fortnight an
 * income transaction belongs to when deposits arrive slightly before or
 * after the nominal payday.
 */
export function getNearestPayday(dateStr: string): Date {
  const d = new Date(dateStr + 'T12:00:00')
  d.setHours(0, 0, 0, 0)
  const y = d.getFullYear()
  const m = d.getMonth()
  const prevM = m === 0 ? 11 : m - 1
  const prevY = m === 0 ? y - 1 : y
  const nextM = m === 11 ? 0 : m + 1
  const nextY = m === 11 ? y + 1 : y
  const candidates: Date[] = [
    ...getPaydaysForMonth(prevY, prevM),
    ...getPaydaysForMonth(y, m),
    ...getPaydaysForMonth(nextY, nextM),
  ]
  let best = candidates[0]
  let bestDist = Math.abs(d.getTime() - best.getTime())
  for (const c of candidates) {
    const dist = Math.abs(d.getTime() - c.getTime())
    if (dist < bestDist) {
      bestDist = dist
      best = c
    }
  }
  return best
}

/**
 * Start of the current fortnight: the most recent payday (15th or last
 * business day of the month) on or before today.
 */
export function getCurrentFortnightStart(today: Date = new Date()): Date {
  const d = new Date(today)
  d.setHours(0, 0, 0, 0)
  const y = d.getFullYear()
  const m = d.getMonth()
  const [first, second] = getPaydaysForMonth(y, m)
  if (d >= second) return second
  if (d >= first) return first
  const prevM = m === 0 ? 11 : m - 1
  const prevY = m === 0 ? y - 1 : y
  const [, prevSecond] = getPaydaysForMonth(prevY, prevM)
  return prevSecond
}

/**
 * Get the next payday after a given date.
 */
function getNextPaydayAfter(date: Date): Date {
  const y = date.getFullYear()
  const m = date.getMonth()
  const [first, second] = getPaydaysForMonth(y, m)

  if (date < first) return first
  if (date < second) return second

  // Next month's first payday
  const nm = m === 11 ? 0 : m + 1
  const ny = m === 11 ? y + 1 : y
  return getPaydaysForMonth(ny, nm)[0]
}

/**
 * Calculate payday information.
 * @param lastIncomeDate - Date string (YYYY-MM-DD) of most recent quincena/salary income.
 *   If provided and it falls on or after the previous payday, we know the user already
 *   received this fortnight's income, so we advance to the next period.
 */
export function usePayday(lastIncomeDate?: string | null) {
  return useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const year = today.getFullYear()
    const month = today.getMonth()

    const [firstPayday, secondPayday] = getPaydaysForMonth(year, month)

    // Previous month paydays (for period start calculation)
    const prevMonth = month === 0 ? 11 : month - 1
    const prevYear = month === 0 ? year - 1 : year
    const [, prevSecondPayday] = getPaydaysForMonth(prevYear, prevMonth)

    // Next month paydays (if past all current month paydays)
    const nextMonth = month === 11 ? 0 : month + 1
    const nextYear = month === 11 ? year + 1 : year
    const [nextFirstPayday] = getPaydaysForMonth(nextYear, nextMonth)

    let nextPayday: Date
    let previousPayday: Date
    let currentFortnight: number

    if (today <= firstPayday) {
      nextPayday = firstPayday
      previousPayday = prevSecondPayday
      currentFortnight = 1
    } else if (today <= secondPayday) {
      nextPayday = secondPayday
      previousPayday = firstPayday
      currentFortnight = 2
    } else {
      nextPayday = nextFirstPayday
      previousPayday = secondPayday
      currentFortnight = 1
    }

    // If user already received income for this fortnight, advance to next period
    if (lastIncomeDate) {
      const incomeDate = new Date(lastIncomeDate + 'T12:00:00')
      incomeDate.setHours(0, 0, 0, 0)

      if (incomeDate >= previousPayday) {
        // Income received in current period — advance
        previousPayday = nextPayday
        nextPayday = getNextPaydayAfter(new Date(nextPayday.getTime() + 86400000))
        currentFortnight = currentFortnight === 1 ? 2 : 1
      }
    }

    // Days remaining including today
    const diffMs = nextPayday.getTime() - today.getTime()
    const daysRemaining = Math.max(Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1, 1)

    // Fortnight progress (0 → 1)
    const totalDays = Math.ceil(
      (nextPayday.getTime() - previousPayday.getTime()) / (1000 * 60 * 60 * 24)
    )
    const elapsedDays = Math.ceil(
      (today.getTime() - previousPayday.getTime()) / (1000 * 60 * 60 * 24)
    )
    const progress = Math.min(Math.max(elapsedDays / totalDays, 0), 1)

    return {
      nextPayday,
      previousPayday,
      daysRemaining,
      currentFortnight,
      progress,
      totalDays,
      elapsedDays,
    }
  }, [lastIncomeDate])
}
