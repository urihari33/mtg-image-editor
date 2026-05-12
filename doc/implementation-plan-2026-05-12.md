# 実装計画 — 2026-05-12 フィードバック対応

## 🔍 事前調査結果（重要）

### Q1. 検索が全部表示できない？

**結論**: 仕様上の制約あり

`searchAutocomplete` の挙動:
- **ASCII 入力**: `/cards/autocomplete?q={Q}` （上限 20 件、英語名のみ）
- **非 ASCII 入力**: `/cards/search?q=name:{Q} lang:ja&unique=cards&order=name` （上限 20 件で `slice` でカット）

**制限**:
1. **両面カード（DFC）の日本語検索が機能しない**: Scryfall の `name:` フィルタは **トップレベル英語名** にしかマッチしない。DFC は top-level の `printed_name` が `null` で、各面の `printed_name` は `card_faces[].printed_name` にあるが、`name:` フィルタはここを見ない
2. ASCII 入力時は autocomplete エンドポイント上限 20 件で打ち切り（Scryfall 側仕様）
3. 非 ASCII 入力時は 20 件 slice（クライアント側）

### Q2. 「光輝の夜明け、ヘリオッド」が引っかからない

**結論**: そのカード自体が Scryfall に存在しない

実証:
- `Heliod lang:ja` → 12 件返るが、すべて「太陽冠のヘリオッド」「太陽の神、ヘリオッド」など。「光輝の夜明け、ヘリオッド」という名前のカードは Scryfall データに存在しない
- `name:光輝の夜明け lang:ja` → 0 件
- 名前の記憶違い or 未収録の最新セットの可能性

### Q3. Avatar Aang が日本語で引っかからない

**結論**: DFC（両面カード）の Scryfall API 制約

実証:
- `name:アン lang:ja` → 209 件（単面カードはヒット、top-level `printed_name=気の技の達人、アン` 等）
- 「Aang, at the Crossroads // Aang, Destined Savior」は `layout=transform`、top_printed=`(none)`
- DFC の日本語名は `card_faces[].printed_name` にしかないが、Scryfall の `name:` フィルタはこれを検索対象にしない

**対策**: 完全な DFC JP 検索には Scryfall bulk data を DL してローカル全文検索が必要（Phase 3 候補。今回のスコープ外）

### Q4. 画像 DL/Clipboard で 3 秒かかる

**結論**: `cache: 'no-store'` が原因

`renderLayout.ts` の `loadBitmap` は `cache: 'no-store'` で **毎回ネットワークから再取得**。10 枚 × 200KB = 2MB × 帯域＋レイテンシ。

**対策**: cache buster `?_cors=1` 付きで URL ユニーク化されているので、`cache: 'default'` に戻せば 2 回目以降はブラウザ HTTP キャッシュヒット → 数百ミリ秒に短縮

---

## 📋 実装順序（小→大）

### Phase A: 小さい UX 調整（即座に実装可、各 < 30分）

| # | タスク | 影響範囲 | 工数 |
|---|--------|----------|------|
| A1 | **コピーボタンを左寄せ**（テキスト出力） | `TextOutput.tsx` + CSS のみ | 5分 |
| A2 | **画像 DL/Clipboard 軽量化**: `cache: 'no-store'` → `cache: 'default'`、`_cors=1` 維持 | `renderLayout.ts` 1 行 | 5分 |
| A3 | **両面カードの裏返しボタン**: DFC 限定、左上、押すたび表↔裏切替（face index を `LayoutItem` に追加） | `types/card.ts` + `Canvas/CardView.tsx` + 状態関数 1 個 | 30分 |

### Phase B: 検索 UI 強化（中規模、合計 1-2 時間）

| # | タスク | 影響範囲 | 工数 |
|---|--------|----------|------|
| B1 | **検索トグル「JP優先/EN優先」**: 検索時の `lang:ja` の付け外し、フェッチ時の preference | `SearchBox.tsx` + `scryfall.ts` | 30分 |
| B2 | **検索トグル「古い/新しい優先」**: `order=released&dir=asc/desc` の切替 | `scryfall.ts` の `fetchCardWithLanguagePreference` 引数 | 20分 |
| B3 | **トグル状態の永続化**: localStorage に保存 | `state/preferences.ts` 新設 | 20分 |

### Phase C: 出力レイアウト調整（中規模、30分）

| # | タスク | 影響範囲 | 工数 |
|---|--------|----------|------|
| C1 | **出力画像の整列オプション**: 左/中央/右の 3 ボタン（クリップボードボタンの右）、デフォルト左 | `renderLayout.ts` の row 描画 + `ImageExport.tsx` UI | 30分 |

### Phase D: 画像自由選択モード（大、2-3 時間）

| # | タスク | 影響範囲 | 工数 |
|---|--------|----------|------|
| D1 | **自由選択モード ON/OFF トグル**: 検索 UI に 3 つ目のボタン | `SearchBox.tsx` | 10分 |
| D2 | **候補画像モーダル**: 右からスライドイン、選んだカードのプリント一覧 (`unique=prints&order=released&dir=asc`)、クリックで配置 | `PrintPickerModal.tsx` 新設 | 1.5時間 |
| D3 | **モーダル連携**: SearchBox の onPickSuggestion → モーダル表示 → 選択 → 配置 | `App.tsx` 状態管理 | 30分 |

### Phase E: 検索ロジック改善（任意・後送り推奨）

| # | タスク | 備考 |
|---|--------|------|
| E1 | DFC JP 検索の bulk data 対応 | Scryfall 全カードデータ DL (約 500MB JSON) + ローカルインデックス。Phase 3 規模 |
| E2 | ASCII 候補に日本語名併記 | autocomplete レスポンスを elaborate するため別 fetch 必要 |

---

## 🚧 既存残課題（Phase 2 から継続）

| # | カテゴリ | 内容 |
|---|----------|------|
| R1 | **bug:high** | `setOverlay` overlay-of-overlay 防止 |
| R2 | **bug:medium** | `moveItem` 同一行 clamp 不整合 |
| R3 | **a11y** | `NewRowZone` のキーボード到達 |
| R4 | **a11y** | `TextOutput` aria-live 配置 |
| R5 | **perf low** | `useDndContext` 由来 re-render 最適化 |
| R6 | **test** | `renderLayout` unit / `handleDragEnd` integration |
| R7 | API | `scryfallFetch` リトライ 5xx/429 拡張 |
| R8 | UX | 絵柄選択 UI (D2 と重複統合) |

→ **D2 で R8 を吸収**。R1-R7 は Phase A-D 完了後にまとめて対応推奨。

---

## 🎯 推奨アプローチ

1. **Phase A 一気実装** → 1 コミット
2. **Phase B 実装** → 1 コミット
3. **Phase C 実装** → 1 コミット
4. **Phase D 実装** → 1 コミット（最大）
5. （任意）残課題 R1-R7 → 各小規模コミット

各 Phase ごとにブラウザ確認を挟むことを推奨。

---

## ❓ 確認事項

1. **「光輝の夜明け、ヘリオッド」**: Scryfall に存在しないことを確認しました。別の名前のカードでしょうか？（→ 確認なら今後の検索ロジック改善には影響しないので、回答待たずに Phase A 進めて OK）
2. **両面カード JP 検索の制約**: Scryfall API の仕様なので根本対応は bulk data 必要（Phase 3 規模、後送り推奨）。当面は **英語名で検索 → ヒットしたら DFC でも配置可能** という形でユーザーに案内するヒントを追加するのが現実的
3. **画像自由選択モード Phase D の優先度**: 大きいので、A/B/C 完了後にブラウザ確認後の方が安全
