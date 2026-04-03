import { NextRequest, NextResponse } from 'next/server'

import { requireWriteUser } from '@/lib/auth'
import { getMediaCandidateById, updateMediaContact, updateMediaStatus } from '@/lib/db'
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
    const hasContactUpdate = [
      'operator_name',
      'contact_email',
      'contact_page_url',
      'contact_slack_id',
      'contact_chatwork_id',
      'assigned_owner',
    ].some((key) => body?.[key] !== undefined)

    if (!body?.status && !hasContactUpdate) {
      return NextResponse.json({ error: 'update field is required' }, { status: 400 })
    }

    const media = hasContactUpdate
      ? await updateMediaContact(id, {
          operator_name: body.operator_name,
          contact_email: body.contact_email,
          contact_page_url: body.contact_page_url,
          contact_slack_id: body.contact_slack_id,
          contact_chatwork_id: body.contact_chatwork_id,
          assigned_owner: body.assigned_owner,
        })
      : await updateMediaStatus(id, body.status as MediaStatus)

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
