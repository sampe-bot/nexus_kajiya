import { textCss } from "./textStyle";
import type { CSSProperties } from "react";
import type { Slide } from "../model/slideSchema";

type SlideRendererProps = {
  slide: Slide;
  className?: string;
};

export function SlideRenderer({
  slide,
  className = "",
}: SlideRendererProps) {
  return (
    <article
      className={`slide-renderer ${className}`.trim()}
      style={{ backgroundColor: slide.background }}
      aria-label="スライドプレビュー"
    >
      {/*将来的に画像や図形が追加されることを想定した分岐*/}
      {slide.elements.map((element) => {
        if (element.type !== "text") {
          return null;
        }

        const style: CSSProperties = {
          left: `${(element.x / slide.width) * 100}%`,
          top: `${(element.y / slide.height) * 100}%`,
          width: `${(element.width / slide.width) * 100}%`,
          height: `${(element.height / slide.height) * 100}%`,
          ...textCss(element.style, slide.width),
          display: element.verticalAlign === 'top' ? 'block' : 'flex',

        };

        return (
          <div
            key={element.id}
            className={[
              "rendered-text",
              element.role ? `rendered-text--${element.role}` : "",
            ]
              .filter(Boolean)
              .join(" ")}
            data-slide-element-id={element.id}
            style={style}
          >
            {element.runs ? element.runs.map((run, index) => run.lineBreak
              ? <br key={index} />
              : <span key={index} style={textCss(run.style, slide.width)}>{run.text}</span>) : element.text}
          </div>
        );
      })}

    </article>
  );
}
