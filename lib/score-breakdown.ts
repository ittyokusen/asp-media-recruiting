import type { MediaCandidate } from '@/types'

export type ScoreBreakdownItem = {
  key: string
  label: string
  value: number
  note: string
}

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)))

const getAudienceScore = (media: MediaCandidate) => {
  const text = `${media.estimated_audience} ${media.fit_reason} ${media.summary}`
  let score = media.fit_score

  if (/(完全一致|一致|直結|合う|親和性)/.test(text)) score += 8
  if (/(ずれ|合わない|弱い|薄い)/.test(text)) score -= 18
  if (/(20〜40代|20代)/.test(media.estimated_audience) && /(血糖|血圧|中高年)/.test(media.fit_reason)) {
    score -= 12
  }

  return clampScore(score)
}

const getArticleScore = (media: MediaCandidate) => {
  const text = `${media.genre} ${media.summary} ${media.fit_reason}`
  let score = media.fit_score

  if (/(比較|レビュー|体験談|ランキング)/.test(text)) score += 12
  if (/(特化|カテゴリが一致|記事カテゴリが一致)/.test(text)) score += 10
  if (/(雑貨寄り|少量|薄い)/.test(text)) score -= 12

  return clampScore(score)
}

const getContactScore = (media: MediaCandidate) => {
  let score = 26

  if (media.contact_email) score += 34
  if (media.contact_page_url) score += 18
  if (media.contact_slack_id) score += 14
  if (media.contact_chatwork_id) score += 14
  if (media.social_links.length > 0) score += 8

  return clampScore(score)
}

const getOperationScore = (media: MediaCandidate) => {
  let score = media.operator_type.includes('法人') ? 82 : 64

  if (media.operator_name && media.operator_name !== '個人運営') score += 8
  if (media.assigned_owner) score += 8
  if (media.operator_type.includes('比較') || media.operator_type.includes('アフィリ')) score += 6

  return clampScore(score)
}

const getDealScore = (media: MediaCandidate) => {
  const rankBonus = media.priority_rank === 'S' ? 12 : media.priority_rank === 'A' ? 6 : media.priority_rank === 'C' ? -10 : 0
  const statusBonus =
    media.status === 'partnered'
      ? 14
      : media.status === 'interested'
        ? 10
        : media.status === 'replied'
          ? 8
          : media.status === 'passed'
            ? -18
            : 0

  return clampScore(media.fit_score + rankBonus + statusBonus)
}

const getSafetyScore = (media: MediaCandidate) => {
  let score = 72

  if (media.fit_score >= 80) score += 8
  if (media.status === 'passed') score -= 16
  if (/(薬|治療|完治|医薬品)/.test(`${media.summary} ${media.fit_reason}`)) score -= 12
  if (media.priority_rank === 'S' || media.priority_rank === 'A') score += 8

  return clampScore(score)
}

export const getScoreBreakdown = (media: MediaCandidate): ScoreBreakdownItem[] => [
  {
    key: 'audience',
    label: '読者一致',
    value: getAudienceScore(media),
    note: media.estimated_audience,
  },
  {
    key: 'article',
    label: '記事相性',
    value: getArticleScore(media),
    note: media.genre,
  },
  {
    key: 'contact',
    label: '接触導線',
    value: getContactScore(media),
    note: media.contact_email
      ? 'メールあり'
      : media.contact_slack_id || media.contact_chatwork_id
        ? 'チャットあり'
        : media.contact_page_url
          ? 'フォームあり'
          : '導線弱め',
  },
  {
    key: 'operation',
    label: '運営信頼',
    value: getOperationScore(media),
    note: media.operator_type,
  },
  {
    key: 'deal',
    label: '提携期待',
    value: getDealScore(media),
    note: `ランク ${media.priority_rank}`,
  },
  {
    key: 'safety',
    label: '表現安全',
    value: getSafetyScore(media),
    note: media.status === 'passed' ? '慎重確認' : '訴求しやすい',
  },
]
