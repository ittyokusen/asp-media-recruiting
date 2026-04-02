import { NextResponse } from 'next/server'

import { getMediaCandidates } from '@/lib/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const media = await getMediaCandidates(id)

    return NextResponse.json(media)
  } catch (error) {
    console.error('[campaign-media:get] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
