import { z } from "zod";

export const SLIDE_WIDTH = 960;
export const SLIDE_HEIGHT = 540;

const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "6桁のHEXカラーを指定してください");

export const textElementSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("text"),
    role: z.enum(["title", "body"]),
    text: z.string(),
    x: z.number().finite().min(0),
    y: z.number().finite().min(0),
    width: z.number().finite().positive(),
    height: z.number().finite().positive(),
    style: z
      .object({
        fontSize: z.number().finite().min(8).max(160),
        fontWeight: z.enum(["400", "500", "600", "700"]),
        lineHeight: z.number().finite().min(1).max(2),
        color: hexColorSchema,
        textAlign: z.enum(["left", "center", "right"]),
      })
      .strict(),
  })
  .strict();

export const slideSchema = z
  .object({
    id: z.string().min(1),
    width: z.literal(SLIDE_WIDTH),
    height: z.literal(SLIDE_HEIGHT),
    background: hexColorSchema,
    elements: z.array(textElementSchema).min(2),
  })
  .strict()
  .superRefine((slide, context) => {
    const ids = new Set<string>();
    const roles = new Set<string>();

    slide.elements.forEach((element, index) => {
      if (ids.has(element.id)) {
        context.addIssue({
          code: "custom",
          path: ["elements", index, "id"],
          message: "要素IDはスライド内で一意にしてください",
        });
      }
      ids.add(element.id);
      roles.add(element.role);

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

export const slideDocumentSchema = z
  .object({
    kind: z.literal("nexus-kajiya.slide-document"),
    version: z.literal(1),
    slides: z.array(slideSchema).length(1),
  })
  .strict();

export type TextElement = z.infer<typeof textElementSchema>;
export type Slide = z.infer<typeof slideSchema>;
export type SlideDocument = z.infer<typeof slideDocumentSchema>;

export function formatValidationError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "document";
      return `${path}: ${issue.message}`;
    })
    .join("\n");
}
