import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { requireWriteUser } from '@/lib/auth'
import { createManagedMedia, getManagedMedia, updateMediaStatus } from '@/lib/db'

const managedMediaCreateSchema = z.object({
  source_media_candidate_id: z.string().optional(),
  campaign_id: z.string().trim().min(1),
  media_name: z.string().trim().min(1),
  domain: z.string().trim().min(1),
  url: z.string().trim().min(1),
  product_name: z.string().trim().min(1),
  placement_type: z.string().optional(),
  contract_status: z.enum(['negotiating', 'active', 'paused', 'completed']).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  unit_price: z.string().optional(),
  reward_rule: z.string().optional(),
  owner_name: z.string().optional(),
  monthly_volume: z.string().optional(),
  memo: z.string().optional(),
})

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
    const parsed = managedMediaCreateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: '入力値が不正です' }, { status: 400 })
    }

    const saved = await createManagedMedia({
      source_media_candidate_id: parsed.data.source_media_candidate_id ?? '',
      campaign_id: parsed.data.campaign_id,
      media_name: parsed.data.media_name,
      domain: parsed.data.domain,
      url: parsed.data.url,
      product_name: parsed.data.product_name,
      placement_type: parsed.data.placement_type ?? '',
      contract_status: parsed.data.contract_status ?? 'negotiating',
      start_date: parsed.data.start_date ?? '',
      end_date: parsed.data.end_date ?? '',
      unit_price: parsed.data.unit_price ?? '',
      reward_rule: parsed.data.reward_rule ?? '',
      owner_name: parsed.data.owner_name ?? '',
      monthly_volume: parsed.data.monthly_volume ?? '',
      memo: parsed.data.memo ?? '',
    })

    if (parsed.data.source_media_candidate_id) {
      await updateMediaStatus(parsed.data.source_media_candidate_id, 'partnered')
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
