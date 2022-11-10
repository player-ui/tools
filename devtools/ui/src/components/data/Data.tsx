import React from 'react';
import { ObjectInspector } from '@devtools-ds/object-inspector';
import Split from 'react-split';
import type { ResolvedASTNode, ASTNode } from '@devtools-ds/object-parser';
import type { Runtime } from '@player-tools/devtools-common';
import styles from './data.css';
import commonStyles from '../app.css';

interface DataDetailsPanelProps {
  details?: Runtime.PlayerDataBindingRPC['result'];
}

export const DataDetailsPanel = (props: DataDetailsPanelProps) => {
  const { details } = props;

  return (
    <div key={props.details?.binding} className={styles['data-details']}>
      <h3>Details</h3>
      {details ? (
        <div>
          <div className={styles['data-details-section']}>
            <div className={styles['data-details-pair']}>
              <h5>Binding:</h5>
              <span className={styles['data-details-string-value']}>
                {`"${details.binding}"`}
              </span>
            </div>
            <div className={styles['data-details-pair']}>
              <h5>Current Value:</h5>
              <ObjectInspector
                className={styles['data-details-obj-inspector']}
                includePrototypes={false}
                data={details.value?.currentValue}
              />
            </div>
            <div className={styles['data-details-pair']}>
              <h5>Formatted Value:</h5>
              <ObjectInspector
                className={styles['data-details-obj-inspector']}
                includePrototypes={false}
                data={details.value?.formattedValue}
              />
            </div>
            <div className={styles['data-details-pair']}>
              <h5>Model Value:</h5>
              <ObjectInspector
                className={styles['data-details-obj-inspector']}
                includePrototypes={false}
                data={details.value?.modelValue}
              />
            </div>
          </div>
          <div className={styles['data-details-section']}>
            <h4>Schema</h4>
            <div className={styles['data-details-pair']}>
              <h5>Type:</h5>
              <span className={styles['data-details-string-value']}>
                {`"${details.type?.type}"`}
              </span>
            </div>
            {details.type?.validation && (
              <div className={styles['data-details-pair']}>
                <h5>Validation:</h5>
                <ObjectInspector
                  className={styles['data-details-obj-inspector']}
                  includePrototypes={false}
                  data={details.type?.validation}
                />
              </div>
            )}
          </div>

          {details.validation && (
            <div className={styles['data-details-section']}>
              <h4>Validation</h4>
              <div className={styles['data-details-pair']}>
                <h5>Severity:</h5>
                <span className={styles['data-details-string-value']}>
                  {details.validation.severity}
                </span>
              </div>
              <div className={styles['data-details-pair']}>
                <h5>Message:</h5>
                <span className={styles['data-details-string-value']}>
                  {`"${details.validation.message}"`}
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p>Select binding to view details</p>
      )}
    </div>
  );
};

interface DataProps {
  allBindings: Runtime.PlayerDataBindingRPC['result'];
  selectedBinding: Runtime.PlayerDataBindingRPC['result'];
  onSelect: (astNode: ASTNode | ResolvedASTNode | undefined) => Promise<void>;
}

export const Data = ({ allBindings, selectedBinding, onSelect }: DataProps) => (
  <Split
    direction="horizontal"
    sizes={[75, 25]}
    className={styles.split}
    gutterSize={1}
  >
    <div className={styles['data-panel-wrapper']}>
      {allBindings?.value.currentValue ? (
        <ObjectInspector
          includePrototypes={false}
          expandLevel={7}
          data={allBindings?.value?.currentValue}
          onSelect={onSelect}
        />
      ) : (
        <div className={commonStyles.noData}>No data available</div>
      )}
    </div>
    <div className={styles['data-panel-wrapper']}>
      <DataDetailsPanel details={selectedBinding} />
    </div>
  </Split>
);
