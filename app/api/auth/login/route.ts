import { NextRequest, NextResponse } from 'next/server'

import { authenticateUser, createSessionToken, getAuthCookieName } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: string
      password?: string
    }

    if (!body.email || !body.password) {
      return NextResponse.json({ error: 'email and password are required' }, { status: 400 })
    }

    const user = authenticateUser(body.email, body.password)
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const response = NextResponse.json({ user })
    response.cookies.set(getAuthCookieName(), createSessionToken(user), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })

    return response
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
