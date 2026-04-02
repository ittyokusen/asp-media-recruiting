export class AIRequestError extends Error {
  code: 'timeout' | 'rate_limit' | 'invalid_json' | 'upstream' | 'forbidden'

  constructor(
    code: 'timeout' | 'rate_limit' | 'invalid_json' | 'upstream' | 'forbidden',
    message: string
  ) {
    super(message)
    this.name = 'AIRequestError'
    this.code = code
  }
}

export function extractJsonBlock(text: string) {
  const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
  if (!match) {
    throw new AIRequestError('invalid_json', 'AI response did not contain valid JSON')
  }

  return match[0]
}

export async function withTimeout<T>(
  task: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number
) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await task(controller.signal)
  } catch (error) {
    if (controller.signal.aborted) {
      throw new AIRequestError('timeout', `AI request timed out after ${timeoutMs}ms`)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function withRetry<T>(
  task: (attempt: number) => Promise<T>,
  options: {
    retries: number
    retryDelayMs?: number
    shouldRetry?: (error: unknown) => boolean
  }
) {
  const retryDelayMs = options.retryDelayMs ?? 700
  const shouldRetry =
    options.shouldRetry ??
    ((error: unknown) =>
      error instanceof AIRequestError
        ? error.code === 'timeout' || error.code === 'rate_limit' || error.code === 'upstream'
        : true)

  let lastError: unknown

  for (let attempt = 0; attempt <= options.retries; attempt += 1) {
    try {
      return await task(attempt)
    } catch (error) {
      lastError = error
      if (attempt === options.retries || !shouldRetry(error)) {
        throw error
      }

      await new Promise((resolve) => setTimeout(resolve, retryDelayMs * (attempt + 1)))
    }
  }

  throw lastError
}

export function toApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AIRequestError) {
    if (error.code === 'timeout') return 'AI応答がタイムアウトしました。時間をおいて再試行してください。'
    if (error.code === 'rate_limit') return 'AI API の上限に達しました。少し待ってから再試行してください。'
    if (error.code === 'invalid_json') return 'AIレスポンスの解析に失敗しました。再実行してください。'
    return error.message
  }

  return error instanceof Error ? error.message : fallback
}
