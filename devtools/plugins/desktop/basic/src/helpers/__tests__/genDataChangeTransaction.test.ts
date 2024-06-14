import { describe, it, expect } from "vitest";
import type {
  DevtoolsDataChangeEvent,
  Transaction,
} from "@player-tools/devtools-types";
import { genDataChangeTransaction } from "../genDataChangeTransaction";

describe("genDataChangeTransaction", () => {
  it("should correctly generate a data change transaction for valid input", () => {
    const input = {
      playerID: "player1",
      data: {
        key: "value",
        anotherKey: 123,
      },
      pluginID: "pluginA",
    };

    const expectedOutput: Transaction<DevtoolsDataChangeEvent> = {
      id: -1,
      type: "PLAYER_DEVTOOLS_PLUGIN_DATA_CHANGE",
      payload: {
        pluginID: "pluginA",
        data: {
          key: "value",
          anotherKey: 123,
        },
      },
      sender: "player1",
      context: "player",
      target: "player",
      timestamp: expect.any(Number),
      _messenger_: true,
    };

    const result = genDataChangeTransaction(input);

    expect(result).toEqual(expect.objectContaining(expectedOutput));
  });
});
