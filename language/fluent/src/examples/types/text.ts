import type { Asset, Expression } from "@player-ui/types";

/**
 * A text asset is a simple text string that can be displayed to the user.
 * It can be modified with modifiers to change its appearance.
 */
export interface TextAsset extends Asset<"text"> {
  /** The text to display */
  value: string;

  /** Any modifiers on the text */
  modifiers?: Array<TextModifier>;

  /** Applicability expression that conditionally shows or hides an asset (and all of its children) from the view tree */
  applicability?: string;
}

export type TextModifier = BasicTextModifier | LinkModifier;

/**
 * A basic text modifier is a modifier that can be applied to a text asset.
 * It can be used to change the appearance of the text.
 */
export interface BasicTextModifier {
  /** The modifier type */
  type: string;

  /** Modifiers can be named when used in strings */
  name?: string;

  /** A spot for other metaData or properties */
  [key: string]: unknown;
}

/** A modifier to turn the text into a link */
export interface LinkModifier {
  /** The link type denotes this as a link */
  type: "link";

  /** An optional expression to run before the link is opened */
  exp?: Expression;

  /** metaData about the link's target */
  metaData: {
    /** The location of the link to load */
    ref: string;

    /** Used to indicate an application specific resolver to use */
    "mime-type"?: string;
  };
}
