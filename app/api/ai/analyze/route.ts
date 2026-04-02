import { NextRequest, NextResponse } from 'next/server'
import { toApiErrorMessage } from '@/lib/ai'
import { scrapeSite } from '@/lib/crawler/scraper'
import { buildAnalyzeMediaPrompt, buildExtractContactPrompt } from '@/lib/prompts/analyze-media'
import { callClaude } from '@/lib/claude'
import type { Campaign } from '@/types'

interface AnalyzeRequest {
  url: string
  campaign: Campaign
}

interface AnalysisResult {
  media_name: string
  genre: string
  estimated_audience: string
  article_topics: string[]
  has_comparison_articles: boolean
  has_ranking_articles: boolean
  affiliate_friendly_signals: boolean
  update_frequency: string
  operator_type_estimation: string
  summary: string
  campaign_fit_reason: string
  fit_score: number
  priority_rank: 'S' | 'A' | 'B' | 'C'
}

interface ContactResult {
  operator_name: string | null
  contact_email: string | null
  contact_page_url: string | null
  social_links: string[]
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now()

  try {
    const { url, campaign }: AnalyzeRequest = await req.json()

    if (!url || !campaign) {
      return NextResponse.json({ error: 'url and campaign are required' }, { status: 400 })
    }

    // 1. サイトをスクレイプ
    const scraped = await scrapeSite(url)
    if (scraped.error) {
      return NextResponse.json({ error: `Scrape failed: ${scraped.error}` }, { status: 422 })
    }

    // 2. Claude でメディア分析とコンタクト抽出を並行実行
    const [analysis, contact] = await Promise.all([
      callClaude<AnalysisResult>(
        buildAnalyzeMediaPrompt(scraped.bodyText, url, campaign)
      ),
      callClaude<ContactResult>(
        buildExtractContactPrompt(scraped.rawHtml, url)
      ),
    ])

    const response = NextResponse.json({
      url,
      domain: new URL(url).hostname.replace(/^www\./, ''),
      // 分析結果
      ...analysis,
      // コンタクト情報
      operator_name: contact.operator_name,
      contact_email: contact.contact_email ?? scraped.emails[0] ?? null,
      contact_page_url: contact.contact_page_url ?? scraped.contactPageUrl,
      social_links: contact.social_links.length > 0 ? contact.social_links : scraped.socialLinks,
    })

    console.info('[analyze] success', {
      url,
      campaignId: campaign.id,
      durationMs: Date.now() - startedAt,
    })

    return response
  } catch (err) {
    console.error('[analyze] error:', err)
    console.info('[analyze] finished', {
      durationMs: Date.now() - startedAt,
    })
    return NextResponse.json(
      { error: toApiErrorMessage(err, 'サイト分析でエラーが発生しました') },
      { status: 500 }
    )
  }
}
