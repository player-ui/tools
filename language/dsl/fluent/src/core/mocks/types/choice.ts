import type { Asset, AssetWrapper, Binding } from "@player-ui/types";

export const ALL_CATEGORIES = ["recommended"] as const;

export type ChoiceItemCategory = (typeof ALL_CATEGORIES)[number];

/** Any modifier that can appear on a choice */
export type ChoiceModifier = {
  /** The default type */
  type: "tag";

  /** A compact modifier renders a radio button as a dropdown  */
  value: "compact";
};

/** Optional tag to set choice as readonly */
export type ChoiceInputModifier = {
  /** The default type */
  type: "input";

  /** modifier to set the choices to readonly */
  value: "readonly";
};

export type ChoiceItemMetadata = {
  /** optional category for the choice item to determine its purpose:
   * recommended: this choice item is recommended for the user over or in addition to other items
   */
  category?: ChoiceItemCategory;
};

export interface ChoiceItem<AnyAsset extends Asset = Asset> {
  /** The id associated with the choice item */
  id: string;

  /** The id used for replay tests. */
  automationId?: string;

  /** The label describing the choice. */
  label?: AssetWrapper<AnyAsset>;

  /** The icon describing the choice. */
  icon?: AssetWrapper<AnyAsset>;

  /** The help for the choice. */
  help?: AssetWrapper<AnyAsset>;

  /** Support the legacy choiceHelp prop. No storybook docs for this; deprecated in favour of the "help" field. */
  choiceHelp?: AssetWrapper<AnyAsset>;

  /** The description of the choice. */
  description?: AssetWrapper<AnyAsset>;

  /** The footer of the choice. */
  footer?: AssetWrapper<AnyAsset>;

  /**
   * The value to set when this choice is selected
   */
  value?: string | number | boolean | null;

  /** The details shown when a user selects the choice item */
  choiceDetail?: AssetWrapper<AnyAsset>;
  /**
   * Any modifiers for the current item. No storybook docs for this as "readonly" (the only modifier) shouldn't be used anymore.
   */
  modifiers?: Array<ChoiceInputModifier>;

  /** MetaData for the choiceItem */
  metaData?: ChoiceItemMetadata;
}

export interface ChoiceMetaData {
  /** Display the asset a little differently based on the role, monthselector only applies to multiselect asset */
  role?: "tiles" | "monthselector"; // problem with Omit again, can't omit metaData on choiceProps and redefine it

  /** used to set tiles to jumbo manually */
  tileSize?: "jumbo" | undefined;

  /** should The placeholder be disabled or not */
  placeholderSelectable?: boolean;
}

/**
 * Choice assets are more specific type of data collection element
 *  where user is presented with a number of predefined choices and
 * asked to select a single answer.
 */
export interface ChoiceAsset<AnyAsset extends Asset = Asset>
  extends Asset<"choice"> {
  /** The binding used to keep track of the selected Choice */
  binding: Binding;

  /** The choiceItems used as options */
  choices?: Array<ChoiceItem<AnyAsset>>;

  /** The label describing the choice field. */
  label?: AssetWrapper<AnyAsset>;

  /** choice help providing additional info that could be helpful  */
  help?: AssetWrapper<AnyAsset>;

  /** choice note */
  note?: AssetWrapper;

  /** placeholder string to show by default for the choice */
  placeholder?: string;

  /** any accessibility text to be added as an aria label.*/
  accessibility?: string;

  /** The info that appears underneath the choice  */
  additionalInfo?: AssetWrapper<AnyAsset>;

  /** The resulting Text that appears underneath the choice */
  resultText?: AssetWrapper<AnyAsset>;

  /** */
  modifiers?: Array<ChoiceModifier | ChoiceInputModifier>;

  /** Additional metaData for the Choice */
  metaData?: ChoiceMetaData;

  /** The main action associated with choices */
  action?: AssetWrapper<AnyAsset>;

  /** The main image associated with choices */
  image?: AssetWrapper<AnyAsset>;
}
