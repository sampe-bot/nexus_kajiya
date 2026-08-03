import type { Slide } from "./slideSchema";

export type SlideTemplate = {
  id: string;
  requiredElementRoles: readonly string[];
};

export type SlideTemplateValidationIssue = {
  role: string;
  message: string;
};

export const titleBodyTemplate = {
  id: "title-body",
  requiredElementRoles: ["title", "body"],
} as const satisfies SlideTemplate;

export function validateSlideAgainstTemplate(
  slide: Slide,
  template: SlideTemplate,
): SlideTemplateValidationIssue[] {
  const presentRoles = new Set(
    slide.elements
      .map((element) => element.role)
      .filter((role): role is string => role !== undefined),
  );

  return template.requiredElementRoles
    .filter((role) => !presentRoles.has(role))
    .map((role) => ({
      role,
      message: `${template.id}テンプレートには${role}要素が必要です`,
    }));
}
