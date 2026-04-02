'use client'

import { ShieldAlert } from 'lucide-react'

export default function PermissionBanner({
  title = '閲覧専用モードです',
  description = 'このアカウントでは更新系の操作はできません。内容確認のみ可能です。',
}: {
  title?: string
  description?: string
}) {
  return (
    <section className="surface-panel flex items-start gap-3 p-4 md:p-5">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
        <ShieldAlert className="size-4" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </section>
  )
}
