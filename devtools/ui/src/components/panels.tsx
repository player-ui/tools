import React from 'react';
import { ConfigPanel } from './config';
import { DataPanel } from './data';
import { EventsPanel } from './events';
import { FlowPanel } from './flow';
import { ViewPanel } from './view';
import { ConsolePanel } from './console';
import { ProfilerPanel } from './profiler';

export const PANEL_IDS = [
  // 'config',
  'events',
  'data',
  'flow',
  'view',
  'console',
  // 'profiler',
] as const;
export type PanelID = typeof PANEL_IDS[number];

const ContentPage: Record<PanelID, React.ComponentType> = {
  // config: ConfigPanel,
  events: EventsPanel,
  data: DataPanel,
  flow: FlowPanel,
  view: ViewPanel,
  console: ConsolePanel,
  // profiler: ProfilerPanel,
};

interface ContentProps {
  panelId: PanelID;
}

export const Content = (props: ContentProps) => {
  const ContentPageComp = ContentPage[props.panelId];

  if (!ContentPageComp) {
    return <div>Unknown tab {props.panelId}</div>;
  }

  return <ContentPageComp />;
};
