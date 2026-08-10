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
      <div className="slide-accent" aria-hidden="true" />
      <p className="slide-kicker" aria-hidden="true">
        NEXUS KAJIYA / 01
      </p>
      // 将来的に画像や図形が追加されることを想定した分岐
      {slide.elements.map((element) => {
        if (element.type !== "text") {
          return null;
        }

        const style: CSSProperties = {
          left: `${(element.x / slide.width) * 100}%`,
          top: `${(element.y / slide.height) * 100}%`,
          width: `${(element.width / slide.width) * 100}%`,
          height: `${(element.height / slide.height) * 100}%`,
          color: element.style.color,
          fontSize: `${(element.style.fontSize / slide.width) * 100}cqw`,
          fontWeight: element.style.fontWeight,
          lineHeight: element.style.lineHeight,
          textAlign: element.style.textAlign,
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
            {element.text}
          </div>
        );
      })}

      <p className="slide-footer" aria-hidden="true">
        Structured slide document
      </p>
    </article>
  );
}
