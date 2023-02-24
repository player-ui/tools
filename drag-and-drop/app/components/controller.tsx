import React from 'react';
import type { DragAndDropController } from '@player-tools/dnd-lib';

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
