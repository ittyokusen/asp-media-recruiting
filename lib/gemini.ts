import { GoogleGenerativeAI } from '@google/generative-ai'
import { AIRequestError, extractJsonBlock, withRetry, withTimeout } from '@/lib/ai'
import { extractHostname } from '@/lib/utils'

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  return new GoogleGenerativeAI(apiKey)
}

function hasGeminiKey() {
  return Boolean(process.env.GEMINI_API_KEY)
}

function extractValue(prompt: string, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = prompt.match(new RegExp(`- ${escaped}:\\s*(.+)`))
  return match?.[1]?.trim() ?? ''
}

function mockResponse(prompt: string) {
  if (prompt.includes('"contact_slack_id"') && prompt.includes('"contact_chatwork_id"')) {
    return {
      operator_name: '山田 太郎',
      contact_email: 'taro.yamada@example-demo.jp',
      contact_slack_id: '@taro_yamada',
      contact_chatwork_id: 'taro_yamada_demo',
      contact_page_url: 'https://example-demo.jp/contact',
      memo: 'デモモードの名刺OCR結果です。',
    }
  }

  if (prompt.includes('"subject_candidates"')) {
    const mediaName = extractValue(prompt, 'メディア名') || 'ご担当者'
    const campaignName = extractValue(prompt, '案件名') || '案件'
    const senderName = extractValue(prompt, '担当者名') || '田中'
    const senderCompany = extractValue(prompt, '会社名') || '株式会社サンプル'

    return {
      subject_candidates: [
        `【ご提携のご相談】${mediaName}様に${campaignName}のご提案`,
        `${mediaName}様向け ${campaignName}の掲載ご相談`,
        `${campaignName}のご紹介とご提携のお願い`,
      ],
      body: `${mediaName} ご担当者様\n\n突然のご連絡失礼いたします。\n${senderCompany}の${senderName}と申します。\n\n貴メディアを拝見し、読者との距離感が近い丁寧な発信に魅力を感じました。\nこのたび、${campaignName}のご紹介でご連絡しております。\n読者層との親和性が高いと考えており、一度詳細をご案内できれば幸いです。\n\nご興味ございましたら、ぜひご返信ください。\nどうぞよろしくお願いいたします。`,
      personalization_points: ['メディアの読者層', 'サイトの発信トーン', '案件との親和性'],
      tone: 'ていねい',
    }
  }

  if (prompt.includes('"queries"') && prompt.includes('"intent"')) {
    const category = extractValue(prompt, 'カテゴリ') || '健康食品'
    return {
      queries: [
        `${category} 比較 ブログ`,
        `${category} 口コミ メディア`,
        `${category} おすすめ ランキング`,
        `${category} 体験談 アフィリエイト`,
        `${category} レビュー サイト`,
      ],
      intent: '案件と親和性の高いアフィリエイト向けメディア候補を探す',
    }
  }

  if (prompt.includes('"operator_name"') && prompt.includes('"contact_email"')) {
    return {
      operator_name: 'デモ運営事務局',
      contact_email: 'contact@example-demo.jp',
      contact_page_url: 'https://example-demo.jp/contact',
      social_links: ['https://twitter.com/example_demo'],
    }
  }

  if (prompt.includes('"campaign_fit_reason"')) {
    const url = extractValue(prompt, 'URL') || 'https://example-demo.jp'
    return {
      media_name: extractHostname(url),
      genre: '健康・生活習慣',
      estimated_audience: '40〜60代',
      article_topics: ['比較記事', '体験談', '生活改善'],
      has_comparison_articles: true,
      has_ranking_articles: true,
      affiliate_friendly_signals: true,
      update_frequency: '普通',
      operator_type_estimation: '法人メディア',
      summary: '比較記事と体験談を中心に構成された、デモ用の分析結果です。',
      campaign_fit_reason: '読者層と訴求テーマの親和性が高く、提携打診の優先度が高いと判断できます。',
      fit_score: 82,
      priority_rank: 'A',
    }
  }

  if (prompt.includes('"subject"') && prompt.includes('"body"')) {
    return {
      subject: '先日のご連絡の件でご確認です',
      body: '先日お送りしたご提案について、改めてご確認のご連絡です。ご興味ございましたらお気軽にご返信ください。',
    }
  }

  return {}
}

/**
 * Claude APIを呼び出してJSONレスポンスを返す
 */
export async function callClaude<T>(prompt: string): Promise<T> {
  if (!hasGeminiKey()) {
    return mockResponse(prompt) as T
  }

  const client = getClient()
  const model = client.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.4,
    },
  })

  const startedAt = Date.now()

  const text = await withRetry(
    async () => {
      const response = await withTimeout(
        async () => model.generateContent(prompt),
        Number(process.env.GEMINI_TIMEOUT_MS ?? 15000)
      )

      return response.response.text()
    },
    {
      retries: Number(process.env.GEMINI_RETRIES ?? 2),
      shouldRetry: (error) => {
        if (error instanceof AIRequestError) {
          return error.code !== 'invalid_json' && error.code !== 'forbidden'
        }

        const message = error instanceof Error ? error.message.toLowerCase() : ''
        return message.includes('429') || message.includes('503') || message.includes('overloaded')
      },
    }
  ).catch((error: unknown) => {
    if (error instanceof AIRequestError) {
      throw error
    }

    const message = error instanceof Error ? error.message : 'Unknown Gemini error'
    if (message.includes('429')) {
      throw new AIRequestError('rate_limit', 'Gemini rate limit exceeded')
    }

    throw new AIRequestError('upstream', message)
  })

  try {
    const parsed = JSON.parse(extractJsonBlock(text)) as T
    console.info('[ai] gemini call success', {
      durationMs: Date.now() - startedAt,
      usedMock: false,
    })
    return parsed
  } catch (error) {
    if (error instanceof AIRequestError) {
      throw error
    }
    throw new AIRequestError('invalid_json', 'Gemini response could not be parsed as JSON')
  }
}

export async function callClaudeVision<T>({
  prompt,
  mimeType,
  base64Data,
}: {
  prompt: string
  mimeType: string
  base64Data: string
}): Promise<T> {
  if (!hasGeminiKey()) {
    return mockResponse(prompt) as T
  }

  const client = getClient()
  const model = client.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2,
    },
  })

  const text = await withRetry(
    async () => {
      const response = await withTimeout(
        async () =>
          model.generateContent([
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
          ]),
        Number(process.env.GEMINI_TIMEOUT_MS ?? 15000)
      )

      return response.response.text()
    },
    {
      retries: Number(process.env.GEMINI_RETRIES ?? 2),
    }
  )

  return JSON.parse(extractJsonBlock(text)) as T
}
