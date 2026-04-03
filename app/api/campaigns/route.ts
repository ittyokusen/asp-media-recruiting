import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { requireWriteUser } from '@/lib/auth'
import { createCampaign, getCampaigns } from '@/lib/db'

const campaignCreateSchema = z.object({
  campaign_name: z.string().trim().min(1),
  category: z.string().trim().min(1),
  appeal_points: z.array(z.string()).optional(),
  ng_expressions: z.array(z.string()).optional(),
  preferred_media_traits: z.array(z.string()).optional(),
  existing_good_media_examples: z.array(z.string()).optional(),
})

export async function GET() {
  try {
    const campaigns = await getCampaigns()
    return NextResponse.json(campaigns)
  } catch (error) {
    console.error('[campaigns:get] error:', error)
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
    const parsed = campaignCreateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: '入力値が不正です' }, { status: 400 })
    }

    const campaign = await createCampaign({
      campaign_name: parsed.data.campaign_name,
      category: parsed.data.category,
      appeal_points: parsed.data.appeal_points ?? [],
      ng_expressions: parsed.data.ng_expressions ?? [],
      preferred_media_traits: parsed.data.preferred_media_traits ?? [],
      existing_good_media_examples: parsed.data.existing_good_media_examples ?? [],
    })

    return NextResponse.json(campaign, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('[campaigns:post] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
