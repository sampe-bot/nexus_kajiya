import { z } from "zod";

// アプリのドキュメントの識別子と最新バージョン情報
export const SLIDE_DOCUMENT_KIND = "nexus-kajiya.slide-document" as const;
export const CURRENT_SLIDE_DOCUMENT_VERSION = 2 as const;

// スライドの論理サイズ（画面アスペクト比 16:9 の基準値）
export const SLIDE_WIDTH = 960;
export const SLIDE_HEIGHT = 540;

// 基本的なパーツのバリデーション定義
const idSchema = z.string().min(1, "IDを指定してください");

// #RRGGBB 形式の6桁16進数カラーコードであることを正規表現で担保
const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "6桁のHEXカラーを指定してください");

// 要素の配置・サイズに関する共通枠組み（全要素で共通して使用するプロパティ）
const elementFrameSchema = z
  .object({
    id: idSchema,
    role: z.string().min(1).max(64).optional(),
    x: z.number().finite().min(0),
    y: z.number().finite().min(0),
    width: z.number().finite().positive(),
    height: z.number().finite().positive(),
  })
  .strict(); // 定義にない未知のプロパティの混入を厳格に拒否する

// テキスト要素の装飾スタイル定義
export const textStyleSchema = z
  .object({
    fontSize: z.number().finite().min(8).max(160),
    fontWeight: z.enum(["400", "500", "600", "700"]),
    lineHeight: z.number().finite().min(1).max(2),
    color: hexColorSchema,
    textAlign: z.enum(["left", "center", "right"]),
  })
  .strict();

// テキスト要素本体の定義（elementFrameSchema を継承・拡張）
export const textElementSchema = elementFrameSchema
  .extend({
    type: z.literal("text"),
    text: z.string(),
    style: textStyleSchema,
  })
  .strict();


// 将来的に画像（image）や図形（shape）などの新要素を追加した際、
// `type` プロパティで安全に型分岐（Discriminated Union）できるようにする定義
export const slideElementSchema = z.discriminatedUnion("type", [
  textElementSchema,
]);

type ElementFrame = z.infer<typeof elementFrameSchema>;

// 単純な型チェックだけでは防げない「業務ロジックの違反」をチェックするヘルパー関数
function validateSlideElements(
  slide: { width: number; height: number; elements: ElementFrame[] },
  context: z.RefinementCtx,
) {
  const ids = new Set<string>();

  slide.elements.forEach((element, index) => {
    // チェック1: 同一スライド内で要素IDが重複していないか
    if (ids.has(element.id)) {
      context.addIssue({
        code: "custom",
        path: ["elements", index, "id"],
        message: "要素IDはスライド内で一意にしてください",
      });
    }
    ids.add(element.id);

    // チェック2: 要素がスライドの画面外にはみ出していないか（境界チェック）
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

// スライド 1 枚分のスキーマ定義
export const slideSchema = z
  .object({
    id: idSchema,
    width: z.literal(SLIDE_WIDTH),
    height: z.literal(SLIDE_HEIGHT),
    background: hexColorSchema,
    elements: z.array(slideElementSchema),
  })
  .strict()
  // カスタム検証ルール（要素IDの重複チェック＆画面はみ出しチェック）を適用
  .superRefine(validateSlideElements);

// ドキュメント全体（最新 v2）のスキーマ定義
export const slideDocumentSchema = z
  .object({
    kind: z.literal(SLIDE_DOCUMENT_KIND),
    version: z.literal(CURRENT_SLIDE_DOCUMENT_VERSION),
    slides: z.array(slideSchema).min(1, "スライドを1枚以上指定してください"),
  })
  .strict()
  // ドキュメント全体を通して「スライドID」および「全要素のID」がユニークかをチェック
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

// Zodのスキーマから TypeScript の型（Type）を自動生成（二重定義の手間を排除）
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

    // v1 スライドには title と body の両方が必須という昔のルールをチェック
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
