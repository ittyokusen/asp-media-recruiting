import ManagedMediaClient from '@/components/managed-media/ManagedMediaClient'
import { getCampaigns, getManagedMedia, getMediaCandidates } from '@/lib/db'

export default async function ManagedMediaPage() {
  const [campaigns, managedMedia, mediaCandidates] = await Promise.all([
    getCampaigns(),
    getManagedMedia(),
    getMediaCandidates(),
  ])

  return (
    <ManagedMediaClient
      initialCampaigns={campaigns}
      initialManagedMedia={managedMedia}
      initialMediaCandidates={mediaCandidates}
    />
  )
}
