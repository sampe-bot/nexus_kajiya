import { z } from "zod";

export const SLIDE_DOCUMENT_KIND = "nexus-kajiya.slide-document" as const;
export const CURRENT_SLIDE_DOCUMENT_VERSION = 2 as const;
export const SLIDE_WIDTH = 960;
export const SLIDE_HEIGHT = 540;

const idSchema = z.string().min(1, "IDを指定してください");
const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "6桁のHEXカラーを指定してください");

const elementFrameSchema = z
  .object({
    id: idSchema,
    role: z.string().min(1).max(64).optional(),
    x: z.number().finite().min(0),
    y: z.number().finite().min(0),
    width: z.number().finite().positive(),
    height: z.number().finite().positive(),
  })
  .strict();

export const textStyleSchema = z
  .object({
    fontSize: z.number().finite().min(8).max(160),
    fontWeight: z.enum(["400", "500", "600", "700"]),
    lineHeight: z.number().finite().min(1).max(2),
    color: hexColorSchema,
    textAlign: z.enum(["left", "center", "right"]),
  })
  .strict();

export const textElementSchema = elementFrameSchema
  .extend({
    type: z.literal("text"),
    text: z.string(),
    style: textStyleSchema,
  })
  .strict();

// New element types are added to this discriminated union. Consumers must
// branch on `type` instead of assuming every slide element is text.
export const slideElementSchema = z.discriminatedUnion("type", [
  textElementSchema,
]);

type ElementFrame = z.infer<typeof elementFrameSchema>;

function validateSlideElements(
  slide: { width: number; height: number; elements: ElementFrame[] },
  context: z.RefinementCtx,
) {
  const ids = new Set<string>();

  slide.elements.forEach((element, index) => {
    if (ids.has(element.id)) {
      context.addIssue({
        code: "custom",
        path: ["elements", index, "id"],
        message: "要素IDはスライド内で一意にしてください",
      });
    }
    ids.add(element.id);

    if (
      element.x + element.width > slide.width ||
      element.y + element.height > slide.height
    ) {
      context.addIssue({
        code: "custom",
        path: ["elements", index],
        message: "要素をスライド領域内に配置してください",
      });
    }
  });
}

export const slideSchema = z
  .object({
    id: idSchema,
    width: z.literal(SLIDE_WIDTH),
    height: z.literal(SLIDE_HEIGHT),
    background: hexColorSchema,
    elements: z.array(slideElementSchema),
  })
  .strict()
  .superRefine(validateSlideElements);

export const slideDocumentSchema = z
  .object({
    kind: z.literal(SLIDE_DOCUMENT_KIND),
    version: z.literal(CURRENT_SLIDE_DOCUMENT_VERSION),
    slides: z.array(slideSchema).min(1, "スライドを1枚以上指定してください"),
  })
  .strict()
  .superRefine((document, context) => {
    const slideIds = new Set<string>();
    const elementIds = new Set<string>();

    document.slides.forEach((slide, slideIndex) => {
      if (slideIds.has(slide.id)) {
        context.addIssue({
          code: "custom",
          path: ["slides", slideIndex, "id"],
          message: "スライドIDはドキュメント全体で一意にしてください",
        });
      }
      slideIds.add(slide.id);

      slide.elements.forEach((element, elementIndex) => {
        if (elementIds.has(element.id)) {
          context.addIssue({
            code: "custom",
            path: ["slides", slideIndex, "elements", elementIndex, "id"],
            message: "要素IDはドキュメント全体で一意にしてください",
          });
        }
        elementIds.add(element.id);
      });
    });
  });

export type TextElement = z.infer<typeof textElementSchema>;
export type SlideElement = z.infer<typeof slideElementSchema>;
export type Slide = z.infer<typeof slideSchema>;
export type SlideDocument = z.infer<typeof slideDocumentSchema>;

// v1 remains explicit so imported files are validated against the format they
// declare before being migrated. Template-specific title/body requirements are
// preserved only here; they are not document-level invariants in v2.
const legacyTextElementSchema = textElementSchema
  .extend({ role: z.enum(["title", "body"]) })
  .strict();

const legacySlideSchema = z
  .object({
    id: idSchema,
    width: z.literal(SLIDE_WIDTH),
    height: z.literal(SLIDE_HEIGHT),
    background: hexColorSchema,
    elements: z.array(legacyTextElementSchema).min(2),
  })
  .strict()
  .superRefine((slide, context) => {
    validateSlideElements(slide, context);

    const roles = new Set(slide.elements.map((element) => element.role));
    (["title", "body"] as const).forEach((role) => {
      if (!roles.has(role)) {
        context.addIssue({
          code: "custom",
          path: ["elements"],
          message: `${role}要素が必要です`,
        });
      }
    });
  });

export const slideDocumentV1Schema = z
  .object({
    kind: z.literal(SLIDE_DOCUMENT_KIND),
    version: z.literal(1),
    slides: z.array(legacySlideSchema).length(1),
  })
  .strict();

export type SlideDocumentV1 = z.infer<typeof slideDocumentV1Schema>;

export function migrateSlideDocumentV1(
  legacyDocument: SlideDocumentV1,
): SlideDocument {
  return {
    kind: legacyDocument.kind,
    version: CURRENT_SLIDE_DOCUMENT_VERSION,
    slides: legacyDocument.slides.map((slide) => ({
      ...slide,
      elements: slide.elements.map((element) => ({
        ...element,
        style: { ...element.style },
      })),
    })),
  };
}

function declaresVersion(input: unknown, version: number): boolean {
  return (
    typeof input === "object" &&
    input !== null &&
    "version" in input &&
    input.version === version
  );
}

export function safeParseSlideDocument(
  input: unknown,
): z.SafeParseReturnType<unknown, SlideDocument> {
  if (declaresVersion(input, 1)) {
    const legacyResult = slideDocumentV1Schema.safeParse(input);
    if (!legacyResult.success) {
      return legacyResult;
    }

    return slideDocumentSchema.safeParse(
      migrateSlideDocumentV1(legacyResult.data),
    );
  }

  return slideDocumentSchema.safeParse(input);
}

export function formatValidationError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "document";
      return `${path}: ${issue.message}`;
    })
    .join("\n");
}
