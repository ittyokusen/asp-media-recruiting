// ===== 案件 =====
export interface Campaign {
  id: string
  campaign_name: string
  category: string
  appeal_points: string[]
  ng_expressions: string[]
  preferred_media_traits: string[]
  existing_good_media_examples: string[]
  created_at: string
  updated_at: string
}

// ===== メディア候補 =====
export type PriorityRank = 'S' | 'A' | 'B' | 'C'

export type MediaStatus =
  | 'unreviewed'
  | 'ready_to_send'
  | 'sent'
  | 'replied'
  | 'interested'
  | 'partnered'
  | 'passed'
  | 'retry_candidate'

export interface MediaCandidate {
  id: string
  campaign_id: string
  media_name: string
  domain: string
  url: string
  genre: string
  estimated_audience: string
  operator_name: string
  operator_type: string
  contact_page_url: string
  contact_email: string
  contact_slack_id: string
  contact_chatwork_id: string
  assigned_owner: string
  social_links: string[]
  summary: string
  fit_score: number // 0-100
  priority_rank: PriorityRank
  fit_reason: string
  status: MediaStatus
  created_at: string
  updated_at: string
}

// ===== メール下書き =====
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface OutreachDraft {
  id: string
  media_candidate_id: string
  subject: string
  body: string
  tone: string
  personalization_points: string[]
  approval_status: ApprovalStatus
  created_at: string
  updated_at: string
}

// ===== 送信ログ =====
export type DeliveryStatus = 'pending' | 'delivered' | 'bounced' | 'failed'
export type ReplyStatus = 'none' | 'replied' | 'interested' | 'declined'

export interface OutreachLog {
  id: string
  media_candidate_id: string
  draft_id: string
  sent_by: string
  sent_at: string
  delivery_status: DeliveryStatus
  reply_status: ReplyStatus
  reply_body: string
  reply_received_at: string
  next_action: string
  memo: string
}
