import { z } from "zod";
import { safeParseSlideDocument as parseLegacy, type SlideDocumentV1 } from './legacySlideSchema';
export { slideDocumentV1Schema, type SlideDocumentV1 } from './legacySlideSchema';

// アプリのドキュメントの識別子と最新バージョン情報
export const SLIDE_DOCUMENT_KIND = "nexus-kajiya.slide-document" as const;
export const CURRENT_SLIDE_DOCUMENT_VERSION = 3 as const;

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
    fontSize: z.number().finite().min(1).max(500),
    fontWeight: z.string().regex(/^\d{1,4}(?:\.\d+)?$/).refine(value => Number(value) >= 1 && Number(value) <= 1000),
    lineHeight: z.union([z.number().finite().min(0.5).max(10), z.literal("normal")]),
    color: hexColorSchema,
    textAlign: z.enum(["left", "center", "right", "start", "end", "justify"]),
    fontFamily: z.string().min(1).max(512).optional(),
    letterSpacing: z.number().finite().min(-100).max(100).optional(),
    inlineMarginLeft: z.number().finite().min(-960).max(960).optional(),
    inlineMarginRight: z.number().finite().min(-960).max(960).optional(),
    fontStyle: z.enum(['normal', 'italic', 'oblique']).optional(),
    whiteSpace: z.enum(['normal', 'nowrap', 'pre', 'pre-wrap', 'pre-line', 'break-spaces']).optional(),
    textTransform: z.enum(['none', 'uppercase', 'lowercase', 'capitalize']).optional(),
    wordBreak: z.enum(['normal', 'break-all', 'keep-all', 'break-word']).optional(),
    overflowWrap: z.enum(['normal', 'break-word', 'anywhere']).optional(),
  })
  .strict();

export const textRunSchema = z.object({
  text: z.string(),
  style: textStyleSchema,
  lineBreak: z.boolean().optional(),
}).strict();
export type TextStyle = z.infer<typeof textStyleSchema>;
export type TextRun = z.infer<typeof textRunSchema>;

// テキスト要素本体の定義（elementFrameSchema を継承・拡張）
export const textElementSchema = elementFrameSchema
  .extend({
    type: z.literal("text"),
    text: z.string(),
    style: textStyleSchema,
    runs: z.array(textRunSchema).max(10000).optional(),
    verticalAlign: z.enum(['top', 'center']).optional(),
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
    const text = element as z.infer<typeof textElementSchema>;
    if (text.runs && (text.runs.map(run => run.text).join('') !== text.text || text.runs.some(run => run.lineBreak && run.text !== '\n'))) {
      context.addIssue({ code: 'custom', path: ['elements', index, 'runs'], message: '文字と書式付きテキストが一致しません' });
    }
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

// Validate older versions against their original closed schemas before upgrading.
export function migrateSlideDocumentV1(document: SlideDocumentV1): SlideDocument {
  const result = safeParseSlideDocument(document);
  if (!result.success) throw result.error;
  return result.data;
}
export function safeParseSlideDocument(input: unknown): z.SafeParseReturnType<unknown, SlideDocument> {
  if (typeof input === 'object' && input !== null && 'version' in input && (input.version === 1 || input.version === 2)) {
    const legacy = parseLegacy(input);
    if (!legacy.success) return legacy;
    return slideDocumentSchema.safeParse({ ...legacy.data, version: CURRENT_SLIDE_DOCUMENT_VERSION });
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
