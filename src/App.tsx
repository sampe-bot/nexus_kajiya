import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { type HtmlImportResult } from "./importers/htmlImporter";
import { SlideRenderer } from "./components/SlideRenderer";
import { SlideEditor } from "./components/SlideEditor";
import {
  CURRENT_SLIDE_DOCUMENT_VERSION,
  formatValidationError,
  safeParseSlideDocument,
  type SlideDocument,
} from "./model/slideSchema";
// アプリ起動時に初期表示されるサンプルデータ（UIのプレビュー用）
const initialDocument: SlideDocument = {
  kind: "nexus-kajiya.slide-document",
  version: CURRENT_SLIDE_DOCUMENT_VERSION,
  slides: [{
    id: "slide-1",
    width: 960,
    height: 540,
    background: "#111827",
    elements: [
      {
        id: "title-1",
        type: "text",
        role: "title",
        text: "Shape ideas into slides.",
        x: 80,
        y: 120,
        width: 800,
        height: 100,
        style: {
          fontSize: 58,
          fontWeight: "700",
          lineHeight: 1.15,
          color: "#F9FAFB",
          textAlign: "left",
        },
      },
      {
        id: "body-1",
        type: "text",
        role: "body",
        text: "JSONを唯一のデータソースにした、軽量なHTMLスライドエディター。",
        x: 84,
        y: 260,
        width: 680,
        height: 100,
        style: {
          fontSize: 26,
          fontWeight: "400",
          lineHeight: 1.5,
          color: "#CBD5E1",
          textAlign: "left",
        },
      },
    ],
  }],
};
export function App() {
  // スライドの全データを管理する、このアプリの「単一の真実のソース」
  const [document, setDocument] = useState(initialDocument);
  const [error, setError] = useState("");
  const [activeSlideId, setActiveSlideId] = useState(initialDocument.slides[0].id);
  const [generation, setGeneration] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [candidate, setCandidate] = useState<Extract<HtmlImportResult, { success: true }> | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const htmlInputRef = useRef<HTMLInputElement>(null);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  const replaceDocument = (next: SlideDocument) => {
    setDocument(next); setActiveSlideId(next.slides[0].id);
    setGeneration(value => value + 1);
  };
  const cancelImport = () => {
    pending.current?.abort(); pending.current = null;
    setBusy(false); setCandidate(null);
  };
  const loadHtml = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    pending.current?.abort();
    const controller = new AbortController(); pending.current = controller;
    setBusy(true); setError(""); setCandidate(null);
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("HTMLは5MB以下にしてください");
      const source = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
      const { importHtml } = await import("./importers/htmlImporter");
      const result = await importHtml(source, controller.signal);
      if (controller.signal.aborted) return;
      if (result.success) { setCandidate(result); setPreviewIndex(0); }
      else setError(result.errors.join("\n"));
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "HTMLを読み込めませんでした");
    } finally { if (pending.current === controller) { setBusy(false); pending.current = null; } }
  };

  // 見た目がダサい標準の <input type="file"> を隠し、別のボタンから起動させるための参照
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveDocument = () => {
    // 1. JSONデータをメモリ上のファイル（Blob）に変換し、ダウンロード用のURLを発行
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(document, null, 2)], { type: "application/json" }),
    );
    // 2. 透明な <a> タグをプログラム上で作り、クリックさせてダウンロードを強制発火
    const link = window.document.createElement("a");
    link.href = url;
    link.download = "slide-document.json";
    link.click();
    // 3. メモリリーク（無駄なメモリ消費）を防ぐため、使用済みのURLを解放
    URL.revokeObjectURL(url);
    setDirty(false);
  };

  const loadDocument = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // 同一ファイルを連続で読み込んだ場合でも onChange を発火させるためのリセット
    event.target.value = "";
    
    if (!file) return;

    try {
      // 壊れたJSONや、構造が違うデータが読み込まれてアプリがクラッシュするのを防ぐ（バリデーション）
      const parsed = safeParseSlideDocument(JSON.parse(await file.text()));
      if (!parsed.success) {
        setError(formatValidationError(parsed.error));
        return;
      }
      replaceDocument(parsed.data);
      setDirty(false);
      setError("");
    } catch {
      // JSONの文法エラー（カッコ閉じ忘れ等）で parse が失敗した際のセーフティネット
      setError("JSONファイルを読み取れませんでした");
    }
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">NEXUS KAJIYA</p>
          <h1>HTML Slide Editor</h1>
        </div>
        <div className="toolbar">
          <button type="button" disabled={busy || !!candidate} onClick={() => htmlInputRef.current?.click()}>HTMLを読み込む</button>
          <input ref={htmlInputRef} type="file" accept="text/html,.html,.htm" hidden onChange={loadHtml} />
          {/* このキレイなボタンを押すことで、裏にある hidden な input を代わりにクリックさせる */}
          <button type="button" disabled={busy || !!candidate} onClick={() => fileInputRef.current?.click()}>
            JSONを読み込む
          </button>
          <button type="button" className="primary" onClick={saveDocument}>
            JSONを保存
          </button>
          {/* 実際のファイル受取口 */}
          <input
            ref={fileInputRef}
            type="file"
            // MIMEタイプと拡張子を併記し、一部のOS/ブラウザでファイルがグレーアウトするのを防ぐ
            accept="application/json,.json"
            hidden
            onChange={loadDocument}
          />
        </div>
      </header>
      {error ? <pre className="error-message">{error}</pre> : null}
      {busy && <div role="status">HTMLを変換しています… <button type="button" onClick={cancelImport}>中止</button></div>}
      {candidate && <section className="import-preview" aria-label="HTML取り込み確認">
        <h2>取り込み内容の確認</h2>
        <p>{candidate.document.slides.length}枚・{candidate.document.slides.reduce((n, slide) => n + slide.elements.length, 0)}個のテキストを編集できます。</p>
        <nav className="slide-tabs" aria-label="取り込みプレビューのページ">
          {candidate.document.slides.map((slide, i) => <button type="button" key={slide.id} aria-pressed={i === previewIndex} onClick={() => setPreviewIndex(i)}>{i + 1}枚目</button>)}
        </nav>
        <div className="preview-canvas"><SlideRenderer slide={candidate.document.slides[previewIndex]} /></div>
        <ul className="import-warnings">{candidate.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul>
        <p>{dirty ? "未保存の編集があります。" : ""}取り込むと現在の文書全体が置き換わります。必要なら先に「JSONを保存」を押してください。</p>
        <div className="toolbar">
          <button type="button" onClick={cancelImport}>中止</button>
          <button type="button" className="primary" onClick={() => {
            replaceDocument(candidate.document); setDirty(true); setCandidate(null);
          }}>この内容で取り込む</button>
        </div>
      </section>}
      <section className="workspace" inert={busy || !!candidate}>
        <nav className="slide-tabs" aria-label="編集するスライド">
          {document.slides.map((slide, i) => <button type="button" key={slide.id} aria-pressed={slide.id === activeSlideId} onClick={() => setActiveSlideId(slide.id)}>{i + 1}枚目</button>)}
        </nav>
        <SlideEditor key={`${generation}-${activeSlideId}`} document={document} activeSlideId={activeSlideId} onChange={next => { setDocument(next); setDirty(true); }} />
      </section>
      <p className="hint">
        テキストをドラッグして移動、ダブルクリックして編集できます。
      </p>
    </main>
  );
}
