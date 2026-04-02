import { NextRequest, NextResponse } from 'next/server'

import { requireWriteUser } from '@/lib/auth'
import { getMediaCandidateById, updateMediaStatus } from '@/lib/db'
import type { MediaStatus } from '@/types'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const media = await getMediaCandidateById(id)

    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    return NextResponse.json(media)
  } catch (error) {
    console.error('[media-id:get] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireWriteUser()
    const { id } = await params
    const body = await request.json()

    if (!body?.status) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 })
    }

    const media = await updateMediaStatus(id, body.status as MediaStatus)
    return NextResponse.json(media)
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('[media-id:patch] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
