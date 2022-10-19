import React from 'react';
import type { DragAndDropControllerOptions } from '../controller';
import { DragAndDropController } from '../controller';

export const useDragAndDrop = (conf?: DragAndDropControllerOptions) => {
  const controller = React.useMemo(() => {
    return new DragAndDropController(conf);
  }, []);

  return controller;
};
