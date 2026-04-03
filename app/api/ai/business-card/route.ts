import { NextRequest, NextResponse } from 'next/server'

import { toApiErrorMessage } from '@/lib/ai'
import { requireWriteUser } from '@/lib/auth'
import { callClaudeVision } from '@/lib/claude'

export async function POST(request: NextRequest) {
  try {
    await requireWriteUser()

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'image file is required' }, { status: 400 })
    }

    const base64Data = Buffer.from(await file.arrayBuffer()).toString('base64')
    const result = await callClaudeVision<{
      operator_name: string
      contact_email: string
      contact_slack_id: string
      contact_chatwork_id: string
      contact_page_url: string
      memo: string
    }>({
      mimeType: file.type,
      base64Data,
      prompt: `
名刺画像から営業連絡先を読み取り、次のJSONだけで返してください。
{
  "operator_name": "氏名または担当者名。なければ空文字",
  "contact_email": "メールアドレス。なければ空文字",
  "contact_slack_id": "Slack ID/表示名。なければ空文字",
  "contact_chatwork_id": "Chatwork ID。なければ空文字",
  "contact_page_url": "会社URLや問い合わせURL。なければ空文字",
  "memo": "補足。読み取りに自信がない項目があれば短く書く。なければ空文字"
}
      `.trim(),
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    console.error('[ai-business-card] error:', error)
    return NextResponse.json(
      { error: toApiErrorMessage(error, '名刺の読み取りに失敗しました') },
      { status: 500 }
    )
  }
}
