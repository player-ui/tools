import React from 'react';
import { Navigation, Controls, TabList, Tab } from '@devtools-ds/navigation';
import { headerCase } from 'change-case';
import { PANEL_IDS, type PanelID, Content } from './panels';

interface PanelNavigationProps {
  readonly onSelectTab?: (tabID: PanelID) => void;
}

export const PanelNavigation = (props: PanelNavigationProps) => {
  return (
    <div style={{ width: '100%' }}>
      <Navigation defaultIndex={0}>
        <Controls>
          <TabList>
            {PANEL_IDS.map((panelID) => (
              <Tab
                key={panelID}
                id={panelID}
                onClick={() => props.onSelectTab?.(panelID)}
              >
                {headerCase(panelID)}
              </Tab>
            ))}
          </TabList>
        </Controls>
        <Navigation.Panels>
          {PANEL_IDS.map((panelID) => (
            <Navigation.Panel key={panelID}>
              <Content panelId={panelID} />
            </Navigation.Panel>
          ))}
        </Navigation.Panels>
      </Navigation>
    </div>
  );
};
