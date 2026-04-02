'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, LockKeyhole } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const DEMO_ACCOUNTS = [
  { role: '管理者', email: 'admin@demo.local', password: 'demo-admin' },
  { role: '閲覧専用', email: 'viewer@demo.local', password: 'demo-viewer' },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState(DEMO_ACCOUNTS[0].email)
  const [password, setPassword] = useState(DEMO_ACCOUNTS[0].password)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error ?? 'ログインに失敗しました')
      }

      router.push('/campaigns')
      router.refresh()
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'ログインに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="surface-panel overflow-hidden p-8 lg:p-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-100 px-3 py-1 text-sm font-medium text-teal-800">
            <LockKeyhole className="size-4" />
            Secure Workspace
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-950">
            ASP メディア開拓ツール
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 md:text-base">
            案件管理、候補メディア収集、メール文面生成、送信管理までを一つの導線で扱う運用画面です。
            ログイン後、権限に応じて編集機能も切り替わります。
          </p>
          <div className="mt-8 grid gap-3 md:grid-cols-2">
            {DEMO_ACCOUNTS.map((account) => (
              <div key={account.role} className="rounded-[24px] border border-slate-200 bg-white/85 p-4">
                <p className="text-sm font-semibold text-slate-900">{account.role}</p>
                <p className="mt-2 text-xs text-slate-500">email: {account.email}</p>
                <p className="mt-1 text-xs text-slate-500">password: {account.password}</p>
              </div>
            ))}
          </div>
        </section>

        <Card className="rounded-[28px] border-white/70 bg-white/90">
          <CardHeader>
            <CardTitle>ログイン</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input id="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">パスワード</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              {error ? <p className="text-sm text-rose-600">{error}</p> : null}
              <Button type="submit" className="w-full rounded-2xl" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    ログイン中...
                  </>
                ) : (
                  'ログイン'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
