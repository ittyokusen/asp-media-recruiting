import type { Campaign, MediaCandidate, OutreachDraft, OutreachLog } from '@/types'

export const mockCampaigns: Campaign[] = [
  {
    id: 'camp_001',
    campaign_name: 'アカポリWダウン',
    category: '健康食品・血糖値・血圧',
    appeal_points: ['食べたままOK', '血糖・血圧の両方にアプローチ', 'CSIRO研究成分配合'],
    ng_expressions: ['薬', '治療', '完治', '医薬品'],
    preferred_media_traits: ['体験談系', '比較記事あり', '中高年女性読者'],
    existing_good_media_examples: ['kenko-review.com', 'supplement-hikaku.jp'],
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-15T00:00:00Z',
  },
  {
    id: 'camp_002',
    campaign_name: 'ノウベルQi',
    category: '健康食品・睡眠',
    appeal_points: ['国産素材', '睡眠の質向上', '安心の無添加'],
    ng_expressions: ['睡眠薬', '治療', '診断'],
    preferred_media_traits: ['睡眠・疲労系メディア', '30〜50代読者'],
    existing_good_media_examples: [],
    created_at: '2026-03-10T00:00:00Z',
    updated_at: '2026-03-20T00:00:00Z',
  },
]

export const mockMediaCandidates: MediaCandidate[] = [
  {
    id: 'media_001',
    campaign_id: 'camp_001',
    media_name: '血糖値ケア研究所',
    domain: 'kettochi-lab.com',
    url: 'https://kettochi-lab.com',
    genre: '健康・血糖値',
    estimated_audience: '50〜70代女性',
    operator_name: '株式会社ヘルスメディア',
    operator_type: 'アフィリエイトメディア',
    contact_page_url: 'https://kettochi-lab.com/contact',
    contact_email: 'info@kettochi-lab.com',
    social_links: ['https://twitter.com/kettochi_lab'],
    summary: '血糖値に関する体験談・比較記事を多数掲載。読者の悩みに寄り添うトーン。月間PV推定10万。',
    fit_score: 88,
    priority_rank: 'S',
    fit_reason: '血糖値特化メディアで読者層が完全一致。比較記事・体験談ともに充実しており訴求しやすい。',
    status: 'ready_to_send',
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
  },
  {
    id: 'media_002',
    campaign_id: 'camp_001',
    media_name: '健康生活ノート',
    domain: 'kenko-note.jp',
    url: 'https://kenko-note.jp',
    genre: '健康・生活習慣',
    estimated_audience: '40〜60代',
    operator_name: '個人運営',
    operator_type: '個人ブログ（アフィリ運営）',
    contact_page_url: 'https://kenko-note.jp/contact',
    contact_email: '',
    social_links: [],
    summary: '生活習慣病・ダイエット・サプリに関する幅広い記事。更新頻度は高め。',
    fit_score: 72,
    priority_rank: 'A',
    fit_reason: '生活習慣改善系で親和性あり。血糖値特化ではないが読者層は合致。',
    status: 'unreviewed',
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
  },
  {
    id: 'media_003',
    campaign_id: 'camp_001',
    media_name: 'サプリ比較ナビ',
    domain: 'supple-navi.com',
    url: 'https://supple-navi.com',
    genre: 'サプリ比較',
    estimated_audience: '30〜50代',
    operator_name: '株式会社コンテンツラボ',
    operator_type: '比較メディア',
    contact_page_url: 'https://supple-navi.com/contact',
    contact_email: 'media@supple-navi.com',
    social_links: ['https://twitter.com/supple_navi', 'https://instagram.com/supple_navi'],
    summary: 'サプリ全般の比較・ランキング記事に特化。SEO強め。血糖・血圧カテゴリあり。',
    fit_score: 81,
    priority_rank: 'A',
    fit_reason: '比較記事でのアカポリ紹介に最適。血糖・血圧カテゴリが既存なので掲載交渉しやすい。',
    status: 'sent',
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
  },
  {
    id: 'media_004',
    campaign_id: 'camp_001',
    media_name: '美容と健康のまとめ',
    domain: 'bijou-kenko.net',
    url: 'https://bijou-kenko.net',
    genre: '美容・健康',
    estimated_audience: '20〜40代女性',
    operator_name: '個人運営',
    operator_type: '個人ブログ',
    contact_page_url: '',
    contact_email: '',
    social_links: ['https://instagram.com/bijou_kenko'],
    summary: '美容メインで健康カテゴリは薄い。読者層が若めでターゲットとずれあり。',
    fit_score: 42,
    priority_rank: 'C',
    fit_reason: '読者層が若く、血糖・血圧の訴求に合わない可能性が高い。',
    status: 'passed',
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
  },
]

export const mockOutreachDrafts: OutreachDraft[] = [
  {
    id: 'draft_001',
    media_candidate_id: 'media_001',
    subject: '【提携のご相談】血糖値ケア研究所様への新規案件ご紹介',
    body: `血糖値ケア研究所 ご担当者様

突然のご連絡失礼いたします。
○○株式会社の△△と申します。

貴メディアの「血糖値ケア研究所」様の記事を拝見し、読者様の丁寧な悩みに向き合ったコンテンツに共感いたしました。

この度、弊社が取り扱う「アカポリWダウン」という健康食品のアフィリエイト提携についてご相談させていただきたく、ご連絡いたしました。

【アカポリWダウンの特長】
・血糖値と血圧の両方にアプローチする国内唯一の処方
・CSIRO研究成分「ナリンジン」配合
・食事制限不要で続けやすい設計

貴メディアの読者様と非常に親和性が高いと感じており、ぜひ一度詳細をご案内させていただければと思います。

ご検討いただけますと幸いです。どうぞよろしくお願いいたします。

---
△△ ○○（担当者名）
○○株式会社
`,
    tone: 'ていねい',
    personalization_points: ['体験談記事への言及', '読者層が一致する点', '既存コンテンツとの親和性'],
    approval_status: 'approved',
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
  },
]

export const mockOutreachLogs: OutreachLog[] = [
  {
    id: 'log_001',
    media_candidate_id: 'media_003',
    draft_id: 'draft_001',
    sent_by: '田中',
    sent_at: '2026-04-01T10:00:00Z',
    delivery_status: 'delivered',
    reply_status: 'none',
    next_action: '1週間後にフォローアップ',
    memo: '',
  },
]
