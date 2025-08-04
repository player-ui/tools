import { describe, it, expect } from "vitest";
import { flow } from "..";
import { Flow } from "@player-ui/types";
import { text } from "../../examples";

describe("flow function", () => {
  it("should create a flow with basic properties", () => {
    const result = flow({
      id: "test-flow",
      topic: "test-flow",
      views: [text({ value: "Hello World" })],
      data: {
        greeting: "Hello",
      },
      navigation: {
        BEGIN: "FLOW_1",
        FLOW_1: {
          startState: "VIEW_1",
          VIEW_1: {
            state_type: "VIEW",
            ref: "view-1",
            transitions: {},
          },
        },
      },
    });

    const expected: Flow = {
      data: {
        greeting: "Hello",
      },
      id: "test-flow",
      topic: "test-flow",
      navigation: {
        BEGIN: "FLOW_1",
        FLOW_1: {
          VIEW_1: {
            ref: "view-1",
            state_type: "VIEW",
            transitions: {},
          },
          startState: "VIEW_1",
        },
      },
      views: [
        {
          id: "test-flow-views-0",
          type: "text",
          value: "Hello World",
        },
      ],
    };

    expect(result).toEqual(expected);
  });

  it('should use "root" as default flow ID', () => {
    const result = flow({
      views: [text({ value: "Hello World" })],
      navigation: {
        BEGIN: "FLOW_1",
        FLOW_1: {
          startState: "VIEW_1",
          VIEW_1: {
            state_type: "VIEW",
            ref: "view-1",
            transitions: {},
          },
        },
      },
    });

    expect(result.id).toEqual("root");
  });

  it("should generate hierarchical IDs for views", () => {
    const result = flow({
      id: "my-flow",
      views: [text().withValue("First View"), text().withValue("Second View")],
      navigation: {
        BEGIN: "FLOW_1",
        FLOW_1: {
          startState: "VIEW_1",
          VIEW_1: {
            state_type: "VIEW",
            ref: "view-1",
            transitions: {},
          },
        },
      },
    });

    const expected: Flow["views"] = [
      {
        id: "my-flow-views-0",
        type: "text",
        value: "First View",
      },
      {
        id: "my-flow-views-1",
        type: "text",
        value: "Second View",
      },
    ];

    expect(result.views).toEqual(expected);
  });

  it("should preserve custom IDs in views", () => {
    const result = flow({
      id: "custom-flow",
      views: [
        text().withId("custom-view-id").withValue("Custom ID View"),
        text().withValue("Auto ID View"),
      ],
      navigation: {
        BEGIN: "FLOW_1",
        FLOW_1: {
          startState: "VIEW_1",
          VIEW_1: {
            state_type: "VIEW",
            ref: "custom-view-id",
            transitions: {},
          },
        },
      },
    });

    const expected: Flow["views"] = [
      {
        id: "custom-view-id",
        type: "text",
        value: "Custom ID View",
      },
      {
        id: "custom-flow-views-1",
        type: "text",
        value: "Auto ID View",
      },
    ];

    expect(result.views).toEqual(expected);
  });

  it("should handle function-based view generators", () => {
    const result = flow({
      id: "functional-flow",
      views: [
        (ctx) => ({
          id: ctx.parentId,
          type: "text",
          value: "Function Generated View",
        }),
      ],
      navigation: {
        BEGIN: "FLOW_1",
        FLOW_1: {
          startState: "VIEW_1",
          VIEW_1: {
            state_type: "VIEW",
            ref: "view-func",
            transitions: {},
          },
        },
      },
    });

    const expected: Flow["views"] = [
      {
        id: "functional-flow-views",
        type: "text",
        value: "Function Generated View",
      },
    ];

    expect(result.views).toEqual(expected);
  });

  it("should handle a complex flow with multiple properties", () => {
    const result = flow({
      id: "complex-flow",
      views: [
        text().withId("view-1").withValue("First View"),
        text().withId("view-2").withValue("Second View"),
      ],
      data: {
        user: {
          name: "John Doe",
          email: "john@example.com",
        },
        settings: {
          theme: "dark",
        },
      },
      schema: {
        ROOT: {
          user: {
            type: "object",
          },
          settings: {
            type: "object",
          },
        },
      },
      navigation: {
        BEGIN: "MAIN_FLOW",
        MAIN_FLOW: {
          startState: "FIRST_VIEW",
          FIRST_VIEW: {
            state_type: "VIEW",
            ref: "view-1",
            transitions: {
              NEXT: "SECOND_VIEW",
            },
          },
          SECOND_VIEW: {
            state_type: "VIEW",
            ref: "view-2",
            transitions: {
              DONE: "END_STATE",
            },
          },
          END_STATE: {
            state_type: "END",
            outcome: "completed",
          },
        },
      },
    });

    const expected: Flow = {
      data: {
        settings: {
          theme: "dark",
        },
        user: {
          email: "john@example.com",
          name: "John Doe",
        },
      },
      id: "complex-flow",
      navigation: {
        BEGIN: "MAIN_FLOW",
        MAIN_FLOW: {
          END_STATE: {
            outcome: "completed",
            state_type: "END",
          },
          FIRST_VIEW: {
            ref: "view-1",
            state_type: "VIEW",
            transitions: {
              NEXT: "SECOND_VIEW",
            },
          },
          SECOND_VIEW: {
            ref: "view-2",
            state_type: "VIEW",
            transitions: {
              DONE: "END_STATE",
            },
          },
          startState: "FIRST_VIEW",
        },
      },
      schema: {
        ROOT: {
          settings: {
            type: "object",
          },
          user: {
            type: "object",
          },
        },
      },
      views: [
        {
          id: "view-1",
          type: "text",
          value: "First View",
        },
        {
          id: "view-2",
          type: "text",
          value: "Second View",
        },
      ],
    };

    expect(result).toEqual(expected);
  });
});
