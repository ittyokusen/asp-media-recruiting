import { NextResponse } from 'next/server'

import { getDemoCredentials } from '@/lib/auth'
import { hasSupabaseEnv } from '@/lib/supabase'

export async function GET() {
  const supabaseReady = hasSupabaseEnv()
  const geminiReady = Boolean(process.env.GEMINI_API_KEY)
  const searchReady = Boolean(process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_CX)

  return NextResponse.json({
    status: 'ok',
    mode: supabaseReady ? 'database' : 'demo',
    services: {
      supabase: supabaseReady,
      gemini: geminiReady,
      googleSearch: searchReady,
    },
    demoUsers: getDemoCredentials().map(({ email, role }) => ({ email, role })),
    checkedAt: new Date().toISOString(),
  })
}
