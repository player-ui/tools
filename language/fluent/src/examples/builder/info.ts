import type { Asset } from "@player-ui/types";
import type { InfoAsset } from "../types/info";
import type {
  BaseFluentBuilder,
  ExtractBuilderArgs,
  ParentCtx,
} from "../../types";
import { createAssetWrapper } from "../../asset-wrapper";
import { genId } from "../../id-generator";
import { markAsBuilder, safeToString } from "../../utils";

/**
 * Derived builder args type for InfoAsset
 */
type InfoBuilderArgs = ExtractBuilderArgs<InfoAsset>;

/**
 * Internal state for the info component
 * Stores the current asset state
 */
interface InfoComponentState {
  /** The info asset being built */
  asset: InfoAsset;
  titleAsset?: Asset | (<K extends ParentCtx>(ctx: K) => Asset);
  subTitleAsset?: Asset | (<K extends ParentCtx>(ctx: K) => Asset);
  primaryInfoAsset?: Asset | (<K extends ParentCtx>(ctx: K) => Asset);
  /** The actions asset to be built when the component is called */
  actionsAssets?: Array<Asset | (<K extends ParentCtx>(ctx: K) => Asset)>;
}

/** This interface is a callable Info component with a fluent API for configuring Infos */
export interface InfoComponent extends BaseFluentBuilder<InfoComponent> {
  /** Generate the InfoAsset with context */
  <K extends ParentCtx>(ctx: K): InfoAsset;

  /** The string value to show */
  withTitle: (title: NonNullable<InfoBuilderArgs["title"]>) => InfoComponent;

  /** subtitle */
  withSubTitle: (
    subTitle: NonNullable<InfoBuilderArgs["subTitle"]>,
  ) => InfoComponent;

  /** Primary place for info  */
  withPrimaryInfo: (
    primaryInfo: NonNullable<InfoBuilderArgs["primaryInfo"]>,
  ) => InfoComponent;

  /** List of actions to show at the bottom of the page */
  withActions: (
    actions: NonNullable<InfoBuilderArgs["actions"]>,
  ) => InfoComponent;

  /** @private Component state */
  state: InfoComponentState;
}

/** Creates a info component with a fluent API for configuration. */
export function info(args?: Partial<InfoBuilderArgs>): InfoComponent {
  // Initialize the component state
  const state: InfoComponentState = {
    asset: {
      id: "",
      type: "info",
    },
  };

  // Create the component function
  const component = (<K extends ParentCtx>(_ctx: K) => {
    // If the asset has an id, use it otherwise generate a new id using the genId function
    const ctx = component.state.asset.id
      ? {
          ..._ctx,
          parentId: component.state.asset.id,
          branch: { type: "custom" },
        }
      : _ctx;
    const id = genId(ctx);

    // Create the result asset
    const result = {
      ...component.state.asset,
      id,
    };

    // Handle title if present
    if (component.state.titleAsset) {
      result.title = createAssetWrapper(
        component.state.titleAsset,
        ctx,
        "title",
      );
    }

    // Handle subTitle if present
    if (component.state.subTitleAsset) {
      result.subTitle = createAssetWrapper(
        component.state.subTitleAsset,
        ctx,
        "subTitle",
      );
    }

    // Handle primaryInfo if present
    if (component.state.primaryInfoAsset) {
      result.primaryInfo = createAssetWrapper(
        component.state.primaryInfoAsset,
        ctx,
        "primaryInfo",
      );
    }

    // Handle actions if present
    if (component.state.actionsAssets) {
      result.actions = component.state.actionsAssets.map((item, index) =>
        createAssetWrapper(item, ctx, `actions-${index}`),
      );
    }

    return result;
  }) as InfoComponent;

  // Set the initial state
  component.state = state;

  // Define chainable methods
  component.withId = (id) => {
    component.state.asset.id = safeToString(id);
    return component;
  };

  component.withTitle = (title) => {
    component.state.titleAsset = title;
    return component;
  };

  component.withSubTitle = (subTitle) => {
    component.state.subTitleAsset = subTitle;
    return component;
  };

  component.withPrimaryInfo = (primaryInfo) => {
    component.state.primaryInfoAsset = primaryInfo;
    return component;
  };

  component.withActions = (actions) => {
    component.state.actionsAssets = actions;
    return component;
  };

  component.withApplicability = (applicability) => {
    component.state.asset.applicability = safeToString(applicability);
    return component;
  };

  // Apply any initial args
  if (args) {
    if (args.id) component.withId(args.id);
    if (args.title) component.withTitle(args.title);
    if (args.subTitle) component.withSubTitle(args.subTitle);
    if (args.primaryInfo) component.withPrimaryInfo(args.primaryInfo);
    if (args.actions) component.withActions(args.actions);
    if (args.applicability) component.withApplicability(args.applicability);
  }

  return markAsBuilder(component);
}
