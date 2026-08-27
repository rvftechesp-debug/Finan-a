import { getAnalytics } from '@/app/actions/analytics'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ScoreCard } from '@/components/analytics/ScoreCard'
import { ComparisonList } from '@/components/analytics/ComparisonList'
import { ProjectionCard } from '@/components/analytics/ProjectionCard'

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const { score, comparison, projection } = await getAnalytics(session.user.id)

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <ScoreCard score={score.score} label={score.label} breakdown={score.breakdown} />
      <ComparisonList items={comparison} />
      <ProjectionCard {...projection} />
    </main>
  )
}
