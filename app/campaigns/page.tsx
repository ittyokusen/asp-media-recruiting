'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CircleAlert, Loader2, Plus, Sparkles, Target, TrendingUp } from 'lucide-react'

import { useAuth } from '@/components/AuthProvider'
import CollectMediaModal from '@/components/media/CollectMediaModal'
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
import { Textarea } from '@/components/ui/textarea'
import type { Campaign, MediaCandidate } from '@/types'

type CampaignFormState = {
  campaign_name: string
  category: string
  appeal_points: string
  ng_expressions: string
  preferred_media_traits: string
  existing_good_media_examples: string
}

const initialForm: CampaignFormState = {
  campaign_name: '',
  category: '',
  appeal_points: '',
  ng_expressions: '',
  preferred_media_traits: '',
  existing_good_media_examples: '',
}

function toList(value: string) {
  return value
    .split('\n')
    .flatMap((line) => line.split(','))
    .map((item) => item.trim())
    .filter(Boolean)
}

export default function CampaignsPage() {
  const { canWrite } = useAuth()
  const { showToast } = useToast()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [mediaCandidates, setMediaCandidates] = useState<MediaCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(initialForm)

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [campaignsRes, mediaRes] = await Promise.all([
        fetch('/api/campaigns', { cache: 'no-store' }),
        fetch('/api/media', { cache: 'no-store' }),
      ])

      if (!campaignsRes.ok || !mediaRes.ok) {
        throw new Error('案件データの取得に失敗しました')
      }

      const [campaignsData, mediaData] = await Promise.all([
        campaignsRes.json() as Promise<Campaign[]>,
        mediaRes.json() as Promise<MediaCandidate[]>,
      ])

      setCampaigns(campaignsData)
      setMediaCandidates(mediaData)
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'データ取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const totalMedia = mediaCandidates.length
  const activeCampaigns = campaigns.length
  const avgAppealCount =
    campaigns.length === 0
      ? 0
      : Math.round(
          campaigns.reduce((sum, campaign) => sum + campaign.appeal_points.length, 0) /
            campaigns.length
        )

  const handleSave = async () => {
    if (!form.campaign_name.trim() || !form.category.trim()) return

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_name: form.campaign_name.trim(),
          category: form.category.trim(),
          appeal_points: toList(form.appeal_points),
          ng_expressions: toList(form.ng_expressions),
          preferred_media_traits: toList(form.preferred_media_traits),
          existing_good_media_examples: toList(form.existing_good_media_examples),
        }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error ?? '案件の保存に失敗しました')
      }

      const created = (await response.json()) as Campaign
      setCampaigns((current) => [created, ...current])
      setForm(initialForm)
      setOpen(false)
      showToast({
        tone: 'success',
        title: '案件を追加しました',
        description: `${created.campaign_name} を案件一覧に追加しました。`,
      })
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : '案件の保存に失敗しました'
      setError(message)
      showToast({
        tone: 'error',
        title: '案件の追加に失敗しました',
        description: message,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="surface-panel overflow-hidden">
        <div className="grid gap-8 p-6 lg:grid-cols-[1.4fr_0.9fr] lg:p-8">
          <div>
            <Badge className="mb-4 bg-teal-100 text-teal-800">Campaign Workspace</Badge>
            <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
              案件管理
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              訴求ポイント、NG 表現、相性のよいメディア像を案件ごとに整理しておくことで、
              候補選定と営業文面の精度を安定させます。
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger
                  render={<Button size="lg" className="rounded-2xl px-4" disabled={!canWrite} />}
                >
                  <Plus className="size-4" />
                  案件を追加
                </DialogTrigger>
                <DialogContent className="max-w-3xl rounded-[28px] p-0 sm:max-w-3xl">
                  <div className="p-6">
                    <DialogHeader>
                      <DialogTitle>案件を追加</DialogTitle>
                      <DialogDescription>
                        カテゴリ、訴求、NG 表現、相性のよいメディア像を整理して登録します。
                      </DialogDescription>
                    </DialogHeader>

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="campaign_name">案件名</Label>
                        <Input
                          id="campaign_name"
                          value={form.campaign_name}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, campaign_name: event.target.value }))
                          }
                          placeholder="例: アカポリWダウン"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">カテゴリ</Label>
                        <Input
                          id="category"
                          value={form.category}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, category: event.target.value }))
                          }
                          placeholder="例: 健康食品・血糖値・血圧"
                        />
                      </div>
                      <FormTextarea
                        id="appeal_points"
                        label="訴求ポイント"
                        hint="改行またはカンマ区切りで入力"
                        value={form.appeal_points}
                        onChange={(value) => setForm((current) => ({ ...current, appeal_points: value }))}
                      />
                      <FormTextarea
                        id="ng_expressions"
                        label="NG表現"
                        hint="薬機法上の注意表現を整理"
                        value={form.ng_expressions}
                        onChange={(value) => setForm((current) => ({ ...current, ng_expressions: value }))}
                      />
                      <FormTextarea
                        id="preferred_media_traits"
                        label="相性のよいメディア像"
                        hint="例: 比較記事あり / 中高年女性読者"
                        value={form.preferred_media_traits}
                        onChange={(value) =>
                          setForm((current) => ({ ...current, preferred_media_traits: value }))
                        }
                      />
                      <FormTextarea
                        id="existing_good_media_examples"
                        label="既存の好相性メディア"
                        hint="ドメインやメディア名を登録"
                        value={form.existing_good_media_examples}
                        onChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            existing_good_media_examples: value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <DialogFooter className="rounded-b-[28px] bg-slate-50/90">
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                      キャンセル
                    </Button>
                    <Button onClick={handleSave} disabled={submitting || !canWrite}>
                      {submitting ? '保存中...' : '案件を保存'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Link href="/media">
                <Button variant="outline" size="lg" className="rounded-2xl px-4">
                  メディア候補へ移動
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { label: '進行中案件', value: `${activeCampaigns}件`, icon: Target },
              { label: '紐づく候補メディア', value: `${totalMedia}件`, icon: TrendingUp },
              { label: '平均訴求数', value: `${avgAppealCount}件`, icon: Sparkles },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.label}
                  className="rounded-[24px] border border-slate-200 bg-white/85 p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">{item.label}</p>
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-slate-100">
                      <Icon className="size-4 text-slate-700" />
                    </div>
                  </div>
                  <p className="mt-4 text-3xl font-semibold text-slate-950">{item.value}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {!canWrite ? <PermissionBanner /> : null}

      {error ? (
        <section className="surface-panel flex items-center justify-between gap-4 p-5">
          <p className="text-sm text-rose-600">{error}</p>
          <Button variant="outline" className="rounded-2xl" onClick={() => void loadData()}>
            再読み込み
          </Button>
        </section>
      ) : null}

      {loading ? (
        <section className="surface-panel flex min-h-52 items-center justify-center p-6">
          <div className="flex items-center gap-3 text-slate-500">
            <Loader2 className="size-5 animate-spin" />
            案件データを読み込み中...
          </div>
        </section>
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {campaigns.map((campaign) => {
            const matchedMedia = mediaCandidates.filter((media) => media.campaign_id === campaign.id).length

            return (
              <Card
                key={campaign.id}
                className="rounded-[28px] border-white/70 bg-white/85 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]"
              >
                <CardHeader className="pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <Badge variant="outline" className="mb-3 border-teal-200 bg-teal-50 text-teal-800">
                        {campaign.category}
                      </Badge>
                      <CardTitle className="text-xl font-semibold text-slate-950">
                        {campaign.campaign_name}
                      </CardTitle>
                      <p className="mt-2 text-sm text-slate-500">
                        候補メディア {matchedMedia} 件 / 更新日{' '}
                        {new Date(campaign.updated_at).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                    <Badge className="bg-slate-900 text-white">アクティブ</Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5 pt-5">
                  <InfoBlock
                    icon={Sparkles}
                    label="訴求ポイント"
                    tone="blue"
                    items={campaign.appeal_points}
                    emptyText="訴求ポイントは未設定です"
                  />
                  <InfoBlock
                    icon={CircleAlert}
                    label="NG表現"
                    tone="rose"
                    items={campaign.ng_expressions}
                    emptyText="NG 表現は未設定です"
                  />
                  <InfoBlock
                    icon={Target}
                    label="相性のよいメディア像"
                    tone="amber"
                    items={campaign.preferred_media_traits}
                    emptyText="想定読者像は未設定です"
                  />

                  {campaign.existing_good_media_examples.length > 0 && (
                    <div className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        既存の好相性メディア
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {campaign.existing_good_media_examples.map((example) => (
                          <Badge
                            key={example}
                            variant="outline"
                            className="border-slate-200 bg-white text-slate-700"
                          >
                            {example}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Link href={`/media?campaign=${campaign.id}`} className="flex-1 min-w-48">
                      <Button className="w-full rounded-2xl">メディア候補を見る</Button>
                    </Link>
                    <CollectMediaModal
                      campaign={campaign}
                      disabled={!canWrite}
                      onComplete={() => {
                        void loadData()
                      }}
                    />
                    <Button variant="outline" className="rounded-2xl" disabled={!canWrite}>
                      編集
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </section>
      )}
    </div>
  )
}

function FormTextarea({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string
  label: string
  hint: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        <span className="text-xs text-slate-400">{hint}</span>
      </div>
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-28"
      />
    </div>
  )
}

function InfoBlock({
  icon: Icon,
  label,
  tone,
  items,
  emptyText,
}: {
  icon: typeof Sparkles
  label: string
  tone: 'blue' | 'rose' | 'amber'
  items: string[]
  emptyText: string
}) {
  const toneMap = {
    blue: 'bg-sky-50 text-sky-700 border-sky-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
  }

  return (
    <div className="rounded-3xl bg-slate-50/80 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
        <Icon className="size-4 text-slate-500" />
        {label}
      </div>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <Badge key={item} className={toneMap[tone]}>
              {item}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">{emptyText}</p>
      )}
    </div>
  )
}
