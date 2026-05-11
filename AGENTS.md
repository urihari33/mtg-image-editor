# AGENTS.md — mtgImageEditor 開発フロー

このドキュメントはエージェント（Claude Code / 将来のサブエージェント）がこのプロジェクトで従う運用ルールを定義します。
人間向けの README ではなく、エージェントが「次に何をするか」「どこに書くか」を判断するための運用契約です。

## 運用モード

**Solo モード**（Claude Code 単体運用）。`.cursor/` が存在しないため、PM 役・Impl 役を Claude Code が兼任します。

## 開発フロー（Plan → Work → Review）

```
[1] Plan   : /plan-with-agent で要件定義 → Plans.md に cc:TODO を追加
[2] Work   : /work で cc:TODO を取り出し → 実装 → cc:DONE に更新
[3] Review : /harness-review で多角レビュー（必要なら /codex-review で第2意見）
[4] Sync   : /sync-status で進捗同期、必要に応じて decisions.md / patterns.md を更新
```

## タスクマーカー（`Plans.md` 内で使用）

| マーカー | 意味 |
|---------|------|
| `cc:TODO` | 未着手（Impl が次に取りに行く対象） |
| `cc:WIP` | 作業中 |
| `cc:blocked` | 依存待ち（理由を併記） |
| `cc:DONE` | 完了 |

## SSOT（Single Source of Truth）

- **要件**: `要件定義.txt`（ユーザー原典 — エージェントは変更しない）
- **意思決定**: `.claude/memory/decisions.md`
- **再利用パターン**: `.claude/memory/patterns.md`
- **タスク**: `Plans.md`

実装中に「なぜこの選択をしたか」が将来必要になるなら `decisions.md` に記録すること。

## 編集禁止 / 注意ファイル

- `要件定義.txt` — 読み取り専用。ユーザーが直接編集する。
- `.claude/state/` — Claude Code 自身が管理する。手動編集禁止。

## 品質ルール

実装前に必ず以下を確認:

- `.claude/rules/implementation-quality.md` — 中身のない関数・TODO スタブを返さない
- `.claude/rules/test-quality.md` — テストを通すためのテスト改変を禁止

## エージェント間の引き継ぎ（将来 2-Agent 化する場合）

現状は Solo モードのため不要。Cursor を導入する際は `/harness-init --mode=2agent` で `.cursor/commands/` を生成すること。
