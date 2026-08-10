
# 進捗
## 概要
次のマイルストーンは、設計資料どおり **v0.2 Reliable Editor** が妥当です。最初の実装は「Command化＋Undo / Redo」から始めるのが最も手戻りを減らせます。

現状はDocument Model v2と移行処理まで完成していますが、編集画面は先頭スライド固定で、文書操作もテキスト移動・更新だけです。[architecture.md](</Users/sampei/Desktop/PersonalFolder/2026/nexus_kajiya/docs/architecture.md:223>) [SlideEditor.tsx](</Users/sampei/Desktop/PersonalFolder/2026/nexus_kajiya/src/components/SlideEditor.tsx:42>) [documentOperations.ts](</Users/sampei/Desktop/PersonalFolder/2026/nexus_kajiya/src/model/documentOperations.ts:49>)

## 推奨実装順

| 優先 | 作業 | 主な完了条件 |
|---|---|---|
| P0 | 開発基準線の復元 | `npm ci`後にテスト・ビルド成功。Rendererに表示される可能性がある生の`//`コメントも修正 |
| P1 | Command・履歴基盤 | 移動とテキスト変更をCommand化。Undo / Redo、ショートカット、Redo破棄を実装 |
| P2 | 複数スライドUI | 選択・追加・複製・削除・並べ替え。先頭固定を`activeSlideId`へ変更 |
| P3 | 要素編集 | テキスト要素の追加・削除・リサイズ・スタイル変更 |
| P4 | 自動保存 | `localStorage`へ検証済み文書を保存し、再起動時に復元 |
| P5 | テスト・仕上げ | Operations、履歴、Renderer、主要操作を自動テスト。ドキュメント更新 |

### P1で重要な設計

Commandは最低限、次の操作を表現します。

- `move-element`
- `update-text`
- `add-slide` / `delete-slide` / `reorder-slide`
- `add-element` / `delete-element`
- `resize-element`
- `update-text-style`

ドラッグ中の全pointer moveを履歴へ積まず、ドラッグ開始前と終了後を使って「1回の移動＝1履歴」にまとめます。Undo後に新しい編集を行った場合はRedoスタックを破棄します。

### v0.2の受け入れ条件

- 複数枚のスライドを作成し、選択・並べ替えできる
- テキスト要素を追加・削除・移動・リサイズ・装飾できる
- すべての編集をUndo / Redoできる
- ブラウザを閉じても文書が復元される
- JSON保存・再読込後も内容と表示が一致する
- 不正な保存データでアプリが壊れない
- `npm test`と`npm run build`が成功する

まずは **P0とP1を1つ目のPR**、P2以降を機能単位のPRに分けるのがおすすめです。なお現在の作業ツリーはクリーンですが、依存関係が未インストールのため、テストとビルドは`vitest: command not found`、`tsc: command not found`で未確認です。実装変更は行っていません。