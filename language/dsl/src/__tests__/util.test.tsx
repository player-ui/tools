import { test, expect, describe } from "vitest";
import { getObjectReferences } from "../utils";

describe("Testing the 'getObjectReferences' helper that creates same property references into a new object", () => {
  test("should return the object properties in referenced format", () => {
    const dataTypes = {
      BooleanType: {
        type: "BooleanType",
      },
    };

    const validators = {
      required: {
        type: "required",
      },
    };

    const dataReferences = getObjectReferences(dataTypes);
    const validatorReferences = getObjectReferences(validators);

    expect(dataReferences.BooleanTypeRef).toStrictEqual({
      type: "BooleanType",
    });
    expect(validatorReferences.requiredRef).toStrictEqual({ type: "required" });
  });
});
