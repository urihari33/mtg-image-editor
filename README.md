# MTG Image Editor

Magic: The Gathering のカード画像を **Scryfall API** から取得し、ローカル PC でレイアウト編集して画像とカード名テキストを書き出すための Web アプリ（React + Vite）。

## 機能

- カード検索（日本語 / 英語の自動判定）
- 検索候補のオートコンプリート（キーボード操作対応）
- 日本語版を優先表示、無ければ英語版にフォールバック
- 横一列のレイアウト編集（複数行対応）
  - ドラッグ&ドロップで並び替え / 行間移動
  - **Shift + ドラッグ** で別カードに重ね合わせ（60% サイズ・右下揃え）
  - 末尾の「ここにドロップで新しい行」ゾーンで行追加
- PNG 書き出し（透明背景、`pixelRatio: 2` で高解像度）
- 画像クリップボードコピー
- カード名テキスト出力（`《カード名》` 形式、行=改行、同行=スペース区切り、クリップボードコピー）
- サイドバーに検索履歴（localStorage 永続、上限 100、クリアボタン）

## 必要環境

- Node.js 22 / npm 10

## セットアップ

```bash
npm install
npm run dev    # 開発サーバ (http://localhost:5173)
```

## スクリプト

| コマンド | 用途 |
|---------|------|
| `npm run dev` | 開発サーバ起動 |
| `npm run build` | 型チェック + 本番ビルド (`dist/`) |
| `npm run preview` | ビルド成果物のプレビュー |
| `npm run lint` | ESLint |
| `npm test` | Vitest を一回実行 |
| `npm run test:watch` | Vitest を watch モードで実行 |

## アーキテクチャ

```
src/
├── api/scryfall.ts        # Scryfall API クライアント（自動言語判定 + JP 優先フェッチ）
├── components/            # React コンポーネント
│   ├── SearchBox.tsx      # オートコンプリート + キーボード操作
│   ├── Canvas.tsx         # レイアウト表示 + DnD ドロップターゲット
│   ├── CardView.tsx       # 1 枚のカード表示
│   ├── Sidebar.tsx        # 検索履歴
│   ├── ImageExport.tsx    # PNG ダウンロード / クリップボード
│   └── TextOutput.tsx     # カード名テキスト出力
├── state/
│   ├── layout.ts          # レイアウト純関数（move/overlay/add/remove）
│   ├── history.ts         # 履歴 localStorage 純関数
│   └── useHistory.ts      # 履歴 React フック
├── utils/
│   └── formatCardNames.ts # 《》形式テキスト生成
├── types/card.ts          # 型定義（Scryfall + ドメイン）
└── test/                  # Vitest + msw セットアップ
```

## 開発フロー

詳細は [`AGENTS.md`](AGENTS.md) と [`Plans.md`](Plans.md) を参照。

- 要件は [`要件定義.txt`](要件定義.txt)
- 意思決定ログは [`.claude/memory/decisions.md`](.claude/memory/decisions.md)
- 品質ルールは [`.claude/rules/`](.claude/rules/)

## Scryfall API 利用上の注意

- 無料 API。User-Agent 設定とリクエスト間隔 50–100ms を遵守（クライアントは 75ms 間隔）
- `/cards/autocomplete` は **英語名のみ** 対応のため、日本語入力時は `/cards/search?q=name:Q lang:ja` で代替している
- 一部の古いカード（Alpha 専用など）は日本語版が存在しないため、その場合は英語版にフォールバックする

## ライセンス

ローカル個人利用のみを想定（公開デプロイ未対応）。
