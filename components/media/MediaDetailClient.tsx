'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  ExternalLink,
  Globe,
  Hash,
  IdCard,
  type LucideIcon,
  Loader2,
  Mail,
  MessageSquareText,
  Sparkles,
  UserRound,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/AuthProvider'
import PermissionBanner from '@/components/PermissionBanner'
import ScoreRadarChart from '@/components/media/ScoreRadarChart'
import { useToast } from '@/components/ToastProvider'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { getCampaignRecommendations } from '@/lib/campaign-recommendations'
import { RANK_COLORS, STATUS_COLORS, STATUS_LABELS } from '@/lib/constants'
import type { Campaign, MediaCandidate, OutreachDraft, OutreachLog } from '@/types'

type SendLogResponse = {
  log: OutreachLog
  media: MediaCandidate
}

type ManagedMediaFormState = {
  product_name: string
  placement_type: string
  start_date: string
  end_date: string
  unit_price: string
  reward_rule: string
  monthly_volume: string
  memo: string
}

export default function MediaDetailClient({
  media,
  campaign,
  campaigns,
  initialDrafts,
  initialHistory,
}: {
  media: MediaCandidate
  campaign: Campaign
  campaigns: Campaign[]
  initialDrafts: OutreachDraft[]
  initialHistory: OutreachLog[]
}) {
  const router = useRouter()
  const { canWrite, user } = useAuth()
  const { showToast } = useToast()
  const [drafts, setDrafts] = useState(initialDrafts)
  const [history, setHistory] = useState(initialHistory)
  const [mediaProfile, setMediaProfile] = useState(media)
  const [mediaStatus, setMediaStatus] = useState(media.status)
  const [senderName, setSenderName] = useState('田中')
  const [senderCompany, setSenderCompany] = useState('株式会社サンプル')
  const [generating, setGenerating] = useState(false)
  const [sendingDraftId, setSendingDraftId] = useState<string | null>(null)
  const [updatingContact, setUpdatingContact] = useState(false)
  const [managedDialogOpen, setManagedDialogOpen] = useState(false)
  const [registeringManagedMedia, setRegisteringManagedMedia] = useState(false)
  const [managedForm, setManagedForm] = useState<ManagedMediaFormState>({
    product_name: campaign.campaign_name,
    placement_type: media.genre,
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '',
    unit_price: '',
    reward_rule: '',
    monthly_volume: media.estimated_audience,
    memo: media.fit_reason,
  })
  const [error, setError] = useState<string | null>(null)
  const businessCardInputRef = useRef<HTMLInputElement | null>(null)
  const recommendedCampaigns = getCampaignRecommendations(mediaProfile, campaigns)

  const contactMethodLabel = mediaProfile.contact_email
    ? 'Email'
    : mediaProfile.contact_slack_id
      ? 'Slack'
      : mediaProfile.contact_chatwork_id
        ? 'Chatwork'
        : mediaProfile.contact_page_url
          ? 'Form'
          : 'なし'

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

  const saveContactProfile = async (payload: Partial<MediaCandidate>, successMessage: string) => {
    setUpdatingContact(true)
    setError(null)

    try {
      const response = await fetch(`/api/media/${media.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const responsePayload = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(responsePayload?.error ?? '連絡先の更新に失敗しました')
      }

      const updatedMedia = (await response.json()) as MediaCandidate
      setMediaProfile(updatedMedia)
      setMediaStatus(updatedMedia.status)
      showToast({
        tone: 'success',
        title: '連絡先情報を更新しました',
        description: successMessage,
      })
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : '連絡先の更新に失敗しました'
      setError(message)
      showToast({
        tone: 'error',
        title: '連絡先の更新に失敗しました',
        description: message,
      })
    } finally {
      setUpdatingContact(false)
    }
  }

  const handleAssignSelf = async () => {
    if (!user?.email) return

    await saveContactProfile(
      { assigned_owner: user.email },
      `${user.email} を対応担当として設定しました。`
    )
  }

  const handleBusinessCardUpload = async (file?: File) => {
    if (!file) return

    setUpdatingContact(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/ai/business-card', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const responsePayload = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(responsePayload?.error ?? '名刺の読み取りに失敗しました')
      }

      const extracted = (await response.json()) as {
        operator_name: string
        contact_email: string
        contact_slack_id: string
        contact_chatwork_id: string
        contact_page_url: string
        memo: string
      }

      await saveContactProfile(
        {
          operator_name: extracted.operator_name || mediaProfile.operator_name,
          contact_email: extracted.contact_email || mediaProfile.contact_email,
          contact_page_url: extracted.contact_page_url || mediaProfile.contact_page_url,
          contact_slack_id: extracted.contact_slack_id || mediaProfile.contact_slack_id,
          contact_chatwork_id: extracted.contact_chatwork_id || mediaProfile.contact_chatwork_id,
          assigned_owner: mediaProfile.assigned_owner || user?.email || '',
        },
        extracted.memo || '名刺画像から読み取った連絡先を反映しました。'
      )
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : '名刺の読み取りに失敗しました'
      setError(message)
      showToast({
        tone: 'error',
        title: '名刺の読み取りに失敗しました',
        description: message,
      })
    } finally {
      if (businessCardInputRef.current) {
        businessCardInputRef.current.value = ''
      }
      setUpdatingContact(false)
    }
  }

  const handleRegisterManagedMedia = async () => {
    if (!managedForm.product_name.trim()) {
      setError('実施商材は必須です')
      return
    }

    setRegisteringManagedMedia(true)
    setError(null)

    try {
      const response = await fetch('/api/managed-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_media_candidate_id: mediaProfile.id,
          campaign_id: campaign.id,
          media_name: mediaProfile.media_name,
          domain: mediaProfile.domain,
          url: mediaProfile.url,
          product_name: managedForm.product_name,
          placement_type: managedForm.placement_type,
          contract_status: 'negotiating',
          start_date: managedForm.start_date,
          end_date: managedForm.end_date,
          unit_price: managedForm.unit_price,
          reward_rule: managedForm.reward_rule,
          owner_name: mediaProfile.assigned_owner || user?.email || '',
          monthly_volume: managedForm.monthly_volume,
          memo: managedForm.memo,
        }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error ?? 'メディア管理への登録に失敗しました')
      }

      setMediaStatus('partnered')
      setMediaProfile((current) => ({ ...current, status: 'partnered' }))
      setManagedDialogOpen(false)
      showToast({
        tone: 'success',
        title: 'メディア管理へ登録しました',
        description: '成約後の実施条件をメディア管理に引き継ぎました。',
      })
      router.push('/managed-media')
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'メディア管理への登録に失敗しました'
      setError(message)
      showToast({
        tone: 'error',
        title: 'メディア管理への登録に失敗しました',
        description: message,
      })
    } finally {
      setRegisteringManagedMedia(false)
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
              <div className="flex flex-col items-center gap-1">
                <span
                  className={`inline-flex size-14 items-center justify-center rounded-full text-lg font-bold ${RANK_COLORS[media.priority_rank]}`}
                >
                  {media.priority_rank}
                </span>
                <span className="text-[10px] font-semibold tracking-[0.18em] text-slate-400">
                  営業優先度
                </span>
              </div>
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
              <MetricCard
                label={`${campaign.campaign_name} での適合スコア`}
                value={`${media.fit_score}`}
                subLabel="/ 100"
                description={`スコアは「${campaign.campaign_name}」との相性を0〜100で細かく見た点数、左のランクは営業優先度をS/A/B/Cに丸めた区分です。${media.fit_reason}`}
              />
              <MetricCard
                label="問い合わせ導線"
                value={contactMethodLabel}
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
              <InfoRow label="運営者" value={mediaProfile.operator_name} />
              <InfoRow label="運営形態" value={media.operator_type} />
              <InfoRow label="案件名" value={campaign.campaign_name} />
              <InfoRow label="対応担当" value={mediaProfile.assigned_owner || '未設定'} />
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-2xl"
                disabled={!canWrite || updatingContact || !user?.email}
                onClick={() => void handleAssignSelf()}
              >
                自分を担当にする
              </Button>
              <Dialog open={managedDialogOpen} onOpenChange={setManagedDialogOpen}>
                <DialogTrigger
                  render={
                    <Button
                      type="button"
                      className="h-11 rounded-2xl"
                      disabled={!canWrite || registeringManagedMedia}
                    />
                  }
                >
                  メディア管理へ登録
                </DialogTrigger>
                <DialogContent className="max-w-2xl rounded-[28px] p-0 sm:max-w-2xl">
                  <div className="p-6">
                    <DialogHeader>
                      <DialogTitle>メディア管理へ登録</DialogTitle>
                      <DialogDescription>
                        この候補メディアを成約後の管理台帳へ移し、実施商材や掲載条件を記録します。
                      </DialogDescription>
                    </DialogHeader>

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      <ManagedFormField
                        label="実施商材"
                        value={managedForm.product_name}
                        onChange={(value) =>
                          setManagedForm((current) => ({ ...current, product_name: value }))
                        }
                      />
                      <ManagedFormField
                        label="掲載メニュー"
                        value={managedForm.placement_type}
                        onChange={(value) =>
                          setManagedForm((current) => ({ ...current, placement_type: value }))
                        }
                        placeholder="例: 比較記事 / バナー / メルマガ"
                      />
                      <ManagedFormField
                        label="開始日"
                        value={managedForm.start_date}
                        type="date"
                        onChange={(value) =>
                          setManagedForm((current) => ({ ...current, start_date: value }))
                        }
                      />
                      <ManagedFormField
                        label="終了日"
                        value={managedForm.end_date}
                        type="date"
                        onChange={(value) =>
                          setManagedForm((current) => ({ ...current, end_date: value }))
                        }
                      />
                      <ManagedFormField
                        label="単価"
                        value={managedForm.unit_price}
                        onChange={(value) =>
                          setManagedForm((current) => ({ ...current, unit_price: value }))
                        }
                        placeholder="例: CPA 4,800円"
                      />
                      <ManagedFormField
                        label="報酬条件"
                        value={managedForm.reward_rule}
                        onChange={(value) =>
                          setManagedForm((current) => ({ ...current, reward_rule: value }))
                        }
                        placeholder="例: 月末締め翌月末支払い"
                      />
                      <ManagedFormField
                        label="想定ボリューム"
                        value={managedForm.monthly_volume}
                        onChange={(value) =>
                          setManagedForm((current) => ({ ...current, monthly_volume: value }))
                        }
                      />
                      <div className="md:col-span-2">
                        <Label>運用メモ</Label>
                        <Textarea
                          value={managedForm.memo}
                          onChange={(event) =>
                            setManagedForm((current) => ({ ...current, memo: event.target.value }))
                          }
                          className="mt-2 min-h-24 rounded-2xl border-slate-200 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="rounded-b-[28px] bg-slate-50/90">
                    <Button
                      variant="outline"
                      className="rounded-2xl"
                      onClick={() => setManagedDialogOpen(false)}
                      disabled={registeringManagedMedia}
                    >
                      キャンセル
                    </Button>
                    <Button
                      className="rounded-2xl"
                      onClick={() => void handleRegisterManagedMedia()}
                      disabled={!canWrite || registeringManagedMedia}
                    >
                      {registeringManagedMedia ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          登録中...
                        </>
                      ) : (
                        '登録してメディア管理へ'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-white/70 bg-white/85">
            <CardHeader>
              <div className="space-y-3">
                <Badge className="w-fit bg-teal-100 text-teal-800">この案件での評価</Badge>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="size-4 text-slate-500" />
                  {campaign.campaign_name} との相性スコア
                </CardTitle>
                <p className="text-xs leading-6 text-slate-500">
                  下の六角形は「この案件」を基準に、読者一致・記事相性・接触導線・運営信頼・提携期待・表現安全で分解したものっぴ。
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[28px] border border-teal-100 bg-[linear-gradient(180deg,#f0fdfa,white)] p-4">
                <div className="mb-4 rounded-[22px] bg-white/80 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                    対象案件
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">
                    {campaign.campaign_name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{campaign.category}</p>
                </div>
                <ScoreRadarChart media={mediaProfile} targetLabel="この案件" />
              </div>
              <div className="rounded-[24px] bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  AI評価コメント
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-700">{media.fit_reason}</p>
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
              {mediaProfile.contact_email && <InfoRow label="メール" value={mediaProfile.contact_email} />}
              {mediaProfile.contact_slack_id && (
                <ContactAccountRow
                  icon={Hash}
                  label="Slack"
                  value={mediaProfile.contact_slack_id}
                />
              )}
              {mediaProfile.contact_chatwork_id && (
                <ContactAccountRow
                  icon={MessageSquareText}
                  label="Chatwork"
                  value={mediaProfile.contact_chatwork_id}
                />
              )}
              {mediaProfile.contact_page_url && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    フォーム
                  </p>
                  <a
                    href={mediaProfile.contact_page_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex break-all text-sm text-teal-700 hover:underline"
                  >
                    {mediaProfile.contact_page_url}
                  </a>
                </div>
              )}
              {!mediaProfile.contact_email &&
                !mediaProfile.contact_slack_id &&
                !mediaProfile.contact_chatwork_id &&
                !mediaProfile.contact_page_url && (
                <p className="text-sm text-rose-500">問い合わせ先が見つかっていません。</p>
              )}
              <input
                ref={businessCardInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => void handleBusinessCardUpload(event.target.files?.[0])}
              />
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-2xl"
                disabled={!canWrite || updatingContact}
                onClick={() => businessCardInputRef.current?.click()}
              >
                {updatingContact ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    名刺読取中...
                  </>
                ) : (
                  <>
                    <IdCard className="size-4" />
                    名刺から連絡先を取り込む
                  </>
                )}
              </Button>
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
                <TabsTrigger value="campaigns" className="shrink-0">
                  おすすめ案件
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
                          {log.reply_body ? (
                            <div className="mt-3 rounded-[18px] bg-white px-3 py-3 text-sm leading-6 text-slate-700">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                返信本文
                              </p>
                              <p className="mt-2 whitespace-pre-wrap">{log.reply_body}</p>
                              {log.reply_received_at ? (
                                <p className="mt-2 text-xs text-slate-400">
                                  受信日時: {new Date(log.reply_received_at).toLocaleString('ja-JP')}
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                          <p className="mt-1 text-sm text-slate-500">{log.memo || 'メモは未登録です。'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="campaigns" className="space-y-4">
              <Card className="rounded-[24px] border-white/70 bg-white">
                <CardHeader>
                  <CardTitle className="text-lg">このメディアにおすすめの案件</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm leading-7 text-slate-600">
                    媒体ジャンル、読者層、記事傾向、問い合わせ導線をもとに、
                    このメディアへ当てやすい案件をスコア順で並べていますっぴ。
                  </p>
                  {recommendedCampaigns.map((item, index) => (
                    <div
                      key={item.campaign.id}
                      className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={RANK_COLORS[item.rank]}>#{index + 1} {item.rank}</Badge>
                            {item.campaign.id === campaign.id ? (
                              <Badge variant="outline" className="border-teal-200 bg-white text-teal-700">
                                現在の案件
                              </Badge>
                            ) : null}
                            <span className="text-xs text-slate-500">{item.campaign.category}</span>
                          </div>
                          <h3 className="mt-3 truncate text-lg font-semibold text-slate-950">
                            {item.campaign.campaign_name}
                          </h3>
                        </div>
                        <div className="rounded-3xl bg-white px-4 py-3 text-center shadow-sm">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Match
                          </p>
                          <p className="mt-1 text-3xl font-semibold text-slate-950">{item.score}</p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        {item.reasons.map((reason) => (
                          <p
                            key={reason}
                            className="flex gap-2 rounded-2xl bg-white px-3 py-2 text-sm leading-6 text-slate-700"
                          >
                            <Sparkles className="mt-1 size-3.5 shrink-0 text-teal-700" />
                            <span>{reason}</span>
                          </p>
                        ))}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link href={`/media?campaign=${item.campaign.id}`}>
                          <Button variant="outline" className="rounded-2xl">
                            この案件の候補一覧へ
                            <ArrowRight className="size-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
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
  description,
}: {
  label: string
  value: string
  subLabel?: string
  description?: string
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white/90 p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <div className="mt-3 flex items-end gap-1">
        <p className="text-3xl font-semibold text-slate-950">{value}</p>
        {subLabel ? <span className="pb-1 text-xs text-slate-400">{subLabel}</span> : null}
      </div>
      {description ? (
        <p className="mt-3 line-clamp-3 text-xs leading-5 text-slate-500">{description}</p>
      ) : null}
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

function ContactAccountRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <div className="mt-1 inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
        <Icon className="size-4 text-slate-500" />
        {value}
      </div>
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

function ManagedFormField({
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
        placeholder={placeholder}
        className="h-11 rounded-2xl border-slate-200 bg-white"
      />
    </div>
  )
}
