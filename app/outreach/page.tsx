import OutreachDashboard from '@/components/outreach/OutreachDashboard'
import { getAllOutreachLogs, getMediaCandidates } from '@/lib/db'

export default async function OutreachPage() {
  const [mediaCandidates, logs] = await Promise.all([getMediaCandidates(), getAllOutreachLogs()])

  return <OutreachDashboard initialMediaCandidates={mediaCandidates} initialLogs={logs} />
}
