import type { Asset, AssetWrapper } from "@player-ui/types";
import {
  type BaseBuildContext,
  genId,
  isFluentBuilder,
  BranchTypes,
} from "../base-builder";
import {
  isTaggedTemplateValue,
  type TaggedTemplateValue,
} from "../tagged-template";

type CaseExpression = boolean | string | TaggedTemplateValue;

interface SwitchCase<
  T extends Asset,
  C extends BaseBuildContext = BaseBuildContext,
> {
  readonly case: CaseExpression;
  readonly asset: T | { build(context?: C): T };
}

interface SwitchArgs<
  T extends Asset,
  C extends BaseBuildContext = BaseBuildContext,
> {
  readonly cases: ReadonlyArray<SwitchCase<T, C>>;
  readonly isDynamic?: boolean;
}

function processCaseExpression(exp: CaseExpression): string | boolean {
  if (typeof exp === "boolean") {
    return exp;
  }

  if (isTaggedTemplateValue(exp)) {
    return exp.toString();
  }

  return String(exp);
}

/**
 * Creates a switch configuration for conditionally selecting an asset
 * @see https://player-ui.github.io/next/content/assets-views/#switches
 */
export const switch_ =
  <T extends Asset, C extends BaseBuildContext = BaseBuildContext>({
    cases,
    isDynamic = false,
  }: SwitchArgs<T, C>) =>
  (ctx: C, caseOffset: number = 0): AssetWrapper => {
    const switchType = isDynamic ? "dynamic" : "static";

    return {
      [`${switchType}Switch`]: cases.map((c, index) => {
        const caseParentCtx: C = {
          ...ctx,
          parentId: ctx.parentId,
          branch: {
            type: BranchTypes.SWITCH,
            kind: switchType,
            index: caseOffset + index,
          },
        } as C;

        const asset: T =
          isFluentBuilder(c.asset) && "build" in c.asset
            ? (c.asset.build(caseParentCtx) as T)
            : (c.asset as T);

        return {
          case: processCaseExpression(c.case),
          asset: {
            ...asset,
            id: asset.id ?? genId(caseParentCtx),
          },
        };
      }),
    } as AssetWrapper;
  };
