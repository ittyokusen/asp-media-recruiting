import type { Campaign, MediaLearningProfile } from '@/types'
import { sanitizeForPrompt } from '@/lib/utils'

/**
 * メディア候補の検索クエリを生成するプロンプト
 */
export function buildSearchQueriesPrompt(
  campaign: Campaign,
  learningProfile?: MediaLearningProfile
): string {
  const safeCampaignName = sanitizeForPrompt(campaign.campaign_name)
  const safeCategory = sanitizeForPrompt(campaign.category)
  const safeAppealPoints = campaign.appeal_points.map(sanitizeForPrompt).join('、')
  const safePreferredTraits = campaign.preferred_media_traits.map(sanitizeForPrompt).join('、')
  const safeGoodExamples =
    campaign.existing_good_media_examples.map(sanitizeForPrompt).join('、') || 'なし'
  const safeLearningHints =
    learningProfile?.summary_hints.map(sanitizeForPrompt).join('\n- ') || 'まだ十分な学習データなし'

  return `あなたはアフィリエイトマーケティングの専門家です。
以下の案件に適した新規メディアを探すための検索クエリを生成してください。

## 案件情報
- 案件名: ${safeCampaignName}
- カテゴリ: ${safeCategory}
- 訴求ポイント: ${safeAppealPoints}
- 好ましいメディア特性: ${safePreferredTraits}
- 既存の優良メディア例: ${safeGoodExamples}

## 過去の営業結果から学習した傾向
- ${safeLearningHints}

## 検索クエリ生成のルール
- Google検索で使うクエリを生成する
- アフィリエイトメディアが見つかりやすいクエリにする
- 比較記事・体験談・ランキング記事が多いメディアを見つけやすいクエリを含める
- 過去に返信や提携につながった媒体のドメイン/ジャンル/運営タイプに近い中小媒体を優先して深掘りする
- 見送り傾向が強いドメインや、出版社/巨大プラットフォーム寄りの媒体は避ける
- 10〜15件のクエリを生成する
- 既存優良メディアの類似サイトを見つけるクエリも含める

## 出力形式（必ずJSON形式で返してください）
{
  "queries": [
    "検索クエリ1",
    "検索クエリ2",
    ...
  ],
  "intent": "このクエリ群で狙っているメディアタイプの説明"
}`
}
