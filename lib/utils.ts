import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitizeForPrompt(input: string): string {
  return input
    .replace(/```/g, '')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .slice(0, 500)
}

export function extractHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
