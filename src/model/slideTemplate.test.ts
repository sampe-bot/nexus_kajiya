import { describe, expect, it } from "vitest";
import type { Slide } from "./slideSchema";
import {
  titleBodyTemplate,
  validateSlideAgainstTemplate,
} from "./slideTemplate";

function createEmptySlide(): Slide {
  return {
    id: "slide-1",
    width: 960,
    height: 540,
    background: "#FFFFFF",
    elements: [],
  };
}

describe("validateSlideAgainstTemplate", () => {
  it("文書として有効な空スライドにテンプレート固有の不足を返す", () => {
    const issues = validateSlideAgainstTemplate(
      createEmptySlide(),
      titleBodyTemplate,
    );

    expect(issues.map((issue) => issue.role)).toEqual(["title", "body"]);
  });

  it("必須roleが揃っていれば問題を返さない", () => {
    const slide = createEmptySlide();
    slide.elements = [
      {
        id: "title-1",
        type: "text",
        role: "title",
        text: "タイトル",
        x: 80,
        y: 100,
        width: 800,
        height: 80,
        style: {
          fontSize: 48,
          fontWeight: "700",
          lineHeight: 1.2,
          color: "#111827",
          textAlign: "left",
        },
      },
      {
        id: "body-1",
        type: "text",
        role: "body",
        text: "本文",
        x: 80,
        y: 220,
        width: 700,
        height: 100,
        style: {
          fontSize: 24,
          fontWeight: "400",
          lineHeight: 1.5,
          color: "#374151",
          textAlign: "left",
        },
      },
    ];

    expect(validateSlideAgainstTemplate(slide, titleBodyTemplate)).toEqual([]);
  });
});
