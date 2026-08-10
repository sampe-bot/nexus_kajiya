import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  moveTextElement,
  updateTextElement,
} from "../model/documentOperations";
import type {
  SlideDocument,
  TextElement,
} from "../model/slideSchema";
import { SlideRenderer } from "./SlideRenderer";

// SlideEditor は内部で document を保持せず、編集結果を必ず親へ返す。
// これにより「編集 UI」と「状態管理」を分離し、再利用性とテスト容易性を高めている。
type SlideEditorProps = {
  document: SlideDocument;
  onChange: (document: SlideDocument) => void;
};

// ドラッグ中の座標計算用データ
// （高頻度に変化するため useState ではなく useRef で保持し、不要な再描画を防ぐ）
type DragState = {
  elementId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startElementX: number;
  startElementY: number;
};

// 編集中のテキスト要素の保持用
type EditingState = {
  elementId: string;
  initialValue: string;
};

export function SlideEditor({ document, onChange }: SlideEditorProps) {
  
  const slide = document.slides[0];

  // 画面上の実際のキャンバスサイズ（width/height）を測るための参照
  const canvasRef = useRef<HTMLDivElement>(null);

  // ドラッグ状態は 1 秒間に数十〜数百回更新されるため、Reactの描画ループから分離して useRef で保持
  const dragStateRef = useRef<DragState | null>(null);

  // 選択中・編集中の状態は見た目（枠線の強調表示やテキストエリア切り替え）に直結するため useState で管理
  const [activeElementId, setActiveElementId] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingState | null>(null);
  
  // --- ドラッグ処理 ---
  const startDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
    element: TextElement,
  ) => {
    // 編集モード中はドラッグ移動させない
    if (editing?.elementId === element.id) {
      return;
    }
    
    event.preventDefault();
    // ポインターが要素の外へ素早くはみ出しても、ポインターイベントを取りこぼさないようにキャプチャ（拘束）する
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      elementId: element.id,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startElementX: element.x,
      startElementY: element.y,
    };
    setActiveElementId(element.id);
  };

  const continueDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    const canvas = canvasRef.current;

    // 現在のドラッグセッション以外のイベントや、キャンバスが未初期化の場合はスキップ
    if (!drag || drag.pointerId !== event.pointerId || !canvas) {
      return;
    }

    // 実際のブラウザ上のキャンバスの描画サイズを取得
    const bounds = canvas.getBoundingClientRect();
    if (bounds.width === 0 || bounds.height === 0) {
      return;
    }

    // 画面上のピクセル移動量を、スライドの仮想座標系（例: 960x540）に変換して計算
    // 計算式: 移動量(px) * (スライドの論理幅 / キャンバスの実際の描画幅)
    const x =
      drag.startElementX +
      (event.clientX - drag.startClientX) * (slide.width / bounds.width);
    const y =
      drag.startElementY +
      (event.clientY - drag.startClientY) * (slide.height / bounds.height);

    // イミュータブル（不可変）に状態を更新して親コンポーネントへ通知
    onChange(
      moveTextElement(document, slide.id, drag.elementId, {
        x,
        y,
      }),
    );
  };

  const stopDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current?.pointerId !== event.pointerId) {
      return;
    }

    dragStateRef.current = null;
    // 拘束していたポインターを解放
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  // --- インライン編集処理 ---
  const beginEditing = (
    event: ReactMouseEvent<HTMLDivElement>,
    element: TextElement,
  ) => {
    event.preventDefault();
    // 親要素へのイベント伝播を止め、キャンバスの選択解除（onPointerDown）が走らないようにする
    event.stopPropagation();
    dragStateRef.current = null;
    setActiveElementId(element.id);
    setEditing({
      elementId: element.id,
      initialValue: element.text,
    });
  };

  const commitText = (elementId: string, text: string) => {
    onChange(updateTextElement(document, slide.id, elementId, text));
    setEditing(null);
  };

  return (
    <div
      ref={canvasRef}
      className="slide-editor"
      aria-label="編集用スライドキャンバス"
      onPointerDown={(event) => {
        // キャンバスの「空白部分」をクリックしたときだけ選択を解除する
        if (event.target === event.currentTarget) {
          setActiveElementId(null);
        }
      }}
    >
      {/* 背景画像・デザインスライド本体を表示するプレビュー層 */}
      <SlideRenderer slide={slide} />
      
      {/* ドラッグ操作・編集判定を受け付ける透過オーバーレイ層 */}
      <div className="editor-overlay" aria-label="テキスト編集レイヤー">
        {slide.elements.map((element) => {
          if (element.type !== "text") {
            return null;
          }

          const isActive = activeElementId === element.id;
          const isEditing = editing?.elementId === element.id;
          const elementLabel = element.role ?? "text";

          return (
            <div
              key={element.id}
              className={[
                "element-hitbox",
                isActive ? "element-hitbox--active" : "",
                isEditing ? "element-hitbox--editing" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              // スライドの拡大縮小に自動追従させるため、位置とサイズは全てパーセンテージ（%）で設定
              style={{
                left: `${(element.x / slide.width) * 100}%`,
                top: `${(element.y / slide.height) * 100}%`,
                width: `${(element.width / slide.width) * 100}%`,
                height: `${(element.height / slide.height) * 100}%`,
              }}
              aria-label={`${elementLabel}テキスト。ダブルクリックで編集`}
              onPointerDown={(event) => startDrag(event, element)}
              onPointerMove={continueDrag}
              onPointerUp={stopDrag}
              onPointerCancel={stopDrag}
              onDoubleClick={(event) => beginEditing(event, element)}
            >

              {/* ダブルクリックされた要素のみ、入力用のテキストエリアをその場に重ねて表示（インライン編集） */}
              {isEditing ? (
                <InlineTextEditor
                  element={element}
                  initialValue={editing.initialValue}
                  onCommit={(text) => commitText(element.id, text)}
                  onCancel={() => setEditing(null)}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type InlineTextEditorProps = {
  element: TextElement;
  initialValue: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
};

// 編集時に一時的に出現するテキスト入力コンポーネント
function InlineTextEditor({
  element,
  initialValue,
  onCommit,
  onCancel,
}: InlineTextEditorProps) {
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 確定（Enter / Blur）処理が二重で呼び出されるのを防ぐためのフラグガード
  const finishedRef = useRef(false);

  // マウントされた瞬間に自動フォーカス ＆ テキストを全選択状態にする
  useEffect(() => {
    textareaRef.current?.focus();
    textareaRef.current?.select();
  }, []);

  return (
    <textarea
      ref={textareaRef}
      className="inline-text-editor"
      aria-label={`${element.role ?? "text"}テキストを編集`}
      value={value}
      style={{
        color: element.style.color,
        // コンテナの幅（cqw: Container Query Width）に合わせて文字サイズも自動スケールさせる
        fontSize: `${(element.style.fontSize / 960) * 100}cqw`,
        fontWeight: element.style.fontWeight,
        lineHeight: element.style.lineHeight,
        textAlign: element.style.textAlign,
      }}
      onChange={(event) => setValue(event.target.value)}
      // 入力中のクリック・ドラッグが親（キャンバス）のドラッグ処理とバッティングしないようイベントを遮断
      onPointerDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        // ESC キーでキャンセル
        if (event.key === "Escape") {
          finishedRef.current = true;
          onCancel();
          return;
        }

        // Cmd + Enter (Mac) または Ctrl + Enter (Windows) で確定
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          finishedRef.current = true;
          onCommit(value);
        }
      }}

      // 入力エリア外をクリックした時（フォーカスが外れた時）も自動確定する
      onBlur={() => {
        // KeyDown (Cmd+Enter) で既に確定済みの場合は二重実行しない
        if (!finishedRef.current) {
          finishedRef.current = true;
          onCommit(value);
        }
      }}
    />
  );
}
