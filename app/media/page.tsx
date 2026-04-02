import MediaListClient from '@/components/media/MediaListClient'

export default async function MediaListPage({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string }>
}) {
  const params = await searchParams

  return <MediaListClient initialCampaign={params.campaign ?? 'all'} />
}
