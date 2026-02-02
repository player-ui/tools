import { type BaseBuildContext, StorageKeys } from "../../types";
import type { AuxiliaryStorage } from "../../storage/auxiliary-storage";
import type { template as easyDslTemplate } from "../../../index";

/**
 * Step 8: Resolves templates
 *
 * Processes template functions and adds them to the result.
 * Templates are special constructs that generate dynamic content.
 *
 * @param auxiliaryStorage - Storage containing template functions
 * @param result - The result object being built
 * @param context - Build context for template resolution
 */
export function resolveTemplates<C extends BaseBuildContext>(
  auxiliaryStorage: AuxiliaryStorage,
  result: Record<string, unknown>,
  context: C | undefined,
): void {
  const templateFns = auxiliaryStorage.getArray<
    ReturnType<typeof easyDslTemplate>
  >(StorageKeys.TEMPLATES);

  if (templateFns.length === 0) {
    return;
  }

  if (!context) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `resolveTemplates: ${templateFns.length} template(s) exist but no context provided. ` +
          "Templates will be ignored. Pass a build context to .build() to enable template resolution.",
      );
    }
    return;
  }

  const templates = templateFns.map((fn) => fn(context));
  result.template = templates;
}
