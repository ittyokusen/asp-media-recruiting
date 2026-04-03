import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { requireWriteUser } from '@/lib/auth'
import { getMediaCandidateById, updateMediaContact, updateMediaStatus } from '@/lib/db'

const mediaStatusSchema = z.enum([
  'unreviewed',
  'ready_to_send',
  'sent',
  'replied',
  'interested',
  'partnered',
  'passed',
  'retry_candidate',
])

const mediaPatchSchema = z
  .object({
    status: mediaStatusSchema.optional(),
    operator_name: z.string().optional(),
    contact_email: z.string().optional(),
    contact_page_url: z.string().optional(),
    contact_slack_id: z.string().optional(),
    contact_chatwork_id: z.string().optional(),
    assigned_owner: z.string().optional(),
  })
  .refine(
    (body) =>
      body.status !== undefined ||
      body.operator_name !== undefined ||
      body.contact_email !== undefined ||
      body.contact_page_url !== undefined ||
      body.contact_slack_id !== undefined ||
      body.contact_chatwork_id !== undefined ||
      body.assigned_owner !== undefined,
    { message: 'At least one field is required' }
  )

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
    const parsed = mediaPatchSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: '入力値が不正です' }, { status: 400 })
    }

    let media = await getMediaCandidateById(id)
    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    const hasContactUpdate =
      parsed.data.operator_name !== undefined ||
      parsed.data.contact_email !== undefined ||
      parsed.data.contact_page_url !== undefined ||
      parsed.data.contact_slack_id !== undefined ||
      parsed.data.contact_chatwork_id !== undefined ||
      parsed.data.assigned_owner !== undefined

    if (hasContactUpdate) {
      media = await updateMediaContact(id, {
        operator_name: parsed.data.operator_name,
        contact_email: parsed.data.contact_email,
        contact_page_url: parsed.data.contact_page_url,
        contact_slack_id: parsed.data.contact_slack_id,
        contact_chatwork_id: parsed.data.contact_chatwork_id,
        assigned_owner: parsed.data.assigned_owner,
      })
    }

    if (parsed.data.status !== undefined) {
      media = await updateMediaStatus(id, parsed.data.status)
    }

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
