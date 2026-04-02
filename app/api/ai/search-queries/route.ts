import { NextRequest, NextResponse } from 'next/server'
import { toApiErrorMessage } from '@/lib/ai'
import { buildSearchQueriesPrompt } from '@/lib/prompts/generate-search-queries'
import { callClaude } from '@/lib/claude'
import type { Campaign } from '@/types'

interface SearchQueriesResult {
  queries: string[]
  intent: string
}

export async function POST(req: NextRequest) {
  try {
    const startedAt = Date.now()
    const { campaign }: { campaign: Campaign } = await req.json()

    if (!campaign) {
      return NextResponse.json({ error: 'campaign is required' }, { status: 400 })
    }

    const result = await callClaude<SearchQueriesResult>(
      buildSearchQueriesPrompt(campaign)
    )

    console.info('[search-queries] success', {
      campaignId: campaign.id,
      durationMs: Date.now() - startedAt,
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[search-queries] error:', err)
    return NextResponse.json(
      { error: toApiErrorMessage(err, '検索クエリ生成でエラーが発生しました') },
      { status: 500 }
    )
  }
}
