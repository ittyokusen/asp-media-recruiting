'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Filter, Globe, Loader2, Mail, Search, SlidersHorizontal } from 'lucide-react'

import PermissionBanner from '@/components/PermissionBanner'
import { useAuth } from '@/components/AuthProvider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RANK_COLORS, STATUS_COLORS, STATUS_LABELS } from '@/lib/constants'
import type { Campaign, MediaCandidate } from '@/types'

const rankOptions = ['all', 'S', 'A', 'B', 'C'] as const

export default function MediaListClient({ initialCampaign }: { initialCampaign: string }) {
  const { canWrite } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [mediaCandidates, setMediaCandidates] = useState<MediaCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [keyword, setKeyword] = useState('')
  const [selectedCampaign, setSelectedCampaign] = useState(initialCampaign)
  const [selectedRank, setSelectedRank] = useState<(typeof rankOptions)[number]>('all')
  const [selectedStatus, setSelectedStatus] = useState<'all' | keyof typeof STATUS_LABELS>('all')

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [campaignsRes, mediaRes] = await Promise.all([
        fetch('/api/campaigns', { cache: 'no-store' }),
        fetch('/api/media', { cache: 'no-store' }),
      ])

      if (!campaignsRes.ok || !mediaRes.ok) {
        throw new Error('メディアデータの取得に失敗しました')
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

  const filteredCandidates = mediaCandidates.filter((media) => {
    const normalizedKeyword = keyword.trim().toLowerCase()
    const matchesKeyword =
      normalizedKeyword.length === 0 ||
      [
        media.media_name,
        media.domain,
        media.genre,
        media.estimated_audience,
        media.operator_name,
      ].some((value) => value.toLowerCase().includes(normalizedKeyword))
    const matchesCampaign = selectedCampaign === 'all' || media.campaign_id === selectedCampaign
    const matchesRank = selectedRank === 'all' || media.priority_rank === selectedRank
    const matchesStatus = selectedStatus === 'all' || media.status === selectedStatus

    return matchesKeyword && matchesCampaign && matchesRank && matchesStatus
  })

  const readyCount = filteredCandidates.filter((media) => media.status === 'ready_to_send').length
  const withContactCount = filteredCandidates.filter(
    (media) => Boolean(media.contact_email || media.contact_page_url)
  ).length
  const avgScore =
    filteredCandidates.length > 0
      ? Math.round(
          filteredCandidates.reduce((sum, media) => sum + media.fit_score, 0) / filteredCandidates.length
        )
      : 0

  return (
    <div className="space-y-6">
      <section className="surface-panel overflow-hidden">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.35fr_0.9fr] lg:p-8">
          <div>
            <Badge className="mb-4 bg-slate-900 text-white">Media Prospecting</Badge>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
              メディア候補
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              案件別、ランク別、ステータス別の絞り込みをクライアントサイドで即時反映します。
              初回の精査から送信待ち候補の洗い出しまで、一覧上で判断しやすくしました。
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { label: '表示中の候補', value: `${filteredCandidates.length}件`, icon: Search },
              { label: '送信待ち', value: `${readyCount}件`, icon: Mail },
              { label: '平均スコア', value: `${avgScore}`, icon: Filter },
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
                  <p className="mt-4 text-3xl font-semibold text-slate-950">{item.value}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {error ? (
        <section className="surface-panel flex items-center justify-between gap-4 p-5">
          <p className="text-sm text-rose-600">{error}</p>
          <Button variant="outline" className="rounded-2xl" onClick={() => void loadData()}>
            再読み込み
          </Button>
        </section>
      ) : null}

      {!canWrite ? (
        <PermissionBanner
          title="一覧画面の編集権限"
          description="詳細画面での文面生成や案件画面での追加・一括収集は、管理者アカウントでのみ実行できます。"
        />
      ) : null}

      <section className="surface-panel p-4 md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <SlidersHorizontal className="size-4 text-slate-500" />
              フィルター
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="メディア名、ドメイン、運営者で検索"
                className="h-11 rounded-2xl border-slate-200 bg-white pl-10"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:w-[560px]">
            <FilterSelect
              label="案件"
              value={selectedCampaign}
              onValueChange={(value) => setSelectedCampaign(value ?? 'all')}
              options={[
                { value: 'all', label: 'すべての案件' },
                ...campaigns.map((campaign) => ({
                  value: campaign.id,
                  label: campaign.campaign_name,
                })),
              ]}
            />
            <FilterSelect
              label="ランク"
              value={selectedRank}
              onValueChange={(value) =>
                setSelectedRank((value as (typeof rankOptions)[number] | null) ?? 'all')
              }
              options={rankOptions.map((rank) => ({
                value: rank,
                label: rank === 'all' ? 'すべてのランク' : `ランク ${rank}`,
              }))}
            />
            <FilterSelect
              label="ステータス"
              value={selectedStatus}
              onValueChange={(value) =>
                setSelectedStatus((value as 'all' | keyof typeof STATUS_LABELS | null) ?? 'all')
              }
              options={[
                { value: 'all', label: 'すべてのステータス' },
                ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
              ]}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[24px] bg-slate-50 px-4 py-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
              問い合わせ先あり {withContactCount}件
            </Badge>
            <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
              送信待ち {readyCount}件
            </Badge>
          </div>
          <Button
            variant="outline"
            className="rounded-2xl"
            onClick={() => {
              setKeyword('')
              setSelectedCampaign('all')
              setSelectedRank('all')
              setSelectedStatus('all')
            }}
          >
            条件をリセット
          </Button>
        </div>
      </section>

      {loading ? (
        <section className="surface-panel flex min-h-52 items-center justify-center p-6">
          <div className="flex items-center gap-3 text-slate-500">
            <Loader2 className="size-5 animate-spin" />
            メディア一覧を読み込み中...
          </div>
        </section>
      ) : (
        <section className="surface-panel overflow-hidden">
          <div className="hidden overflow-x-auto lg:block">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-200 bg-slate-50/90 hover:bg-slate-50/90">
                  <TableHead className="w-16 text-center">ランク</TableHead>
                  <TableHead>メディア</TableHead>
                  <TableHead>ジャンル</TableHead>
                  <TableHead>読者層</TableHead>
                  <TableHead className="text-right">スコア</TableHead>
                  <TableHead>問い合わせ</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCandidates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-14 text-center text-slate-400">
                      条件に一致するメディア候補はありません
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCandidates.map((media) => (
                    <TableRow key={media.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex size-9 items-center justify-center rounded-full text-xs font-bold ${RANK_COLORS[media.priority_rank]}`}
                        >
                          {media.priority_rank}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-950">{media.media_name}</p>
                          <a
                            href={media.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-xs text-teal-700 hover:underline"
                          >
                            <Globe className="size-3" />
                            {media.domain}
                          </a>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{media.genre}</TableCell>
                      <TableCell className="text-sm text-slate-600">{media.estimated_audience}</TableCell>
                      <TableCell className="text-right">
                        <span className="text-lg font-semibold text-slate-950">{media.fit_score}</span>
                        <span className="text-xs text-slate-400"> / 100</span>
                      </TableCell>
                      <TableCell>
                        <ContactBadge
                          hasEmail={Boolean(media.contact_email)}
                          hasForm={Boolean(media.contact_page_url)}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[media.status]}>{STATUS_LABELS[media.status]}</Badge>
                      </TableCell>
                      <TableCell>
                        <Link href={`/media/${media.id}`}>
                          <Button variant="ghost" className="rounded-2xl">
                            詳細
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-4 p-4 lg:hidden">
            {filteredCandidates.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
                条件に一致するメディア候補はありません
              </div>
            ) : (
              filteredCandidates.map((media) => (
                <Card key={media.id} className="rounded-[24px] border border-slate-200 bg-white/90 py-0 shadow-none">
                  <CardContent className="space-y-4 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-flex size-9 items-center justify-center rounded-full text-xs font-bold ${RANK_COLORS[media.priority_rank]}`}
                          >
                            {media.priority_rank}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-950">{media.media_name}</p>
                            <p className="text-xs text-slate-500">{media.genre}</p>
                          </div>
                        </div>
                      </div>
                      <Badge className={STATUS_COLORS[media.status]}>{STATUS_LABELS[media.status]}</Badge>
                    </div>
                    <a
                      href={media.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex max-w-full items-center gap-1 text-xs text-teal-700 hover:underline"
                    >
                      <Globe className="size-3 shrink-0" />
                      <span className="truncate">{media.domain}</span>
                    </a>
                    <p className="text-sm leading-6 text-slate-600">{media.summary}</p>
                    <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
                      <InfoPair label="読者層" value={media.estimated_audience} />
                      <InfoPair label="スコア" value={`${media.fit_score} / 100`} />
                      <InfoPair label="運営者" value={media.operator_name} />
                      <InfoPair
                        label="問い合わせ"
                        value={media.contact_email ? 'メールあり' : media.contact_page_url ? 'フォームのみ' : 'なし'}
                      />
                    </div>
                    <Link href={`/media/${media.id}`}>
                      <Button className="w-full rounded-2xl">詳細を見る</Button>
                    </Link>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string
  value: string
  onValueChange: (value: string | null) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-11 w-full rounded-2xl border-slate-200 bg-white px-3">
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

function ContactBadge({
  hasEmail,
  hasForm,
}: {
  hasEmail: boolean
  hasForm: boolean
}) {
  if (hasEmail) {
    return <Badge className="bg-emerald-100 text-emerald-700">メールあり</Badge>
  }

  if (hasForm) {
    return <Badge className="bg-amber-100 text-amber-700">フォームのみ</Badge>
  }

  return <Badge className="bg-rose-100 text-rose-700">問い合わせ先なし</Badge>
}

function InfoPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-700">{value}</p>
    </div>
  )
}
