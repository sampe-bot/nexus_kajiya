import { describe, expect, it } from "vitest";
import {
  moveTextElement,
  updateTextElement,
} from "./documentOperations";
import type { SlideDocument } from "./slideSchema";

function createDocument(): SlideDocument {
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
            text: "変更前",
            x: 80,
            y: 100,
            width: 300,
            height: 80,
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
            width: 600,
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

describe("documentOperations", () => {
  it("テキスト更新で元のDocumentを変更しない", () => {
    const original = createDocument();
    const originalSnapshot = structuredClone(original);

    const updated = updateTextElement(original, "slide-1", "title-1", "変更後");

    expect(updated).not.toBe(original);
    expect(updated.slides[0].elements[0].text).toBe("変更後");
    expect(original).toEqual(originalSnapshot);
  });

  it("移動した要素がスライド外へ出ない", () => {
    const original = createDocument();

    const movedPastTopLeft = moveTextElement(
      original,
      "slide-1",
      "title-1",
      { x: -100, y: -50 },
    );
    const movedPastBottomRight = moveTextElement(
      original,
      "slide-1",
      "title-1",
      { x: 2_000, y: 2_000 },
    );

    expect(movedPastTopLeft.slides[0].elements[0]).toMatchObject({ x: 0, y: 0 });
    expect(movedPastBottomRight.slides[0].elements[0]).toMatchObject({
      x: 660,
      y: 460,
    });
  });

  it("存在しない要素IDではDocumentを変更しない", () => {
    const original = createDocument();

    const updated = updateTextElement(
      original,
      "slide-1",
      "missing-element",
      "変更後",
    );

    expect(updated).toBe(original);
  });
});

it('書式付きテキストの一部を書き換えても周囲の色・太さ・改行を保持する', () => {
  const document = createDocument();
  const element = document.slides[0].elements[0];
  element.text = '前半色付き\n後半';
  element.runs = [
    { text: '前半', style: element.style },
    { text: '色付き', style: { ...element.style, color: '#00ff00', fontWeight: '850' } },
    { text: '\n', lineBreak: true, style: element.style },
    { text: '後半', style: element.style },
  ];
  const snapshot = structuredClone(document);
  const result = updateTextElement(document, 'slide-1', 'title-1', '前半に追記色付き\n後半');
  const runs = result.slides[0].elements[0].runs!;
  expect(runs.map(run => run.text).join('')).toBe('前半に追記色付き\n後半');
  expect(runs.find(run => run.text === '色付き')?.style).toMatchObject({ color: '#00ff00', fontWeight: '850' });
  expect(runs.find(run => run.lineBreak)?.text).toBe('\n');
  expect(document).toEqual(snapshot);
});
