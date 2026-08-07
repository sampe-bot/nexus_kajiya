# Graph Report - .  (2026-08-07)

## Corpus Check
- Corpus is ~3,306 words - fits in a single context window. You may not need a graph.

## Summary
- 172 nodes · 213 edges · 14 communities (12 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Document Schema Core
- Product Architecture and Rationale
- TypeScript App Configuration
- Runtime Package Configuration
- Slide Editing Interaction
- Frontend Development Dependencies
- Development Runtime and Bootstrap
- Rendering and Template Validation
- Vite Build Configuration
- Product Roadmap
- TypeScript Project References
- Python Package Metadata

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 14 edges
2. `v0.1 Core Prototype MVP` - 9 edges
3. `Nexus Kajiya README` - 8 edges
4. `app Service` - 8 edges
5. `compilerOptions` - 7 edges
6. `Versioned Document Model` - 7 edges
7. `Nexus Kajiya Roadmap` - 7 edges
8. `SlideDocument` - 6 edges
9. `safeParseSlideDocument()` - 6 edges
10. `Document Operations` - 6 edges

## Surprising Connections (you probably didn't know these)
- `JSON-Based HTML Slide Editor` --semantically_similar_to--> `v0.1 Core Prototype MVP`  [INFERRED] [semantically similar]
  index.html → README.md
- `app Service` --implements--> `Docker Compose Development Environment`  [INFERRED]
  compose.yaml → README.md
- `app Service` --conceptually_related_to--> `Nexus Kajiya HTML Page`  [INFERRED]
  compose.yaml → index.html
- `App()` --calls--> `formatValidationError()`  [EXTRACTED]
  src/App.tsx → src/model/slideSchema.ts
- `App()` --calls--> `safeParseSlideDocument()`  [EXTRACTED]
  src/App.tsx → src/model/slideSchema.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Nexus Kajiya Target Architecture Flow** — readme_markdown_supported_html_gui, readme_ai_commands, readme_versioned_document_model, readme_document_operations, readme_history_review, readme_realtime_collaboration, readme_deterministic_renderer, readme_html_output, readme_pdf_other_formats [EXTRACTED 1.00]
- **Nexus Kajiya Product Roadmap Phases** — readme_v0_1_mvp, readme_v0_2_reliable_editor, readme_v0_3_markdown_to_artifact, readme_v0_4_ai_editing, readme_v0_5_collaboration, readme_v1_0_knowledge_lifecycle [EXTRACTED 1.00]

## Communities (14 total, 2 thin omitted)

### Community 0 - "Document Schema Core"
Cohesion: 0.09
Nodes (25): App(), initialDocument, CURRENT_SLIDE_DOCUMENT_VERSION, declaresVersion(), ElementFrame, elementFrameSchema, formatValidationError(), hexColorSchema (+17 more)

### Community 1 - "Product Architecture and Rationale"
Cohesion: 0.09
Nodes (29): AI Commands, Prioritize a Constrained Slide Model, Deterministic Renderer, Docker Compose Development Environment, Document Model v2, Document Operations, src/model/documentOperations.ts, Editor Overlay (+21 more)

### Community 2 - "TypeScript App Configuration"
Cohesion: 0.10
Nodes (19): DOM, DOM.Iterable, ES2022, src, compilerOptions, allowSyntheticDefaultImports, esModuleInterop, isolatedModules (+11 more)

### Community 3 - "Runtime Package Configuration"
Cohesion: 0.12
Nodes (16): dependencies, react, react-dom, zod, name, private, scripts, build (+8 more)

### Community 4 - "Slide Editing Interaction"
Cohesion: 0.20
Nodes (12): DragState, EditingState, InlineTextEditorProps, SlideEditor(), SlideEditorProps, moveTextElement(), TextElementPosition, updateElement() (+4 more)

### Community 5 - "Frontend Development Dependencies"
Cohesion: 0.15
Nodes (13): devDependencies, @types/react, @types/react-dom, typescript, vite, @vitejs/plugin-react, vitest, @types/react (+5 more)

### Community 6 - "Development Runtime and Bootstrap"
Cohesion: 0.18
Nodes (11): app Service, CHOKIDAR_USEPOLLING, development Build Target, docker/Dockerfile Build Definition, node_modules Named Volume, Port 5173 Mapping, Repository Source Bind Mount, JSON-Based HTML Slide Editor (+3 more)

### Community 7 - "Rendering and Template Validation"
Cohesion: 0.24
Nodes (7): SlideRenderer(), SlideRendererProps, Slide, SlideTemplate, SlideTemplateValidationIssue, titleBodyTemplate, validateSlideAgainstTemplate()

### Community 8 - "Vite Build Configuration"
Cohesion: 0.20
Nodes (9): vite.config.ts, compilerOptions, allowImportingTsExtensions, composite, module, moduleResolution, noEmit, skipLibCheck (+1 more)

### Community 9 - "Product Roadmap"
Cohesion: 0.29
Nodes (7): Build Correctness Before AI and Collaboration, Nexus Kajiya Roadmap, v0.2 Reliable Editor, v0.3 Markdown to Artifact, v0.4 AI Editing, v0.5 Collaboration, v1.0 Knowledge Lifecycle

## Knowledge Gaps
- **87 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+82 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `v0.1 Core Prototype MVP` connect `Product Architecture and Rationale` to `Development Runtime and Bootstrap`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `Nexus Kajiya` connect `Product Architecture and Rationale` to `Product Roadmap`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `app Service` (e.g. with `Nexus Kajiya HTML Page` and `Docker Compose Development Environment`) actually correct?**
  _`app Service` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _87 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Document Schema Core` be split into smaller, more focused modules?**
  _Cohesion score 0.09425287356321839 - nodes in this community are weakly interconnected._
- **Should `Product Architecture and Rationale` be split into smaller, more focused modules?**
  _Cohesion score 0.08866995073891626 - nodes in this community are weakly interconnected._
- **Should `TypeScript App Configuration` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._