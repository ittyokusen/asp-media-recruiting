import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { requireWriteUser } from '@/lib/auth'
import { createOutreachLog, updateMediaContact, updateMediaStatus } from '@/lib/db'
import type { MediaStatus } from '@/types'

const outreachLogCreateSchema = z.object({
  media_candidate_id: z.string().trim().min(1),
  draft_id: z.string().optional(),
  sent_by: z.string().optional(),
  sent_at: z.string().optional(),
  delivery_status: z.enum(['pending', 'delivered', 'bounced', 'failed']).optional(),
  reply_status: z.enum(['none', 'replied', 'interested', 'declined']).optional(),
  next_action: z.string().optional(),
  memo: z.string().optional(),
})

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
    const parsed = outreachLogCreateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: '入力値が不正です' }, { status: 400 })
    }

    const sentBy = parsed.data.sent_by?.trim() || user?.email || 'admin@demo.local'

    const log = await createOutreachLog({
      media_candidate_id: parsed.data.media_candidate_id,
      draft_id: parsed.data.draft_id,
      sent_by: sentBy,
      sent_at: parsed.data.sent_at,
      delivery_status: parsed.data.delivery_status ?? 'delivered',
      reply_status: parsed.data.reply_status ?? 'none',
      next_action: parsed.data.next_action ?? '3営業日以内に初回返信を確認',
      memo: parsed.data.memo ?? '',
    })

    await updateMediaContact(parsed.data.media_candidate_id, {
      assigned_owner: sentBy,
    })

    const media = await updateMediaStatus(
      parsed.data.media_candidate_id,
      resolveMediaStatusFromSend(parsed.data.delivery_status)
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
