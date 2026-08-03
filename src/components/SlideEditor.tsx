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

type SlideEditorProps = {
  document: SlideDocument;
  onChange: (document: SlideDocument) => void;
};

type DragState = {
  elementId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startElementX: number;
  startElementY: number;
};

type EditingState = {
  elementId: string;
  initialValue: string;
};

export function SlideEditor({ document, onChange }: SlideEditorProps) {
  const slide = document.slides[0];
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [activeElementId, setActiveElementId] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingState | null>(null);

  const startDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
    element: TextElement,
  ) => {
    if (editing?.elementId === element.id) {
      return;
    }

    event.preventDefault();
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

    if (!drag || drag.pointerId !== event.pointerId || !canvas) {
      return;
    }

    const bounds = canvas.getBoundingClientRect();
    if (bounds.width === 0 || bounds.height === 0) {
      return;
    }

    const x =
      drag.startElementX +
      (event.clientX - drag.startClientX) * (slide.width / bounds.width);
    const y =
      drag.startElementY +
      (event.clientY - drag.startClientY) * (slide.height / bounds.height);

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
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const beginEditing = (
    event: ReactMouseEvent<HTMLDivElement>,
    element: TextElement,
  ) => {
    event.preventDefault();
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
        if (event.target === event.currentTarget) {
          setActiveElementId(null);
        }
      }}
    >
      <SlideRenderer slide={slide} />

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

function InlineTextEditor({
  element,
  initialValue,
  onCommit,
  onCancel,
}: InlineTextEditorProps) {
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const finishedRef = useRef(false);

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
        fontSize: `${(element.style.fontSize / 960) * 100}cqw`,
        fontWeight: element.style.fontWeight,
        lineHeight: element.style.lineHeight,
        textAlign: element.style.textAlign,
      }}
      onChange={(event) => setValue(event.target.value)}
      onPointerDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          finishedRef.current = true;
          onCancel();
          return;
        }

        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          finishedRef.current = true;
          onCommit(value);
        }
      }}
      onBlur={() => {
        if (!finishedRef.current) {
          finishedRef.current = true;
          onCommit(value);
        }
      }}
    />
  );
}
