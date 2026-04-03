import type { Campaign, MediaCandidate } from '@/types'

export type CampaignRecommendation = {
  campaign: Campaign
  score: number
  rank: 'S' | 'A' | 'B' | 'C'
  reasons: string[]
}

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)))

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[・、,./\s\-_/]/g, ' ')
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)

const countMatches = (sourceTokens: string[], targetText: string) => {
  const normalizedTarget = targetText.toLowerCase()
  return sourceTokens.filter((token) => normalizedTarget.includes(token)).length
}

const toRank = (score: number): CampaignRecommendation['rank'] => {
  if (score >= 86) return 'S'
  if (score >= 72) return 'A'
  if (score >= 58) return 'B'
  return 'C'
}

export function getCampaignRecommendations(
  media: MediaCandidate,
  campaigns: Campaign[]
): CampaignRecommendation[] {
  const mediaText = [
    media.media_name,
    media.genre,
    media.estimated_audience,
    media.summary,
    media.fit_reason,
    media.operator_type,
  ].join(' ')
  const mediaTokens = normalizeText(mediaText)

  return campaigns
    .map((campaign) => {
      const categoryMatches = countMatches(normalizeText(campaign.category), mediaText)
      const appealMatches = campaign.appeal_points.filter((point) =>
        countMatches(normalizeText(point), mediaText) > 0
      )
      const traitMatches = campaign.preferred_media_traits.filter((trait) =>
        countMatches(normalizeText(trait), mediaText) > 0
      )
      const exampleMatches = campaign.existing_good_media_examples.filter((example) =>
        media.domain.includes(example) || countMatches(mediaTokens, example) > 0
      )

      const baseScore = campaign.id === media.campaign_id ? media.fit_score : 50
      const score = clampScore(
        baseScore +
          categoryMatches * 8 +
          appealMatches.length * 7 +
          traitMatches.length * 8 +
          exampleMatches.length * 10 +
          (media.contact_email || media.contact_page_url ? 4 : 0) +
          (media.priority_rank === 'S' ? 5 : media.priority_rank === 'A' ? 3 : 0)
      )

      const reasons = [
        campaign.id === media.campaign_id
          ? `現在紐づいている案件で、既存評価 ${media.fit_score} 点をベースに見ています`
          : null,
        categoryMatches > 0 ? `カテゴリ「${campaign.category}」と媒体テーマが近いです` : null,
        appealMatches[0] ? `訴求「${appealMatches[0]}」を記事文脈に乗せやすいです` : null,
        traitMatches[0] ? `希望媒体条件「${traitMatches[0]}」に寄っています` : null,
        exampleMatches[0] ? `既存の好相性媒体例「${exampleMatches[0]}」と近い傾向があります` : null,
        media.contact_email || media.contact_page_url
          ? '連絡導線があるため、提案開始まで進めやすいです'
          : null,
      ].filter((reason): reason is string => Boolean(reason))

      return {
        campaign,
        score,
        rank: toRank(score),
        reasons:
          reasons.length > 0
            ? reasons.slice(0, 3)
            : ['媒体ジャンルと案件条件の距離を見て、テスト提案候補として評価しています'],
      }
    })
    .sort((a, b) => b.score - a.score)
}
