'use client'

import styles from './RaceStrategy.module.css'

export default function RaceStrategyTab() {
  return (
    <section className={styles.strategyContainer}>
      <div className={styles.header}>
        <h2>Surf City Marathon — Race Strategy</h2>
        <div className={styles.raceInfo}>
          <div className={styles.infoBox}>
            <div className={styles.infoLabel}>Date</div>
            <div className={styles.infoValue}>Sunday, February 7, 2027</div>
          </div>
          <div className={styles.infoBox}>
            <div className={styles.infoLabel}>Location</div>
            <div className={styles.infoValue}>Huntington Beach, California</div>
          </div>
          <div className={styles.infoBox}>
            <div className={styles.infoLabel}>Goal Time</div>
            <div className={styles.infoValue}>2:55:00</div>
          </div>
          <div className={styles.infoBox}>
            <div className={styles.infoLabel}>Goal Pace</div>
            <div className={styles.infoValue}>6:40/mi</div>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <h3>Race Plan by Segment</h3>

          <div className={styles.segment}>
            <div className={styles.segmentHeader}>Miles 0–3: Controlled Start</div>
            <div className={styles.segmentPace}>6:42–6:45/mi</div>
            <ul className={styles.segmentList}>
              <li>Start slightly conservative — let the adrenaline settle</li>
              <li>Find your rhythm and breathing pattern</li>
              <li>Feel strong and patient, don&apos;t chase early runners</li>
              <li>Use this to dial in your pace, hydration, and fueling rhythm</li>
            </ul>
          </div>

          <div className={styles.segment}>
            <div className={styles.segmentHeader}>Miles 4–20: Lock In</div>
            <div className={styles.segmentPace}>6:40/mi (Marathon Pace)</div>
            <ul className={styles.segmentList}>
              <li>This is the sweet spot — your trained pace for the vast majority</li>
              <li>Stay mentally composed and consistent</li>
              <li>Fuel on schedule: water at aid stations, calories every 30–45 min</li>
              <li>Don&apos;t worry about time splits — just run the pace</li>
              <li>Keep effort controlled; save everything for the final miles</li>
            </ul>
          </div>

          <div className={styles.segment}>
            <div className={styles.segmentHeader}>Miles 20–26.2: Race Hard</div>
            <div className={styles.segmentPace}>Negative split if possible</div>
            <ul className={styles.segmentList}>
              <li>The marathon starts at mile 20 — this is where fitness meets grit</li>
              <li>Expect to feel it, but you&apos;ve trained for this</li>
              <li>Break the race into smaller chunks: &quot;just get to 22,&quot; then &quot;just get to 24&quot;</li>
              <li>Pick off runners ahead if you feel strong</li>
              <li>Last 5K: leave it all out there. This is what you trained for.</li>
            </ul>
          </div>
        </div>

        <div className={styles.section}>
          <h3>Fueling &amp; Hydration</h3>
          <ul className={styles.fuelingList}>
            <li>
              <strong>Every aid station:</strong> Grab water. Take gels or race drink calories every
              30–45 minutes
            </li>
            <li>
              <strong>Electrolytes:</strong> On warmer race days, electrolyte drink is crucial for
              cramping prevention
            </li>
            <li>
              <strong>Test everything in training:</strong> Nothing new on race day. Use exactly
              what you trained with.
            </li>
            <li>
              <strong>Stomach discipline:</strong> Drink early and often before you feel thirsty
            </li>
          </ul>
        </div>

        <div className={styles.section}>
          <h3>Pacing Mindset</h3>
          <div className={styles.mindset}>
            <p>
              The most critical skill in marathon running is <strong>negative splitting</strong> —
              running the second half faster than the first, or at least evenly. Your training has
              built this. Trust it.
            </p>
            <p>
              <strong>Don&apos;t chase the fast starts.</strong> Half the field will blow up by mile 18.
              You won&apos;t. You&apos;ll be strong.
            </p>
            <p>
              <strong>6:40 per mile feels easy for the first 10K.</strong> That&apos;s okay. You need to
              run 26.2 miles, not 6 miles fast. Save the aggression for mile 20.
            </p>
            <p>
              <strong>At mile 20, you&apos;ll know if you can go faster.</strong> If you do, you&apos;ve run
              a perfect race. If you hold 6:40, you&apos;ve hit your goal and you&apos;re racing strong to
              the line.
            </p>
          </div>
        </div>

        <div className={styles.section}>
          <h3>Pre-Race Checklist</h3>
          <div className={styles.checklist}>
            <div className={styles.checkItem}>
              <span className={styles.checkMark}>✓</span> Bib and chip pinned correctly
            </div>
            <div className={styles.checkItem}>
              <span className={styles.checkMark}>✓</span> Shoes broken in (race day shoes worn at
              least 50 miles)
            </div>
            <div className={styles.checkItem}>
              <span className={styles.checkMark}>✓</span> Outfit tested in full — nothing new
            </div>
            <div className={styles.checkItem}>
              <span className={styles.checkMark}>✓</span> Fueling/hydration belt loaded and tested
            </div>
            <div className={styles.checkItem}>
              <span className={styles.checkMark}>✓</span> Sunscreen applied (waterproof)
            </div>
            <div className={styles.checkItem}>
              <span className={styles.checkMark}>✓</span> GPS watch synced and ready
            </div>
            <div className={styles.checkItem}>
              <span className={styles.checkMark}>✓</span> Get solid sleep the two nights before
            </div>
            <div className={styles.checkItem}>
              <span className={styles.checkMark}>✓</span> Easy shakeout run Friday if needed to feel fresh
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h3>Post-Race</h3>
          <ul className={styles.fuelingList}>
            <li>Celebrate. You earned this.</li>
            <li>Walk around, keep moving — don&apos;t sit down immediately</li>
            <li>Refuel within 30 min with carbs + protein</li>
            <li>Easy walking/short jog the next few days, then take 1–2 full rest days</li>
            <li>Enjoy the recovery week. You&apos;ve trained incredibly hard.</li>
          </ul>
        </div>
      </div>
    </section>
  )
}
