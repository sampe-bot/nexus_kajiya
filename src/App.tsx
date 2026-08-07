import { useRef, useState, type ChangeEvent } from "react";
import { SlideEditor } from "./components/SlideEditor";
import {
  CURRENT_SLIDE_DOCUMENT_VERSION,
  formatValidationError,
  safeParseSlideDocument,
  type SlideDocument,
} from "./model/slideSchema";

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
  const [document, setDocument] = useState(initialDocument);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveDocument = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(document, null, 2)], { type: "application/json" }),
    );
    const link = window.document.createElement("a");
    link.href = url;
    link.download = "slide-document.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const loadDocument = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const parsed = safeParseSlideDocument(JSON.parse(await file.text()));
      if (!parsed.success) {
        setError(formatValidationError(parsed.error));
        return;
      }
      setDocument(parsed.data);
      setError("");
    } catch {
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
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            JSONを読み込む
          </button>
          <button type="button" className="primary" onClick={saveDocument}>
            JSONを保存
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={loadDocument}
          />
        </div>
      </header>
      {error ? <pre className="error-message">{error}</pre> : null}
      <section className="workspace">
        <SlideEditor document={document} onChange={setDocument} />
      </section>
      <p className="hint">
        テキストをドラッグして移動、ダブルクリックして編集できます。
      </p>
    </main>
  );
}
