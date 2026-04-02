# ASP Media Recruiting

ASP案件向けのメディア候補収集、文面生成、送信管理をまとめた Next.js App Router アプリです。

## セットアップ

1. 依存関係を入れます。

```bash
npm install
```

2. 環境変数を用意します。

```bash
cp .env.local.example .env.local
```

3. 必要に応じて `supabase/schema.sql` を Supabase に適用します。

4. 開発サーバーを起動します。

```bash
npm run dev -- --port 3001
```

## ログイン

デモモードでは以下の認証情報を使えます。

- `admin@demo.local` / `demo-admin`
- `viewer@demo.local` / `demo-viewer`

## 動作モード

- Supabase と Gemini が設定されている場合は実接続で動きます。
- 未設定の場合でも、デモ用メモリストアとモック AI 応答で画面確認できます。
- デモモードの保存データはサーバー再起動で初期化されます。

## 必須の環境変数

- `GEMINI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 任意の環境変数

- `APP_BASE_URL`
- `APP_ALLOW_INDEXING`
- `GEMINI_TIMEOUT_MS`
- `GEMINI_RETRIES`
- `GOOGLE_SEARCH_API_KEY`
- `GOOGLE_SEARCH_CX`
- `GOOGLE_SEARCH_TIMEOUT_MS`
- `MEDIA_COLLECT_MAX_SITES`
- `MEDIA_COLLECT_QUERY_LIMIT`
- `MEDIA_COLLECT_DELAY_MS`
- `APP_ADMIN_EMAIL`
- `APP_ADMIN_PASSWORD`
- `APP_VIEWER_EMAIL`
- `APP_VIEWER_PASSWORD`

## デモ確認の導線

- `/campaigns`
- `/media`
- `/media/:id`
- `/outreach`
- `/api/health`

## デプロイ前チェック

1. `APP_BASE_URL` を公開URLに合わせる
2. `APP_ALLOW_INDEXING` は通常 `false` のままにする
3. Supabase を使う場合は `supabase/schema.sql` を適用する
4. Vercel などの環境変数に `.env.local.example` の値を登録する
5. デプロイ後に `/api/health` で設定反映を確認する

## 検証コマンド

```bash
npm run lint
npm run build
```
