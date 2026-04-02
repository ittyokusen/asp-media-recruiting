import { cookies } from 'next/headers'

export type UserRole = 'admin' | 'viewer'

export type AuthUser = {
  email: string
  role: UserRole
}

type AuthAccount = AuthUser & {
  password: string
}

const AUTH_COOKIE_NAME = 'asp_auth'

function base64UrlEncode(input: string) {
  return Buffer.from(input).toString('base64url')
}

function base64UrlDecode(input: string) {
  return Buffer.from(input, 'base64url').toString('utf8')
}

function defaultAccounts(): AuthAccount[] {
  return [
    {
      email: process.env.APP_ADMIN_EMAIL || 'admin@demo.local',
      password: process.env.APP_ADMIN_PASSWORD || 'demo-admin',
      role: 'admin',
    },
    {
      email: process.env.APP_VIEWER_EMAIL || 'viewer@demo.local',
      password: process.env.APP_VIEWER_PASSWORD || 'demo-viewer',
      role: 'viewer',
    },
  ]
}

export function getDemoCredentials() {
  return defaultAccounts().map(({ email, password, role }) => ({ email, password, role }))
}

export function authenticateUser(email: string, password: string): AuthUser | null {
  const account = defaultAccounts().find(
    (candidate) => candidate.email === email.trim() && candidate.password === password
  )

  if (!account) {
    return null
  }

  return {
    email: account.email,
    role: account.role,
  }
}

export function createSessionToken(user: AuthUser) {
  return base64UrlEncode(
    JSON.stringify({
      email: user.email,
      role: user.role,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
    })
  )
}

export function verifySessionToken(token?: string | null): AuthUser | null {
  if (!token) {
    return null
  }

  try {
    const decoded = JSON.parse(base64UrlDecode(token)) as {
      email: string
      role: UserRole
      exp: number
    }

    if (!decoded.exp || decoded.exp < Date.now()) {
      return null
    }

    return {
      email: decoded.email,
      role: decoded.role,
    }
  } catch {
    return null
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies()
  return verifySessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value)
}

export function getAuthCookieName() {
  return AUTH_COOKIE_NAME
}

export function canWrite(user: AuthUser | null) {
  return user?.role === 'admin'
}

export async function requireWriteUser() {
  const user = await getCurrentUser()

  if (!canWrite(user)) {
    throw new Error('Forbidden')
  }

  return user
}
