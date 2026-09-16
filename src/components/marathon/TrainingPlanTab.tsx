'use client'

import { useEffect, useState } from 'react'
import styles from './TrainingPlan.module.css'

interface Week {
  number: number
  dateRange: string
  mileage: string
  isDown?: boolean
  isPeak?: boolean
  mon: string
  tue: string
  wed: string
  thu: string
  fri: string
  sat: string
  sun: string
}

type WeeklyStats = Record<string, { mileage: number; activities: number }>

const weeks: Week[] = [
  {
    number: 1,
    dateRange: 'Oct 1–7',
    mileage: '40–45',
    mon: 'Rest',
    tue: 'Strength + 4mi E',
    wed: 'Bike (60–90 min)',
    thu: 'Strength + 4mi E',
    fri: '5mi E',
    sat: '4×2K alt MP/HMP + 2mi w/u/c/d = 8mi',
    sun: '10mi LR (E)',
  },
  {
    number: 2,
    dateRange: 'Oct 8–14',
    mileage: '48',
    mon: 'Rest',
    tue: 'Strength + 5mi E',
    wed: 'Bike (75–90 min)',
    thu: 'Strength + 4mi E',
    fri: '5mi E',
    sat: '1mi MP, 5×1K T (60s rest), 1mi MP + 2mi w/u/c/d = 10mi',
    sun: '12mi LR (E)',
  },
  {
    number: 3,
    dateRange: 'Oct 15–21',
    mileage: '50',
    mon: 'Rest',
    tue: 'Strength + 5mi E',
    wed: 'Bike (75–90 min)',
    thu: 'Strength + 4mi E',
    fri: '6mi E',
    sat: '3×(2K T, 1K E) + 2mi w/u/c/d = 9mi',
    sun: '14mi LR (E)',
  },
  {
    number: 4,
    dateRange: 'Oct 22–28',
    mileage: '53',
    mon: 'Rest',
    tue: 'Strength + 5mi E',
    wed: 'Bike (90–105 min)',
    thu: 'Strength + 5mi E',
    fri: '6mi E',
    sat: '5×1mi progression (90s rest) + 2mi w/u/c/d = 9mi',
    sun: '14mi LR (E, 4mi @ MP)',
  },
  {
    number: 5,
    dateRange: 'Oct 29–Nov 4',
    mileage: '48',
    isDown: true,
    mon: 'Rest',
    tue: 'Strength + 4mi E',
    wed: 'Bike (60–75 min)',
    thu: 'Strength + 4mi E',
    fri: '5mi E',
    sat: '2mi MP, 6×800m T (60s rest), 2mi MP + 2mi w/u/c/d = 8mi',
    sun: '13mi LR (E)',
  },
  {
    number: 6,
    dateRange: 'Nov 5–11',
    mileage: '50',
    mon: 'Rest',
    tue: 'Strength + 5mi E',
    wed: 'Bike (90–105 min)',
    thu: 'Strength + 4mi E',
    fri: '6mi E',
    sat: '1mi MP, 6×1K T (60s rest), 1mi MP + 2mi w/u/c/d = 10mi',
    sun: '16–17mi LR (E, 6mi @ MP)',
  },
  {
    number: 7,
    dateRange: 'Nov 12–18',
    mileage: '50',
    mon: 'Rest',
    tue: 'Strength + 5mi E',
    wed: 'Bike (90–105 min)',
    thu: 'Strength + 4mi E',
    fri: '5mi E',
    sat: '6×alt 1K (MP/HMP) + 2mi w/u/c/d = 9mi',
    sun: '14–16mi LR (E)',
  },
  {
    number: 8,
    dateRange: 'Nov 19–25',
    mileage: '54',
    mon: 'Rest',
    tue: 'Strength + 5mi E',
    wed: 'Bike (90–105 min)',
    thu: 'Strength + 5mi E',
    fri: '6mi E',
    sat: '1mi MP, 6×800m T (60s rest), 1mi MP + 2mi w/u/c/d = 9mi',
    sun: '18mi LR (E, 6mi @ MP)',
  },
  {
    number: 9,
    dateRange: 'Nov 26–Dec 2',
    mileage: '52',
    mon: 'Rest',
    tue: 'Strength + 5mi E',
    wed: 'Bike (90–105 min)',
    thu: 'Strength + 4mi E',
    fri: '5mi E',
    sat: '2-1-2-1-2 miles (MP/HMP alt) + 2mi w/u/c/d = 9mi',
    sun: '17mi LR (E, 8mi @ MP)',
  },
  {
    number: 10,
    dateRange: 'Dec 3–9',
    mileage: '48',
    isDown: true,
    mon: 'Rest',
    tue: 'Strength + 4mi E',
    wed: 'Bike (60–75 min)',
    thu: 'Strength + 4mi E',
    fri: '5mi E',
    sat: '8×1K T (60s rest) + 2mi w/u/c/d = 9mi',
    sun: '16mi LR (E, 6mi @ MP)',
  },
  {
    number: 11,
    dateRange: 'Dec 10–16',
    mileage: '56',
    mon: 'Rest',
    tue: 'Strength + 5mi E',
    wed: 'Bike (90–105 min)',
    thu: 'Strength + 5mi E',
    fri: '6mi E',
    sat: '3×2mi T (0.5mi jog recovery) + 2mi w/u/c/d = 10mi',
    sun: '20mi LR (E, 8mi @ MP)',
  },
  {
    number: 12,
    dateRange: 'Dec 17–23',
    mileage: '56',
    isPeak: true,
    mon: 'Rest',
    tue: 'Strength + 5mi E',
    wed: 'Bike (90–105 min)',
    thu: 'Strength + 5mi E',
    fri: '6mi E',
    sat: '6mi continuous T (or 5×1mi @ T) + 2mi w/u/c/d = 10mi',
    sun: '20mi LR (E, 10mi @ MP)',
  },
  {
    number: 13,
    dateRange: 'Dec 24–30',
    mileage: '50',
    isPeak: true,
    mon: 'Rest',
    tue: 'Strength + 4mi E',
    wed: 'Bike (60–75 min)',
    thu: 'Strength + 4mi E',
    fri: '5mi E',
    sat: '4×alt 1K (MP/HMP) + 2mi w/u/c/d = 8mi',
    sun: '16mi LR (E, 10mi @ MP)',
  },
  {
    number: 14,
    dateRange: 'Dec 31–Jan 6',
    mileage: '42',
    mon: 'Rest',
    tue: 'Strength + 3mi E',
    wed: 'Bike (45–60 min)',
    thu: 'Strength + 3mi E',
    fri: '4mi E',
    sat: '5×alt 1K (MP/HMP) + 2mi w/u/c/d = 8mi',
    sun: '10–12mi LR (E)',
  },
  {
    number: 15,
    dateRange: 'Jan 7–13',
    mileage: '32',
    mon: 'Rest',
    tue: 'Strength + 3mi E',
    wed: 'Bike (30–45 min)',
    thu: 'Strength + 2mi E',
    fri: '3mi E',
    sat: '4mi E + 4–6 strides',
    sun: '8mi LR (E)',
  },
  {
    number: 16,
    dateRange: 'Jan 14–20',
    mileage: '28',
    mon: 'Rest',
    tue: '3–4mi E',
    wed: 'Bike (30–45 min) or easy 3–4mi',
    thu: '3mi E + 4–6 strides',
    fri: '2mi E',
    sat: '3mi E',
    sun: '8mi LR (E)',
  },
  {
    number: 17,
    dateRange: 'Jan 21–27',
    mileage: '26',
    mon: 'Rest',
    tue: '3mi E',
    wed: 'Bike (20–30 min) or skip',
    thu: '2–3mi E',
    fri: '3mi E + 4–6 strides',
    sat: '2mi E',
    sun: '6–7mi LR (E)',
  },
  {
    number: 18,
    dateRange: 'Jan 28–Feb 7',
    mileage: '16–20 + Race',
    mon: 'Rest',
    tue: '3–4mi E',
    wed: 'Bike (20 min) or rest',
    thu: '3–4mi E + 4–6 strides',
    fri: '2–3mi E',
    sat: '2mi E + 4–6 strides',
    sun: '🏃 SURF CITY MARATHON',
  },
]

export default function TrainingPlanTab() {
  const [stats, setStats] = useState<WeeklyStats>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/marathon/weekly-stats')
      .then((res) => res.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const getStatusIndicator = (weekNum: number): string => {
    const stat = stats[weekNum.toString()]
    if (!stat) return '—'

    const planned = parseFloat((weeks.find((w) => w.number === weekNum)?.mileage || '0').split('–')[0])
    const actual = Math.round(stat.mileage * 10) / 10
    const diff = actual - planned

    if (Math.abs(diff) <= 2) return '✓' // Within 2 miles
    if (diff > 2) return `+${Math.round(diff)}`
    return `${Math.round(diff)}`
  }

  return (
    <section className={styles.planContainer}>
      <div className={styles.header}>
        <h2>18-Week Training Plan</h2>
        <p className={styles.subtitle}>October 1, 2026 – February 7, 2027</p>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.planTable}>
          <thead>
            <tr>
              <th>Wk</th>
              <th>Dates</th>
              <th>Plan</th>
              <th>Actual</th>
              <th>Mon</th>
              <th>Tue</th>
              <th>Wed</th>
              <th>Thu</th>
              <th>Fri</th>
              <th>Sat</th>
              <th>Sun</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr
                key={week.number}
                className={`${week.isDown ? styles.downWeek : ''} ${week.isPeak ? styles.peakWeek : ''}`}
              >
                <td className={styles.weekNum}>{week.number}</td>
                <td>{week.dateRange}</td>
                <td className={styles.miles}>{week.mileage}</td>
                <td className={styles.actual}>{loading ? '…' : getStatusIndicator(week.number)}</td>
                <td>{week.mon}</td>
                <td>{week.tue}</td>
                <td>{week.wed}</td>
                <td>{week.thu}</td>
                <td>{week.fri}</td>
                <td>{week.sat}</td>
                <td>{week.sun}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.legend}>
        <p>
          <strong>E</strong> = Easy • <strong>MP</strong> = Marathon Pace (6:40/mi) •{' '}
          <strong>HMP</strong> = Half Marathon Pace (6:30–6:35/mi) • <strong>T</strong> = Threshold
          (6:15–6:25/mi) • <strong>LR</strong> = Long Run • <strong>w/u/c/d</strong> = warm-up/cool-down
        </p>
        <p className={styles.downNote}>
          ↓ = Down week (reduced volume for recovery) | ⭐ = Peak build weeks
        </p>
      </div>
    </section>
  )
}
