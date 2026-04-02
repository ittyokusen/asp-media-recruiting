import { NextRequest, NextResponse } from 'next/server'

import { requireWriteUser } from '@/lib/auth'
import { createCampaign, getCampaigns } from '@/lib/db'

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

    if (!body?.campaign_name || !body?.category) {
      return NextResponse.json({ error: 'campaign_name and category are required' }, { status: 400 })
    }

    const campaign = await createCampaign({
      campaign_name: body.campaign_name,
      category: body.category,
      appeal_points: body.appeal_points ?? [],
      ng_expressions: body.ng_expressions ?? [],
      preferred_media_traits: body.preferred_media_traits ?? [],
      existing_good_media_examples: body.existing_good_media_examples ?? [],
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
