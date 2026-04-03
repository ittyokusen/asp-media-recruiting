import { NextRequest, NextResponse } from 'next/server'

import { requireWriteUser } from '@/lib/auth'
import { createOutreachLog, updateMediaContact, updateMediaStatus } from '@/lib/db'
import type { MediaStatus } from '@/types'

function resolveMediaStatusFromSend(deliveryStatus?: string): MediaStatus {
  if (deliveryStatus === 'failed' || deliveryStatus === 'bounced') {
    return 'retry_candidate'
  }

  return 'sent'
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireWriteUser()
    const body = await request.json()
    const sentBy = body?.sent_by?.trim() || user?.email || 'admin@demo.local'

    if (!body?.media_candidate_id) {
      return NextResponse.json({ error: 'media_candidate_id is required' }, { status: 400 })
    }

    const log = await createOutreachLog({
      media_candidate_id: body.media_candidate_id,
      draft_id: body.draft_id,
      sent_by: sentBy,
      sent_at: body.sent_at,
      delivery_status: body.delivery_status ?? 'delivered',
      reply_status: body.reply_status ?? 'none',
      next_action: body.next_action ?? '3営業日以内に初回返信を確認',
      memo: body.memo ?? '',
    })

    await updateMediaContact(body.media_candidate_id, {
      assigned_owner: sentBy,
    })

    const media = await updateMediaStatus(
      body.media_candidate_id,
      resolveMediaStatusFromSend(body.delivery_status)
    )

    return NextResponse.json({ log, media }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    console.error('[outreach-logs:post] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
