'use client'

import { useMemo, useState } from 'react'
import { Braces, Loader2, Upload } from 'lucide-react'

import { useToast } from '@/components/ToastProvider'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Campaign, MediaCandidate, MediaStatus, PriorityRank } from '@/types'

type ImportableMediaCandidate = Omit<MediaCandidate, 'id' | 'created_at' | 'updated_at'>

const priorityByScore = (score: number): PriorityRank =>
  score >= 90 ? 'S' : score >= 80 ? 'A' : score >= 65 ? 'B' : 'C'

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => normalizeString(entry))
    .filter(Boolean)
    .slice(0, 10)
}

function normalizeStatus(value: unknown): MediaStatus {
  const allowed: MediaStatus[] = [
    'unreviewed',
    'ready_to_send',
    'sent',
    'replied',
    'interested',
    'partnered',
    'passed',
    'retry_candidate',
  ]

  return allowed.includes(value as MediaStatus) ? (value as MediaStatus) : 'unreviewed'
}

function parseCandidates(
  rawValue: string,
  campaignOverride: string
): { candidates: ImportableMediaCandidate[]; warnings: string[] } {
  const parsed = JSON.parse(rawValue) as unknown
  const rows = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as { candidates?: unknown[] }).candidates)
      ? (parsed as { candidates: unknown[] }).candidates
      : null

  if (!rows) {
    throw new Error('JSON配列、または { "candidates": [...] } 形式で貼り付けてください')
  }

  const warnings: string[] = []
  const candidates = rows.flatMap((row, index) => {
    if (!row || typeof row !== 'object') {
      warnings.push(`${index + 1}行目はオブジェクトではないため除外しました`)
      return []
    }

    const candidate = row as Record<string, unknown>
    const media_name = normalizeString(candidate.media_name)
    const domain = normalizeString(candidate.domain).replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    const url = normalizeString(candidate.url)
    const campaign_id = campaignOverride || normalizeString(candidate.campaign_id)

    if (!campaign_id || !media_name || !domain || !url) {
      warnings.push(`${index + 1}行目は必須項目不足のため除外しました`)
      return []
    }

    const fit_score = Math.max(0, Math.min(100, Number(candidate.fit_score) || 0))
    const priority_rank = ['S', 'A', 'B', 'C'].includes(normalizeString(candidate.priority_rank))
      ? (normalizeString(candidate.priority_rank) as PriorityRank)
      : priorityByScore(fit_score)

    return [
      {
        campaign_id,
        media_name,
        domain,
        url,
        genre: normalizeString(candidate.genre) || '未分類',
        estimated_audience: normalizeString(candidate.estimated_audience) || '不明',
        operator_name: normalizeString(candidate.operator_name) || '不明',
        operator_type: normalizeString(candidate.operator_type) || '不明',
        contact_page_url: normalizeString(candidate.contact_page_url),
        contact_email: normalizeString(candidate.contact_email),
        contact_slack_id: normalizeString(candidate.contact_slack_id),
        contact_chatwork_id: normalizeString(candidate.contact_chatwork_id),
        assigned_owner: normalizeString(candidate.assigned_owner),
        social_links: normalizeStringArray(candidate.social_links),
        summary: normalizeString(candidate.summary),
        fit_score,
        priority_rank,
        fit_reason: normalizeString(candidate.fit_reason) || 'Gemini経由で候補取り込み',
        status: normalizeStatus(candidate.status),
      } satisfies ImportableMediaCandidate,
    ]
  })

  return { candidates, warnings }
}

export default function ImportMediaJsonDialog({
  campaigns,
  onImported,
}: {
  campaigns: Campaign[]
  onImported: (saved: MediaCandidate[]) => void
}) {
  const { showToast } = useToast()
  const [open, setOpen] = useState(false)
  const [jsonText, setJsonText] = useState('')
  const [campaignOverride, setCampaignOverride] = useState('keep-json')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])

  const exampleText = useMemo(
    () =>
      JSON.stringify(
        [
          {
            campaign_id: 'camp_001',
            media_name: 'サンプル媒体',
            domain: 'example.com',
            url: 'https://example.com/',
            genre: '比較・レビュー',
            estimated_audience: '30代〜50代男女',
            operator_name: 'サンプル編集部',
            operator_type: '比較メディア',
            contact_page_url: 'https://example.com/contact',
            contact_email: '',
            contact_slack_id: '',
            contact_chatwork_id: '',
            assigned_owner: '',
            social_links: [],
            summary: 'Geminiで収集した候補です。',
            fit_score: 82,
            priority_rank: 'A',
            fit_reason: '比較記事との親和性が高いです。',
            status: 'unreviewed',
          },
        ],
        null,
        2
      ),
    []
  )

  const resetState = () => {
    setJsonText('')
    setCampaignOverride('keep-json')
    setError(null)
    setWarnings([])
    setSubmitting(false)
  }

  const handleImport = async () => {
    setSubmitting(true)
    setError(null)

    try {
      const { candidates, warnings: parseWarnings } = parseCandidates(
        jsonText,
        campaignOverride === 'keep-json' ? '' : campaignOverride
      )

      if (candidates.length === 0) {
        throw new Error('保存できる候補がありませんでした')
      }

      const response = await fetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(candidates),
      })

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | MediaCandidate[]
        | null

      if (!response.ok || !payload || !Array.isArray(payload)) {
        throw new Error(
          payload && !Array.isArray(payload) ? payload.error || '取り込みに失敗しました' : '取り込みに失敗しました'
        )
      }

      setWarnings(parseWarnings)
      onImported(payload)
      showToast({
        tone: 'success',
        title: 'メディア候補を取り込みました',
        description:
          parseWarnings.length > 0
            ? `${payload.length}件を保存し、${parseWarnings.length}件をスキップしました。`
            : `${payload.length}件を保存しました。`,
      })
      setOpen(false)
      resetState()
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : '取り込みに失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) resetState()
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" className="rounded-2xl">
            <Upload className="mr-2 size-4" />
            Gemini JSON取り込み
          </Button>
        }
      />
      <DialogContent className="max-w-3xl rounded-[28px] p-0">
        <div className="space-y-5 p-6">
          <DialogHeader>
            <DialogTitle>Gemini JSON 取り込み</DialogTitle>
            <DialogDescription>
              Geminiや検索AIから出したJSONをそのまま貼り付けて、メディア候補へ一括保存できます。
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-[220px_1fr]">
            <div className="space-y-2">
              <Label htmlFor="campaign-override">案件の上書き</Label>
              <Select
                value={campaignOverride}
                onValueChange={(value) => setCampaignOverride(value ?? 'keep-json')}
              >
                <SelectTrigger id="campaign-override" className="rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep-json">JSONの campaign_id を使う</SelectItem>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.campaign_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs leading-5 text-slate-500">
                `campaign_id` が空のJSONでも、ここで案件を選べば一括で紐づけられます。
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="media-json">JSON</Label>
              <Textarea
                id="media-json"
                value={jsonText}
                onChange={(event) => setJsonText(event.target.value)}
                className="min-h-[320px] rounded-[24px] border-slate-200 bg-slate-50 px-4 py-3 font-mono text-xs"
                placeholder={exampleText}
              />
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Braces className="size-4 text-slate-500" />
              受け付ける形式
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {'`[{...}]`'} か {'`{ "candidates": [...] }`'} 形式を受け付けます。必須は
              {' `media_name` `domain` `url` '} と、JSONまたは上書き選択での {'`campaign_id`'} です。
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
                不足項目は自動補完
              </Badge>
              <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
                配列をそのまま一括保存
              </Badge>
              <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
                ランク未指定ならスコアから自動判定
              </Badge>
            </div>
          </div>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {warnings.length > 0 ? (
            <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p className="font-semibold">一部候補をスキップしたっぴ</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {warnings.slice(0, 5).map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              className="rounded-2xl"
              onClick={() => {
                setOpen(false)
                resetState()
              }}
            >
              キャンセル
            </Button>
            <Button
              className="rounded-2xl"
              onClick={() => void handleImport()}
              disabled={submitting || jsonText.trim().length === 0}
            >
              {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
              取り込む
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
