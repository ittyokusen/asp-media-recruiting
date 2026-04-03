/**
 * メディアサイトのスクレイピングユーティリティ
 * サーバーサイド（API Route）でのみ使用
 */

import { extractHostname } from '@/lib/utils'

export interface ScrapeResult {
  url: string
  title: string
  metaDescription: string
  bodyText: string
  rawHtml: string
  links: string[]
  emails: string[]
  contactPageUrl: string | null
  socialLinks: string[]
  error?: string
}

/**
 * URLからサイト情報を取得する
 */
export async function scrapeSite(url: string): Promise<ScrapeResult> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MediaScout/1.0)',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }

    const html = await res.text()
    return parseHtml(url, html)
  } catch (err) {
    return {
      url,
      title: '',
      metaDescription: '',
      bodyText: '',
      rawHtml: '',
      links: [],
      emails: [],
      contactPageUrl: null,
      socialLinks: [],
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * HTMLをパースして必要な情報を抽出する（Cheerio不使用の軽量版）
 */
function parseHtml(url: string, html: string): ScrapeResult {
  const baseUrl = new URL(url).origin

  // タイトル抽出
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? ''

  // メタディスクリプション抽出
  const metaDescription =
    html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1]?.trim() ??
    html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i)?.[1]?.trim() ??
    ''

  // ボディテキスト抽出（タグ除去）
  const bodyText = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 5000)

  // リンク抽出
  const linkMatches = html.matchAll(/href=["']([^"'#?]+)["']/gi)
  const links = [...new Set([...linkMatches].map((m) => resolveUrl(baseUrl, m[1])).filter(Boolean))]

  // メールアドレス抽出
  const emailMatches = html.matchAll(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g)
  const emails = [...new Set([...emailMatches].map((m) => m[0]))]
    .filter((e) => !e.includes('example') && !e.includes('sentry'))

  // 問い合わせページURL候補
  const contactPageUrl =
    links.find((l) =>
      /contact|inquiry|お問い合わせ|問い合わせ|recruit/i.test(l)
    ) ?? null

  // SNSリンク抽出
  const socialPatterns = [
    /twitter\.com\/[^"'\s/]+/,
    /x\.com\/[^"'\s/]+/,
    /instagram\.com\/[^"'\s/]+/,
    /facebook\.com\/[^"'\s/]+/,
    /youtube\.com\/(channel|@|c)\/[^"'\s/]+/,
  ]
  const socialLinks = socialPatterns
    .flatMap((pattern) => {
      const match = html.match(pattern)
      return match ? [`https://${match[0]}`] : []
    })
    .filter((v, i, a) => a.indexOf(v) === i)

  return {
    url,
    title,
    metaDescription,
    bodyText,
    rawHtml: html.slice(0, 50000),
    links: links.slice(0, 100),
    emails,
    contactPageUrl,
    socialLinks,
  }
}

function resolveUrl(baseUrl: string, href: string): string {
  try {
    if (href.startsWith('http')) return href
    if (href.startsWith('/')) return `${baseUrl}${href}`
    return ''
  } catch {
    return ''
  }
}

/**
 * 重複ドメインを除外する
 */
export function deduplicateDomains(urls: string[]): string[] {
  const seen = new Set<string>()
  return urls.filter((url) => {
    try {
      const domain = extractHostname(url)
      if (seen.has(domain)) return false
      seen.add(domain)
      return true
    } catch {
      return false
    }
  })
}
