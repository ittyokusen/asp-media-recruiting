import { NextRequest, NextResponse } from 'next/server'
import { requireWriteUser } from '@/lib/auth'
import { toApiErrorMessage } from '@/lib/ai'
import { buildGenerateEmailPrompt } from '@/lib/prompts/generate-email'
import { callClaude } from '@/lib/gemini'
import type { Campaign, MediaCandidate } from '@/types'

interface GenerateEmailRequest {
  campaign: Campaign
  media: MediaCandidate
  senderName: string
  senderCompany: string
  signature?: string
  tone?: string
}

interface GeneratedEmail {
  subject_candidates: string[]
  body: string
  personalization_points: string[]
  tone: string
}

export async function POST(req: NextRequest) {
  try {
    const startedAt = Date.now()
    await requireWriteUser()
    const body: GenerateEmailRequest = await req.json()
    const { campaign, media, senderName, senderCompany, signature, tone } = body

    if (!campaign || !media || !senderName || !senderCompany) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const result = await callClaude<GeneratedEmail>(
      buildGenerateEmailPrompt(campaign, media, { senderName, senderCompany, signature, tone })
    )

    console.info('[generate-email] success', {
      mediaId: media.id,
      campaignId: campaign.id,
      durationMs: Date.now() - startedAt,
    })

    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof Error && err.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('[generate-email] error:', err)
    return NextResponse.json(
      { error: toApiErrorMessage(err, 'メール生成でエラーが発生しました') },
      { status: 500 }
    )
  }
}
