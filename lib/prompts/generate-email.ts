import type { Campaign, MediaCandidate } from '@/types'
import { sanitizeForPrompt } from '@/lib/utils'

interface EmailGenerationOptions {
  senderName: string
  senderCompany: string
  signature?: string
  tone?: string
}

/**
 * 初回リクルーティングメール生成プロンプト
 */
export function buildGenerateEmailPrompt(
  campaign: Campaign,
  media: MediaCandidate,
  options: EmailGenerationOptions
): string {
  const safeSenderName = sanitizeForPrompt(options.senderName)
  const safeSenderCompany = sanitizeForPrompt(options.senderCompany)
  const safeTone = sanitizeForPrompt(options.tone || 'ていねい')
  const safeSignature = options.signature ? sanitizeForPrompt(options.signature) : ''

  const safeCampaignName = sanitizeForPrompt(campaign.campaign_name)
  const safeCampaignCategory = sanitizeForPrompt(campaign.category)
  const safeAppealPoints = campaign.appeal_points.map(sanitizeForPrompt).join('、')
  const safeNgExpressions = campaign.ng_expressions.map(sanitizeForPrompt).join('、')

  const safeMediaName = sanitizeForPrompt(media.media_name)
  const safeMediaUrl = sanitizeForPrompt(media.url)
  const safeMediaGenre = sanitizeForPrompt(media.genre)
  const safeAudience = sanitizeForPrompt(media.estimated_audience)
  const safeSummary = sanitizeForPrompt(media.summary)
  const safeFitReason = sanitizeForPrompt(media.fit_reason)

  return `あなたはアフィリエイト営業の専門家です。
以下の情報をもとに、新規メディアへの提携依頼メールを作成してください。

## 送信者情報
- 担当者名: ${safeSenderName}
- 会社名: ${safeSenderCompany}

## 案件情報
- 案件名: ${safeCampaignName}
- カテゴリ: ${safeCampaignCategory}
- 訴求ポイント: ${safeAppealPoints}
- NG表現（絶対に使わないこと）: ${safeNgExpressions}

## 送信先メディア情報
- メディア名: ${safeMediaName}
- URL: ${safeMediaUrl}
- ジャンル: ${safeMediaGenre}
- 推定読者層: ${safeAudience}
- サイト要約: ${safeSummary}
- 案件との相性理由: ${safeFitReason}

## 文面作成のルール
- 文体: ${safeTone}
- メディアの特徴や記事内容に触れてパーソナライズすること
- 押し売り感・スパム感を出さないこと
- 件名は読みたくなるものにすること
- 本文は300〜500文字程度に収めること
- NG表現は絶対に使わないこと
- 最後に署名を入れること

${safeSignature ? `## 署名\n${safeSignature}` : ''}

## 出力形式（必ずJSON形式で返してください）
{
  "subject_candidates": [
    "件名案1",
    "件名案2",
    "件名案3"
  ],
  "body": "メール本文（改行は\\nで表現）",
  "personalization_points": ["パーソナライズに使った要素1", "要素2"],
  "tone": "使用したトーン"
}`
}

/**
 * フォローアップメール生成プロンプト
 */
export function buildFollowUpEmailPrompt(
  campaign: Campaign,
  media: MediaCandidate,
  options: EmailGenerationOptions,
  daysSinceFirstEmail: number
): string {
  const safeCampaignName = sanitizeForPrompt(campaign.campaign_name)
  const safeMediaName = sanitizeForPrompt(media.media_name)
  const safeSenderName = sanitizeForPrompt(options.senderName)
  const safeSenderCompany = sanitizeForPrompt(options.senderCompany)
  const safeNgExpressions = campaign.ng_expressions.map(sanitizeForPrompt).join('、')

  return `以下の条件でフォローアップメールを作成してください。

## 前提
- ${daysSinceFirstEmail}日前に初回メールを送信したが返信がない
- 催促になりすぎず、自然な形でフォローする

## 案件名: ${safeCampaignName}
## メディア名: ${safeMediaName}
## 担当者: ${safeSenderName}（${safeSenderCompany}）
## NG表現: ${safeNgExpressions}

## 出力形式（必ずJSON形式）
{
  "subject": "フォローアップ件名",
  "body": "フォローアップ本文（改行は\\nで表現）"
}`
}
