# decisions.md — 意思決定ログ

技術選定や設計判断のうち、後から「なぜそうしたか」を参照する必要があるものを記録します。
コードを見れば分かることは書きません。**Why** が残らないと将来困るものだけを書きます。

書式:
```
## YYYY-MM-DD — 件名
**決定**: 何をどう決めたか
**理由**: なぜそうしたか（制約・トレードオフ）
**代替案**: 検討したが採用しなかった選択肢
**影響範囲**: この決定が縛るスコープ
```

---

## 2026-05-11 — 技術スタック: Vite + React + TypeScript
**決定**: バンドラに Vite、UI に React 19 + TypeScript を採用。
**理由**: ローカル前提だが、ドラッグ&ドロップ・状態管理・カード一覧のリアクティブな更新が要件にあり、素の HTML/JS では複雑化する。Vite は ESM ネイティブで開発体験が良く、ビルド成果物が静的で配布しやすい。
**代替案**:
- 素の HTML/CSS/JS（依存ゼロだが DnD・状態管理を自前で書くコストが高い）
- Next.js（ローカル限定要件に対して SSR や Router がオーバースペック）
**影響範囲**: 全コンポーネント、ビルド、デプロイ方式。

## 2026-05-11 — 言語対応の方針: Scryfall 多言語データを利用、翻訳禁止
**決定**: 日英対応は Scryfall API の `lang` / `printed_name` を使う。クライアント側翻訳は行わない。
**理由**: 要件定義.txt の明示制約。MTG のカード名は公式の日本語訳が確定しており、機械翻訳は誤訳リスクが高い。
**代替案**: 翻訳 API による動的変換 — 要件で明示的に禁止。
**影響範囲**: 検索 API 呼び出し、結果表示、出力されるカード名テキスト。

## 2026-05-11 — オートコンプリート方式: 入力文字種で自動判定
**決定**: 検索ボックスの入力が ASCII のみなら `/cards/autocomplete?q=...`、日本語（非 ASCII）を含む場合は `/cards/search?q=name:... lang:ja&unique=cards&order=name` を呼び分ける。結果は最大 20 件で「英語名（日本語名）」併記。
**理由**: Scryfall の `/cards/autocomplete` は実証検証で日本語入力に 0 件を返した（英語名インデックスのみ）。代替に `/cards/search` の `name:` フィルタが必要。`include_multilingual=true` ではなく `lang:ja` 指定で十分（日本語カードのみ返るため）。
**代替案**:
- バルクデータローカル fuzzy 検索 — 起動時に数十 MB ダウンロードでオーバーヘッド大、API 礼儀的にも 1 回 / 24h 制約あり。MVP では過剰。
- 手動 JA/EN トグル — 余計な操作が発生し UX を損なう。
**影響範囲**: 検索 UI、API クライアント。

## 2026-05-11 — 表示画像の言語: 常に日本語版を優先、なければ英語版にフォールバック
**決定**: カード追加時、まず Scryfall に日本語版 (`lang:ja`) があるか確認し、あれば日本語版画像、なければ英語版画像を表示。`printed_name` が空の場合は「日本語版なし」を UI でバッジ表示する。
**理由**: 実証検証で Scryfall 上の日本語版カードは 29,652 枚あり、4ED (1995) のような古い時代から日本語化されている。一方 Black Lotus 等 Alpha-Beta 限定のカードは日本語版が存在せず、フォールバックが必要。
**代替案**:
- 検索言語に追従 — 要件「日本語のカード名を《》で表示」を満たすには日本語版を優先したほうが自然。
- フォールバックなし（エラー表示） — 使用感が悪い。
**影響範囲**: カードフェッチロジック、カード表示コンポーネント、カード名テキスト出力。

## 2026-05-11 — 絵柄選択 UI: MVP はデフォルト印刷のみ、プリント一覧は Phase 2
**決定**: MVP では `/cards/named?fuzzy=NAME&lang=ja` 相当で取得したデフォルト印刷を使う。Phase 2 でカードクリック時にプリント一覧モーダル（`unique=prints&order=released&dir=asc`）を出し差し替え可能にする。
**理由**: 要件「絵柄選択は嬉しいが、難しければ古いものを選べるように」。MVP スコープを絞り、まず動くものを作る。
**代替案**: 全カードで強制的に最古印刷 — `released_at` 最古が日本語版でないケースが多く、表示言語決定との競合が発生する。
**影響範囲**: カードフェッチロジック、Phase 2 のプリント一覧 UI。

## 2026-05-11 — レイアウト編集: ドラッグ&ドロップ（dnd-kit）
**決定**: カードの並び替え・複数行への移動・サイドバーからキャンバスへの追加すべてをドラッグ&ドロップで実装。ライブラリは `@dnd-kit/core` + `@dnd-kit/sortable` を採用。
**理由**: 要件「並び替えや複数行配置を UI で」。ボタン操作だけでは複数行の自由なレイアウト編集が煩雑。dnd-kit は React 19 対応・軽量・キーボード操作も標準対応で a11y 面でも有利。
**代替案**: `react-dnd` — HTML5 backend の慣用 API だが React 19 対応とメンテ頻度で dnd-kit が優位。
**影響範囲**: キャンバスコンポーネント、サイドバーコンポーネント、状態管理。

## 2026-05-11 — 重ね合わせ機能: Shift + ドラッグで発動
**決定**: 通常ドラッグは「並び替え」、Shift キーを押しながらドラッグして既存カードの上にドロップすると「重ね合わせ（60% サイズ・右下揃え）」モードになる。重ね合わせを解除するときは通常ドラッグで離す。
**理由**: 要件「指定した時のみ」発動を、誤操作なく実現する明示的なモディファイア。マウス操作のみで完結し、追加 UI が不要。
**代替案**:
- 自動重ね合わせ（ドラッグでカード上にドロップしたら必ず重ねる） — 並び替え操作と区別できず誤操作が頻発。
- 右クリックメニュー / 専用ボタン — 操作ステップが増える。
**影響範囲**: ドラッグハンドラ、レイアウト状態スキーマ（カードに `overlayOf` 参照を持たせる）。

> **【2026-05-12 改訂】**: ユーザーフィードバックで Shift+ドラッグの認識が不安定との指摘あり、**右下「🔗 重ねる」ドロップゾーン方式**に切替。各カードの右下 55%×48% を専用 droppable とし、`pointerWithin` collision detection + drag preview を 60% 縮小して下のゾーンを視認可能にした。Shift キー検出ロジック (`useRefShiftKey`) は撤去。

## 2026-05-11 — 画像書き出し: PNG + 透明背景 + 高解像度
**決定**: 出力は PNG、背景は透明、Scryfall normal 画像（488×680 px 程度）の解像度をそのまま保持。書き出しライブラリは `html-to-image`（または同等の DOM→Canvas 系）を検討。
**理由**: SNS 投稿時の二次加工しやすさ（透明背景＋PNG）と、印刷物にも耐える解像度。要件で背景指定はなく、透明であれば後処理で白背景化も可能。
**代替案**: JPG / 白背景 — ファイルサイズは小さいが透明化できない。
**影響範囲**: 書き出しコンポーネント、ライブラリ選定。

> **【2026-05-12 改訂】**: html-to-image は SVG foreignObject 描画で flex layout が縦並びに崩れるバグが多発 → **Canvas 2D 直接描画 (`renderLayout.ts` / `renderLayoutToCanvas`)** に置換。`fetch + createImageBitmap` で画像取得、`drawImage` で配置。CORS は `?_cors=1` cache buster で display `<img>` キャッシュと分離（Scryfall は `Vary: Origin` で正しく区別）。html-to-image 依存は package.json から削除済。

## 2026-05-11 — カード名テキスト出力: 「行＝改行、同行＝スペース区切り」
**決定**: 出力形式は「《カード名》 《カード名》 ...\n《カード名》 ...」。レイアウトの行構造をそのまま反映。表示言語に従い、日本語版があれば日本語名、なければ英語名を出力。
**理由**: 要件「画像の下に表示してクリップボードへコピー」。カードの並びと一対一対応させることで、画像とテキストの関係が直感的にわかる。
**代替案**:
- 1 行 1 カード — 行情報が欠落、複数行レイアウトとの対応が失われる。
- タブ区切り — 表計算用途。MTG 用途では一般的ではない。
- MTG デッキ表記（枚数付き） — デッキリスト用途であり、画像並べ用ではない。
**影響範囲**: テキスト書き出しロジック、状態スキーマ（行構造の保持）。

## 2026-05-12 — 検索プリファレンス (preferLanguage / preferAge / outputAlignment / pickPrintMode) を localStorage 永続化
**決定**: `Preferences` 型に 4 つのユーザー設定を集約し、`src/state/preferences.ts` で `localStorage` (`mtgImageEditor.preferences.v1`) に永続化。`usePreferences` フックで提供。
**理由**: ユーザーフィードバックで「言語/年代の優先切替」「整列オプション」「画像自由選択モード」が要求された。設定は 1 つの場所に集約しないと bug を生む（個別 localStorage 鍵だと衝突しがち）。
**代替案**:
- 個別 React state（永続化なし） — リロードで失われ UX が悪い
- 個別 localStorage 鍵 — 不整合の温床
**影響範囲**: scryfall.ts (`fetchCardWithLanguagePreference` / `fetchAllPrintings` に options 受け渡し)、renderLayout.ts (`alignment`)、App/ImageExport の UI、Plans.md Phase 2 で `bool` 拡張時もここに追加する。

## 2026-05-12 — 両面カード (DFC): `faces` + `faceIndex` で表↔裏切替
**決定**: `CardEntry.faces?: CardFace[]` に各面の `imageUrl`/`displayName`/`japaneseName` を保持。`LayoutItem.faceIndex?: number` で現在表示中の面を指定。`flipItem(layout, itemId)` で `(current ?? 0 + 1) % faces.length` を回す。`getActiveFaceFields` / `activeImageUrl` / `activeDisplayName` の小ヘルパで CardView / formatCardNames / renderLayout が face-aware に動作。
**理由**: ユーザー要望「両面カードに裏返すオプション」。`faceIndex` を `LayoutItem` に置くことで、同じ DFC カードを 2 つ配置して別々の面を表示できる（履歴側の `CardEntry` は不変、レイアウト側だけで状態を持つ）。
**代替案**:
- 表/裏で別の `CardEntry` を発行 — 履歴やキャッシュが膨らむ
- グローバル "flipped IDs" Set — テストしづらい
**影響範囲**: types/card.ts、api/scryfall.ts (`buildFaces`)、state/layout.ts (`flipItem`)、CardView、Canvas (`onFlipItem` 伝播)、formatCardNames、renderLayout。

## 2026-05-12 — DFC の日本語検索: Scryfall API 制約のため未対応（Phase E 後送り）
**決定**: 両面カードの日本語名（face-level `printed_name`）は Scryfall の `name:` フィルタの検索対象に**含まれない**。当面は英語名でカードを検索し、`fetchCardWithLanguagePreference` で日本語版を引き当てる現行ロジックでカバー。完全対応は bulk data 経由のローカルインデックス（Phase E `cc:TODO`）。
**理由**: 実証で `name:アン+lang:ja` は単面カード（top-level `printed_name`）にはヒットするが、DFC は `top.printed_name=null` で face-level しか日本語名がなく、`name:` フィルタが face-level を検索しないため 0 件。
**代替案**:
- bulk data ダウンロード (約 500MB JSON) — Phase 3/E 規模
- Scryfall への機能追加要望 — 現実的でない
**影響範囲**: 検索 UI（DFC を JP 名で検索しても出ない既知制約として運用）、Phase E のスコープ。

## 2026-05-12 — overlay-of-overlay 禁止
**決定**: `setOverlay(layout, itemId, baseItemId)` は `baseLocation.item.overlayOf !== undefined` なら no-op で拒否。
**理由**: `groupRowItems` が 2 段目の overlay を取りこぼし、テキスト出力と UI レンダリングで不一致が生じる（state には残るが画面に出ない）。再帰的 overlay は UX 上も意味が薄い。
**代替案**: 多段 overlay をサポート — グルーピングとレンダリングの複雑化、UX 上のメリットなし。
**影響範囲**: state/layout.ts setOverlay、テスト、Canvas OverlayDropZone（active が overlay 持ち base の時 zone を無効化する既存対応と組み合わせて二重防御）。

## 2026-05-11 — サイドバー検索履歴: localStorage 永続 + 手動クリア
**決定**: 検索/追加したカードを localStorage に最大 100 件保存。同一カード（Scryfall `oracle_id`）は重複排除、最新を先頭。サイドバーに「履歴をクリア」ボタンを設置。
**理由**: 要件「セッション内で検索したものを保存」を満たしつつ、リロード/ブラウザ再起動でも残るほうが実用的。100 件上限はストレージ容量とリスト UI のスクロール耐性のトレードオフ。
**代替案**:
- sessionStorage（タブを閉じたら消える） — 要件の最小解釈だが利便性が劣る。
- IndexedDB — 100 件規模なら過剰、localStorage で十分。
**影響範囲**: サイドバーコンポーネント、永続化レイヤ。
