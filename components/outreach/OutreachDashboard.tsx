'use client'

import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CircleAlert,
  Loader2,
  MailCheck,
  MessageCircleReply,
  Send,
  ShieldCheck,
} from 'lucide-react'

import { useAuth } from '@/components/AuthProvider'
import PermissionBanner from '@/components/PermissionBanner'
import { useToast } from '@/components/ToastProvider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RANK_COLORS, STATUS_COLORS, STATUS_LABELS } from '@/lib/constants'
import type { MediaCandidate, OutreachLog, ReplyStatus } from '@/types'

const REPLY_STATUS_LABELS = {
  none: '未返信',
  replied: '返信あり',
  interested: '興味あり',
  declined: '断り',
} satisfies Record<ReplyStatus, string>

const REPLY_STATUS_COLORS = {
  none: 'bg-slate-100 text-slate-600',
  replied: 'bg-sky-100 text-sky-700',
  interested: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-rose-100 text-rose-700',
} satisfies Record<ReplyStatus, string>

type SendResponse = {
  log: OutreachLog
  media: MediaCandidate
}

type UpdateResponse = {
  log: OutreachLog
  media: MediaCandidate | null
}

export default function OutreachDashboard({
  initialMediaCandidates,
  initialLogs,
}: {
  initialMediaCandidates: MediaCandidate[]
  initialLogs: OutreachLog[]
}) {
  const { user, canWrite } = useAuth()
  const { showToast } = useToast()
  const [mediaCandidates, setMediaCandidates] = useState(initialMediaCandidates)
  const [logs, setLogs] = useState(initialLogs)
  const [pageError, setPageError] = useState<string | null>(null)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [updatingLogId, setUpdatingLogId] = useState<string | null>(null)

  const { readyToSend, sent, replied, mediaById } = useMemo(() => {
    const sortedMedia = [...mediaCandidates].sort((a, b) => b.updated_at.localeCompare(a.updated_at))

    return {
      readyToSend: sortedMedia.filter((media) => media.status === 'ready_to_send'),
      sent: sortedMedia.filter((media) => media.status === 'sent' || media.status === 'retry_candidate'),
      replied: sortedMedia.filter((media) =>
        ['replied', 'interested', 'partnered', 'passed'].includes(media.status)
      ),
      mediaById: new Map(sortedMedia.map((media) => [media.id, media])),
    }
  }, [mediaCandidates])

  const upsertMedia = (nextMedia: MediaCandidate) => {
    setMediaCandidates((current) =>
      current.map((media) => (media.id === nextMedia.id ? nextMedia : media))
    )
  }

  const upsertLog = (nextLog: OutreachLog) => {
    setLogs((current) => {
      const exists = current.some((log) => log.id === nextLog.id)
      const next = exists
        ? current.map((log) => (log.id === nextLog.id ? nextLog : log))
        : [nextLog, ...current]

      return next.sort((a, b) => b.sent_at.localeCompare(a.sent_at))
    })
  }

  const handleSend = async (media: MediaCandidate) => {
    setSendingId(media.id)
    setPageError(null)

    try {
      const response = await fetch('/api/outreach/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_candidate_id: media.id,
          sent_by: user?.email,
          next_action: '3営業日以内に初回返信を確認',
        }),
      })

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | SendResponse
        | null

      if (!response.ok || !payload || !('log' in payload)) {
        throw new Error(
          payload && 'error' in payload ? payload.error || '送信処理に失敗しました' : '送信処理に失敗しました'
        )
      }

      upsertLog(payload.log)
      upsertMedia(payload.media)
      showToast({
        tone: 'success',
        title: '送信ログを登録しました',
        description: `${media.media_name} を送信済みに更新しました。`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '送信処理に失敗しました'
      setPageError(message)
      showToast({
        tone: 'error',
        title: '送信処理に失敗しました',
        description: message,
      })
    } finally {
      setSendingId(null)
    }
  }

  const handleReplyStatusChange = async (log: OutreachLog, replyStatus: ReplyStatus) => {
    setUpdatingLogId(log.id)
    setPageError(null)

    try {
      const nextAction =
        replyStatus === 'interested'
          ? '提携条件を整理して折り返す'
          : replyStatus === 'replied'
            ? '返信内容を確認して次回アクションを決める'
            : replyStatus === 'declined'
              ? '見送り理由をメモして案件対象外に整理'
              : log.next_action

      const response = await fetch(`/api/outreach/logs/${log.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reply_status: replyStatus,
          next_action: nextAction,
          memo: log.memo,
        }),
      })

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | UpdateResponse
        | null

      if (!response.ok || !payload || !('log' in payload)) {
        throw new Error(
          payload && 'error' in payload ? payload.error || '返信更新に失敗しました' : '返信更新に失敗しました'
        )
      }

      upsertLog(payload.log)
      if (payload.media) {
        upsertMedia(payload.media)
      }

      showToast({
        tone: 'success',
        title: '返信ステータスを更新しました',
        description: `${mediaById.get(log.media_candidate_id)?.media_name || 'メディア'} の状況を反映しました。`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '返信更新に失敗しました'
      setPageError(message)
      showToast({
        tone: 'error',
        title: '返信ステータスを更新できませんでした',
        description: message,
      })
    } finally {
      setUpdatingLogId(null)
    }
  }

  return (
    <div className="space-y-6">
      <section className="surface-panel overflow-hidden">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.35fr_0.9fr] lg:p-8">
          <div>
            <Badge className="mb-4 bg-emerald-100 text-emerald-800">Outreach Control</Badge>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
              送信待ちから返信管理まで、営業の進行をひと目で追う
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              送信前の最終確認、送信済みのフォローアップ、返信あり案件の温度感確認を
              同じページで切り替えながら更新できます。
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
            {[
              { label: '送信待ち', count: readyToSend.length, icon: Send },
              { label: '送信済み', count: sent.length, icon: MailCheck },
              { label: '返信あり', count: replied.length, icon: MessageCircleReply },
              {
                label: '提携済み',
                count: mediaCandidates.filter((media) => media.status === 'partnered').length,
                icon: ShieldCheck,
              },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.label}
                  className="rounded-[24px] border border-slate-200 bg-white/90 p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">{item.label}</p>
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-slate-100">
                      <Icon className="size-4 text-slate-700" />
                    </div>
                  </div>
                  <p className="mt-4 text-3xl font-semibold text-slate-950">{item.count}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {!canWrite ? (
        <PermissionBanner description="viewer 権限では送信や返信更新はできません。進行確認のみ可能です。" />
      ) : null}

      {pageError ? (
        <div className="flex items-start gap-3 rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <p>{pageError}</p>
        </div>
      ) : null}

      <section className="surface-panel p-4 md:p-5">
        <Tabs defaultValue="ready">
          <TabsList className="mb-5 rounded-2xl bg-slate-100">
            <TabsTrigger value="ready">送信待ち ({readyToSend.length})</TabsTrigger>
            <TabsTrigger value="sent">送信済み ({sent.length})</TabsTrigger>
            <TabsTrigger value="replied">返信あり ({replied.length})</TabsTrigger>
            <TabsTrigger value="history">送信ログ ({logs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="ready">
            <DataTable
              emptyText="送信待ちのメディアはありません"
              headers={['ランク', 'メディア名', '問い合わせ先', '文面ステータス', '']}
              rows={readyToSend.map((media) => (
                <TableRow key={media.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                  <TableCell>
                    <span
                      className={`inline-flex size-8 items-center justify-center rounded-full text-xs font-bold ${RANK_COLORS[media.priority_rank]}`}
                    >
                      {media.priority_rank}
                    </span>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-slate-900">{media.media_name}</p>
                    <p className="text-xs text-slate-500">{media.domain}</p>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {media.contact_email || 'フォームのみ'}
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-emerald-100 text-emerald-700">文面確認済み</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link href={`/media/${media.id}`}>
                        <Button size="sm" variant="outline" className="rounded-2xl">
                          確認
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        className="rounded-2xl"
                        disabled={!canWrite || sendingId === media.id}
                        onClick={() => void handleSend(media)}
                      >
                        {sendingId === media.id ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            送信中...
                          </>
                        ) : (
                          '送信する'
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            />
          </TabsContent>

          <TabsContent value="sent">
            <DataTable
              emptyText="送信済みのメディアはありません"
              headers={['メディア名', '送信日', '返信状況', '次のアクション', '']}
              rows={sent.map((media) => {
                const log = logs.find((item) => item.media_candidate_id === media.id)

                return (
                  <TableRow key={media.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                    <TableCell>
                      <p className="font-medium text-slate-900">{media.media_name}</p>
                      <p className="text-xs text-slate-500">{media.domain}</p>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {log ? new Date(log.sent_at).toLocaleDateString('ja-JP') : '—'}
                    </TableCell>
                    <TableCell>
                      {log ? (
                        <Select
                          value={log.reply_status}
                          onValueChange={(value) =>
                            void handleReplyStatusChange(log, value as ReplyStatus)
                          }
                          disabled={!canWrite || updatingLogId === log.id}
                        >
                          <SelectTrigger className="w-[140px] rounded-2xl border-slate-200 bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(REPLY_STATUS_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{log?.next_action || '—'}</TableCell>
                    <TableCell>
                      <Link href={`/media/${media.id}`}>
                        <Button size="sm" variant="ghost" className="rounded-2xl">
                          詳細
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })}
            />
          </TabsContent>

          <TabsContent value="replied">
            <DataTable
              emptyText="返信のあるメディアはありません"
              headers={['メディア名', 'ステータス', 'メモ', '']}
              rows={replied.map((media) => {
                const log = logs.find((item) => item.media_candidate_id === media.id)

                return (
                  <TableRow key={media.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                    <TableCell>
                      <p className="font-medium text-slate-900">{media.media_name}</p>
                      <p className="text-xs text-slate-500">{media.domain}</p>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[media.status]}>{STATUS_LABELS[media.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {log?.memo || log?.next_action || 'メモは未登録です'}
                    </TableCell>
                    <TableCell>
                      <Link href={`/media/${media.id}`}>
                        <Button size="sm" variant="ghost" className="rounded-2xl">
                          詳細
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })}
            />
          </TabsContent>

          <TabsContent value="history">
            <DataTable
              emptyText="送信ログはありません"
              headers={['メディア名', '送信者', '送信日時', '配信状況', '返信', 'メモ']}
              rows={logs.map((log) => {
                const media = mediaById.get(log.media_candidate_id)

                return (
                  <TableRow key={log.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                    <TableCell className="font-medium text-slate-900">{media?.media_name || '—'}</TableCell>
                    <TableCell className="text-sm text-slate-600">{log.sent_by}</TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {new Date(log.sent_at).toLocaleString('ja-JP')}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          log.delivery_status === 'delivered'
                            ? 'bg-emerald-100 text-emerald-700'
                            : log.delivery_status === 'bounced'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-slate-100 text-slate-600'
                        }
                      >
                        {log.delivery_status === 'delivered'
                          ? '配信済み'
                          : log.delivery_status === 'bounced'
                            ? 'バウンス'
                            : log.delivery_status === 'failed'
                              ? '失敗'
                              : '保留'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={REPLY_STATUS_COLORS[log.reply_status]}>
                        {REPLY_STATUS_LABELS[log.reply_status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">{log.memo || '—'}</TableCell>
                  </TableRow>
                )
              })}
            />
          </TabsContent>
        </Tabs>
      </section>
    </div>
  )
}

function DataTable({
  headers,
  rows,
  emptyText,
}: {
  headers: string[]
  rows: ReactNode[]
  emptyText: string
}) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-slate-100 bg-slate-50/90">
            {headers.map((header) => (
              <TableHead key={header}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length > 0 ? (
            rows
          ) : (
            <TableRow>
              <TableCell
                colSpan={headers.length}
                className="py-12 text-center text-sm text-slate-400"
              >
                {emptyText}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
