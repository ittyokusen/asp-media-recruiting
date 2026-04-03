import {
  mockCampaigns,
  mockMediaCandidates,
  mockOutreachDrafts,
  mockOutreachLogs,
} from '@/lib/mock-data'
import type {
  Campaign,
  DeliveryStatus,
  MediaCandidate,
  MediaStatus,
  OutreachDraft,
  OutreachLog,
  ReplyStatus,
} from '@/types'

let campaignsStore: Campaign[] = structuredClone(mockCampaigns)
let mediaStore: MediaCandidate[] = structuredClone(mockMediaCandidates)
let draftsStore: OutreachDraft[] = structuredClone(mockOutreachDrafts)
let logsStore: OutreachLog[] = structuredClone(mockOutreachLogs)

function nowIso() {
  return new Date().toISOString()
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function getDemoCampaigns() {
  return [...campaignsStore].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

export function getDemoCampaignById(id: string) {
  return campaignsStore.find((campaign) => campaign.id === id) ?? null
}

export function createDemoCampaign(
  input: Omit<Campaign, 'id' | 'created_at' | 'updated_at'>
) {
  const campaign: Campaign = {
    id: makeId('camp'),
    created_at: nowIso(),
    updated_at: nowIso(),
    ...input,
  }
  campaignsStore = [campaign, ...campaignsStore]
  return campaign
}

export function getDemoMedia(campaignId?: string) {
  const list = campaignId
    ? mediaStore.filter((media) => media.campaign_id === campaignId)
    : mediaStore

  return [...list].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

export function getDemoMediaById(id: string) {
  return mediaStore.find((media) => media.id === id) ?? null
}

export function createDemoMedia(
  input: Omit<MediaCandidate, 'id' | 'created_at' | 'updated_at'>[]
) {
  const saved: MediaCandidate[] = []

  for (const item of input) {
    const existingIndex = mediaStore.findIndex(
      (media) => media.campaign_id === item.campaign_id && media.domain === item.domain
    )
    const nextItem: MediaCandidate = {
      id: existingIndex >= 0 ? mediaStore[existingIndex].id : makeId('media'),
      created_at: existingIndex >= 0 ? mediaStore[existingIndex].created_at : nowIso(),
      updated_at: nowIso(),
      ...item,
    }

    if (existingIndex >= 0) {
      mediaStore = mediaStore.map((media, index) => (index === existingIndex ? nextItem : media))
    } else {
      mediaStore = [nextItem, ...mediaStore]
    }

    saved.push(nextItem)
  }

  return saved
}

export function updateDemoMediaStatus(id: string, status: MediaStatus) {
  let updated: MediaCandidate | null = null
  mediaStore = mediaStore.map((media) => {
    if (media.id !== id) return media
    updated = { ...media, status, updated_at: nowIso() }
    return updated
  })
  return updated
}

export function updateDemoMediaContact(
  id: string,
  input: Partial<
    Pick<
      MediaCandidate,
      | 'operator_name'
      | 'contact_email'
      | 'contact_page_url'
      | 'contact_slack_id'
      | 'contact_chatwork_id'
      | 'assigned_owner'
    >
  >
) {
  let updated: MediaCandidate | null = null

  mediaStore = mediaStore.map((media) => {
    if (media.id !== id) return media

    updated = {
      ...media,
      operator_name: input.operator_name ?? media.operator_name,
      contact_email: input.contact_email ?? media.contact_email,
      contact_page_url: input.contact_page_url ?? media.contact_page_url,
      contact_slack_id: input.contact_slack_id ?? media.contact_slack_id,
      contact_chatwork_id: input.contact_chatwork_id ?? media.contact_chatwork_id,
      assigned_owner: input.assigned_owner ?? media.assigned_owner,
      updated_at: nowIso(),
    }

    return updated
  })

  return updated
}

export function getDemoDrafts(mediaId: string) {
  return draftsStore
    .filter((draft) => draft.media_candidate_id === mediaId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function createDemoDraft(
  input: Omit<OutreachDraft, 'id' | 'created_at' | 'updated_at'>
) {
  const draft: OutreachDraft = {
    id: makeId('draft'),
    created_at: nowIso(),
    updated_at: nowIso(),
    ...input,
  }
  draftsStore = [draft, ...draftsStore]
  return draft
}

export function getDemoLogs(mediaId: string) {
  return logsStore
    .filter((log) => log.media_candidate_id === mediaId)
    .sort((a, b) => b.sent_at.localeCompare(a.sent_at))
}

export function getAllDemoLogs() {
  return [...logsStore].sort((a, b) => b.sent_at.localeCompare(a.sent_at))
}

export function createDemoLog(input: {
  media_candidate_id: string
  draft_id?: string
  sent_by: string
  sent_at?: string
  delivery_status: DeliveryStatus
  reply_status: ReplyStatus
  reply_body: string
  reply_received_at: string
  next_action: string
  memo: string
}) {
  const log: OutreachLog = {
    id: makeId('log'),
    sent_at: input.sent_at ?? nowIso(),
    draft_id: input.draft_id ?? '',
    ...input,
  }
  logsStore = [log, ...logsStore]
  return log
}

export function updateDemoLog(
  id: string,
  input: {
    delivery_status?: DeliveryStatus
    reply_status?: ReplyStatus
    reply_body?: string
    reply_received_at?: string | null
    next_action?: string
    memo?: string
  }
) {
  let updated: OutreachLog | null = null

  logsStore = logsStore.map((log) => {
    if (log.id !== id) return log

    updated = {
      ...log,
      delivery_status: input.delivery_status ?? log.delivery_status,
      reply_status: input.reply_status ?? log.reply_status,
      reply_body: input.reply_body ?? log.reply_body,
      reply_received_at: input.reply_received_at ?? log.reply_received_at,
      next_action: input.next_action ?? log.next_action,
      memo: input.memo ?? log.memo,
    }

    return updated
  })

  return updated
}

export function resetDemoStore() {
  campaignsStore = structuredClone(mockCampaigns)
  mediaStore = structuredClone(mockMediaCandidates)
  draftsStore = structuredClone(mockOutreachDrafts)
  logsStore = structuredClone(mockOutreachLogs)
}
