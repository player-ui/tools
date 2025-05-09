/** @jsx createElement */
import { createElement } from "../jsx-runtime";
import { describe, test, expect } from "vitest";
import { render } from "../render";
import { useRef } from "../hooks";
import type {
  ASTNode,
  ObjectASTNode,
  PropertyASTNode,
  ValueASTNode,
  RefObject,
} from "../types";
import { createPropertyNode } from "../nodes";

describe("useRef hook", () => {
  test("useRef basic functionality", () => {
    // Create a ref with initial value
    const ref = useRef<number>(42);
    expect(ref.current).toBe(42);

    // Update the ref
    ref.current = 100;
    expect(ref.current).toBe(100);
  });

  test("useRef with null initial value", () => {
    const ref = useRef<ASTNode>(null);
    expect(ref.current).toBeNull();
  });

  test("useRef with AST nodes through jsx ref prop", () => {
    // Create refs with specific AST node types
    const objRef = useRef<ObjectASTNode>(null);
    const propRef = useRef<PropertyASTNode>(null);
    const valueRef = useRef<ValueASTNode>(null);

    const element = (
      <obj ref={objRef}>
        <property name="test" ref={propRef} value="value1" />
        <value ref={valueRef} value={42} />
      </obj>
    );

    render(element);

    // Verify the refs contain the right nodes
    expect(objRef.current).not.toBeNull();
    expect(objRef.current?.kind).toBe("obj");
    expect(propRef.current?.kind).toBe("property");
    expect(valueRef.current?.kind).toBe("value");
  });

  test("useRef in component function", () => {
    let myRef!: RefObject<ObjectASTNode | null>;

    // Component using refs
    const TestComponent = () => {
      myRef = useRef<ObjectASTNode>(null);

      return (
        <obj ref={myRef}>
          <property name="test" value="value1" />
        </obj>
      );
    };

    render(<TestComponent />);
    expect(myRef.current).not.toBeNull();
    expect(myRef.current?.kind).toBe("obj");
  });

  test("Accessing and modifying AST nodes via refs", () => {
    // Create a ref to hold an object AST node
    const objRef = useRef<ObjectASTNode>(null);

    // Initial render
    const element = (
      <obj ref={objRef}>
        <property name="count" value={0} />
      </obj>
    );

    render(element);
    expect(objRef.current).not.toBeNull();

    // Modify the AST node directly via ref adding a new property to the object node
    const newProp = createPropertyNode("modified", true);
    objRef.current?.children.push(newProp);
    newProp.parent = objRef.current;

    // Custom assertion to check if the modified AST has the right properties
    expect(objRef.current?.children.length).toBeGreaterThan(1);
    expect(
      objRef.current?.children.some(
        (child) =>
          child.kind === "property" &&
          (child as PropertyASTNode).name === "modified",
      ),
    ).toBe(true);
  });
});
