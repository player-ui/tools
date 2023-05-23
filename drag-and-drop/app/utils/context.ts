import React from 'react';
import type { DragAndDropController } from '@player-tools/dnd-lib';

export const PropertiesContext = React.createContext<{
  /**
   * Current Asset thats selected in the edit panel on the right
   */
  displayedAssetID?: symbol;
  /**
   * Sets `displayedAssetID`
   */
  setDisplayedAssetID: (id: symbol) => void;

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
});

export const ControllerContext = React.createContext<
  | {
      /** */
      controller: DragAndDropController;
    }
  | undefined
>(undefined);

/**
 *
 */
export function useController() {
  return React.useContext(ControllerContext);
}

export function useProperties() {
  return React.useContext(PropertiesContext);
}
