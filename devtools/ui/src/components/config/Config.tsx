import React from 'react';
import type { Runtime } from '@player-tools/devtools-client';
import { ObjectInspector } from '@devtools-ds/object-inspector';
import { Controls, Navigation, Tab, TabList } from '@devtools-ds/navigation';
import { headerCase } from 'change-case';

export const SUB_PANEL_IDS = ['plugins', 'schema', 'expressions'] as const;

interface ConfigProps {
  readonly configState: Runtime.PlayerConfigRPC['result'];
}

export const Config = ({ configState }: ConfigProps) => {
  const renderSubPanel = (param: string) => {
    switch (param) {
      case 'schema':
        return (
          <div>
            <ObjectInspector
              data={configState?.schema}
              includePrototypes={false}
              expandLevel={4}
            />
          </div>
        );
      case 'expressions':
        return (
          <div>
            <ObjectInspector
              data={configState?.expressions}
              includePrototypes={false}
              expandLevel={4}
            />
          </div>
        );
      default:
        return (
          <div>
            <ObjectInspector
              data={configState?.plugins}
              includePrototypes={false}
              expandLevel={4}
            />
          </div>
        );
    }
  };

  return (
    <div style={{ width: '100%' }}>
      <Navigation defaultIndex={0}>
        <Controls>
          <TabList>
            {SUB_PANEL_IDS.map((panelID) => (
              <Tab key={panelID} id={panelID}>
                {headerCase(panelID)}
              </Tab>
            ))}
          </TabList>
        </Controls>
        <Navigation.Panels>
          {SUB_PANEL_IDS.map((panelID) => (
            <Navigation.Panel key={panelID}>
              {renderSubPanel(panelID)}
            </Navigation.Panel>
          ))}
        </Navigation.Panels>
      </Navigation>
    </div>
  );
};
