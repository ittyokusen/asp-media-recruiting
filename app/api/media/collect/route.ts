import { NextRequest } from 'next/server'
import { requireWriteUser } from '@/lib/auth'
import { toApiErrorMessage } from '@/lib/ai'
import { scrapeSite, deduplicateDomains } from '@/lib/crawler/scraper'
import {
  buildAnalyzeMediaPrompt,
  buildExtractContactPrompt,
} from '@/lib/prompts/analyze-media'
import { buildSearchQueriesPrompt } from '@/lib/prompts/generate-search-queries'
import { callClaude } from '@/lib/claude'
import type { Campaign, MediaCandidate, PriorityRank } from '@/types'

// SSEヘルパー
function sseMessage(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

interface CollectRequest {
  campaign: Campaign
  maxSites?: number
}

function getCollectConfig(requestedMaxSites?: number) {
  const fallbackMaxSites = Number(process.env.MEDIA_COLLECT_MAX_SITES ?? '15')
  const fallbackQueryLimit = Number(process.env.MEDIA_COLLECT_QUERY_LIMIT ?? '5')
  const searchTimeoutMs = Number(process.env.GOOGLE_SEARCH_TIMEOUT_MS ?? '8000')
  const analyzeDelayMs = Number(process.env.MEDIA_COLLECT_DELAY_MS ?? '500')

  return {
    maxSites: Math.min(Math.max(requestedMaxSites ?? fallbackMaxSites, 1), 30),
    queryLimit: Math.min(Math.max(fallbackQueryLimit, 1), 10),
    searchTimeoutMs: Math.max(searchTimeoutMs, 1000),
    analyzeDelayMs: Math.max(analyzeDelayMs, 0),
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireWriteUser()
  } catch {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { campaign, maxSites }: CollectRequest = await req.json()
  const config = getCollectConfig(maxSites)
  const startedAt = Date.now()

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(sseMessage(event, data)))
      }

      try {
        // Step 1: 検索クエリ生成
        send('progress', { step: 'queries', message: '検索クエリを生成中...', percent: 5 })

        const { queries } = await callClaude<{ queries: string[]; intent: string }>(
          buildSearchQueriesPrompt(campaign)
        )
        send('progress', {
          step: 'queries',
          message: `${queries.length}件のクエリを生成しました`,
          percent: 15,
          detail: queries.slice(0, config.queryLimit),
        })

        // Step 2: URL収集
        send('progress', { step: 'discover', message: 'メディアURLを収集中...', percent: 20 })

        const discoveredUrls = await discoverUrls(queries.slice(0, config.queryLimit), config.searchTimeoutMs)
        const uniqueUrls = deduplicateDomains(discoveredUrls).slice(0, config.maxSites)

        if (uniqueUrls.length === 0) {
          throw new Error('収集対象のURLが見つかりませんでした')
        }

        send('progress', {
          step: 'discover',
          message: `${uniqueUrls.length}件のURLを収集しました`,
          percent: 30,
        })

        // Step 3: 各サイトをスクレイプ → AI分析
        const results: MediaCandidate[] = []
        const total = uniqueUrls.length

        for (let i = 0; i < uniqueUrls.length; i++) {
          const url = uniqueUrls[i]
          const progressPercent = 30 + Math.round((i / total) * 60)

          send('progress', {
            step: 'analyze',
            message: `分析中 (${i + 1}/${total}): ${url}`,
            percent: progressPercent,
          })

          try {
            // スクレイプ
            const scraped = await scrapeSite(url)
            if (scraped.error) {
              send('skip', { url, reason: scraped.error })
              continue
            }

            // Claude で分析（並行）
            const [analysis, contact] = await Promise.all([
              callClaude<{
                media_name: string
                genre: string
                estimated_audience: string
                article_topics: string[]
                summary: string
                campaign_fit_reason: string
                fit_score: number
                priority_rank: PriorityRank
                operator_type_estimation: string
              }>(buildAnalyzeMediaPrompt(scraped.bodyText, url, campaign)),
              callClaude<{
                operator_name: string | null
                contact_email: string | null
                contact_page_url: string | null
                social_links: string[]
              }>(buildExtractContactPrompt(scraped.rawHtml, url)),
            ])

            const candidate: MediaCandidate = {
              id: `media_${Date.now()}_${i}`,
              campaign_id: campaign.id,
              media_name: analysis.media_name || scraped.title || url,
              domain: new URL(url).hostname.replace(/^www\./, ''),
              url,
              genre: analysis.genre,
              estimated_audience: analysis.estimated_audience,
              operator_name: contact.operator_name ?? '不明',
              operator_type: analysis.operator_type_estimation,
              contact_page_url: contact.contact_page_url ?? scraped.contactPageUrl ?? '',
              contact_email: contact.contact_email ?? scraped.emails[0] ?? '',
              social_links:
                contact.social_links.length > 0 ? contact.social_links : scraped.socialLinks,
              summary: analysis.summary,
              fit_score: analysis.fit_score,
              priority_rank: analysis.priority_rank,
              fit_reason: analysis.campaign_fit_reason,
              status: 'unreviewed',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }

            results.push(candidate)
            send('candidate', candidate)
          } catch (err) {
            send('skip', {
              url,
              reason: err instanceof Error ? err.message : 'Unknown error',
            })
          }

          // API レート制限対策：少し待つ
          await sleep(config.analyzeDelayMs)
        }

        // Step 4: 完了
        send('progress', {
          step: 'done',
          message: `完了！${results.length}件のメディアを収集・分析しました`,
          percent: 100,
        })
        send('done', { count: results.length, candidates: results })
      } catch (err) {
        send('error', {
          message: toApiErrorMessage(err, 'メディア収集でエラーが発生しました'),
        })
      } finally {
        console.info('[media-collect] finished', {
          campaignId: campaign.id,
          durationMs: Date.now() - startedAt,
        })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

async function discoverUrls(queries: string[], timeoutMs: number): Promise<string[]> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY
  const cx = process.env.GOOGLE_SEARCH_CX

  if (!apiKey || !cx) {
    // 開発用モック
    return [
      'https://kenko-review.example.com',
      'https://supplement-hikaku.example.jp',
      'https://kettouchi-lab.example.com',
    ]
  }

  const allUrls: string[] = []
  for (const query of queries) {
    try {
      const params = new URLSearchParams({
        key: apiKey,
        cx,
        q: query,
        num: '10',
        lr: 'lang_ja',
        gl: 'jp',
      })
      const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`, {
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (!res.ok) continue
      const data = await res.json()
      allUrls.push(...(data.items ?? []).map((item: { link: string }) => item.link))
    } catch {
      // クエリ単位のエラーはスキップ
    }
  }
  return allUrls
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
