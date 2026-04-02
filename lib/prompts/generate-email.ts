import type { Campaign, MediaCandidate } from '@/types'

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
  return `あなたはアフィリエイト営業の専門家です。
以下の情報をもとに、新規メディアへの提携依頼メールを作成してください。

## 送信者情報
- 担当者名: ${options.senderName}
- 会社名: ${options.senderCompany}

## 案件情報
- 案件名: ${campaign.campaign_name}
- カテゴリ: ${campaign.category}
- 訴求ポイント: ${campaign.appeal_points.join('、')}
- NG表現（絶対に使わないこと）: ${campaign.ng_expressions.join('、')}

## 送信先メディア情報
- メディア名: ${media.media_name}
- URL: ${media.url}
- ジャンル: ${media.genre}
- 推定読者層: ${media.estimated_audience}
- サイト要約: ${media.summary}
- 案件との相性理由: ${media.fit_reason}

## 文面作成のルール
- 文体: ${options.tone || 'ていねい'}
- メディアの特徴や記事内容に触れてパーソナライズすること
- 押し売り感・スパム感を出さないこと
- 件名は読みたくなるものにすること
- 本文は300〜500文字程度に収めること
- NG表現は絶対に使わないこと
- 最後に署名を入れること

${options.signature ? `## 署名\n${options.signature}` : ''}

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
  return `以下の条件でフォローアップメールを作成してください。

## 前提
- ${daysSinceFirstEmail}日前に初回メールを送信したが返信がない
- 催促になりすぎず、自然な形でフォローする

## 案件名: ${campaign.campaign_name}
## メディア名: ${media.media_name}
## 担当者: ${options.senderName}（${options.senderCompany}）
## NG表現: ${campaign.ng_expressions.join('、')}

## 出力形式（必ずJSON形式）
{
  "subject": "フォローアップ件名",
  "body": "フォローアップ本文（改行は\\nで表現）"
}`
}
