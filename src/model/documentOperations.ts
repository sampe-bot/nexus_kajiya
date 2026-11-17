import type {
  Slide,
  SlideDocument,
  SlideElement,
  TextElement,
  TextRun,
} from "./slideSchema";

type TextElementPosition = Pick<TextElement, "x" | "y">;

function updateElement(
  document: SlideDocument,
  slideId: string,
  elementId: string,
  update: (element: SlideElement, slide: Slide) => SlideElement,
): SlideDocument {
  let documentChanged = false;

  const slides = document.slides.map((slide) => {
    if (slide.id !== slideId) {
      return slide;
    }

    let slideChanged = false;
    const elements = slide.elements.map((element) => {
      if (element.id !== elementId) {
        return element;
      }

      const updatedElement = update(element, slide);
      if (updatedElement === element) {
        return element;
      }

      slideChanged = true;
      return updatedElement;
    });

    if (!slideChanged) {
      return slide;
    }

    documentChanged = true;
    return { ...slide, elements };
  });

  return documentChanged ? { ...document, slides } : document;
}

export function updateTextElement(
  document: SlideDocument,
  slideId: string,
  elementId: string,
  text: string,
): SlideDocument {
  return updateElement(document, slideId, elementId, (element) => {
    if (element.type !== 'text' || element.text === text) return element;
    if (!element.runs) return { ...element, text };
    // Keep styles on unchanged text, assigning inserted text the style at the edit point.
    let prefix = 0;
    while (prefix < text.length && prefix < element.text.length && text[prefix] === element.text[prefix]) prefix++;
    let suffix = 0;
    while (suffix < text.length - prefix && suffix < element.text.length - prefix && text[text.length - 1 - suffix] === element.text[element.text.length - 1 - suffix]) suffix++;
    const slice = (start: number, end: number): TextRun[] => {
      let offset = 0;
      return element.runs!.flatMap(run => {
        const from = Math.max(0, start - offset), to = Math.min(run.text.length, end - offset);
        offset += run.text.length;
        return to > from ? [{ ...run, text: run.text.slice(from, to) }] : [];
      });
    };
    const insertionStyle = slice(Math.min(prefix, element.text.length - 1), Math.min(prefix + 1, element.text.length))[0]?.style ?? element.style;
    const inserted = text.slice(prefix, text.length - suffix).split(/(\n)/).filter(Boolean).map(value => ({ text: value, style: insertionStyle, ...(value === '\n' ? { lineBreak: true } : {}) }));
    return { ...element, text, runs: [...slice(0, prefix), ...inserted, ...slice(element.text.length - suffix, element.text.length)] };
  });
}

export function moveTextElement(
  document: SlideDocument,
  slideId: string,
  elementId: string,
  position: TextElementPosition,
): SlideDocument {
  return updateElement(document, slideId, elementId, (element, slide) =>
    element.type === "text"
      ? {
          ...element,
          x: Math.min(Math.max(position.x, 0), slide.width - element.width),
          y: Math.min(Math.max(position.y, 0), slide.height - element.height),
        }
      : element,
  );
}
