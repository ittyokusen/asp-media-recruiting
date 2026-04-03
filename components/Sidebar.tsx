'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BriefcaseBusiness,
  ChevronRight,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  Search,
  Sparkles,
} from 'lucide-react'

import type { AuthUser } from '@/lib/auth'
import { cn } from '@/lib/utils'
import type { Campaign, MediaCandidate } from '@/types'

const navItems = [
  { href: '/campaigns', label: '案件管理', icon: BriefcaseBusiness },
  { href: '/media', label: 'メディア候補', icon: Search },
  { href: '/outreach', label: '連絡管理', icon: Mail },
]

export default function Sidebar({ currentUser }: { currentUser: AuthUser | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [mediaCandidates, setMediaCandidates] = useState<MediaCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadStats = async () => {
      try {
        const [campaignsRes, mediaRes] = await Promise.all([
          fetch('/api/campaigns', { cache: 'no-store' }),
          fetch('/api/media', { cache: 'no-store' }),
        ])

        if (!campaignsRes.ok || !mediaRes.ok) {
          throw new Error('Failed to load sidebar stats')
        }

        const [campaignsData, mediaData] = await Promise.all([
          campaignsRes.json() as Promise<Campaign[]>,
          mediaRes.json() as Promise<MediaCandidate[]>,
        ])

        if (!cancelled) {
          setCampaigns(campaignsData)
          setMediaCandidates(mediaData)
        }
      } catch {
        if (!cancelled) {
          setCampaigns([])
          setMediaCandidates([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadStats()

    return () => {
      cancelled = true
    }
  }, [])

  const quickStats = [
    {
      label: '進行中案件',
      value: loading ? '...' : `${campaigns.length}件`,
    },
    {
      label: '候補メディア',
      value: loading ? '...' : `${mediaCandidates.length}件`,
    },
  ]

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <aside className="w-full border-b border-white/60 bg-[#fbfaf7]/90 backdrop-blur md:sticky md:top-0 md:h-screen md:w-72 md:border-r md:border-b-0">
      <div className="flex h-full flex-col">
        <div className="border-b border-slate-200/80 px-4 py-4 md:px-5 md:py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f766e,#0f172a)] text-white shadow-lg shadow-teal-900/15 md:size-11">
              <LayoutDashboard className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">ASP Media Recruiting</p>
              <p className="hidden text-xs text-slate-500 sm:block">営業準備から連絡管理まで一元化</p>
            </div>
          </div>
          {currentUser ? (
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-700">{currentUser.email}</p>
                <p className="text-[11px] text-slate-400">
                  {currentUser.role === 'admin' ? '管理者' : '閲覧専用'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                disabled={loggingOut}
              >
                <LogOut className="size-3.5" />
                {loggingOut ? '...' : 'ログアウト'}
              </button>
            </div>
          ) : null}
        </div>

        <div className="flex-1 px-3 py-3 md:px-4 md:py-4">
          <nav className="flex gap-2 overflow-x-auto pb-2 md:flex-col md:overflow-visible">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = pathname.startsWith(item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group flex min-w-[128px] items-center gap-2 rounded-2xl border px-3 py-2.5 text-sm transition-all sm:min-w-fit md:min-w-0 md:gap-3 md:px-4 md:py-3',
                    active
                      ? 'border-teal-200 bg-teal-950 text-white shadow-lg shadow-teal-950/15'
                      : 'border-slate-200 bg-white/85 text-slate-600 hover:border-teal-100 hover:bg-white hover:text-slate-900'
                  )}
                >
                  <div
                    className={cn(
                      'flex size-8 items-center justify-center rounded-xl md:size-9',
                      active ? 'bg-white/12' : 'bg-slate-100 text-slate-700'
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-nowrap font-medium">{item.label}</p>
                    <p
                      className={cn(
                        'hidden text-xs md:block',
                        active ? 'text-white/70' : 'text-slate-400'
                      )}
                    >
                      {item.href === '/campaigns'
                        ? '案件の訴求・配信条件を整理'
                        : item.href === '/media'
                          ? '候補メディアを比較・絞り込み'
                          : '送信待ち・返信状況を追跡'}
                    </p>
                  </div>
                  <ChevronRight
                    className={cn(
                      'hidden size-4 sm:block',
                      active ? 'text-white/70' : 'text-slate-300'
                    )}
                  />
                </Link>
              )
            })}
          </nav>

          <div className="mt-5 hidden rounded-[28px] border border-slate-200 bg-white/90 p-4 md:block">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Sparkles className="size-4 text-teal-700" />
              現在のスナップショット
              {loading ? <Loader2 className="ml-auto size-4 animate-spin text-slate-400" /> : null}
            </div>
            <div className="space-y-2">
              {quickStats.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2"
                >
                  <span className="text-xs text-slate-500">{item.label}</span>
                  <span className="text-sm font-semibold text-slate-900">{item.value}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl bg-[linear-gradient(135deg,rgba(15,118,110,0.12),rgba(15,23,42,0.08))] p-3 text-xs leading-5 text-slate-600">
              優先度の高い案件から候補抽出、文面確認、送信まで同じ導線で追えるように設計しています。
            </div>
          </div>
        </div>

        <div className="hidden border-t border-slate-200/80 px-5 py-4 text-xs text-slate-400 md:block">
          v0.1 preview
        </div>
      </div>
    </aside>
  )
}
