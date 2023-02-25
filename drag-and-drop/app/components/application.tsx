import type { ObjectType } from '@player-tools/xlr';
import type { Asset, View } from '@player-ui/types';
import React from 'react';

export interface DisplayedAssetInformation {
  /** The Asset that correlates to the given ID */
  asset: Asset;
  /** The underlying XLR type for the Asset */
  type: ObjectType;
}

export const PropertiesContext = React.createContext<{
  /**
   * Current Asset thats selected in the edit panel on the right
   */
  displayedAssetID?: symbol;
  /**
   * Sets `displayedAssetID`
   */
  setDisplayedAssetID: (id: symbol) => void;

  playerContent: View;

  setPlayerContent: (content: View) => void;

  /**
   * Current XLR Type thats selected in the docs panel on the right
   */
  displayedXLRDocType?: string;
  /**
   * Sets `displayedAssetID`
   */
  setDisplayedXLRDocType: (id: string) => void;

  /**
   * If the export modal is open
   */
  exportOpen: boolean;

  /** Sets `exportOpen` */
  setExportOpen: (state: boolean) => void;

  /** If the right panel is docs or edit */
  rightPanelState: 'docs' | 'edit';

  /** Sets `rightPanelState` */
  setRightPanelState: (state: 'docs' | 'edit') => void;
}>({
  setDisplayedAssetID: () => {},
  setExportOpen: () => {},
  setRightPanelState: () => {},
  exportOpen: false,
  rightPanelState: 'edit',
  setDisplayedXLRDocType: () => {},
  playerContent: undefined,
  setPlayerContent: () => {},
});

/**
 *
 */
export function useProperties() {
  return React.useContext(PropertiesContext);
}
