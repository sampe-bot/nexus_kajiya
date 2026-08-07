import { useRef, useState, type ChangeEvent } from "react";
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
      setDocument(parsed.data);
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
          {/* このキレイなボタンを押すことで、裏にある hidden な input を代わりにクリックさせる */}
          <button type="button" onClick={() => fileInputRef.current?.click()}>
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
      <section className="workspace">
        {/* エディタ側での操作（ドラッグやテキスト編集）を、親の setDocument にそのまま流し込む */}
        <SlideEditor document={document} onChange={setDocument} />
      </section>
      <p className="hint">
        テキストをドラッグして移動、ダブルクリックして編集できます。
      </p>
    </main>
  );
}
