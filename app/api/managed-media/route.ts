import { NextRequest, NextResponse } from 'next/server'

import { requireWriteUser } from '@/lib/auth'
import { createManagedMedia, getManagedMedia, updateMediaStatus } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const campaignId = request.nextUrl.searchParams.get('campaignId') ?? undefined
    const media = await getManagedMedia(campaignId)

    return NextResponse.json(media)
  } catch (error) {
    console.error('[managed-media:get] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireWriteUser()

    const body = await request.json()

    if (!body?.media_name || !body?.domain || !body?.url || !body?.campaign_id || !body?.product_name) {
      return NextResponse.json(
        { error: 'media_name, domain, url, campaign_id, product_name are required' },
        { status: 400 }
      )
    }

    const saved = await createManagedMedia({
      source_media_candidate_id: body.source_media_candidate_id ?? '',
      campaign_id: body.campaign_id,
      media_name: body.media_name,
      domain: body.domain,
      url: body.url,
      product_name: body.product_name,
      placement_type: body.placement_type ?? '',
      contract_status: body.contract_status ?? 'negotiating',
      start_date: body.start_date ?? '',
      end_date: body.end_date ?? '',
      unit_price: body.unit_price ?? '',
      reward_rule: body.reward_rule ?? '',
      owner_name: body.owner_name ?? '',
      monthly_volume: body.monthly_volume ?? '',
      memo: body.memo ?? '',
    })

    if (body.source_media_candidate_id) {
      await updateMediaStatus(body.source_media_candidate_id, 'partnered')
    }

    return NextResponse.json(saved, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    console.error('[managed-media:post] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
