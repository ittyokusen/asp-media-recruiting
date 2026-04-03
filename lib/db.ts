import { createSupabaseClient } from '@/lib/supabase'
import { hasSupabaseEnv } from '@/lib/supabase'
import {
  createDemoCampaign,
  createDemoDraft,
  createDemoLog,
  createDemoManagedMedia,
  createDemoMedia,
  getAllDemoLogs,
  getDemoCampaignById,
  getDemoCampaigns,
  getDemoDrafts,
  getDemoLogs,
  getDemoManagedMedia,
  getDemoMedia,
  getDemoMediaById,
  updateDemoLog,
  updateDemoManagedMedia,
  updateDemoMediaContact,
  updateDemoMediaStatus,
} from '@/lib/demo-store'
import { buildLearningProfile } from '@/lib/media-learning'
import type {
  ApprovalStatus,
  Campaign,
  DeliveryStatus,
  ManagedMedia,
  ManagedMediaStatus,
  MediaCandidate,
  MediaLearningProfile,
  MediaStatus,
  OutreachDraft,
  OutreachLog,
  ReplyStatus,
} from '@/types'

type NullableMediaRow = {
  id: string
  campaign_id: string
  media_name: string | null
  domain: string
  url: string
  genre: string | null
  estimated_audience: string | null
  operator_name: string | null
  operator_type: string | null
  contact_page_url: string | null
  contact_email: string | null
  contact_slack_id: string | null
  contact_chatwork_id: string | null
  assigned_owner: string | null
  social_links: string[] | null
  summary: string | null
  fit_score: number | null
  priority_rank: MediaCandidate['priority_rank'] | null
  fit_reason: string | null
  status: MediaStatus | null
  raw_html?: string | null
  created_at: string
  updated_at: string
}

type NullableDraftRow = {
  id: string
  media_candidate_id: string
  subject: string
  body: string
  tone: string | null
  personalization_points: string[] | null
  approval_status: ApprovalStatus | null
  created_at: string
  updated_at: string
}

type NullableLogRow = {
  id: string
  media_candidate_id: string
  draft_id: string | null
  sent_by: string
  sent_at: string
  delivery_status: OutreachLog['delivery_status'] | null
  reply_status: OutreachLog['reply_status'] | null
  reply_body: string | null
  reply_received_at: string | null
  next_action: string | null
  memo: string | null
}

type NullableManagedMediaRow = {
  id: string
  source_media_candidate_id: string | null
  campaign_id: string | null
  media_name: string | null
  domain: string | null
  url: string | null
  product_name: string | null
  placement_type: string | null
  contract_status: ManagedMediaStatus | null
  start_date: string | null
  end_date: string | null
  unit_price: string | null
  reward_rule: string | null
  owner_name: string | null
  monthly_volume: string | null
  memo: string | null
  created_at: string
  updated_at: string
}

export type CreateCampaignInput = Pick<
  Campaign,
  | 'campaign_name'
  | 'category'
  | 'lp_url'
  | 'appeal_points'
  | 'ng_expressions'
  | 'preferred_media_traits'
  | 'existing_good_media_examples'
>

export type CreateMediaInput = Omit<MediaCandidate, 'id' | 'created_at' | 'updated_at'> & {
  raw_html?: string
}

export type UpdateMediaContactInput = Partial<
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

export type CreateDraftInput = Pick<
  OutreachDraft,
  'subject' | 'body' | 'tone' | 'personalization_points'
> & {
  media_candidate_id: string
  approval_status?: ApprovalStatus
}

export type CreateOutreachLogInput = {
  media_candidate_id: string
  draft_id?: string
  sent_by: string
  sent_at?: string
  delivery_status?: DeliveryStatus
  reply_status?: ReplyStatus
  reply_body?: string
  reply_received_at?: string
  next_action?: string
  memo?: string
}

export type UpdateOutreachLogInput = {
  delivery_status?: DeliveryStatus
  reply_status?: ReplyStatus
  reply_body?: string
  reply_received_at?: string | null
  next_action?: string
  memo?: string
}

export type CreateManagedMediaInput = Omit<ManagedMedia, 'id' | 'created_at' | 'updated_at'>

export type UpdateManagedMediaInput = Partial<
  Pick<
    ManagedMedia,
    | 'product_name'
    | 'placement_type'
    | 'contract_status'
    | 'start_date'
    | 'end_date'
    | 'unit_price'
    | 'reward_rule'
    | 'owner_name'
    | 'monthly_volume'
    | 'memo'
  >
>

function normalizeCampaign(campaign: Campaign): Campaign {
  return {
    ...campaign,
    lp_url: campaign.lp_url ?? '',
    appeal_points: campaign.appeal_points ?? [],
    ng_expressions: campaign.ng_expressions ?? [],
    preferred_media_traits: campaign.preferred_media_traits ?? [],
    existing_good_media_examples: campaign.existing_good_media_examples ?? [],
  }
}

function normalizeMedia(media: NullableMediaRow): MediaCandidate {
  return {
    id: media.id,
    campaign_id: media.campaign_id,
    media_name: media.media_name ?? '名称未設定',
    domain: media.domain,
    url: media.url,
    genre: media.genre ?? '不明',
    estimated_audience: media.estimated_audience ?? '不明',
    operator_name: media.operator_name ?? '不明',
    operator_type: media.operator_type ?? '不明',
    contact_page_url: media.contact_page_url ?? '',
    contact_email: media.contact_email ?? '',
    contact_slack_id: media.contact_slack_id ?? '',
    contact_chatwork_id: media.contact_chatwork_id ?? '',
    assigned_owner: media.assigned_owner ?? '',
    social_links: media.social_links ?? [],
    summary: media.summary ?? '',
    fit_score: media.fit_score ?? 0,
    priority_rank: media.priority_rank ?? 'C',
    fit_reason: media.fit_reason ?? '',
    status: media.status ?? 'unreviewed',
    created_at: media.created_at,
    updated_at: media.updated_at,
  }
}

function normalizeDraft(draft: NullableDraftRow): OutreachDraft {
  return {
    id: draft.id,
    media_candidate_id: draft.media_candidate_id,
    subject: draft.subject,
    body: draft.body,
    tone: draft.tone ?? 'ていねい',
    personalization_points: draft.personalization_points ?? [],
    approval_status: draft.approval_status ?? 'pending',
    created_at: draft.created_at,
    updated_at: draft.updated_at,
  }
}

function normalizeLog(log: NullableLogRow): OutreachLog {
  return {
    id: log.id,
    media_candidate_id: log.media_candidate_id,
    draft_id: log.draft_id ?? '',
    sent_by: log.sent_by,
    sent_at: log.sent_at,
    delivery_status: log.delivery_status ?? 'pending',
    reply_status: log.reply_status ?? 'none',
    reply_body: log.reply_body ?? '',
    reply_received_at: log.reply_received_at ?? '',
    next_action: log.next_action ?? '',
    memo: log.memo ?? '',
  }
}

function normalizeManagedMedia(media: NullableManagedMediaRow): ManagedMedia {
  return {
    id: media.id,
    source_media_candidate_id: media.source_media_candidate_id ?? '',
    campaign_id: media.campaign_id ?? '',
    media_name: media.media_name ?? '名称未設定',
    domain: media.domain ?? '',
    url: media.url ?? '',
    product_name: media.product_name ?? '',
    placement_type: media.placement_type ?? '',
    contract_status: media.contract_status ?? 'negotiating',
    start_date: media.start_date ?? '',
    end_date: media.end_date ?? '',
    unit_price: media.unit_price ?? '',
    reward_rule: media.reward_rule ?? '',
    owner_name: media.owner_name ?? '',
    monthly_volume: media.monthly_volume ?? '',
    memo: media.memo ?? '',
    created_at: media.created_at,
    updated_at: media.updated_at,
  }
}

export async function getCampaigns() {
  if (!hasSupabaseEnv()) {
    return getDemoCampaigns()
  }

  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((campaign) => normalizeCampaign(campaign as Campaign))
}

export async function createCampaign(input: CreateCampaignInput) {
  if (!hasSupabaseEnv()) {
    return createDemoCampaign(input)
  }

  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from('campaigns')
    .insert(input)
    .select('*')
    .single()

  if (error) throw error

  return normalizeCampaign(data as Campaign)
}

export async function getCampaignById(id: string) {
  if (!hasSupabaseEnv()) {
    return getDemoCampaignById(id)
  }

  const supabase = createSupabaseClient()
  const { data, error } = await supabase.from('campaigns').select('*').eq('id', id).maybeSingle()

  if (error) throw error

  return data ? normalizeCampaign(data as Campaign) : null
}

export async function getMediaCandidates(campaignId?: string) {
  if (!hasSupabaseEnv()) {
    return getDemoMedia(campaignId)
  }

  const supabase = createSupabaseClient()
  let query = supabase.from('media_candidates').select('*').order('updated_at', { ascending: false })

  if (campaignId) {
    query = query.eq('campaign_id', campaignId)
  }

  const { data, error } = await query
  if (error) throw error

  return (data ?? []).map((media) => normalizeMedia(media as NullableMediaRow))
}

export async function getMediaCandidateById(id: string) {
  if (!hasSupabaseEnv()) {
    return getDemoMediaById(id)
  }

  const supabase = createSupabaseClient()
  const { data, error } = await supabase.from('media_candidates').select('*').eq('id', id).maybeSingle()

  if (error) throw error

  return data ? normalizeMedia(data as NullableMediaRow) : null
}

export async function createMediaCandidates(input: CreateMediaInput | CreateMediaInput[]) {
  if (!hasSupabaseEnv()) {
    return createDemoMedia(Array.isArray(input) ? input : [input])
  }

  const supabase = createSupabaseClient()
  const rows = (Array.isArray(input) ? input : [input]).map((media) => ({
    campaign_id: media.campaign_id,
    media_name: media.media_name,
    domain: media.domain,
    url: media.url,
    genre: media.genre,
    estimated_audience: media.estimated_audience,
    operator_name: media.operator_name,
    operator_type: media.operator_type,
    contact_page_url: media.contact_page_url,
    contact_email: media.contact_email,
    contact_slack_id: media.contact_slack_id,
    contact_chatwork_id: media.contact_chatwork_id,
    assigned_owner: media.assigned_owner,
    social_links: media.social_links,
    summary: media.summary,
    fit_score: media.fit_score,
    priority_rank: media.priority_rank,
    fit_reason: media.fit_reason,
    status: media.status,
    raw_html: media.raw_html,
  }))
  const { data, error } = await supabase
    .from('media_candidates')
    .upsert(rows, { onConflict: 'campaign_id,domain' })
    .select('*')

  if (error) throw error

  return (data ?? []).map((media) => normalizeMedia(media as NullableMediaRow))
}

export async function updateMediaStatus(id: string, status: MediaStatus) {
  if (!hasSupabaseEnv()) {
    const media = updateDemoMediaStatus(id, status)
    if (!media) {
      throw new Error('Media not found')
    }
    return media
  }

  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from('media_candidates')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error

  return normalizeMedia(data as NullableMediaRow)
}

export async function updateMediaContact(id: string, input: UpdateMediaContactInput) {
  if (!hasSupabaseEnv()) {
    const media = updateDemoMediaContact(id, input)
    if (!media) {
      throw new Error('Media not found')
    }
    return media
  }

  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from('media_candidates')
    .update(input)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error

  return normalizeMedia(data as NullableMediaRow)
}

export async function getOutreachDrafts(mediaId: string) {
  if (!hasSupabaseEnv()) {
    return getDemoDrafts(mediaId)
  }

  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from('outreach_drafts')
    .select('*')
    .eq('media_candidate_id', mediaId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((draft) => normalizeDraft(draft as NullableDraftRow))
}

export async function createOutreachDraft(input: CreateDraftInput) {
  if (!hasSupabaseEnv()) {
    return createDemoDraft({
      media_candidate_id: input.media_candidate_id,
      subject: input.subject,
      body: input.body,
      tone: input.tone,
      personalization_points: input.personalization_points,
      approval_status: input.approval_status ?? 'pending',
    })
  }

  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from('outreach_drafts')
    .insert({
      ...input,
      approval_status: input.approval_status ?? 'pending',
    })
    .select('*')
    .single()

  if (error) throw error

  return normalizeDraft(data as NullableDraftRow)
}

export async function getOutreachLogs(mediaId: string) {
  if (!hasSupabaseEnv()) {
    return getDemoLogs(mediaId)
  }

  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from('outreach_logs')
    .select('*')
    .eq('media_candidate_id', mediaId)
    .order('sent_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((log) => normalizeLog(log as NullableLogRow))
}

export async function getAllOutreachLogs() {
  if (!hasSupabaseEnv()) {
    return getAllDemoLogs()
  }

  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from('outreach_logs')
    .select('*')
    .order('sent_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((log) => normalizeLog(log as NullableLogRow))
}

export async function createOutreachLog(input: CreateOutreachLogInput) {
  if (!hasSupabaseEnv()) {
    return createDemoLog({
      media_candidate_id: input.media_candidate_id,
      draft_id: input.draft_id,
      sent_by: input.sent_by,
      sent_at: input.sent_at,
      delivery_status: input.delivery_status ?? 'delivered',
      reply_status: input.reply_status ?? 'none',
      reply_body: input.reply_body ?? '',
      reply_received_at: input.reply_received_at ?? '',
      next_action: input.next_action ?? '',
      memo: input.memo ?? '',
    })
  }

  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from('outreach_logs')
    .insert({
      media_candidate_id: input.media_candidate_id,
      draft_id: input.draft_id || null,
      sent_by: input.sent_by,
      sent_at: input.sent_at,
      delivery_status: input.delivery_status ?? 'delivered',
      reply_status: input.reply_status ?? 'none',
      reply_body: input.reply_body ?? '',
      reply_received_at: input.reply_received_at || null,
      next_action: input.next_action ?? null,
      memo: input.memo ?? null,
    })
    .select('*')
    .single()

  if (error) throw error

  return normalizeLog(data as NullableLogRow)
}

export async function updateOutreachLog(id: string, input: UpdateOutreachLogInput) {
  if (!hasSupabaseEnv()) {
    const log = updateDemoLog(id, input)
    if (!log) {
      throw new Error('Outreach log not found')
    }
    return log
  }

  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from('outreach_logs')
    .update({
      delivery_status: input.delivery_status,
      reply_status: input.reply_status,
      reply_body: input.reply_body,
      reply_received_at: input.reply_received_at,
      next_action: input.next_action,
      memo: input.memo,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error

  return normalizeLog(data as NullableLogRow)
}

export async function getManagedMedia(campaignId?: string) {
  if (!hasSupabaseEnv()) {
    return getDemoManagedMedia(campaignId)
  }

  const supabase = createSupabaseClient()
  let query = supabase.from('managed_media').select('*').order('updated_at', { ascending: false })

  if (campaignId) {
    query = query.eq('campaign_id', campaignId)
  }

  const { data, error } = await query
  if (error) throw error

  return (data ?? []).map((media) => normalizeManagedMedia(media as NullableManagedMediaRow))
}

export async function createManagedMedia(input: CreateManagedMediaInput) {
  if (!hasSupabaseEnv()) {
    return createDemoManagedMedia(input)
  }

  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from('managed_media')
    .insert({
      source_media_candidate_id: input.source_media_candidate_id || null,
      campaign_id: input.campaign_id || null,
      media_name: input.media_name,
      domain: input.domain,
      url: input.url,
      product_name: input.product_name,
      placement_type: input.placement_type,
      contract_status: input.contract_status,
      start_date: input.start_date || null,
      end_date: input.end_date || null,
      unit_price: input.unit_price,
      reward_rule: input.reward_rule,
      owner_name: input.owner_name,
      monthly_volume: input.monthly_volume,
      memo: input.memo,
    })
    .select('*')
    .single()

  if (error) throw error

  return normalizeManagedMedia(data as NullableManagedMediaRow)
}

export async function updateManagedMedia(id: string, input: UpdateManagedMediaInput) {
  if (!hasSupabaseEnv()) {
    const media = updateDemoManagedMedia(id, input)
    if (!media) {
      throw new Error('Managed media not found')
    }
    return media
  }

  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from('managed_media')
    .update({
      ...input,
      start_date: input.start_date === undefined ? undefined : input.start_date || null,
      end_date: input.end_date === undefined ? undefined : input.end_date || null,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error

  return normalizeManagedMedia(data as NullableManagedMediaRow)
}

function isRelatedLearningCampaign(targetCampaign: Campaign, sourceCampaign: Campaign) {
  if (sourceCampaign.id === targetCampaign.id) return true
  if (sourceCampaign.category === targetCampaign.category) return true

  const targetTraits = new Set([
    targetCampaign.category,
    ...targetCampaign.preferred_media_traits,
    ...targetCampaign.appeal_points,
  ])

  return [...sourceCampaign.preferred_media_traits, ...sourceCampaign.appeal_points].some((trait) =>
    targetTraits.has(trait)
  )
}

export async function getMediaLearningProfile(campaign: Campaign): Promise<MediaLearningProfile> {
  const [campaigns, allMediaCandidates, allOutreachLogs, allManagedMedia] = await Promise.all([
    getCampaigns(),
    getMediaCandidates(),
    getAllOutreachLogs(),
    getManagedMedia(),
  ])

  const relatedCampaignIds = new Set(
    campaigns
      .filter((sourceCampaign) => isRelatedLearningCampaign(campaign, sourceCampaign))
      .map((sourceCampaign) => sourceCampaign.id)
  )

  const mediaCandidates = allMediaCandidates.filter((media) =>
    relatedCampaignIds.has(media.campaign_id)
  )
  const mediaIds = new Set(mediaCandidates.map((media) => media.id))
  const outreachLogs = allOutreachLogs.filter((log) => mediaIds.has(log.media_candidate_id))
  const managedMedia = allManagedMedia.filter((media) =>
    relatedCampaignIds.has(media.campaign_id)
  )

  return buildLearningProfile(mediaCandidates, outreachLogs, managedMedia)
}
