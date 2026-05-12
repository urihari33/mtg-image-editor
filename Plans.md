# Plans.md — mtgImageEditor

タスクは下から積む（新しいタスクは「未割当（Backlog）」に追加）。
マーカー: `cc:TODO` 未着手 / `cc:WIP` 作業中 / `cc:blocked` 待ち / `cc:DONE` 完了

---

## 現在のフェーズ

**Phase 1: MVP 完了** — 2026-05-12。ユーザーフィードバック 3 回 + 画像 CORS hotfix 反映済み、テスト 62 通過、初回 git コミット完了。

次のアクション:
1. **既知の残課題（次セッションで対応）**: 重ね合わせ (Shift+ドラッグ) の動作が安定しない — 仮説: SortableBase 内側に DraggableOverlay を nested させているため、pointer event 起点が衝突している可能性。`useRefShiftKey` は機能しているはずなので、dnd-kit の event activation 周辺を再検証する
2. Phase 2 機能（プリント一覧、レイアウト保存、絵柄選択 UI）

---

## プロジェクト概要

- 目的: MTG カード画像を Scryfall API から取得し、ローカル PC で並べて画像とカード名テキストを書き出す
- スコープ: MVP は `要件定義.txt` の【要望】【技術要件】【追加要件】を全て満たす
- 技術: Vite + React 19 + TypeScript / `@dnd-kit/*` / `html-to-image` / `localStorage` / Scryfall API

---

## 🔴 Phase 1: MVP（完了）

| 節 | 内容 | 主要ファイル | 状態 |
|----|------|------------|------|
| A | Foundation: 依存追加 / dirs / 型定義 / Vitest 設定 | `src/types/card.ts` `vite.config.ts` `src/test/` | `cc:DONE` |
| B | Scryfall API クライアント（自動言語判定 + JP 優先 + 75ms レート制限 + 1 回リトライ） | `src/api/scryfall.ts` (+12 tests) | `cc:DONE` |
| C | 検索ボックス & オートコンプリート UI（200ms debounce + a11y combobox + ↑↓ Enter Esc） | `src/components/SearchBox.tsx` | `cc:DONE` |
| D | 状態管理 & キャンバス（純関数 layout + Canvas/CardView） | `src/state/layout.ts` (+23 tests) `src/components/Canvas.tsx` `src/components/CardView.tsx` | `cc:DONE` |
| E | DnD: dnd-kit Sortable + 行間 droppable + 新行 droppable + Keyboard sensor | `src/App.tsx` `src/components/Canvas.tsx` | `cc:DONE` |
| F | 重ね合わせ: Shift+ドラッグで `setOverlay`、通常ドラッグで `clearOverlay`、60% 右下絶対配置 | layout.ts actions / Canvas overlay 描画 | `cc:DONE` |
| G | 画像書き出し: html-to-image で PNG（pixelRatio:2、透明背景）+ クリップボード画像コピー | `src/components/ImageExport.tsx` | `cc:DONE` |
| H | カード名テキスト出力: `《》` 形式、行=改行、同行=スペース、クリップボード | `src/utils/formatCardNames.ts` (+6 tests) `src/components/TextOutput.tsx` | `cc:DONE` |
| I | サイドバー履歴: localStorage 永続、上限 100、重複排除、クリアボタン、JSON 破損フォールバック | `src/state/history.ts` (+11 tests) `src/state/useHistory.ts` `src/components/Sidebar.tsx` | `cc:DONE` |
| J | 仕上げ: build/lint/test 通過、dev 起動、README 更新 | — | `cc:WIP`（手動 UX 確認のみ残） |

### J. 仕上げ — 残タスク

- [ ] **cc:TODO** ブラウザでの手動 UX 確認（ユーザー側で `npm run dev` → http://localhost:5174）
- [ ] **cc:TODO** `/harness-review` 実行（任意、多角レビュー）
- [ ] **cc:TODO** [後回し] サイドバー履歴 → キャンバスへのドラッグ追加（現状クリックで動作、Phase 2 候補）

### L. ユーザーフィードバック対応（2026-05-12 2 回目）

`doc/feedback.txt` 6 件:

- [x] **cc:DONE** [画像が縦並び・右余白・カード欠落] html-to-image の SVG foreignObject 描画が flex layout を扱えない既知問題と判断。`src/utils/renderLayout.ts` を新設し **Canvas 2D 直接描画** に置換。レイアウト状態から直接 drawImage で構築（行=横並び、列=縦並び、200px 幅・aspect-ratio 488:680、pixelRatio: 2、透明背景、余白は overlayOffset 分のみ） — 2026-05-12
- [x] **cc:DONE** [Cloud, Midgar Mercenary が英語] `order=released asc` で先頭に来る `pspl` 印刷だけ `printed_name=null` だった。`fetchCardWithLanguagePreference` を「`printed_name` を持つ印刷を優先」に変更。DFC (`card_faces[0].printed_name`) も拾う `printedNameOf` ヘルパ追加。追加テスト 2 ケース — 2026-05-12
- [x] **cc:DONE** [履歴ドラッグで配置] Sidebar item を `useDraggable` で囲み `type: 'sidebar-card'` のデータを乗せる。App の `handleDragEnd` で sidebar-card 種別を判定し `addCardToRow` で挿入（item/row/new-row 各ドロップ先を尊重） — 2026-05-12
- [x] **cc:DONE** [`addCardToRow` 純関数] index 指定可、範囲外は clamp、不明 rowId は no-op。テスト 4 ケース追加 — 2026-05-12
- [x] **cc:DONE** [画像配置ルール明文化] 上記の通り、Phase 0 決定との一貫性を再確認しユーザーへ提示 — 2026-05-12
- [x] **cc:DONE** [Shift+ドラッグ補強] `useRefShiftKey` カスタムフックで keyboard + mouse 両イベントから shiftKey をライブ更新（旧実装は KeyboardEvent のみ） — 2026-05-12

> **実装メモ**: 検証ログ — Cloud のバグは Scryfall API 直叩きで `data[0].printed_name === null, data[1..3].printed_name === 'ミッドガルの傭兵、クラウド'` を確認した上で修正。Canvas 描画は flexbox/foreignObject 不依存なのでブラウザ互換性も向上。

> **追加 hotfix (2026-05-12)**: `loadImage(new Image + crossOrigin)` だと、表示用 `<img>` がキャッシュした non-CORS レスポンスとぶつかり「画像の読み込みに失敗」エラー。`fetch(url, { mode: 'cors' })` + `createImageBitmap(blob)` に切り替えてキャッシュを迂回。Scryfall は `access-control-allow-origin: *` を返すので fetch でも問題なし。drawImage に ImageBitmap を渡せるので互換性も維持。

### K. ユーザーフィードバック対応（2026-05-11 1 回目）

`doc/feedback.txt` 6 件に対応:

- [x] **cc:DONE** [画像非表示] `<img crossOrigin="anonymous">` を削除（Scryfall は CORS 対応だが、img タグでの crossOrigin で表示できないケースを排除。html-to-image は内部 fetch で CORS 解決するためエクスポートは継続動作）— 2026-05-11
- [x] **cc:DONE** [カード名表示削除] CardView の `<figcaption>` を撤去、`no-ja-badge` を画像左上のコーナーバッジへ移動（テキスト出力部 `《》` は別途残置）— 2026-05-11
- [x] **cc:DONE** [エクスポート余白カット] `.canvas.is-exporting` で `width: fit-content` を適用、`canvas-new-row` / `canvas-row-placeholder` / `card-remove` / `no-ja-badge` を非表示 — 2026-05-11
- [x] **cc:DONE** [空行自動削除] `pruneEmptyRows`（先頭行は保持）を追加し、`handleRemoveItem` と `handleDragEnd` の各分岐の末尾で適用 — 2026-05-11
- [x] **cc:DONE** [Shift+ドラッグ修正] (1) 重ね合わせ用に `DraggableOverlay` を `useSortable` から `useDraggable` へ変更（SortableContext に id 未登録だった bug）。(2) `setOverlay` をクロス行対応（オーバーレイ item を base 行の base の直後へ移動）— 2026-05-11
- [x] **cc:DONE** [全削除ボタン] `ImageExport` に「全削除」ボタンを追加（`window.confirm` で確認、`onClearAll` で App の layout を初期化）— 2026-05-11
- [x] **cc:DONE** 追加テスト: cross-row setOverlay 1 ケース + pruneEmptyRows 4 ケース（合計 56 テスト通過）— 2026-05-11

> 詳細な実装メモ / テストケース設計は git 履歴・`src/**/*.test.ts`・`.claude/memory/decisions.md` を参照（ここには再掲しない）。

---

## 📅 2026-05-12 フィードバック対応（実装計画は `doc/implementation-plan-2026-05-12.md`）

### Phase A: 小さい UX 調整 `cc:DONE` — 2026-05-12

- [x] **cc:DONE** A1: テキスト出力のコピーボタンを左寄せ
- [x] **cc:DONE** A2: 画像エクスポート軽量化（`cache: 'no-store'` → 既定、`_cors=1` cache buster 維持）
- [x] **cc:DONE** A3: 両面カードの裏返しボタン（左上、DFC 限定、faceIndex で表↔裏切替）

### Phase B: 検索 UI 強化 `cc:DONE` — 2026-05-12

- [x] **cc:DONE** B1: 検索トグル「日本語版/英語版優先」 (`preferLanguage`)
- [x] **cc:DONE** B2: 検索トグル「古い/新しいカード優先」 (`preferAge` → `dir=asc/desc`)
- [x] **cc:DONE** B3: トグル状態の localStorage 永続化 (`mtgImageEditor.preferences.v1`)

### Phase C: 出力レイアウト調整 `cc:TODO`

- [ ] **cc:TODO** C1: 出力画像の整列オプション（左/中央/右、クリップボードボタンの右に 3 ボタン、デフォルト左）

### Phase D: 画像自由選択モード `cc:TODO`

- [ ] **cc:TODO** D1: 自由選択モード ON/OFF トグル
- [ ] **cc:TODO** D2: プリント一覧モーダル（`unique=prints&order=released&dir=asc`）
- [ ] **cc:TODO** D3: モーダル連携（SearchBox → モーダル → 配置）

### Phase E: 後送り（任意）

- [ ] **cc:TODO** E1: DFC JP 検索（bulk data ダウンロード + ローカルインデックス）
- [ ] **cc:TODO** E2: ASCII 候補に日本語名併記

---

## 🟢 Phase 2: 拡張機能（MVP 完了後）

- [ ] **cc:TODO** **[priority]** 重ね合わせの動作安定化 — Shift+ドラッグの判定が不安定。`useRefShiftKey` を `event.activatorEvent.shiftKey` + `pointermove` 経由に変更検討。dnd-kit `pointerWithin` collision detection 試行
- [ ] **cc:TODO** **[bug:high]** `setOverlay` が base 自身が overlay の時の連鎖を防いでいない — base.overlayOf が定義済みなら最上位 base に rebase するか拒否。Canvas/renderLayout の groupRowItems が overlay-of-overlay を group 化できず UI/テキスト不一致が起きる。`layout.test.ts` にテスト追加
- [ ] **cc:TODO** **[bug:medium]** `moveItem` 同一行 clamp が `length - 1`、cross-row は `length`。`Infinity` 渡し時に末尾追加されない不整合。テスト追加
- [ ] **cc:TODO** `scryfallFetch` のリトライを 5xx / 429 にも拡張（`Retry-After` 尊重）
- [ ] **cc:TODO** ASCII オートコンプリート分岐で日本語名併記（現状英語名のみで CLAUDE.md の「両言語検索」と齟齬）
- [ ] **cc:TODO** `renderLayout.ts` の geometry に unit テスト追加（空 layout / canvas 寸法 / 空行フィルタ）
- [ ] **cc:TODO** App.handleDragEnd の integration テスト（JSDOM + synthetic pointer/keyboard）
- [ ] **cc:TODO** **[a11y]** NewRowZone がキーボードから到達不能 → 「行を追加」ボタン代替を追加
- [ ] **cc:TODO** **[a11y]** TextOutput の `aria-live` を button の中ではなく status 用 `<span>` に分離
- [ ] **cc:TODO** [perf low] 100 枚規模で useDndContext 由来の re-render が支配的 → OverlayDropZone を React.memo / useDndMonitor 化
- [ ] **cc:TODO** renderLayout の右下余白 `+overlayOffset` 条件付き化（rightmost/bottommost に overlay がある時のみ）
- [ ] **cc:TODO** 絵柄選択 UI（プリント一覧モーダル、`unique=prints&order=released&dir=asc`）
- [ ] **cc:TODO** カード詳細表示（クリックで拡大、Oracle テキスト表示）
- [ ] **cc:TODO** レイアウトの保存/読み込み（localStorage、複数スロット）
- [ ] **cc:TODO** エクスポート形式の選択 UI（PNG/JPG・背景色）

---

## 🔵 Phase 3: 品質向上（任意）

- [ ] **cc:TODO** E2E テスト（Playwright で主要フロー）
- [ ] **cc:TODO** バルクデータローカルキャッシュ（オフライン対応、24h 制約遵守）
- [ ] **cc:TODO** パフォーマンス最適化（画像の遅延ロード、仮想スクロール）

---

## 完了タスク（アーカイブ）

- **cc:DONE** プロジェクト初期化（Vite + React + TS、ハーネスファイル生成）— 2026-05-11
- **cc:DONE** Phase 0: 要件詰め（8 項目、決定は `.claude/memory/decisions.md`）— 2026-05-11
- **cc:DONE** Phase 1 MVP セクション A〜I + J の自動検証部分（テスト 51 / lint / build / dev 起動）— 2026-05-11
