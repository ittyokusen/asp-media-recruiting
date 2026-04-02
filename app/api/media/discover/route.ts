import { NextRequest, NextResponse } from 'next/server'
import { deduplicateDomains } from '@/lib/crawler/scraper'

/**
 * 検索クエリからメディア候補URLを収集するAPI
 *
 * NOTE: Google検索は直接叩けないため、実装方法は以下から選択：
 * A) Google Custom Search API（有料、月100回まで無料）
 * B) SerpAPI / Serper.dev（有料API）
 * C) Bing Search API（Azureで取得）
 *
 * ここではGoogle Custom Search APIを想定した実装
 */

const GOOGLE_SEARCH_API = 'https://www.googleapis.com/customsearch/v1'

interface DiscoverRequest {
  queries: string[]
  maxResultsPerQuery?: number
}

export async function POST(req: NextRequest) {
  try {
    const { queries, maxResultsPerQuery = 10 }: DiscoverRequest = await req.json()

    const apiKey = process.env.GOOGLE_SEARCH_API_KEY
    const cx = process.env.GOOGLE_SEARCH_CX

    if (!apiKey || !cx) {
      // API未設定時はモックレスポンスを返す（開発用）
      return NextResponse.json({
        urls: [
          'https://example-health-media.com',
          'https://supplement-review-site.jp',
          'https://kenko-hikaku.net',
        ],
        note: 'GOOGLE_SEARCH_API_KEY / GOOGLE_SEARCH_CX が未設定のためモックデータを返しています',
      })
    }

    const allUrls: string[] = []

    for (const query of queries.slice(0, 5)) { // 一度に最大5クエリ
      const params = new URLSearchParams({
        key: apiKey,
        cx,
        q: query,
        num: String(maxResultsPerQuery),
        lr: 'lang_ja',
        gl: 'jp',
      })

      const res = await fetch(`${GOOGLE_SEARCH_API}?${params}`)
      if (!res.ok) continue

      const data = await res.json()
      const urls = (data.items ?? []).map((item: { link: string }) => item.link)
      allUrls.push(...urls)
    }

    const uniqueUrls = deduplicateDomains(allUrls)

    return NextResponse.json({ urls: uniqueUrls })
  } catch (err) {
    console.error('[discover] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
