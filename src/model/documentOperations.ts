import type {
  Slide,
  SlideDocument,
  SlideElement,
  TextElement,
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
  return updateElement(document, slideId, elementId, (element) =>
    element.type === "text" ? { ...element, text } : element,
  );
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
