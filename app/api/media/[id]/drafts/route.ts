import { NextRequest, NextResponse } from 'next/server'

import { requireWriteUser } from '@/lib/auth'
import { createOutreachDraft, getOutreachDrafts } from '@/lib/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const drafts = await getOutreachDrafts(id)

    return NextResponse.json(drafts)
  } catch (error) {
    console.error('[drafts:get] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireWriteUser()
    const { id } = await params
    const body = await request.json()

    if (!body?.subject || !body?.body) {
      return NextResponse.json({ error: 'subject and body are required' }, { status: 400 })
    }

    const draft = await createOutreachDraft({
      media_candidate_id: id,
      subject: body.subject,
      body: body.body,
      tone: body.tone ?? 'ていねい',
      personalization_points: body.personalization_points ?? [],
      approval_status: body.approval_status ?? 'pending',
    })

    return NextResponse.json(draft, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('[drafts:post] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
