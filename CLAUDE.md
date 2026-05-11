# CLAUDE.md — mtgImageEditor

このファイルは Claude Code がこのプロジェクトで作業する際の前提となる情報を集約します。
作業前に必ず本ファイルと `要件定義.txt`、`Plans.md`、`.claude/memory/decisions.md` を確認してください。

## プロジェクト概要

Magic: The Gathering（MTG）のカード画像を **Scryfall API** から取得し、HTML 上でレイアウト編集して画像・カード名テキストを書き出すローカル Web アプリ。

- 用途: ローカル PC でカードリスト画像を作成（公開デプロイは現時点で想定しない）
- 取得元: Scryfall API（`https://api.scryfall.com`）
- 言語対応: 日本語 / 英語 の両方で検索可能（**翻訳ではなく Scryfall の多言語データを利用すること**）

詳細な要望は `要件定義.txt` を参照（ユーザーがオリジナル要件をそこで定義しています）。

## 技術スタック

- ランタイム: Node.js v22 / npm v10
- バンドラ: **Vite**
- UI: **React 19 + TypeScript**
- スタイル: 未確定（要件定義フェーズで決定）
- 外部 API: Scryfall（認証不要 / レート制限あり: 10 req/s 推奨）
- 配布: ローカル `npm run dev` または `npm run build` の静的 dist

## ディレクトリ規約

```
.
├── src/                 # アプリ本体（コンポーネント・ロジック）
├── public/              # 静的アセット
├── .claude/
│   ├── settings.json    # ハーネス共通設定
│   ├── memory/          # 意思決定・パターン（SSOT）
│   └── rules/           # 品質保護ルール
├── AGENTS.md            # 開発フロー（Plan→Work→Review）
├── Plans.md             # タスク管理（cc:TODO / cc:WIP / cc:blocked）
└── 要件定義.txt          # オリジナル要件（変更しない）
```

## 重要な開発原則

1. **翻訳で日英対応しない** — 要件定義の明示制約。Scryfall の `lang=ja` 等の公式多言語データを使う。
2. **予想で要件を補わない** — 不明点は実装前にユーザーへ確認する。`/plan-with-agent` で要件詰めを優先。
3. **ローカル前提** — 公開デプロイ向けの最適化（SSR・CDN 等）は不要。ただしブラウザ単体で動作する純フロントエンドを維持する。
4. **API 礼儀** — Scryfall は無料 API。User-Agent 設定とリクエスト間隔 50–100ms を守る（公式推奨）。
5. **編集前確認** — `index.html`、`vite.config.ts`、`tsconfig.json` への変更は影響範囲が広いので、Read してから Edit する。

## よく使うコマンド

| 用途 | コマンド |
|------|---------|
| 開発サーバ起動 | `npm run dev` |
| 型チェック+ビルド | `npm run build` |
| Lint | `npm run lint` |
| プレビュー（build後） | `npm run preview` |

## ハーネスのフロー

1. `/plan-with-agent` で `Plans.md` に `cc:TODO` を積む
2. `/work` で `cc:TODO` を `cc:WIP` → 実装 → `cc:DONE`
3. `/harness-review` で多角レビュー
4. 必要に応じて `/sync-status` で進捗同期

## 参考リンク（実装時に確認）

- Scryfall API ドキュメント: https://scryfall.com/docs/api
- レート制限・利用規約: https://scryfall.com/docs/api（"Rate Limits and Good Citizenship" セクション）
