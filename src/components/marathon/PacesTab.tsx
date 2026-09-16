'use client'

import styles from './PacesTab.module.css'

interface PaceLevel {
  name: string
  abbreviation: string
  range: string
  purpose: string
}

const paces: PaceLevel[] = [
  {
    name: 'Easy / Recovery',
    abbreviation: 'E',
    range: '7:50–8:30/mi',
    purpose: 'Recovery runs, easy days, building base mileage',
  },
  {
    name: 'Long Run (Easy)',
    abbreviation: 'LR',
    range: '7:45–8:20/mi',
    purpose: 'Sunday long runs at comfortable pace',
  },
  {
    name: 'Marathon Pace',
    abbreviation: 'MP',
    range: '6:40/mi',
    purpose: 'Race goal pace – lock this in during workouts',
  },
  {
    name: 'Half Marathon Pace',
    abbreviation: 'HMP',
    range: '6:30–6:35/mi',
    purpose: 'Slightly faster than race pace – builds speed',
  },
  {
    name: 'Threshold / Tempo',
    abbreviation: 'T',
    range: '6:15–6:25/mi',
    purpose: 'Just below lactate threshold – build aerobic capacity',
  },
  {
    name: '10K Pace',
    abbreviation: '10K',
    range: '6:00–6:10/mi',
    purpose: 'Interval training – higher intensity segments',
  },
  {
    name: '5K Pace',
    abbreviation: '5K',
    range: '5:45–5:55/mi',
    purpose: 'Fast intervals – short bursts for speed work',
  },
]

export default function PacesTab() {
  return (
    <section className={styles.pacesContainer}>
      <div className={styles.header}>
        <h2>Training Paces</h2>
        <p className={styles.subtitle}>All paces for 2:55 marathon goal (6:40/mi)</p>
      </div>

      <div className={styles.paceGrid}>
        {paces.map((pace) => (
          <div key={pace.abbreviation} className={styles.paceCard}>
            <div className={styles.paceHeader}>
              <span className={styles.abbrev}>{pace.abbreviation}</span>
              <h3>{pace.name}</h3>
            </div>
            <div className={styles.paceRange}>{pace.range}</div>
            <div className={styles.purpose}>{pace.purpose}</div>
          </div>
        ))}
      </div>

      <div className={styles.notes}>
        <h3>Key Points</h3>
        <ul>
          <li>
            <strong>Easy days</strong> should feel conversational — you could talk while running
          </li>
          <li>
            <strong>Marathon Pace</strong> workouts train your body to run 6:40/mi for 26.2 miles
          </li>
          <li>
            <strong>Threshold runs</strong> build lactate threshold — the highest pace you can
            sustain aerobically
          </li>
          <li>
            <strong>Intervals</strong> develop speed and running economy with recovery between reps
          </li>
        </ul>
      </div>
    </section>
  )
}
