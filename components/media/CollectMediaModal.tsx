'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, SkipForward, XCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ToastProvider'
import { RANK_COLORS, STATUS_COLORS, STATUS_LABELS } from '@/lib/constants'
import type { Campaign, MediaCandidate } from '@/types'

interface CollectMediaModalProps {
  campaign: Campaign
  disabled?: boolean
  onComplete?: (candidates: MediaCandidate[]) => void
}

type ProgressEvent = {
  step: string
  message: string
  percent: number
  detail?: string[]
}

type LogEntry =
  | { type: 'progress'; data: ProgressEvent }
  | { type: 'candidate'; data: MediaCandidate }
  | { type: 'skip'; data: { url: string; reason: string } }
  | { type: 'error'; data: { message: string } }

type CollectStatus = 'idle' | 'running' | 'done' | 'error'

export default function CollectMediaModal({
  campaign,
  disabled = false,
  onComplete,
}: CollectMediaModalProps) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<CollectStatus>('idle')
  const [percent, setPercent] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [candidates, setCandidates] = useState<MediaCandidate[]>([])
  const [retryingSave, setRetryingSave] = useState(false)
  const logEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const { showToast } = useToast()

  // 自動スクロール
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const handleStart = async () => {
    setStatus('running')
    setPercent(0)
    setLogs([])
    setCandidates([])
    setRetryingSave(false)
    setProgressMessage('開始中...')
    setSaveMessage('')

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/media/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign, maxSites: 15 }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error ?? 'メディア収集の開始に失敗しました')
      }

      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const chunks = buffer.split('\n\n')
        buffer = chunks.pop() ?? ''

        for (const chunk of chunks) {
          const lines = chunk.split('\n')
          let event = ''
          let data = ''
          for (const line of lines) {
            if (line.startsWith('event: ')) event = line.slice(7)
            if (line.startsWith('data: ')) data = line.slice(6)
          }
          if (!event || !data) continue

          try {
            const parsed = JSON.parse(data)
            if (event === 'progress') {
              setPercent(parsed.percent)
              setProgressMessage(parsed.message)
              setLogs((prev) => [...prev, { type: 'progress', data: parsed }])
            } else if (event === 'candidate') {
              setCandidates((prev) => [...prev, parsed])
              setLogs((prev) => [...prev, { type: 'candidate', data: parsed }])
            } else if (event === 'skip') {
              setLogs((prev) => [...prev, { type: 'skip', data: parsed }])
            } else if (event === 'error') {
              setLogs((prev) => [...prev, { type: 'error', data: parsed }])
              setStatus('error')
              setSaveMessage('設定や API キーを確認して、再度お試しください。')
            } else if (event === 'done') {
              const collectedCandidates = parsed.candidates as MediaCandidate[]
              setCandidates(collectedCandidates)
              await handlePersistComplete(collectedCandidates)
            }
          } catch {
            // パースエラーは無視
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setStatus('error')
        setProgressMessage('通信エラーが発生しました')
        setSaveMessage('ネットワーク接続と環境変数を確認してください。')
        showToast({
          tone: 'error',
          title: '一括収集に失敗しました',
          description:
            err instanceof Error ? err.message : 'メディア収集処理の途中でエラーが発生しました。',
        })
      }
    }
  }

  const handleStop = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setStatus('idle')
    setProgressMessage('中断しました')
    setSaveMessage('途中までの結果は破棄されました。')
    showToast({
      tone: 'info',
      title: 'メディア収集を中断しました',
    })
  }

  const handleClose = () => {
    if (status === 'running') handleStop()
    setOpen(false)
    setStatus('idle')
    setLogs([])
    setCandidates([])
    setPercent(0)
    setSaveMessage('')
    setRetryingSave(false)
  }

  const handlePersistComplete = async (collectedCandidates: MediaCandidate[]) => {
    if (collectedCandidates.length === 0) {
      setStatus('done')
      setPercent(100)
      setProgressMessage('完了しましたが、保存対象の候補は見つかりませんでした')
      setSaveMessage('検索条件を見直して再収集できます。')
      return
    }

    setProgressMessage('収集結果を保存しています...')
    setSaveMessage('DB に保存中...')

    try {
      const savedCandidates = await persistCandidates(collectedCandidates)
      setCandidates(savedCandidates)
      setStatus('done')
      setPercent(100)
      setProgressMessage(`完了！${savedCandidates.length}件を保存しました`)
      setSaveMessage(`${savedCandidates.length}件の候補を保存しました`)
      showToast({
        tone: 'success',
        title: 'メディア候補を保存しました',
        description: `${savedCandidates.length}件の候補を一覧へ反映しました。`,
      })
      onComplete?.(savedCandidates)
    } catch (error) {
      setStatus('error')
      setProgressMessage('収集は完了しましたが、保存に失敗しました')
      setSaveMessage('候補は保持しています。再保存するか、設定を確認してください。')
      showToast({
        tone: 'error',
        title: '候補の保存に失敗しました',
        description:
          error instanceof Error ? error.message : '保存処理の途中でエラーが発生しました。',
      })
    }
  }

  const handleRetrySave = async () => {
    if (candidates.length === 0) return

    setRetryingSave(true)
    await handlePersistComplete(candidates)
    setRetryingSave(false)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) handleClose(); else setOpen(true) }}>
      <DialogTrigger
        render={
          <Button variant="outline" className="rounded-2xl" disabled={disabled}>
            🔍 メディアを一括収集
          </Button>
        }
      />

      <DialogContent className="max-w-3xl rounded-[28px] p-0">
        <div className="p-6">
          <DialogHeader>
            <DialogTitle>メディア一括収集</DialogTitle>
            <DialogDescription>
              <span className="font-semibold text-slate-800">{campaign.campaign_name}</span>{' '}
              に適したメディアを自動で探索・分析します。過去の返信・提携履歴も学習シグナルとして、検索クエリとスコアを補正します。
            </DialogDescription>
          </DialogHeader>

          {/* プログレスバー */}
          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">{progressMessage || '開始ボタンを押してください'}</span>
              <span className="font-semibold text-slate-900">{percent}%</span>
            </div>
            {saveMessage ? <p className="text-xs text-slate-500">{saveMessage}</p> : null}
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-teal-600 transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          {/* 収集結果プレビュー */}
          {candidates.length > 0 && (
            <div className="mt-4 rounded-[20px] border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-xs font-semibold text-slate-500">
                収集済み {candidates.length}件
              </p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {candidates.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2 text-sm"
                  >
                    <span
                      className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${RANK_COLORS[c.priority_rank]}`}
                    >
                      {c.priority_rank}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 truncate">{c.media_name}</p>
                      <p className="text-xs text-slate-400 truncate">{c.domain}</p>
                    </div>
                    <span className="text-xs font-semibold text-slate-700">{c.fit_score}</span>
                    <Badge className={`text-xs ${STATUS_COLORS[c.status]}`}>
                      {STATUS_LABELS[c.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ログ */}
          <div className="mt-4 max-h-40 overflow-y-auto rounded-[20px] bg-slate-900 p-3 font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-slate-500">ログがここに表示されます</p>
            ) : (
              logs.map((log, i) => <LogLine key={i} log={log} />)
            )}
            <div ref={logEndRef} />
          </div>
        </div>

        {/* フッター */}
        <div className="flex justify-between rounded-b-[28px] bg-slate-50/90 px-6 py-4">
          <Button variant="ghost" onClick={handleClose} className="rounded-2xl">
            閉じる
          </Button>
          <div className="flex gap-2">
            {status === 'running' ? (
              <Button variant="destructive" onClick={handleStop} className="rounded-2xl">
                中断する
              </Button>
            ) : (
              <>
                {status === 'error' && candidates.length > 0 ? (
                  <Button
                    variant="outline"
                    onClick={() => void handleRetrySave()}
                    className="rounded-2xl"
                    disabled={retryingSave}
                  >
                    {retryingSave ? '再保存中...' : '再保存する'}
                  </Button>
                ) : null}
                <Button onClick={handleStart} className="rounded-2xl" disabled={disabled || retryingSave}>
                  {status === 'done' ? '再収集する' : '収集を開始'}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

async function persistCandidates(candidates: MediaCandidate[]) {
  const deduplicated = Array.from(
    new Map(candidates.map((candidate) => [candidate.domain, candidate])).values()
  )

  const response = await fetch('/api/media', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ candidates: deduplicated }),
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(payload?.error ?? '収集結果の保存に失敗しました')
  }

  return (await response.json()) as MediaCandidate[]
}

function LogLine({ log }: { log: LogEntry }) {
  if (log.type === 'progress') {
    return (
      <p className="text-teal-400">
        <span className="text-slate-500">[{log.data.step}]</span> {log.data.message}
        {log.data.detail && (
          <span className="text-slate-400"> — {log.data.detail.join(', ')}</span>
        )}
      </p>
    )
  }
  if (log.type === 'candidate') {
    return (
      <p className="text-emerald-400">
        <CheckCircle2 className="mr-1 inline size-3" />
        {log.data.domain} — {log.data.media_name} (スコア {log.data.fit_score} / ランク{' '}
        {log.data.priority_rank})
      </p>
    )
  }
  if (log.type === 'skip') {
    return (
      <p className="text-yellow-500">
        <SkipForward className="mr-1 inline size-3" />
        SKIP {log.data.url} — {log.data.reason}
      </p>
    )
  }
  if (log.type === 'error') {
    return (
      <p className="text-rose-400">
        <XCircle className="mr-1 inline size-3" />
        ERROR: {log.data.message}
      </p>
    )
  }
  return null
}
