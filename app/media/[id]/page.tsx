import { notFound } from 'next/navigation'

import MediaDetailClient from '@/components/media/MediaDetailClient'
import {
  getCampaignById,
  getCampaigns,
  getMediaCandidateById,
  getOutreachDrafts,
  getOutreachLogs,
} from '@/lib/db'

export default async function MediaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const media = await getMediaCandidateById(id)

  if (!media) {
    notFound()
  }

  const [campaign, campaigns, drafts, history] = await Promise.all([
    getCampaignById(media.campaign_id),
    getCampaigns(),
    getOutreachDrafts(media.id),
    getOutreachLogs(media.id),
  ])

  if (!campaign) {
    notFound()
  }

  return (
    <MediaDetailClient
      media={media}
      campaign={campaign}
      campaigns={campaigns}
      initialDrafts={drafts}
      initialHistory={history}
    />
  )
}
