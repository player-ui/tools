import React from "react";
import { ObjectInspector } from "@devtools-ds/object-inspector";
import { Table } from "@devtools-ds/table";
import type { Runtime } from "@player-tools/devtools-common";
import styles from "./events.css";

const EVENT_NAME_MAP: Record<
  | Runtime.PlayerDataChangeEvent["type"]
  | Runtime.PlayerLogEvent["type"]
  | Runtime.PlayerFlowStartEvent["type"],
  string
> = {
  "player-data-change-event": "Data Change",
  "player-log-event": "Log",
  "player-flow-start": "Flow Start",
};

function createEmptyCells(
  currentSize: number,
  expectedSize: number,
  Element: React.ComponentType
) {
  return (
    new Array(expectedSize - currentSize)
      .fill(undefined)
      // eslint-disable-next-line react/no-array-index-key
      .map((_x, index) => <Element key={`empty-placeholder-${index}`} />)
  );
}

interface EventsProps {
  events: Array<
    | Runtime.PlayerDataChangeEvent
    | Runtime.PlayerLogEvent
    | Runtime.PlayerFlowStartEvent
  >;
}

export const Events = ({ events }: EventsProps) => {
  const rows = events.map((evt, index) => {
    const row = [
      <Table.Cell key={evt.type}>{EVENT_NAME_MAP[evt.type]}</Table.Cell>,
    ];

    if (evt.type === "player-log-event") {
      row.push(<Table.Cell>{evt.severity}</Table.Cell>);

      row.push(
        ...evt.message.map((mParam) => {
          if (typeof mParam === "number" || typeof mParam === "string") {
            return (
              <Table.Cell key={`log-param-${mParam}`}>{mParam}</Table.Cell>
            );
          }

          return (
            <Table.Cell key="log-param-obj">
              <ObjectInspector
                className={styles["events-panel-obj-inspector"]}
                includePrototypes={false}
                data={mParam}
              />
            </Table.Cell>
          );
        })
      );
    } else if (evt.type === "player-flow-start") {
      row.push(<Table.Cell key="flow-id">{evt.flow.id}</Table.Cell>);
    } else if (evt.type === "player-data-change-event") {
      row.push(
        <Table.Cell key="data-change-binding">{evt.binding}</Table.Cell>,
        <Table.Cell key="data-change-old-value">
          <ObjectInspector
            className={styles["events-panel-obj-inspector"]}
            data={evt.oldValue}
            includePrototypes={false}
          />
        </Table.Cell>,
        <Table.Cell key="data-change-new-value">
          <ObjectInspector
            className={styles["events-panel-obj-inspector"]}
            data={evt.newValue}
            includePrototypes={false}
          />
        </Table.Cell>
      );
    }

    return {
      row,
      key: `${evt.timestamp}-${evt.type}-${index}`,
    };
  });

  const headers = [
    <Table.HeadCell key="name-header" style={{ width: "10%" }}>
      Event Name
    </Table.HeadCell>,
    <Table.HeadCell key="value-header" style={{ width: "20%" }} />,
  ];

  const maxRowSize = rows.reduce(
    (current, nextRow) => Math.max(current, nextRow.row.length),
    headers.length
  );

  return (
    <div className={styles["events-panel"]}>
      <Table>
        <Table.Head>
          <Table.Row>
            {headers}
            {createEmptyCells(headers.length, maxRowSize, Table.HeadCell)}
          </Table.Row>
        </Table.Head>
        <Table.Body style={{ overflow: "auto" }}>
          {rows.map((row) => (
            <Table.Row key={row.key}>
              {row.row}
              {createEmptyCells(row.row.length, maxRowSize, Table.Cell)}
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  );
};
