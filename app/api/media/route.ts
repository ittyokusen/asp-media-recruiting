import { NextRequest, NextResponse } from 'next/server'

import { requireWriteUser } from '@/lib/auth'
import { createMediaCandidates, getMediaCandidates } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const campaignId = request.nextUrl.searchParams.get('campaignId') ?? undefined
    const media = await getMediaCandidates(campaignId)

    return NextResponse.json(media)
  } catch (error) {
    console.error('[media:get] error:', error)
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
    const input = Array.isArray(body) ? body : body.candidates ?? body

    if (!input || (Array.isArray(input) && input.length === 0)) {
      return NextResponse.json({ error: 'Media payload is required' }, { status: 400 })
    }

    const saved = await createMediaCandidates(input)

    return NextResponse.json(saved, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('[media:post] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
