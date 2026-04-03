import type { Campaign, MediaLearningProfile } from '@/types'
import { sanitizeForPrompt } from '@/lib/utils'

/**
 * サイトHTML/テキストからメディア特性を分析するプロンプト
 */
export function buildAnalyzeMediaPrompt(
  siteText: string,
  url: string,
  campaign: Campaign,
  learningProfile?: MediaLearningProfile
): string {
  const safeCampaignName = sanitizeForPrompt(campaign.campaign_name)
  const safeCategory = sanitizeForPrompt(campaign.category)
  const safeAppealPoints = campaign.appeal_points.map(sanitizeForPrompt).join('、')
  const safePreferredTraits = campaign.preferred_media_traits.map(sanitizeForPrompt).join('、')
  const safeUrl = sanitizeForPrompt(url)
  const safeSiteText = sanitizeForPrompt(siteText)
  const safeLearningHints =
    learningProfile?.summary_hints.map(sanitizeForPrompt).join('\n- ') || 'まだ十分な学習データなし'

  return `あなたはアフィリエイトマーケティングの専門家です。
以下のWebサイトのテキスト内容を分析し、案件との相性を評価してください。

## 対象案件
- 案件名: ${safeCampaignName}
- カテゴリ: ${safeCategory}
- 訴求ポイント: ${safeAppealPoints}
- 好ましいメディア特性: ${safePreferredTraits}

## 過去の営業結果から学習した傾向
- ${safeLearningHints}

## 分析対象サイト
URL: ${safeUrl}

サイトテキスト:
---
${safeSiteText}
---

## 出力形式（必ずJSON形式で返してください）
{
  "media_name": "サイト名または推定名",
  "genre": "主なジャンル（例：健康・美容・金融など）",
  "estimated_audience": "推定読者層（例：30〜50代女性）",
  "article_topics": ["主な記事テーマ1", "記事テーマ2"],
  "has_comparison_articles": true または false,
  "has_ranking_articles": true または false,
  "affiliate_friendly_signals": true または false,
  "update_frequency": "高め / 普通 / 低め / 不明",
  "operator_type_estimation": "個人ブログ / 法人メディア / ECサイト / ニュースサイト / 不明",
  "summary": "サイトの特徴を2〜3文で要約",
  "campaign_fit_reason": "この案件との相性が高い・低い理由を具体的に",
  "fit_score": 0から100の整数（案件との相性スコア）,
  "priority_rank": "S / A / B / C"
}

スコアの基準:
- 90〜100: S（ジャンル・読者層・記事傾向すべてが完全一致）
- 70〜89: A（ジャンルが近く読者層も合う）
- 50〜69: B（部分的に合う）
- 0〜49: C（相性が低い）

追加ルール:
- 過去に返信/提携につながったジャンル・運営タイプ・連絡導線に近い媒体は高めに評価する
- 過去に見送りが多かったドメインや、巨大媒体・出版社系・競合ASP系に寄りすぎた媒体は低く評価する
- ただし実際のサイト内容と案件の一致度を優先し、学習傾向は補助シグナルとして使う`
}

/**
 * 運営者情報・問い合わせ先を抽出するプロンプト
 */
export function buildExtractContactPrompt(html: string, url: string): string {
  const safeUrl = sanitizeForPrompt(url)
  const safeHtml = sanitizeForPrompt(html)

  return `以下のHTMLから運営者情報と問い合わせ先を抽出してください。

URL: ${safeUrl}

HTML（先頭部分）:
---
${safeHtml}
---

## 出力形式（必ずJSON形式で返してください）
{
  "operator_name": "運営者名または会社名（不明なら null）",
  "contact_email": "メールアドレス（なければ null）",
  "contact_page_url": "問い合わせページURL（なければ null）",
  "social_links": ["SNSリンク1", "SNSリンク2"]
}`
}
