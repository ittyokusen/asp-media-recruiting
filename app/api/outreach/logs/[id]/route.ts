import { NextRequest, NextResponse } from 'next/server'

import { requireWriteUser } from '@/lib/auth'
import { updateOutreachLog, updateMediaStatus } from '@/lib/db'
import type { DeliveryStatus, MediaStatus, ReplyStatus } from '@/types'

function resolveMediaStatus(input: {
  delivery_status?: DeliveryStatus
  reply_status?: ReplyStatus
}): MediaStatus | null {
  if (input.delivery_status === 'failed' || input.delivery_status === 'bounced') {
    return 'retry_candidate'
  }

  if (input.reply_status === 'interested') {
    return 'interested'
  }

  if (input.reply_status === 'replied') {
    return 'replied'
  }

  if (input.reply_status === 'declined') {
    return 'passed'
  }

  return null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireWriteUser()
    const { id } = await params
    const body = await request.json()

    if (
      body?.delivery_status === undefined &&
      body?.reply_status === undefined &&
      body?.reply_body === undefined &&
      body?.reply_received_at === undefined &&
      body?.next_action === undefined &&
      body?.memo === undefined
    ) {
      return NextResponse.json({ error: 'update fields are required' }, { status: 400 })
    }

    const log = await updateOutreachLog(id, {
      delivery_status: body.delivery_status,
      reply_status: body.reply_status,
      reply_body: body.reply_body,
      reply_received_at: body.reply_received_at,
      next_action: body.next_action,
      memo: body.memo,
    })

    const nextStatus = resolveMediaStatus({
      delivery_status: body.delivery_status,
      reply_status: body.reply_status,
    })

    const media = nextStatus ? await updateMediaStatus(log.media_candidate_id, nextStatus) : null

    return NextResponse.json({ log, media })
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    console.error('[outreach-logs-id:patch] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
