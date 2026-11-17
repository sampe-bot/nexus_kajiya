# Graph Report - nexus_kajiya  (2026-11-18)

## Corpus Check
- 30 files · ~7,774 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 266 nodes · 315 edges · 21 communities (19 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c2a449b1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- slideSchema.ts
- v0.1 Core Prototype MVP
- compilerOptions
- package.json
- SlideEditor.tsx
- devDependencies
- app Service
- Nexus Kajiya アーキテクチャ
- compilerOptions
- `SlideRenderer.tsx`
- tsconfig.json
- nexus-kajiya
- App.tsx
- HTML読み込みの実装方針
- P0 開発基準線の復元

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 14 edges
2. `Nexus Kajiya アーキテクチャ` - 11 edges
3. `HTML読み込みの実装方針` - 9 edges
4. `v0.1 Core Prototype MVP` - 9 edges
5. `safeParseSlideDocument()` - 8 edges
6. `Nexus Kajiya README` - 8 edges
7. `app Service` - 8 edges
8. `scripts` - 7 edges
9. `compilerOptions` - 7 edges
10. ``SlideRenderer.tsx`` - 7 edges

## Surprising Connections (you probably didn't know these)
- `JSON-Based HTML Slide Editor` --semantically_similar_to--> `v0.1 Core Prototype MVP`  [INFERRED] [semantically similar]
  index.html → README.md
- `app Service` --implements--> `Docker Compose Development Environment`  [INFERRED]
  compose.yaml → README.md
- `app Service` --conceptually_related_to--> `Nexus Kajiya HTML Page`  [INFERRED]
  compose.yaml → index.html
- `App()` --calls--> `importHtml()`  [EXTRACTED]
  src/App.tsx → src/importers/htmlImporter.ts
- `App()` --calls--> `formatValidationError()`  [EXTRACTED]
  src/App.tsx → src/model/slideSchema.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Nexus Kajiya Target Architecture Flow** — readme_markdown_supported_html_gui, readme_ai_commands, readme_versioned_document_model, readme_document_operations, readme_history_review, readme_realtime_collaboration, readme_deterministic_renderer, readme_html_output, readme_pdf_other_formats [EXTRACTED 1.00]
- **Nexus Kajiya Product Roadmap Phases** — readme_v0_1_mvp, readme_v0_2_reliable_editor, readme_v0_3_markdown_to_artifact, readme_v0_4_ai_editing, readme_v0_5_collaboration, readme_v1_0_knowledge_lifecycle [EXTRACTED 1.00]

## Communities (21 total, 2 thin omitted)

### Community 0 - "slideSchema.ts"
Cohesion: 0.09
Nodes (23): ElementFrame, elementFrameSchema, hexColorSchema, idSchema, legacySlideSchema, legacyTextElementSchema, Slide, SLIDE_DOCUMENT_KIND (+15 more)

### Community 1 - "v0.1 Core Prototype MVP"
Cohesion: 0.07
Nodes (36): AI Commands, Prioritize a Constrained Slide Model, Build Correctness Before AI and Collaboration, Deterministic Renderer, Docker Compose Development Environment, Document Model v2, Document Operations, src/model/documentOperations.ts (+28 more)

### Community 2 - "compilerOptions"
Cohesion: 0.10
Nodes (19): DOM, DOM.Iterable, ES2022, src, compilerOptions, allowSyntheticDefaultImports, esModuleInterop, isolatedModules (+11 more)

### Community 3 - "package.json"
Cohesion: 0.09
Nodes (22): css-tree, dependencies, css-tree, parse5, react, react-dom, zod, name (+14 more)

### Community 4 - "SlideEditor.tsx"
Cohesion: 0.16
Nodes (14): DragState, EditingState, InlineTextEditorProps, SlideEditor(), SlideEditorProps, SlideRenderer(), SlideRendererProps, moveTextElement() (+6 more)

### Community 5 - "devDependencies"
Cohesion: 0.12
Nodes (17): devDependencies, @playwright/test, @types/css-tree, @types/react, @types/react-dom, typescript, vite, @vitejs/plugin-react (+9 more)

### Community 6 - "app Service"
Cohesion: 0.18
Nodes (11): app Service, CHOKIDAR_USEPOLLING, development Build Target, docker/Dockerfile Build Definition, node_modules Named Volume, Port 5173 Mapping, Repository Source Bind Mount, JSON-Based HTML Slide Editor (+3 more)

### Community 7 - "Nexus Kajiya アーキテクチャ"
Cohesion: 0.07
Nodes (27): 10. 設計判断の基準, 1. 目的とスコープ, 2.1 構造化文書を正本にする, 2.2 変更を文書操作へ集約する, 2.3 Rendererと編集UIを分離する, 2.4 正しさから段階的に積み上げる, 2. 設計原則, 3.1 現在の構成 (+19 more)

### Community 8 - "compilerOptions"
Cohesion: 0.20
Nodes (9): vite.config.ts, compilerOptions, allowImportingTsExtensions, composite, module, moduleResolution, noEmit, skipLibCheck (+1 more)

### Community 9 - "`SlideRenderer.tsx`"
Cohesion: 0.09
Nodes (21): `InlineTextEditor`, `SlideEditor.tsx`, `SlideRenderer.tsx`, スライド本体, テキスト編集, テキスト要素の描画, ドラッグ中, ドラッグ処理 (+13 more)

### Community 14 - "App.tsx"
Cohesion: 0.18
Nodes (14): App(), initialDocument, HtmlImportResult, importHtml(), drop, MAX_HTML_BYTES, prepareHtml(), properties (+6 more)

### Community 15 - "HTML読み込みの実装方針"
Cohesion: 0.18
Nodes (9): HTML読み込みの実装方針, ブラウザへの配置, 初版の対応範囲, 受け入れ条件, 変換ルール, 変更箇所と実装順, 採用する方式, 次の拡張 (+1 more)

### Community 16 - "P0 開発基準線の復元"
Cohesion: 0.25
Nodes (7): P0 開発基準線の復元, P1で重要な設計, v0.2の受け入れ条件, 推奨実装順, 概要, 確認環境, 進捗

## Knowledge Gaps
- **148 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+143 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Nexus Kajiya アーキテクチャ` connect `Nexus Kajiya アーキテクチャ` to `HTML読み込みの実装方針`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _148 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `slideSchema.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08866995073891626 - nodes in this community are weakly interconnected._
- **Should `v0.1 Core Prototype MVP` be split into smaller, more focused modules?**
  _Cohesion score 0.06825396825396825 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._