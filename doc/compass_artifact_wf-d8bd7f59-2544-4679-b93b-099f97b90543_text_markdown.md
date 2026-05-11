# MTGカード名 日英対応の取得・管理ベストプラクティス調査レポート

**結論（BLUF）**: MTGカード名の日英対応を構築するベストプラクティスは、**Scryfallの`all_cards` bulk dataを毎週ダウンロードし、`lang == "ja"`のCardオブジェクトを`oracle_id`をキーにインデックス化して、英語Oracle名（`name`）と日本語印刷名（`printed_name`／DFCでは`card_faces[].printed_name`）のマッピングテーブルをローカル構築する**方式である。ライブAPIでの直接照会は通信量・レート制限・カバレッジ不足の点で本番運用には不向きで、bulk dataのローカル化が事実上の標準となっている。

---

## TL;DR

- **データ源は「Scryfall `all_cards` bulk data」一択でほぼ完結する。** Oracle ID（`oracle_id`）を主キーに、`name`（英語）と`printed_name`（日本語）を対応させる単純なETLで日英マッピングが作れる。`oracle_cards`／`default_cards`では日本語の`printed_name`は得られないため、必ず`all_cards`を使う。
- **同名カードはOracle IDで、両面カードは`card_faces[].printed_name`で扱う。** 再録カードはOracle IDが同一なので自然に重複排除でき、変身カード／分割カード／MDFCは`card_faces`配列の各要素に独立した`printed_name`が入る。日本語未印刷のカード（古いセット、Spider-Manなど一部Universes Beyondセット、最新セットのプレリリース期間）は`lang:ja`の行が存在しないので、フォールバックを明示設計する必要がある。
- **補完手段としてMTGJSON（`foreignData`）と日本コミュニティのWisdom Guild、MTG Wikiが使えるが、メインは依然Scryfall。** Wizards公式の安定したカード名APIは存在しないため、Scryfall利用規約（User-Agent明示、24時間キャッシュ、価格情報の二次利用制限など）を遵守したうえで、Scryfall + 補完辞書のハイブリッドが最も実装が安定する。

---

## Key Findings

### 1. Scryfall Card Objectの言語関連フィールド構造

| フィールド | 内容 | 備考 |
|---|---|---|
| `name` | Oracle名（英語、または`//`で結合した分割／DFC名） | ゲームルール上の正式名 |
| `lang` | ISO風言語コード（`en`, `ja`, `zhs`, `zht`, `ko`, `fr`, `de`, `it`, `es`, `pt`, `ru`, `he`, `la`, `grc`, `ar`, `sa`, `ph`） | 17言語サポート |
| `printed_name` | 印刷時のカード名（非英語版で日本語名が入る） | 単面カード用 |
| `printed_type_line` | 印刷時のタイプ行 | 同上 |
| `printed_text` | 印刷時のルールテキスト | Oracle text（英語）はエラッタを反映するが、`printed_text`は印刷当時のまま |
| `oracle_id` | カードのOracle同一性ID（再録・翻訳をまたいで一定） | **同名カード・別カードの判別に必須** |
| `card_faces[]` | 多面カードの各面オブジェクト配列 | 各面に独自の`name`／`printed_name`を持つ |
| `layout` | `normal`／`split`／`flip`／`transform`／`modal_dfc`／`meld`／`reversible_card` 等 | 多面カードの種別判定 |
| `id` | Scryfall印刷ID（言語・セット・コレクター番号ごとに固有） | 同じOracle IDでも言語・セットが違えば異なる |

公式ドキュメントの記述: *"Each Card object indicates its language in the lang property using an ISO-like code. When available, cards may also include their printed text in printed_name, printed_type_line, and printed_text fields. Please note that Oracle text is always English, per game rules."*（Languages API doc）

### 2. ライブAPIでの日英相互引き

Scryfallは少なくとも以下の経路で日本語名を直接引ける:

- **`GET /cards/:code/:number/:lang`** — セット略号・コレクター番号・言語コード（例: `/cards/dom/1/ja`）で特定言語の印刷を取得。公式ドキュメントの例として「Retrieve ウルザの後継、カーン (Karn, Scion of Urza) from Dominaria」が示されている。
- **`GET /cards/search?q=lang:ja+...`** または `q=!"日本語名"` — `lang:ja`（または`lang:japanese`）で日本語版に絞り込む。`include_multilingual=true`を付けないと検索エンジンが英語版を優先することに注意。
- **`GET /cards/named?fuzzy=...`** — 日本語名を直接渡しても動作するが、英語名を優先するため精度が安定しない場面がある（Scryfallブログでも「we de-prioritise localized cards in favour of English search results」と明言）。
- **`POST /cards/collection`** — 複数カードの一括引きが可能。`name`・`set`・`collector_number`の組み合わせ等で最大75件／リクエスト。

レート制限は概ね10 req/sec（検索・named・randomは2 req/sec）、500msの間隔推奨。**User-Agentヘッダ（例: `MyApp/1.0`）とAcceptヘッダの明示送信が必須**で、デフォルトのHTTPライブラリヘッダは拒否される可能性がある。429応答後は最低30秒のクールダウン、悪質な場合は永久ブロックの可能性がある。

### 3. Bulk Data種別と日英対応データの所在

Scryfallは4種類のカードbulk dataを毎日2回更新する（公式の`/bulk-data`エンドポイント経由でタイムスタンプ付きURIを取得）:

| Bulk種別 | type値 | 内容 | 日本語`printed_name`を含む？ |
|---|---|---|---|
| Oracle Cards | `oracle_cards` | Oracle IDごとに1件（通常英語、認識性重視で選択） | **× ほぼ含まない** |
| Default Cards | `default_cards` | 全カードを英語で1件ずつ（英語版がなければ印刷言語） | **× 基本含まない**（英語のみのカードを除く） |
| Unique Artwork | `unique_artwork` | アート別に1件 | × |
| All Cards | `all_cards` | **全カード × 全言語**の印刷を全件 | **○ 含む（日英マッピングの本命）** |
| Rulings | `rulings` | ルーリングのみ（カード本体は無し） | — |

**日本語の`printed_name`を確実に得られるのは`all_cards`のみ。** 圧縮ファイルとはいえ数百MB〜数GB規模（gzip配信、コンテンツ自体はJSON）になるため、ローカル展開・ストリーミング処理（jq, ijson, simdjson等）が前提となる。

公式ドキュメントは*"If you need to rapidly look up card names, prices, or resolve a large number of card images, you must use the bulk data files"*とし、ライブAPIで全件走査することを明確に禁じている。

### 4. ローカル日英マッピングテーブルの構築手順（推奨実装）

1. `GET https://api.scryfall.com/bulk-data/all-cards` でメタデータを取得し`download_uri`を抽出。
2. gzipされた`all-cards-YYYYMMDDHHMMSS.json`をストリーミングダウンロード。
3. JSON配列を1要素ずつパースしながら以下のレコードを生成:
   - `lang == "ja"` のカードのみを対象。
   - 単面カード: `(oracle_id, name, printed_name, set, collector_number)` を抽出。
   - 多面カード（`card_faces`が存在）: 各面ごとに `(oracle_id, card_faces[i].name, card_faces[i].printed_name)` を抽出。`name`はルート側で`A // B`形式、`printed_name`もルート側に同じ`//`結合形式で入ることが多いが、面ごとの値を使う方が安全。
4. `oracle_id`を主キーに重複排除。**同一カードは複数の日本語印刷を持ち得るため**、複数の`printed_name`が出てきた場合は最新セット（`released_at`が新しい方）を採用するか、すべて保持してエイリアスとして検索可能にする。
5. 双方向ルックアップのため、`英語名 → oracle_id`（一意）、`日本語名 → oracle_id`（基本一意だがエラッタ・再翻訳で稀に揺れる）、`oracle_id → (英語名, 日本語名)` の3索引を持つ。
6. **更新頻度**: ゲームプレイデータは「週1回または新セット発売後」で十分（公式推奨）。価格は24時間以上経つと「dangerously stale」なので別系統で更新。

### 5. 他のデータソース（補完手段）

- **MTGJSON** (`AllPrintings.json`等) — 各カードに`foreignData`配列があり、`{language: "Japanese", name: "兜砕きのズルゴ", multiverseid: ..., text: ..., type: ..., flavorText: ...}` が含まれる。Scryfallと相互補完的だが、`foreignData`の網羅性は不完全という既知のissueがある（プロモのみ初出のカードや、特定版で空配列になる例がGitHub Issue #837, #490で報告されている）。出典はWizardsのGatherer。
- **magicthegathering.io公式API（`api.magicthegathering.io`）** — `foreignNames`配列に`{language: "Japanese", name: ..., multiverseid: ...}`を返す。ただし、データ鮮度・更新頻度はScryfall・MTGJSONより劣り、近年は事実上ほとんどメンテナンスされていないため新セット対応が遅い／欠落することがある。
- **Wizards Gatherer** — 公式だが正式APIは非公開でHTMLスクレイピングが必要、近年は更新が停滞気味。実用上は非推奨。
- **Wisdom Guild（WHISPER）** — 日本最大手のMTGコミュニティDB。「カード名変換辞書データ」としてIME登録用のCSV／テキストファイル形式で日英対応を配布している（M14以降は新形式、それ以前は別形式）。コミュニティの伝統的な「正訳」を反映しており、ScryfallとWisdom Guildで訳語が異なるカードがある場合の照合に有用。
- **MTG Wiki（日本版 mtgwiki.com）** — 個別カード解説に日英名が必ず併記されている。スクレイピングは規約上注意が必要だが、訳語の揺れ・通称の調査に有用。
- **mojp（fog-bank/mojp）** — MTGOの日本語テキスト表示ツール。内部的にWHISPERのテキストとScryfall APIを併用しており、日本コミュニティの実装の参考例。

### 6. 実装上の重要な注意点

#### 6.1 同名カード・再録カードの扱い
- **`oracle_id`を必ず主キーに使う。** カード`id`（Scryfall ID）は印刷ごとに変わるが、`oracle_id`はOracle上のカード同一性を保証する。再録カードは複数の`id`を持つが`oracle_id`は1つ。
- 例外: トークンや`Unstable`系のジョーク再録など、同じ名前でも別カードのケースをScryfallはOracle IDで区別している（公式ドキュメント: *"unique among different cards with the same name (tokens, Unstable variants, etc.)"*）。

#### 6.2 日本語版が存在しないカードの扱い
日本語印刷がそもそも無いカードが相当数存在する:
- Alpha・Beta・Unlimited等の最古セット（多言語化は4th Edition以降が中心）。
- 一部の英語のみのプロモ（FNM、Judge promoの一部、Secret Lair Dropの一部）。
- Universes Beyondの一部（Spider-Man／Through the Omenpaths等は英語のみ展開）。
- 最新セットのプレリリース期間中（Scryfallの日本語データは公式画像公開後に随時追加されるため、taaaaaaxのレポート等で「Marang River Regent」など最新セットの一部カードに日本語が当面欠落するケースが報告されている）。

実装としては「日本語が存在しないカードは英語名をそのまま表示する」「Wisdom Guildやコミュニティ訳を二次辞書として持つ」「ユーザー入力日本語名から英語名を引けないときは英語フォールバックとファジー検索を組み合わせる」の3層構成が現実的。

#### 6.3 表記揺れの正規化
- **句読点・スペース**: Scryfall自体が`/cards/named`でアポストロフィ・ピリオド省略を許容しているが、コンマ・ハイフンの省略は不可なカードもある（MTGNexusで「Atris, Oracle of Half-Truths」の例が議論されている）。
- **全角・半角**: 日本語カード名には全角コンマ「，」「、」、全角中黒「・」、全角スペース等が混在し得る。ユーザー入力との照合では、NFKC正規化→空白除去→大文字化（英字部のみ）等の段階的処理が定石。
- **ふりがな/ルビ**: 神河ブロック以降のカード名にはふりがなが印刷されているが、Scryfallの`printed_name`にはルビは含まれず本文のみが格納される。
- **両面カード**: `name`は`A // B`、日本語の`printed_name`も同様に`//`で結合される傾向。検索時は両面分割で索引化するのが安全。
- **アルケミー版・Rebalanced版**: アリーナのみ存在するA-接頭辞カードは別Oracle IDで扱われ、日本語訳が遅れる／無いことがある。
- **Reflavored prints（Universes Within／Omenpaths）**: 2024年以降の公式ブログによれば、Universes Beyond版と表参道版が同じ`oracle_id`を共有しつつ`printed_name`で異なる印刷名を持つ。Spider-Man / Omenpathsでも同様に、英語版にも`printed_name`が付与される運用に変更されている。**英語側のカードでも`name`と`printed_name`が一致しないケースがある**点に注意。

#### 6.4 Scryfallの規約遵守
- **キャッシュ義務**: ライブAPI結果は最低24時間ローカル保持を推奨（公式）。
- **データの「単純な再配布」禁止**: Scryfallのデータをそのまま再公開するのは規約違反。「end-userに追加の価値を提供する」アプリ内利用は許容。
- **画像の取扱い**: アーティスト名・著作権表記を切り落とさない、改変しない等のルールがある。
- **価格情報**: 24時間で「dangerously stale」、ストアフロントには使用禁止。

---

## Details

### 推奨アーキテクチャ（具体例）

```
[Scryfall bulk all_cards (週次バッチ)]
        ↓ ダウンロード
[ETL: lang=="ja"でフィルタ＋card_faces展開]
        ↓
[ローカルDB / インメモリインデックス]
  - oracle_id → {name_en, name_ja, set, faces[], scryfall_id}
  - name_en (lowercase, punct-normalized) → oracle_id
  - name_ja (NFKC normalized) → oracle_id
        ↓
[アプリケーション層]
  - 日→英、英→日の即時ルックアップ
  - 見つからない場合のみScryfall /cards/namedにフォールバック
  - 24h以内に再問い合わせがあったらキャッシュヒット
```

### サンプル抽出ロジック（疑似コード）

```python
import ijson, gzip, requests

meta = requests.get("https://api.scryfall.com/bulk-data/all-cards",
                    headers={"User-Agent": "MyMTGApp/1.0", "Accept": "*/*"}).json()
url = meta["download_uri"]

mapping = {}  # oracle_id -> {"en": ..., "ja": ...}
with requests.get(url, stream=True) as r, gzip.GzipFile(fileobj=r.raw) as gz:
    for card in ijson.items(gz, "item"):
        if card.get("lang") != "ja":
            continue
        oid = card["oracle_id"] if "oracle_id" in card else card.get("card_faces",[{}])[0].get("oracle_id")
        if not oid:
            continue
        if "card_faces" in card and "printed_name" in card["card_faces"][0]:
            en = " // ".join(f["name"] for f in card["card_faces"])
            ja = " // ".join(f.get("printed_name", f["name"]) for f in card["card_faces"])
        else:
            en = card["name"]
            ja = card.get("printed_name", card["name"])
        mapping.setdefault(oid, {"en": en, "ja": ja})
```

### Scryfall以外を併用すべきケース

- **公式の正訳と齟齬がある場合**: Scryfallの`printed_name`は印刷物に従うが、印刷ミスや早期スポイラー時のデータがそのまま残る場合がある。Wisdom GuildやMTG Wikiの正訳と突合する仕組みがあると安全。
- **古いセット（Mirage以前など）**: Scryfallの多言語サポートは古いセットほど穴がある（公式注記: *"Our support for multiple languages in older sets is limited"*）。MTGJSONの`foreignData`の方が出典が異なるため補完になることがある。
- **最新セットのプレビュー期間**: 公式画像公開後にScryfallに日本語版が追加されるため、リリース当日は英語のみのことがある。MTG-JP公式のカードギャラリー（mtg-jp.com）を一時的な補完ソースにできる。

### Scryfall検索構文での日本語関連クエリ例

- `lang:ja` または `lang:japanese` — 日本語印刷のみ
- `lang:any` — すべての言語
- `in:ja` — 過去に日本語で印刷されたカードのOracle集合
- `new:language` — 新規言語実装の初回印刷
- `e:dsk lang:ja` — 特定セットの日本語版のみ

---

## Recommendations

### ステージ1（PoC〜小規模アプリ）
1. **`/cards/named?fuzzy=...` と `/cards/:code/:number/:lang` を用いたオンザフライ取得**から始める。
2. User-Agent（例: `MyApp/0.1`）と Acceptヘッダを必ず設定。
3. 24時間のローカルキャッシュ（lru_cache、Redis等）を必ず併用。
4. 規模が「1日数千回以上のカード解決」を超えたらステージ2へ移行。

### ステージ2（本格運用・標準パス）
1. **`all_cards` bulk dataの週次バッチ取込み**（新セット発売時は臨時取込み）。
2. `lang == "ja"`をフィルタ、`oracle_id`を主キー、`name`と`printed_name`（DFCは`card_faces[].printed_name`）を抽出してDB／検索インデックスに格納。
3. 日本語名・英語名の双方向検索ができるよう、両方向のセカンダリインデックスを構築。
4. NFKC正規化＋句読点除去版の名前を別カラムに保持し、ユーザー入力ファジーマッチに利用。
5. **見つからない場合の3段フォールバック**: ① ローカルScryfall索引 → ② Scryfall `/cards/named?fuzzy` → ③ Wisdom Guildの変換辞書／MTG Wikiの手動キュレーション辞書。

### ステージ3（高精度・コミュニティ訳併用）
1. Wisdom GuildのIME用変換辞書をCSVで取り込み、Scryfall訳と差分があるカードを別カラム「コミュニティ訳」として保持。
2. 日本語版が存在しない英語カード（Spider-Man等）用に、自前の手動翻訳辞書を運用。
3. MTGJSON `foreignData`をScryfallに照らした品質チェックバッチを定期実行（GitHub Issue #837/#490 が示すように、いずれのソースも欠損があるためクロスチェックが有効）。

### 切替判断のベンチマーク
- **オンライン API → bulk dataへ**: 月間APIコール数が10万を超える、または「全カード走査」をしたくなった瞬間。
- **bulk → bulk+コミュニティ訳**: ユーザーから「カード名が表示されない／古い訳と違う」苦情が出始めたら。
- **MTGJSON併用**: 古いセットや非標準セット（Conspiracy、Vanguard等）の日本語訳精度が問題になった時。

---

## Caveats

- **Scryfallの「日本語サポート」は公式運営の好意ベース**であり、最新セット即日対応は保証されていない（公式ブログでも*"our support for multiple languages in older sets is limited"*とされ、コミュニティでもtaaaaaaxレポート等で最新セットの一部カードに日本語が当面欠落する事例が報告されている）。本番運用のSLAを謳う製品では、必ずフォールバック設計を入れること。
- **`printed_name`は印刷時点の固定値で、エラッタの反映先ではない**。日本語訳に後から修正が入った場合、再印刷されない限り`printed_name`は更新されない可能性がある（Oracle textのみが英語で随時更新される）。
- **Reflavored printsの取り扱い変更（2024年〜）**: Universes Beyond/Within、Omenpathsの導入により、英語版カードでも`printed_name`が`name`と異なる事例が増えている。「英語の`name`」と「英語版の`printed_name`」を区別する必要があるかは、アプリの目的（ゲームルール上の名前か、印刷物の名前か）次第。
- **bulk dataのサイズ**: `all_cards`は数百MB〜数GB（圧縮前）まで成長しており、メモリへの全件ロードはサーバーレス環境などでは難しい。SQLiteやDuckDBへの一括投入、またはijson等のストリーミングパーサ利用が現実的。
- **MTGJSONの`foreignData`欠損**は既知の不具合で、Scryfall単独より精度が劣る場面がある。
- **magicthegathering.io（公式API）は近年メンテナンス頻度が低い**ことが各所で指摘されており、新セットや最近の言語仕様への追従が遅れがち。新規実装の第一選択にはしないこと。
- **データの再配布禁止**: Scryfall・MTGJSONとも、生データを丸ごと別サービスとして再配布することは禁じている。社内ツール・自社アプリ内での利用に留めること。
- **ふりがな・ルビは取得不可**: 神河ブロック以降のカード名についている振り仮名は、Scryfallのテキストデータには含まれない。ふりがな付き表示が必要な場合はOCRや別ソースが必要になる。
- **Scryfallドキュメントページ（scryfall.com/docs/api）のWebフェッチは本調査中に403を返した**ため、本レポートのScryfall公式記述は検索結果スニペットおよびAPI実装ライブラリ（go-scryfall, scryr, scryfall-types, scrython等）のソースから再構成している。記述内容は公式と整合しているが、API挙動の最終確認は実際のリクエストで行うこと。