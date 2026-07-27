import type {
  Slide,
  SlideDocument,
  TextElement,
} from "./slideSchema";

type TextElementPosition = Pick<TextElement, "x" | "y">;

function updateElement(
  document: SlideDocument,
  slideId: string,
  elementId: string,
  update: (element: TextElement, slide: Slide) => TextElement,
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

      slideChanged = true;
      return update(element, slide);
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
  return updateElement(document, slideId, elementId, (element) => ({
    ...element,
    text,
  }));
}

export function moveTextElement(
  document: SlideDocument,
  slideId: string,
  elementId: string,
  position: TextElementPosition,
): SlideDocument {
  return updateElement(document, slideId, elementId, (element, slide) => ({
    ...element,
    x: Math.min(Math.max(position.x, 0), slide.width - element.width),
    y: Math.min(Math.max(position.y, 0), slide.height - element.height),
  }));
}
