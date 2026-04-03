import OutreachDashboard from '@/components/outreach/OutreachDashboard'
import { getAllOutreachLogs, getCampaigns, getMediaCandidates } from '@/lib/db'

export default async function OutreachPage() {
  const [campaigns, mediaCandidates, logs] = await Promise.all([
    getCampaigns(),
    getMediaCandidates(),
    getAllOutreachLogs(),
  ])

  return (
    <OutreachDashboard
      initialCampaigns={campaigns}
      initialMediaCandidates={mediaCandidates}
      initialLogs={logs}
    />
  )
}
