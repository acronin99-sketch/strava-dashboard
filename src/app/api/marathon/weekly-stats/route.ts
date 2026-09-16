import { getSession } from '@/lib/session'
import { fetchActivities } from '@/lib/strava'

export async function GET(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const activities = await fetchActivities(session)

    // Convert activities to weekly stats (Oct 1, 2026 - Feb 7, 2027)
    const weeklyStats = new Map<number, { mileage: number; activities: number }>()

    // Week 1 starts Oct 1, 2026
    const PLAN_START = new Date('2026-10-01T00:00:00Z')

    activities.forEach((activity) => {
      // Only count runs
      if (activity.sport_type !== 'Run') return

      const actDate = new Date(activity.start_date_local)
      const daysFromStart = Math.floor(
        (actDate.getTime() - PLAN_START.getTime()) / (1000 * 60 * 60 * 24),
      )

      if (daysFromStart < 0) return // Before plan start
      if (daysFromStart >= 126) return // After race day (18 weeks = 126 days)

      const weekNumber = Math.floor(daysFromStart / 7) + 1
      const miles = activity.distance * 0.000621371 // Convert meters to miles

      const existing = weeklyStats.get(weekNumber) || { mileage: 0, activities: 0 }
      weeklyStats.set(weekNumber, {
        mileage: existing.mileage + miles,
        activities: existing.activities + 1,
      })
    })

    return Response.json(Object.fromEntries(weeklyStats))
  } catch (error) {
    console.error('Weekly stats error:', error)
    return Response.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
