# MTG Image Editor

Magic: The Gathering のカード画像を **Scryfall API** から取得し、ブラウザ上でレイアウト編集して画像とカード名テキストを書き出す Web アプリ（React + Vite）。サーバ不要のクライアント完結型で、Cloudflare Pages 等の静的ホスティングで公開できます。

## 機能

- カード検索（日本語 / 英語の自動判定、オートコンプリート、キーボード操作）
- 日本語版を優先表示、無ければ英語版にフォールバック（左上に `EN` バッジ表示）
- 言語優先 / 年代優先トグル（localStorage 永続）
- プリント一覧モーダル（絵柄選択モード、`unique=prints&include_multilingual`）
- 両面カード（DFC）の表↔裏切替
- 横一列のレイアウト編集（複数行対応）
  - ドラッグ&ドロップで並び替え / 行間移動 / 履歴サイドバーからも配置可
  - **重ね合わせドロップゾーン** で既存カードの右下に 60% サイズ重ね配置
  - 末尾の「ここにドロップで新しい行」ゾーンで行追加
- PNG 書き出し（Canvas 2D 直接描画、`pixelRatio: 2`、透明背景）
- 画像クリップボードコピー
- カード名テキスト出力（`《カード名》` 形式、行=改行、同行=スペース、クリップボードコピー）
- 出力画像の整列（左 / 中央 / 右）
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
├── api/scryfall.ts            # Scryfall API クライアント（自動言語判定 + JP 優先 + 75ms レート制限）
├── components/                # React コンポーネント
│   ├── SearchBox.tsx          # オートコンプリート + キーボード操作
│   ├── Canvas.tsx             # レイアウト表示 + DnD ドロップターゲット
│   ├── CardView.tsx           # 1 枚のカード表示
│   ├── Sidebar.tsx            # 検索履歴
│   ├── PrintPickerModal.tsx   # プリント一覧モーダル（絵柄選択）
│   ├── ImageExport.tsx        # PNG ダウンロード / クリップボード / 整列切替
│   ├── TextOutput.tsx         # カード名テキスト出力
│   └── Footer.tsx             # 帰属表示・免責
├── state/
│   ├── layout.ts              # レイアウト純関数（move / overlay / add / remove）
│   ├── history.ts             # 履歴 localStorage 純関数
│   ├── preferences.ts         # ユーザー設定 localStorage 純関数
│   ├── useHistory.ts          # 履歴 React フック
│   └── usePreferences.ts      # 設定 React フック
├── utils/
│   ├── formatCardNames.ts     # 《》形式テキスト生成
│   └── renderLayout.ts        # Canvas 2D へのレイアウト描画
├── types/card.ts              # 型定義（Scryfall + ドメイン）
└── test/                      # Vitest + msw セットアップ
```

## デプロイ（Cloudflare Pages）

純フロントエンドなので静的ホスティングで完結します。

- ビルドコマンド: `npm run build`
- 出力ディレクトリ: `dist/`
- 環境変数: 不要（Scryfall API は認証不要）
- Node バージョン: 22

GitHub リポジトリを Cloudflare Pages に連携すると `push` で自動デプロイされます。

## 開発フロー

詳細は [`AGENTS.md`](AGENTS.md) と [`Plans.md`](Plans.md) を参照。

- 要件は [`要件定義.txt`](要件定義.txt)
- 意思決定ログは [`.claude/memory/decisions.md`](.claude/memory/decisions.md)
- 品質ルールは [`.claude/rules/`](.claude/rules/)

## Scryfall API 利用上の注意

- 無料 API。クライアントは 75ms 間隔でリクエスト送信（推奨 50–100ms）
- `/cards/autocomplete` は **英語名のみ** 対応のため、日本語入力時は `/cards/search?q=name:Q lang:ja` で代替
- 一部の古いカードや限定プロモは日本語版が存在しないため、その場合は英語版にフォールバック（左上に `EN` バッジ）

## ライセンス・帰属

- **アプリケーションコード**: MIT License — 商用・改変・再配布自由（無保証）
- **カードデータ・カード画像**: Wizards of the Coast LLC の所有物。本アプリは画像を Scryfall の CDN から直接読み込み、データの再配布は行いません

Card data and card images are provided by [Scryfall](https://scryfall.com). 本アプリは Scryfall API の利用規約に従いレート制限と帰属表示を遵守しています。

## Fan Content 免責

Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC. This is unofficial Fan Content not approved/endorsed by Wizards. Magic: The Gathering and the *Magic: The Gathering* logo are trademarks of Wizards of the Coast LLC.

本アプリは [Wizards Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy) に準拠した個人運営のファンコンテンツです。無料公開・非公式・公式ロゴ/商標未使用を維持します。
