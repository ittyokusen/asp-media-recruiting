import type { MediaStatus, PriorityRank } from '@/types'

export const STATUS_LABELS: Record<MediaStatus, string> = {
  unreviewed: '未確認',
  ready_to_send: '送信待ち',
  sent: '送信済み',
  replied: '返信あり',
  interested: '興味あり',
  partnered: '提携済み',
  passed: '見送り',
  retry_candidate: '再挑戦候補',
}

export const STATUS_COLORS: Record<MediaStatus, string> = {
  unreviewed: 'bg-gray-100 text-gray-700',
  ready_to_send: 'bg-blue-100 text-blue-700',
  sent: 'bg-yellow-100 text-yellow-700',
  replied: 'bg-purple-100 text-purple-700',
  interested: 'bg-orange-100 text-orange-700',
  partnered: 'bg-green-100 text-green-700',
  passed: 'bg-red-100 text-red-700',
  retry_candidate: 'bg-teal-100 text-teal-700',
}

export const RANK_COLORS: Record<PriorityRank, string> = {
  S: 'bg-red-500 text-white',
  A: 'bg-orange-400 text-white',
  B: 'bg-yellow-400 text-white',
  C: 'bg-gray-300 text-gray-700',
}
