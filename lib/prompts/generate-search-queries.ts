import type { Campaign } from '@/types'

/**
 * メディア候補の検索クエリを生成するプロンプト
 */
export function buildSearchQueriesPrompt(campaign: Campaign): string {
  return `あなたはアフィリエイトマーケティングの専門家です。
以下の案件に適した新規メディアを探すための検索クエリを生成してください。

## 案件情報
- 案件名: ${campaign.campaign_name}
- カテゴリ: ${campaign.category}
- 訴求ポイント: ${campaign.appeal_points.join('、')}
- 好ましいメディア特性: ${campaign.preferred_media_traits.join('、')}
- 既存の優良メディア例: ${campaign.existing_good_media_examples.join('、') || 'なし'}

## 検索クエリ生成のルール
- Google検索で使うクエリを生成する
- アフィリエイトメディアが見つかりやすいクエリにする
- 比較記事・体験談・ランキング記事が多いメディアを見つけやすいクエリを含める
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
