import React from 'react';
import {
  type ConsoleExpression,
  Console as ConsoleComp,
  ConsoleResultInspector,
} from '@devtools-ds/console';
import { Navigation } from '@devtools-ds/navigation';
import { DeleteIcon } from '@devtools-ds/icon';
import type { ConsoleState } from '@player-tools/devtools-client';
import styles from './console.css';

const mapHistory = (history: ConsoleState['history']): ConsoleExpression[] => {
  return history.map((h: any) => {
    return {
      id: h.id,
      expression: h.result?.exp ?? '',
      result: h.result?.status === 'error' ? h.result.message : h.result?.data,
      severity: h.result?.status === 'error' ? 'error' : undefined,
    };
  });
};

export const ConsoleHeader = () => {
  return (
    <div style={{ margin: 10 }}>
      <p>
        The console allows you to evaluate any Player expression <br />
        Check out the{' '}
        <a
          href="https://player-ui.github.io/latest/content/data-expressions"
          target="_blank"
          rel="noreferrer"
        >
          docs
        </a>{' '}
        for the available expressions
      </p>
    </div>
  );
};

interface ConsoleProps {
  consoleState: ConsoleState;
  onClear: () => void;
  onExecute: (expression: string) => string;
}

export const Console = ({ consoleState, onClear, onExecute }: ConsoleProps) => (
  <div>
    <ConsoleHeader />
    <Navigation>
      <Navigation.Controls>
        <Navigation.Right>
          <Navigation.Button
            aria-label="Clear"
            icon={<DeleteIcon inline />}
            onClick={onClear}
          />
        </Navigation.Right>
      </Navigation.Controls>
    </Navigation>
    <div className={styles.consoleWrapper}>
      <ConsoleComp
        history={
          consoleState?.history?.length ? mapHistory(consoleState?.history) : []
        }
        execute={onExecute}
        resultComponent={ConsoleResultInspector}
      />
    </div>
  </div>
);
