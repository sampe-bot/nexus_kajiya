import { describe, expect, it } from "vitest";
import { slideDocumentSchema, type SlideDocument } from "./slideSchema";

function createValidDocument(): SlideDocument {
  return {
    kind: "nexus-kajiya.slide-document",
    version: 1,
    slides: [
      {
        id: "slide-1",
        width: 960,
        height: 540,
        background: "#0F172A",
        elements: [
          {
            id: "title-1",
            type: "text",
            role: "title",
            text: "タイトル",
            x: 80,
            y: 100,
            width: 800,
            height: 100,
            style: {
              fontSize: 48,
              fontWeight: "700",
              lineHeight: 1.2,
              color: "#F8FAFC",
              textAlign: "left",
            },
          },
          {
            id: "body-1",
            type: "text",
            role: "body",
            text: "本文",
            x: 80,
            y: 240,
            width: 700,
            height: 100,
            style: {
              fontSize: 24,
              fontWeight: "400",
              lineHeight: 1.5,
              color: "#CBD5E1",
              textAlign: "left",
            },
          },
        ],
      },
    ],
  };
}

describe("slideDocumentSchema", () => {
  it("正しいJSONを検証できる", () => {
    const document = createValidDocument();

    expect(slideDocumentSchema.safeParse(document)).toEqual({
      success: true,
      data: document,
    });
  });

  it("不正な色を拒否する", () => {
    const document = createValidDocument();
    document.slides[0].elements[0].style.color = "red";

    const result = slideDocumentSchema.safeParse(document);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["slides", 0, "elements", 0, "style", "color"],
          }),
        ]),
      );
    }
  });

  it("領域外の要素を拒否する", () => {
    const document = createValidDocument();
    document.slides[0].elements[1].x = 900;

    const result = slideDocumentSchema.safeParse(document);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["slides", 0, "elements", 1],
          }),
        ]),
      );
    }
  });
});
