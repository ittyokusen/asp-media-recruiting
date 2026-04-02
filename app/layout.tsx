import type { Metadata } from 'next'
import { headers } from 'next/headers'

import { AuthProvider } from '@/components/AuthProvider'
import Sidebar from '@/components/Sidebar'
import { ToastProvider } from '@/components/ToastProvider'
import { getCurrentUser } from '@/lib/auth'

import './globals.css'

const appBaseUrl = process.env.APP_BASE_URL
const allowIndexing = process.env.APP_ALLOW_INDEXING === 'true'

export const metadata: Metadata = {
  title: 'ASP メディア開拓ツール',
  description: '新規提携メディア候補の収集・分析・営業支援ツール',
  metadataBase: appBaseUrl ? new URL(appBaseUrl) : undefined,
  robots: allowIndexing
    ? {
        index: true,
        follow: true,
      }
    : {
        index: false,
        follow: false,
      },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const userPromise = getCurrentUser()
  const headersPromise = headers()

  return (
    <LayoutInner userPromise={userPromise} headersPromise={headersPromise}>
      {children}
    </LayoutInner>
  )
}

async function LayoutInner({
  userPromise,
  headersPromise,
  children,
}: {
  userPromise: ReturnType<typeof getCurrentUser>
  headersPromise: ReturnType<typeof headers>
  children: React.ReactNode
}) {
  const [user, requestHeaders] = await Promise.all([userPromise, headersPromise])
  const pathname = requestHeaders.get('x-pathname') ?? '/'
  const showSidebar = pathname !== '/login'

  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.12),transparent_30%),linear-gradient(180deg,#f8fafc_0%,#f7f5ef_100%)] text-slate-950">
        <AuthProvider user={user}>
          <ToastProvider>
            <div className="min-h-screen md:flex">
              {showSidebar ? <Sidebar currentUser={user} /> : null}
              <main className="flex-1 overflow-auto">
                <div className="min-h-screen px-4 py-4 md:px-8 md:py-6">{children}</div>
              </main>
            </div>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
