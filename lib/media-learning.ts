import type {
  ManagedMedia,
  MediaCandidate,
  MediaLearningProfile,
  OutreachLog,
} from '@/types'

const DEFAULT_PROFILE: MediaLearningProfile = {
  positive_domains: [],
  positive_genres: [],
  positive_operator_types: [],
  negative_domains: [],
  contact_routes: [],
  summary_hints: [],
}

const POSITIVE_STATUS_WEIGHT: Partial<Record<MediaCandidate['status'], number>> = {
  replied: 2,
  interested: 4,
  partnered: 6,
}

const NEGATIVE_STATUS_WEIGHT: Partial<Record<MediaCandidate['status'], number>> = {
  passed: 5,
}

const REPLY_STATUS_WEIGHT: Partial<Record<OutreachLog['reply_status'], number>> = {
  replied: 2,
  interested: 4,
  declined: -4,
}

function bumpScore(map: Map<string, number>, key: string, delta: number) {
  if (!key) return
  map.set(key, (map.get(key) ?? 0) + delta)
}

function topKeys(map: Map<string, number>, limit: number, minScore = 1) {
  return [...map.entries()]
    .filter(([, value]) => value >= minScore)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => key)
}

function inferContactRoutes(media: MediaCandidate) {
  const routes: string[] = []
  if (media.contact_email) routes.push('メール')
  if (media.contact_page_url) routes.push('問い合わせフォーム')
  if (media.contact_slack_id) routes.push('Slack')
  if (media.contact_chatwork_id) routes.push('Chatwork')
  return routes
}

export function buildLearningProfile(
  mediaCandidates: MediaCandidate[],
  outreachLogs: OutreachLog[],
  managedMedia: ManagedMedia[]
): MediaLearningProfile {
  if (mediaCandidates.length === 0) return DEFAULT_PROFILE

  const positiveDomains = new Map<string, number>()
  const positiveGenres = new Map<string, number>()
  const positiveOperatorTypes = new Map<string, number>()
  const negativeDomains = new Map<string, number>()
  const contactRoutes = new Map<string, number>()
  const mediaById = new Map(mediaCandidates.map((media) => [media.id, media]))

  mediaCandidates.forEach((media) => {
    const positiveWeight = POSITIVE_STATUS_WEIGHT[media.status] ?? 0
    const negativeWeight = NEGATIVE_STATUS_WEIGHT[media.status] ?? 0

    if (positiveWeight > 0) {
      bumpScore(positiveDomains, media.domain, positiveWeight)
      bumpScore(positiveGenres, media.genre, positiveWeight)
      bumpScore(positiveOperatorTypes, media.operator_type, positiveWeight)
      inferContactRoutes(media).forEach((route) => bumpScore(contactRoutes, route, positiveWeight))
    }

    if (negativeWeight > 0) {
      bumpScore(negativeDomains, media.domain, negativeWeight)
    }
  })

  outreachLogs.forEach((log) => {
    const media = mediaById.get(log.media_candidate_id)
    if (!media) return

    const weight = REPLY_STATUS_WEIGHT[log.reply_status] ?? 0
    if (weight > 0) {
      bumpScore(positiveDomains, media.domain, weight)
      bumpScore(positiveGenres, media.genre, weight)
      bumpScore(positiveOperatorTypes, media.operator_type, weight)
      inferContactRoutes(media).forEach((route) => bumpScore(contactRoutes, route, weight))
    } else if (weight < 0) {
      bumpScore(negativeDomains, media.domain, Math.abs(weight))
    }
  })

  managedMedia
    .filter((media) => media.contract_status === 'active' || media.contract_status === 'completed')
    .forEach((media) => {
      bumpScore(positiveDomains, media.domain, 7)
      if (media.placement_type) {
        bumpScore(positiveGenres, media.placement_type, 2)
      }
    })

  const profile: MediaLearningProfile = {
    positive_domains: topKeys(positiveDomains, 8),
    positive_genres: topKeys(positiveGenres, 8),
    positive_operator_types: topKeys(positiveOperatorTypes, 6),
    negative_domains: topKeys(negativeDomains, 8),
    contact_routes: topKeys(contactRoutes, 4),
    summary_hints: [],
  }

  profile.summary_hints = [
    profile.positive_domains.length > 0
      ? `過去に反応が良かった媒体ドメイン: ${profile.positive_domains.join('、')}`
      : '',
    profile.positive_genres.length > 0
      ? `相性が良かったジャンル/記事面: ${profile.positive_genres.join('、')}`
      : '',
    profile.positive_operator_types.length > 0
      ? `動きやすかった運営タイプ: ${profile.positive_operator_types.join('、')}`
      : '',
    profile.contact_routes.length > 0
      ? `返信につながりやすかった連絡導線: ${profile.contact_routes.join('、')}`
      : '',
    profile.negative_domains.length > 0
      ? `直近で見送り寄りだったドメインは避ける: ${profile.negative_domains.join('、')}`
      : '',
  ].filter(Boolean)

  return profile
}

export function applyLearningToCandidateScore(
  candidate: MediaCandidate,
  profile: MediaLearningProfile
): MediaCandidate {
  let learningDelta = 0
  const reasons: string[] = []

  if (profile.positive_domains.includes(candidate.domain)) {
    learningDelta += 8
    reasons.push('過去反応の良いドメイン傾向と一致')
  }
  if (profile.positive_genres.some((genre) => candidate.genre.includes(genre) || genre.includes(candidate.genre))) {
    learningDelta += 5
    reasons.push('反応の良いジャンル傾向と近い')
  }
  if (profile.positive_operator_types.includes(candidate.operator_type)) {
    learningDelta += 4
    reasons.push('成果につながりやすい運営タイプ')
  }
  if (profile.negative_domains.includes(candidate.domain)) {
    learningDelta -= 14
    reasons.push('直近の見送り傾向ドメインと重複')
  }
  if (profile.contact_routes.includes('メール') && candidate.contact_email) {
    learningDelta += 3
  }
  if (profile.contact_routes.includes('問い合わせフォーム') && candidate.contact_page_url) {
    learningDelta += 2
  }

  const fitScore = Math.max(0, Math.min(100, candidate.fit_score + learningDelta))
  const priorityRank =
    fitScore >= 90 ? 'S' : fitScore >= 80 ? 'A' : fitScore >= 65 ? 'B' : 'C'

  return {
    ...candidate,
    fit_score: fitScore,
    priority_rank: priorityRank,
    fit_reason:
      reasons.length > 0
        ? `${candidate.fit_reason} 学習補正: ${reasons.join('、')}。`
        : candidate.fit_reason,
  }
}
