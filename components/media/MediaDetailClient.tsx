'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Globe, Loader2, Mail, Sparkles, UserRound } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/AuthProvider'
import PermissionBanner from '@/components/PermissionBanner'
import { useToast } from '@/components/ToastProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { RANK_COLORS, STATUS_COLORS, STATUS_LABELS } from '@/lib/constants'
import type { Campaign, MediaCandidate, OutreachDraft, OutreachLog } from '@/types'

type SendLogResponse = {
  log: OutreachLog
  media: MediaCandidate
}

export default function MediaDetailClient({
  media,
  campaign,
  initialDrafts,
  initialHistory,
}: {
  media: MediaCandidate
  campaign: Campaign
  initialDrafts: OutreachDraft[]
  initialHistory: OutreachLog[]
}) {
  const { canWrite, user } = useAuth()
  const { showToast } = useToast()
  const [drafts, setDrafts] = useState(initialDrafts)
  const [history, setHistory] = useState(initialHistory)
  const [mediaStatus, setMediaStatus] = useState(media.status)
  const [senderName, setSenderName] = useState('田中')
  const [senderCompany, setSenderCompany] = useState('株式会社サンプル')
  const [generating, setGenerating] = useState(false)
  const [sendingDraftId, setSendingDraftId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerateDraft = async () => {
    setGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign,
          media,
          senderName,
          senderCompany,
          tone: 'ていねい',
        }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error ?? 'メール生成に失敗しました')
      }

      const generated = (await response.json()) as {
        subject_candidates: string[]
        body: string
        personalization_points: string[]
        tone: string
      }

      const createDraftResponse = await fetch(`/api/media/${media.id}/drafts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: generated.subject_candidates[0] ?? `${campaign.campaign_name}のご提案`,
          body: generated.body,
          tone: generated.tone,
          personalization_points: generated.personalization_points,
          approval_status: 'pending',
        }),
      })

      if (!createDraftResponse.ok) {
        const payload = (await createDraftResponse.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error ?? 'メール下書きの保存に失敗しました')
      }

      const createdDraft = (await createDraftResponse.json()) as OutreachDraft
      setDrafts((current) => [createdDraft, ...current])
      showToast({
        tone: 'success',
        title: 'メール下書きを保存しました',
        description: '生成した文面を下書き一覧に追加しました。',
      })
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'メール生成に失敗しました'
      setError(message)
      showToast({
        tone: 'error',
        title: 'メール生成に失敗しました',
        description: message,
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleSendDraft = async (draft: OutreachDraft) => {
    setSendingDraftId(draft.id)
    setError(null)

    try {
      const response = await fetch('/api/outreach/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_candidate_id: media.id,
          draft_id: draft.id,
          sent_by: user?.email,
          memo: `${draft.subject} を送信文面として記録`,
          next_action: '3営業日以内に初回返信を確認',
        }),
      })

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | SendLogResponse
        | null

      if (!response.ok || !payload || !('log' in payload)) {
        throw new Error(
          payload && 'error' in payload ? payload.error || '送信処理に失敗しました' : '送信処理に失敗しました'
        )
      }

      setHistory((current) => [payload.log, ...current].sort((a, b) => b.sent_at.localeCompare(a.sent_at)))
      setMediaStatus(payload.media.status)
      showToast({
        tone: 'success',
        title: '送信ログを保存しました',
        description: '文面を送信済みとして履歴に追加しました。',
      })
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : '送信処理に失敗しました'
      setError(message)
      showToast({
        tone: 'error',
        title: '送信処理に失敗しました',
        description: message,
      })
    } finally {
      setSendingDraftId(null)
    }
  }

  return (
    <div className="space-y-6">
      <section className="surface-panel overflow-hidden">
        <div className="p-6 lg:p-8">
          <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <Link href="/media" className="hover:text-slate-900">
              メディア候補
            </Link>
            <span>/</span>
            <span className="text-slate-900">{media.media_name}</span>
          </div>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <span
                className={`inline-flex size-14 items-center justify-center rounded-full text-lg font-bold ${RANK_COLORS[media.priority_rank]}`}
              >
                {media.priority_rank}
              </span>
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge className={STATUS_COLORS[mediaStatus]}>{STATUS_LABELS[mediaStatus]}</Badge>
                  <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
                    {media.genre}
                  </Badge>
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                  {media.media_name}
                </h1>
                <a
                  href={media.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 text-sm text-teal-700 hover:underline"
                >
                  <Globe className="size-4" />
                  {media.domain}
                  <ExternalLink className="size-3" />
                </a>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">{media.summary}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-[360px] lg:grid-cols-1">
              <MetricCard label="適合スコア" value={`${media.fit_score}`} subLabel="/ 100" />
              <MetricCard
                label="問い合わせ導線"
                value={media.contact_email ? 'Email' : media.contact_page_url ? 'Form' : 'なし'}
              />
              <MetricCard
                label="優先アクション"
                value={
                  mediaStatus === 'ready_to_send'
                    ? '送信準備'
                    : mediaStatus === 'sent'
                      ? '返信待ち'
                      : '情報確認'
                }
              />
            </div>
          </div>
        </div>
      </section>

      {!canWrite ? (
        <PermissionBanner description="このアカウントでは文面生成や送信操作はできません。内容確認のみ可能です。" />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="rounded-[28px] border-white/70 bg-white/85">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserRound className="size-4 text-slate-500" />
                基本情報
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <InfoRow label="読者層" value={media.estimated_audience} />
              <InfoRow label="運営者" value={media.operator_name} />
              <InfoRow label="運営形態" value={media.operator_type} />
              <InfoRow label="案件名" value={campaign.campaign_name} />
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-white/70 bg-white/85">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="size-4 text-slate-500" />
                適合理由
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-[24px] bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                {media.fit_reason}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-white/70 bg-white/85">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="size-4 text-slate-500" />
                問い合わせ先
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {media.contact_email && <InfoRow label="メール" value={media.contact_email} />}
              {media.contact_page_url && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    フォーム
                  </p>
                  <a
                    href={media.contact_page_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex break-all text-sm text-teal-700 hover:underline"
                  >
                    {media.contact_page_url}
                  </a>
                </div>
              )}
              {!media.contact_email && !media.contact_page_url && (
                <p className="text-sm text-rose-500">問い合わせ先が見つかっていません。</p>
              )}
            </CardContent>
          </Card>
        </div>

        <section className="surface-panel p-4 md:p-5">
          <Tabs defaultValue="email">
            <div className="mb-5 overflow-x-auto">
              <TabsList className="min-w-max rounded-2xl bg-slate-100">
                <TabsTrigger value="email" className="shrink-0">
                  文面案 ({drafts.length})
                </TabsTrigger>
                <TabsTrigger value="site" className="shrink-0">
                  サイト要約
                </TabsTrigger>
                <TabsTrigger value="history" className="shrink-0">
                  送信履歴
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="email" className="space-y-4">
              <Card className="rounded-[24px] border-white/70 bg-white">
                <CardHeader>
                  <CardTitle className="text-lg">AI でメール文面を生成</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sender-name">送信者名</Label>
                    <Input
                      id="sender-name"
                      value={senderName}
                      onChange={(event) => setSenderName(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sender-company">会社名</Label>
                    <Input
                      id="sender-company"
                      value={senderCompany}
                      onChange={(event) => setSenderCompany(event.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}
                    <Button
                      className="rounded-2xl"
                      onClick={() => void handleGenerateDraft()}
                      disabled={generating || !senderName.trim() || !senderCompany.trim() || !canWrite}
                    >
                      {generating ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          生成中...
                        </>
                      ) : (
                        'AIでメール文面を生成'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {drafts.length === 0 ? (
                <Card className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 shadow-none">
                  <CardContent className="py-12 text-center">
                    <p className="text-sm text-slate-500">メール文面はまだ生成されていません。</p>
                  </CardContent>
                </Card>
              ) : (
                drafts.map((draft) => (
                  <Card key={draft.id} className="rounded-[24px] border-white/70 bg-white">
                    <CardHeader>
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Subject
                          </p>
                          <CardTitle className="mt-2 text-lg">{draft.subject}</CardTitle>
                        </div>
                        <Badge
                          className={
                            draft.approval_status === 'approved'
                              ? 'bg-emerald-100 text-emerald-700'
                              : draft.approval_status === 'rejected'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-amber-100 text-amber-700'
                          }
                        >
                          {draft.approval_status === 'approved'
                            ? '承認済み'
                            : draft.approval_status === 'rejected'
                              ? '却下'
                              : '確認待ち'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4 flex flex-wrap gap-2">
                        {draft.personalization_points.map((point) => (
                          <Badge
                            key={point}
                            variant="outline"
                            className="border-slate-200 bg-slate-50 text-slate-600"
                          >
                            {point}
                          </Badge>
                        ))}
                      </div>
                      <Textarea
                        defaultValue={draft.body}
                        readOnly
                        className="min-h-72 rounded-2xl bg-slate-50 font-mono text-sm text-slate-700"
                      />
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Button
                          className="rounded-2xl"
                          disabled={!canWrite || sendingDraftId === draft.id}
                          onClick={() => void handleSendDraft(draft)}
                        >
                          {sendingDraftId === draft.id ? (
                            <>
                              <Loader2 className="size-4 animate-spin" />
                              送信中...
                            </>
                          ) : (
                            '送信する'
                          )}
                        </Button>
                        <Button variant="outline" className="rounded-2xl" disabled={!canWrite}>
                          編集
                        </Button>
                        <Button variant="ghost" className="rounded-2xl text-rose-600" disabled={!canWrite}>
                          却下
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="site">
              <Card className="rounded-[24px] border-white/70 bg-white">
                <CardContent className="space-y-5 pt-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      サイト概要
                    </p>
                    <p className="mt-3 text-sm leading-7 text-slate-700">{media.summary}</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <InfoPanel title="読者層" value={media.estimated_audience} />
                    <InfoPanel title="運営形態" value={media.operator_type} />
                    <InfoPanel title="SNS" value={media.social_links.length > 0 ? `${media.social_links.length}件` : '登録なし'} />
                    <InfoPanel title="更新日時" value={new Date(media.updated_at).toLocaleDateString('ja-JP')} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card className="rounded-[24px] border-white/70 bg-white">
                <CardContent className="pt-5">
                  {history.length === 0 ? (
                    <p className="py-10 text-center text-sm text-slate-400">送信履歴はまだありません。</p>
                  ) : (
                    <div className="space-y-3">
                      {history.map((log) => (
                        <div
                          key={log.id}
                          className="rounded-[22px] border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {new Date(log.sent_at).toLocaleString('ja-JP')}
                              </p>
                              <p className="text-xs text-slate-500">送信者: {log.sent_by}</p>
                            </div>
                            <Badge className="bg-emerald-100 text-emerald-700">
                              {log.delivery_status === 'delivered' ? '配信済み' : log.delivery_status}
                            </Badge>
                          </div>
                          <p className="mt-3 text-sm text-slate-600">
                            次のアクション: {log.next_action || '設定なし'}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">{log.memo || 'メモは未登録です。'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  subLabel,
}: {
  label: string
  value: string
  subLabel?: string
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white/90 p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <div className="mt-3 flex items-end gap-1">
        <p className="text-3xl font-semibold text-slate-950">{value}</p>
        {subLabel ? <span className="pb-1 text-xs text-slate-400">{subLabel}</span> : null}
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm text-slate-700">{value}</p>
    </div>
  )
}

function InfoPanel({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[22px] bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</p>
      <p className="mt-2 text-sm font-medium text-slate-700">{value}</p>
    </div>
  )
}
