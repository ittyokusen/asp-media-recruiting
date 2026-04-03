'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  BadgeJapaneseYen,
  Building2,
  CalendarDays,
  CheckCircle2,
  Globe,
  Loader2,
  Plus,
  Store,
  UserRound,
} from 'lucide-react'

import { useAuth } from '@/components/AuthProvider'
import PermissionBanner from '@/components/PermissionBanner'
import { useToast } from '@/components/ToastProvider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type {
  Campaign,
  ManagedMedia,
  ManagedMediaStatus,
  MediaCandidate,
} from '@/types'

const STATUS_LABELS = {
  negotiating: '条件調整中',
  active: '稼働中',
  paused: '一時停止',
  completed: '終了',
} satisfies Record<ManagedMediaStatus, string>

const STATUS_COLORS = {
  negotiating: 'bg-amber-100 text-amber-700',
  active: 'bg-emerald-100 text-emerald-700',
  paused: 'bg-slate-100 text-slate-600',
  completed: 'bg-sky-100 text-sky-700',
} satisfies Record<ManagedMediaStatus, string>

type ManagedMediaForm = {
  source_media_candidate_id: string
  campaign_id: string
  media_name: string
  domain: string
  url: string
  product_name: string
  placement_type: string
  contract_status: ManagedMediaStatus
  start_date: string
  end_date: string
  unit_price: string
  reward_rule: string
  owner_name: string
  monthly_volume: string
  memo: string
}

const emptyForm: ManagedMediaForm = {
  source_media_candidate_id: '',
  campaign_id: '',
  media_name: '',
  domain: '',
  url: '',
  product_name: '',
  placement_type: '',
  contract_status: 'negotiating',
  start_date: '',
  end_date: '',
  unit_price: '',
  reward_rule: '',
  owner_name: '',
  monthly_volume: '',
  memo: '',
}

export default function ManagedMediaClient({
  initialCampaigns,
  initialManagedMedia,
  initialMediaCandidates,
}: {
  initialCampaigns: Campaign[]
  initialManagedMedia: ManagedMedia[]
  initialMediaCandidates: MediaCandidate[]
}) {
  const { user, canWrite } = useAuth()
  const { showToast } = useToast()
  const [campaigns] = useState(initialCampaigns)
  const [managedMedia, setManagedMedia] = useState(initialManagedMedia)
  const [mediaCandidates] = useState(initialMediaCandidates)
  const [statusFilter, setStatusFilter] = useState<'all' | ManagedMediaStatus>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<ManagedMediaForm>({
    ...emptyForm,
    campaign_id: campaigns[0]?.id ?? '',
    owner_name: user?.email ?? '',
  })

  const campaignById = useMemo(
    () => new Map(campaigns.map((campaign) => [campaign.id, campaign])),
    [campaigns]
  )

  const filteredManagedMedia = useMemo(() => {
    return managedMedia.filter((media) => statusFilter === 'all' || media.contract_status === statusFilter)
  }, [managedMedia, statusFilter])

  const activeCount = managedMedia.filter((media) => media.contract_status === 'active').length
  const negotiatingCount = managedMedia.filter(
    (media) => media.contract_status === 'negotiating'
  ).length
  const campaignCount = new Set(managedMedia.map((media) => media.campaign_id)).size

  const applyCandidate = (candidateId: string) => {
    const candidate = mediaCandidates.find((media) => media.id === candidateId)
    if (!candidate) return

    const campaign = campaignById.get(candidate.campaign_id)
    setForm((current) => ({
      ...current,
      source_media_candidate_id: candidate.id,
      campaign_id: candidate.campaign_id,
      media_name: candidate.media_name,
      domain: candidate.domain,
      url: candidate.url,
      product_name: campaign?.campaign_name ?? current.product_name,
      placement_type: candidate.genre,
      owner_name: candidate.assigned_owner || user?.email || current.owner_name,
      monthly_volume: candidate.estimated_audience,
      memo: candidate.fit_reason,
    }))
  }

  const handleCreate = async () => {
    if (!form.campaign_id || !form.media_name.trim() || !form.product_name.trim()) {
      setError('案件・メディア名・実施商材は必須です')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/managed-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error ?? 'メディア管理の保存に失敗しました')
      }

      const created = (await response.json()) as ManagedMedia
      setManagedMedia((current) => [created, ...current])
      setForm({
        ...emptyForm,
        campaign_id: campaigns[0]?.id ?? '',
        owner_name: user?.email ?? '',
      })
      setDialogOpen(false)
      showToast({
        tone: 'success',
        title: 'メディア管理に追加しました',
        description: `${created.media_name} の実施情報を登録しました。`,
      })
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'メディア管理の保存に失敗しました'
      setError(message)
      showToast({
        tone: 'error',
        title: 'メディア管理の保存に失敗しました',
        description: message,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="surface-panel overflow-hidden">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.35fr_0.9fr] lg:p-8">
          <div>
            <Badge className="mb-4 bg-slate-900 text-white">Partner Media Ops</Badge>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
              メディア管理
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              成約後の媒体を、実施商材・掲載メニュー・稼働期間・単価・担当者まで含めて
              候補メディアとは別枠で管理します。
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger
                  render={<Button size="lg" className="rounded-2xl px-4" disabled={!canWrite} />}
                >
                  <Plus className="size-4" />
                  実施メディアを追加
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-[28px] p-0 sm:max-w-4xl">
                  <div className="p-6">
                    <DialogHeader>
                      <DialogTitle>実施メディアを追加</DialogTitle>
                      <DialogDescription>
                        候補メディアから引き継ぐか、確定媒体を直接登録します。
                      </DialogDescription>
                    </DialogHeader>

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      <FormSelect
                        label="候補メディアから引き継ぐ"
                        value={form.source_media_candidate_id || 'none'}
                        onValueChange={(value) => {
                          if (!value || value === 'none') {
                            setForm((current) => ({ ...current, source_media_candidate_id: '' }))
                            return
                          }
                          applyCandidate(value)
                        }}
                        options={[
                          { value: 'none', label: '手入力で登録' },
                          ...mediaCandidates.map((media) => ({
                            value: media.id,
                            label: `${media.media_name} / ${media.domain}`,
                          })),
                        ]}
                      />
                      <FormSelect
                        label="紐づく案件"
                        value={form.campaign_id}
                        onValueChange={(value) =>
                          setForm((current) => ({ ...current, campaign_id: value ?? '' }))
                        }
                        options={campaigns.map((campaign) => ({
                          value: campaign.id,
                          label: campaign.campaign_name,
                        }))}
                      />
                      <FormInput
                        label="メディア名"
                        value={form.media_name}
                        onChange={(value) => setForm((current) => ({ ...current, media_name: value }))}
                      />
                      <FormInput
                        label="ドメイン"
                        value={form.domain}
                        onChange={(value) => setForm((current) => ({ ...current, domain: value }))}
                      />
                      <FormInput
                        label="URL"
                        value={form.url}
                        onChange={(value) => setForm((current) => ({ ...current, url: value }))}
                      />
                      <FormInput
                        label="実施商材"
                        value={form.product_name}
                        onChange={(value) => setForm((current) => ({ ...current, product_name: value }))}
                      />
                      <FormInput
                        label="媒体/掲載メニュー"
                        value={form.placement_type}
                        onChange={(value) => setForm((current) => ({ ...current, placement_type: value }))}
                        placeholder="例: 比較記事 / バナー / メルマガ"
                      />
                      <FormSelect
                        label="稼働ステータス"
                        value={form.contract_status}
                        onValueChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            contract_status: (value as ManagedMediaStatus | null) ?? 'negotiating',
                          }))
                        }
                        options={Object.entries(STATUS_LABELS).map(([value, label]) => ({
                          value,
                          label,
                        }))}
                      />
                      <FormInput
                        label="開始日"
                        type="date"
                        value={form.start_date}
                        onChange={(value) => setForm((current) => ({ ...current, start_date: value }))}
                      />
                      <FormInput
                        label="終了日"
                        type="date"
                        value={form.end_date}
                        onChange={(value) => setForm((current) => ({ ...current, end_date: value }))}
                      />
                      <FormInput
                        label="単価"
                        value={form.unit_price}
                        onChange={(value) => setForm((current) => ({ ...current, unit_price: value }))}
                        placeholder="例: CPA 4,800円"
                      />
                      <FormInput
                        label="報酬条件"
                        value={form.reward_rule}
                        onChange={(value) => setForm((current) => ({ ...current, reward_rule: value }))}
                        placeholder="例: 月末締め翌月末支払い"
                      />
                      <FormInput
                        label="担当者"
                        value={form.owner_name}
                        onChange={(value) => setForm((current) => ({ ...current, owner_name: value }))}
                      />
                      <FormInput
                        label="想定ボリューム"
                        value={form.monthly_volume}
                        onChange={(value) => setForm((current) => ({ ...current, monthly_volume: value }))}
                        placeholder="例: 月間100CV"
                      />
                      <div className="md:col-span-2">
                        <Label>運用メモ</Label>
                        <Textarea
                          value={form.memo}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, memo: event.target.value }))
                          }
                          className="mt-2 min-h-28 rounded-2xl border-slate-200 bg-white"
                          placeholder="掲載面、注意点、次回交渉ポイントなど"
                        />
                      </div>
                    </div>

                    {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
                  </div>
                  <DialogFooter className="rounded-b-[28px] bg-slate-50/90">
                    <Button
                      variant="outline"
                      className="rounded-2xl"
                      onClick={() => setDialogOpen(false)}
                      disabled={submitting}
                    >
                      キャンセル
                    </Button>
                    <Button
                      className="rounded-2xl"
                      onClick={() => void handleCreate()}
                      disabled={!canWrite || submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          保存中...
                        </>
                      ) : (
                        'メディア管理に保存'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <SummaryCard label="管理媒体数" value={`${managedMedia.length}件`} icon={Store} />
            <SummaryCard label="稼働中" value={`${activeCount}件`} icon={CheckCircle2} />
            <SummaryCard label="条件調整中" value={`${negotiatingCount}件`} icon={Building2} />
          </div>
        </div>
      </section>

      {!canWrite ? (
        <PermissionBanner description="viewer 権限では実施メディアの追加はできません。閲覧のみ可能です。" />
      ) : null}

      <section className="surface-panel p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-slate-500">
            {campaignCount}案件 / {filteredManagedMedia.length}媒体を表示中
          </p>
          <FormSelect
            label="ステータス"
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter((value as 'all' | ManagedMediaStatus | null) ?? 'all')
            }
            options={[
              { value: 'all', label: 'すべて' },
              ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
            ]}
            compact
          />
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {filteredManagedMedia.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm text-slate-400 xl:col-span-2">
              管理対象のメディアはまだありません
            </div>
          ) : (
            filteredManagedMedia.map((media) => (
              <Card key={media.id} className="rounded-[28px] border-white/70 bg-white/90">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-lg">{media.media_name}</CardTitle>
                      <a
                        href={media.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex max-w-full items-center gap-1 text-xs text-teal-700 hover:underline"
                      >
                        <Globe className="size-3 shrink-0" />
                        <span className="truncate">{media.domain}</span>
                      </a>
                    </div>
                    <Badge className={STATUS_COLORS[media.contract_status]}>
                      {STATUS_LABELS[media.contract_status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <InfoBox icon={Store} label="実施商材" value={media.product_name} />
                    <InfoBox icon={Building2} label="媒体/掲載メニュー" value={media.placement_type || '未設定'} />
                    <InfoBox
                      icon={CalendarDays}
                      label="稼働期間"
                      value={`${media.start_date || '未設定'} 〜 ${media.end_date || '未設定'}`}
                    />
                    <InfoBox icon={BadgeJapaneseYen} label="単価" value={media.unit_price || '未設定'} />
                    <InfoBox icon={UserRound} label="担当者" value={media.owner_name || '未設定'} />
                    <InfoBox icon={CheckCircle2} label="想定ボリューム" value={media.monthly_volume || '未設定'} />
                  </div>

                  <div className="rounded-[22px] bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      報酬条件
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{media.reward_rule || '未設定'}</p>
                    {media.memo ? (
                      <p className="mt-2 text-sm leading-6 text-slate-500">{media.memo}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {media.source_media_candidate_id ? (
                      <Link href={`/media/${media.source_media_candidate_id}`}>
                        <Button variant="outline" className="rounded-2xl">
                          元候補を確認
                        </Button>
                      </Link>
                    ) : null}
                    <Link href={`/campaigns`}>
                      <Button variant="ghost" className="rounded-2xl text-slate-600">
                        案件管理へ
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: typeof Store
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white/90 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        <div className="flex size-10 items-center justify-center rounded-2xl bg-slate-100">
          <Icon className="size-4 text-slate-700" />
        </div>
      </div>
      <p className="mt-4 text-3xl font-semibold text-slate-950">{value}</p>
    </div>
  )
}

function InfoBox({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Store
  label: string
  value: string
}) {
  return (
    <div className="rounded-[22px] bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        <Icon className="size-3.5" />
        {label}
      </div>
      <p className="mt-2 text-sm font-medium text-slate-700">{value}</p>
    </div>
  )
}

function FormInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-2xl border-slate-200 bg-white"
        placeholder={placeholder}
      />
    </div>
  )
}

function FormSelect({
  label,
  value,
  onValueChange,
  options,
  compact = false,
}: {
  label: string
  value: string
  onValueChange: (value: string | null) => void
  options: { value: string; label: string }[]
  compact?: boolean
}) {
  return (
    <div className={compact ? 'w-full space-y-2 md:w-52' : 'space-y-2'}>
      <Label>{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white px-4">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
