import React from 'react';
import { ObjectInspector } from '@devtools-ds/object-inspector';
import { ActivePlayerState } from '@player-tools/devtools-client';

interface ViewInspectorProps {
  currentView: ActivePlayerState['view'];
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
