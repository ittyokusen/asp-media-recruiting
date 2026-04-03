-- =============================================
-- ASP メディア開拓ツール - Supabase スキーマ
-- =============================================

-- 案件テーブル
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  campaign_name text not null,
  category text not null,
  appeal_points text[] default '{}',
  ng_expressions text[] default '{}',
  preferred_media_traits text[] default '{}',
  existing_good_media_examples text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- メディア候補テーブル
create type priority_rank as enum ('S', 'A', 'B', 'C');
create type media_status as enum (
  'unreviewed',
  'ready_to_send',
  'sent',
  'replied',
  'interested',
  'partnered',
  'passed',
  'retry_candidate'
);

create table media_candidates (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  media_name text,
  domain text not null,
  url text not null,
  genre text,
  estimated_audience text,
  operator_name text,
  operator_type text,
  contact_page_url text,
  contact_email text,
  contact_slack_id text default '',
  contact_chatwork_id text default '',
  assigned_owner text default '',
  social_links text[] default '{}',
  summary text,
  fit_score integer check (fit_score >= 0 and fit_score <= 100),
  priority_rank priority_rank,
  fit_reason text,
  status media_status default 'unreviewed',
  raw_html text, -- クロール時の生HTML（デバッグ用）
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(campaign_id, domain) -- 同一案件内のドメイン重複防止
);

-- メール下書きテーブル
create type approval_status as enum ('pending', 'approved', 'rejected');

create table outreach_drafts (
  id uuid primary key default gen_random_uuid(),
  media_candidate_id uuid references media_candidates(id) on delete cascade,
  subject text not null,
  body text not null,
  tone text default 'ていねい',
  personalization_points text[] default '{}',
  approval_status approval_status default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 送信ログテーブル
create type delivery_status as enum ('pending', 'delivered', 'bounced', 'failed');
create type reply_status as enum ('none', 'replied', 'interested', 'declined');

create table outreach_logs (
  id uuid primary key default gen_random_uuid(),
  media_candidate_id uuid references media_candidates(id) on delete cascade,
  draft_id uuid references outreach_drafts(id),
  sent_by text not null,
  sent_at timestamptz default now(),
  delivery_status delivery_status default 'pending',
  reply_status reply_status default 'none',
  reply_body text default '',
  reply_received_at timestamptz,
  next_action text,
  memo text,
  created_at timestamptz default now()
);

-- =============================================
-- インデックス
-- =============================================
create index idx_media_candidates_campaign_id on media_candidates(campaign_id);
create index idx_media_candidates_status on media_candidates(status);
create index idx_media_candidates_priority_rank on media_candidates(priority_rank);
create index idx_outreach_logs_media_candidate_id on outreach_logs(media_candidate_id);

-- 確定メディア管理テーブル
create type managed_media_status as enum ('negotiating', 'active', 'paused', 'completed');

create table managed_media (
  id uuid primary key default gen_random_uuid(),
  source_media_candidate_id uuid references media_candidates(id) on delete set null,
  campaign_id uuid references campaigns(id) on delete set null,
  media_name text not null,
  domain text not null,
  url text not null,
  product_name text not null default '',
  placement_type text not null default '',
  contract_status managed_media_status default 'negotiating',
  start_date date,
  end_date date,
  unit_price text not null default '',
  reward_rule text not null default '',
  owner_name text not null default '',
  monthly_volume text not null default '',
  memo text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_managed_media_campaign_id on managed_media(campaign_id);
create index idx_managed_media_contract_status on managed_media(contract_status);

-- =============================================
-- updated_at 自動更新トリガー
-- =============================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger campaigns_updated_at
  before update on campaigns
  for each row execute function update_updated_at();

create trigger media_candidates_updated_at
  before update on media_candidates
  for each row execute function update_updated_at();

create trigger outreach_drafts_updated_at
  before update on outreach_drafts
  for each row execute function update_updated_at();

create trigger managed_media_updated_at
  before update on managed_media
  for each row execute function update_updated_at();

-- =============================================
-- RLS（Row Level Security）※認証実装時に有効化
-- =============================================
-- alter table campaigns enable row level security;
-- alter table media_candidates enable row level security;
-- alter table outreach_drafts enable row level security;
-- alter table outreach_logs enable row level security;
