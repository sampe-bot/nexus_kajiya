import { describe, expect, it } from "vitest";
import {
  safeParseSlideDocument,
  slideDocumentV1Schema,
  slideDocumentSchema,
  type SlideDocument,
  type SlideDocumentV1,
} from "./slideSchema";

function createValidDocument(): SlideDocument {
  return {
    kind: "nexus-kajiya.slide-document",
    version: 3,
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

function createLegacyDocument(): SlideDocumentV1 {
  const currentDocument = createValidDocument();

  return slideDocumentV1Schema.parse({
    ...currentDocument,
    version: 1,
    slides: [
      {
        ...currentDocument.slides[0],
        elements: currentDocument.slides[0].elements.map((element) => ({
          ...element,
          role: element.role === "title" ? "title" : "body",
        })),
      },
    ],
  });
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

  it("複数スライドと空のスライドを検証できる", () => {
    const document = createValidDocument();
    document.slides.push({
      id: "slide-2",
      width: 960,
      height: 540,
      background: "#FFFFFF",
      elements: [],
    });

    expect(slideDocumentSchema.safeParse(document).success).toBe(true);
  });

  it("roleを持たないテキスト要素を検証できる", () => {
    const document = createValidDocument();
    delete document.slides[0].elements[0].role;

    expect(slideDocumentSchema.safeParse(document).success).toBe(true);
  });

  it("重複したスライドIDを拒否する", () => {
    const document = createValidDocument();
    document.slides.push({
      id: "slide-1",
      width: 960,
      height: 540,
      background: "#FFFFFF",
      elements: [],
    });

    const result = slideDocumentSchema.safeParse(document);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ["slides", 1, "id"] }),
        ]),
      );
    }
  });

  it("異なるスライド間でも重複した要素IDを拒否する", () => {
    const document = createValidDocument();
    document.slides.push({
      id: "slide-2",
      width: 960,
      height: 540,
      background: "#FFFFFF",
      elements: [
        {
          ...structuredClone(document.slides[0].elements[0]),
          x: 0,
          y: 0,
        },
      ],
    });

    const result = slideDocumentSchema.safeParse(document);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["slides", 1, "elements", 0, "id"],
          }),
        ]),
      );
    }
  });
});

describe("safeParseSlideDocument", () => {
  it("v1をIDと内容を保ったままv3へ移行する", () => {
    const legacyDocument = createLegacyDocument();

    const result = safeParseSlideDocument(legacyDocument);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.version).toBe(3);
      expect(result.data.slides[0].id).toBe(legacyDocument.slides[0].id);
      expect(result.data.slides[0].elements.map((element) => element.id)).toEqual(
        legacyDocument.slides[0].elements.map((element) => element.id),
      );
      expect(result.data.slides[0].elements[0]).toMatchObject({
        role: "title",
        text: "タイトル",
      });
    }
  });

  it("不正なv1を移行前に拒否する", () => {
    const legacyDocument = createLegacyDocument();
    legacyDocument.slides[0].elements[0].style.color = "red";

    const result = safeParseSlideDocument(legacyDocument);

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
});

it('v2を以前の閉じたスキーマで検証してからv3へ移行する', () => {
  const old = { ...createValidDocument(), version: 2 };
  const parsed = safeParseSlideDocument(old);
  expect(parsed.success).toBe(true);
  if (parsed.success) {
    expect(parsed.data.version).toBe(3);
    expect(parsed.data.slides).toEqual(old.slides);
  }
  const unsupported = structuredClone(old);
  unsupported.slides[0].elements[0].style.fontWeight = '850';
  expect(safeParseSlideDocument(unsupported).success).toBe(false);
});

it('v3の書式付きテキストを保存・復元し、本文との不整合を拒否する', () => {
  const document = createValidDocument();
  const element = document.slides[0].elements[0];
  element.style.fontWeight = '850';
  element.style.fontFamily = 'system-ui, sans-serif';
  element.style.letterSpacing = -1.5;
  element.runs = [{ text: element.text, style: { ...element.style, color: '#00ff00' } }];
  expect(safeParseSlideDocument(JSON.parse(JSON.stringify(document)))).toEqual({ success: true, data: document });
  element.runs[0].text = '違う内容';
  expect(safeParseSlideDocument(document).success).toBe(false);
});
