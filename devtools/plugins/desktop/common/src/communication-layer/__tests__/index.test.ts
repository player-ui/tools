import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react-hooks";
import { useCommunicationLayer } from "../index";
import { flipperClient } from "js-flipper";

vi.mock("js-flipper", () => ({
  flipperClient: {
    start: vi.fn().mockResolvedValue({
      addPlugin: vi.fn(),
    }),
  },
}));

const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

describe("useCommunicationLayer", () => {
  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("should start Flipper client if player-ui-devtools-flipper-active is true", () => {
    localStorage.setItem("player-ui-devtools-flipper-active", "true");
    const { result } = renderHook(() => useCommunicationLayer());
    expect(flipperClient.start).toHaveBeenCalledWith("player-ui-devtools");
    expect(result.current).toMatchInlineSnapshot(`
      {
        "addListener": [Function],
        "removeListener": [Function],
        "sendMessage": [Function],
      }
    `);
  });

  it("should not start Flipper client if player-ui-devtools-flipper-active is false", () => {
    localStorage.setItem("player-ui-devtools-flipper-active", "false");
    const { result } = renderHook(() => useCommunicationLayer());
    expect(flipperClient.start).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "The Flipper connection is disabled. If you want to enable it, use the Player UI extension popup."
    );
    expect(result.current).toMatchInlineSnapshot(`
      {
        "addListener": [Function],
        "removeListener": [Function],
        "sendMessage": [Function],
      }
    `);
  });
});
