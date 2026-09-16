import MarathonTrainingDashboard from '@/components/marathon/MarathonTrainingDashboard'

export const metadata = {
  title: 'Marathon Training - Strava Dashboard',
  description: '2:55 Marathon Goal - Surf City Marathon Feb 7, 2027',
}

export const revalidate = false

export default function MarathonPage() {
  return (
    <div>
      <MarathonTrainingDashboard />
    </div>
  )
}
