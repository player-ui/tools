import React from 'react';
import type { View } from '@player-ui/types';
import { ObjectInspector } from '@devtools-ds/object-inspector';

interface ViewInspectorProps {
  readonly currentView: View;
}

/**
 * Displays the view panel for a player instance.
 * @returns
 */
export const ViewInspector = ({ currentView }: ViewInspectorProps) => (
  <div>
    <ObjectInspector
      data={currentView}
      includePrototypes={false}
      expandLevel={4}
    />
  </div>
);
