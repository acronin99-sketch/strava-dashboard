'use client'

import { useState } from 'react'
import TrainingPlanTab from './TrainingPlanTab'
import PacesTab from './PacesTab'
import RaceStrategyTab from './RaceStrategyTab'
import styles from './Marathon.module.css'

type Tab = 'plan' | 'paces' | 'strategy'
const TABS: Tab[] = ['plan', 'paces', 'strategy']
const TAB_LABEL: Record<Tab, string> = {
  plan: 'Training Plan',
  paces: 'Paces',
  strategy: 'Race Strategy',
}

export default function MarathonTrainingDashboard() {
  const [tab, setTab] = useState<Tab>('plan')

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Marathon Training — 2:55 Goal</h1>
        <p>Surf City Marathon • February 7, 2027 • 6:40/mi pace</p>
      </div>

      <nav className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t}
            className={`${styles.tab} ${t === tab ? styles.active : ''}`}
            onClick={() => setTab(t)}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </nav>

      <div className={styles.content}>
        {tab === 'plan' && <TrainingPlanTab />}
        {tab === 'paces' && <PacesTab />}
        {tab === 'strategy' && <RaceStrategyTab />}
      </div>
    </div>
  )
}
