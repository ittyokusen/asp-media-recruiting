'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, X } from 'lucide-react'

type ToastTone = 'success' | 'error' | 'info'

type ToastItem = {
  id: string
  title: string
  description?: string
  tone: ToastTone
}

type ToastContextValue = {
  showToast: (input: Omit<ToastItem, 'id'>) => void
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => undefined,
})

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback((input: Omit<ToastItem, 'id'>) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    setToasts((current) => [...current, { id, ...input }])
    window.setTimeout(() => removeToast(id), 3500)
  }, [removeToast])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastCard({
  toast,
  onClose,
}: {
  toast: ToastItem
  onClose: () => void
}) {
  const toneMap = {
    success: {
      icon: CheckCircle2,
      className: 'border-emerald-200 bg-white text-slate-900',
      iconClassName: 'text-emerald-600',
    },
    error: {
      icon: AlertCircle,
      className: 'border-rose-200 bg-white text-slate-900',
      iconClassName: 'text-rose-600',
    },
    info: {
      icon: AlertCircle,
      className: 'border-sky-200 bg-white text-slate-900',
      iconClassName: 'text-sky-600',
    },
  } as const

  const config = toneMap[toast.tone]
  const Icon = config.icon

  return (
    <div
      className={`pointer-events-auto rounded-[24px] border p-4 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)] backdrop-blur ${config.className}`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 size-5 shrink-0 ${config.iconClassName}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{toast.title}</p>
          {toast.description ? (
            <p className="mt-1 text-sm leading-6 text-slate-500">{toast.description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="close toast"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
