/** @jsx createElement */
import { createElement } from "../../jsx-runtime";
import { test, expect } from "vitest";
import { IdProvider, useId } from "../useId.js";
import { render } from "../../render.js";

test("uses provided id", () => {
  const Component = () => {
    const { getId } = useId();
    return (
      <obj type="text">
        <property name="value" value={getId()} />
      </obj>
    );
  };

  const tree = (
    <IdProvider id="test">
      <Component />
    </IdProvider>
  );

  const { jsonValue } = render(tree);

  expect((jsonValue as { value: string }).value).toBe("test");
});

test("gets default id if no id is provided", () => {
  const Component = () => {
    const { getId } = useId();
    return (
      <obj type="text">
        <property name="value" value={getId()} />
      </obj>
    );
  };

  const tree = (
    <IdProvider id="">
      <Component />
    </IdProvider>
  );

  const { jsonValue } = render(tree);
  expect((jsonValue as { value: string }).value).toBe("root");
});

test("useId with multiple components", () => {
  const Component1 = () => {
    const { getId } = useId();
    return (
      <obj type="text">
        <property name="value" value={getId()} />
      </obj>
    );
  };

  const Component2 = () => {
    const { getId } = useId();
    return (
      <obj type="text">
        <property name="value" value={getId()} />
      </obj>
    );
  };

  const tree = (
    <IdProvider id="test">
      <Component1 />
      <Component2 />
    </IdProvider>
  );

  const { jsonValue } = render(tree);
  expect((jsonValue as { value: string }[])[0].value).toBe("test");
  expect((jsonValue as { value: string }[])[1].value).toBe("test");
});

test("nested IdProviders and branching", () => {
  const Component = () => {
    const { getId } = useId();
    const id = getId();
    return (
      <obj type="text">
        <property name="value" value={id} />
      </obj>
    );
  };

  const Component1 = () => {
    const { branch } = useId();
    const branchedId = branch({ type: "property", name: "foo" });
    return (
      <IdProvider id={branchedId}>
        <Component />
      </IdProvider>
    );
  };

  const Component2 = () => {
    const { branch } = useId();
    const branchedId = branch({ type: "property", name: "bar" });
    return (
      <IdProvider id={branchedId}>
        <Component />
      </IdProvider>
    );
  };

  const tree = (
    <IdProvider id="test">
      <Component1 />
      <Component2 />
    </IdProvider>
  );

  const { jsonValue } = render(tree);

  // Restore the assertions
  expect((jsonValue as { value: string }[])[0].value).toBe("test-foo");
  expect((jsonValue as { value: string }[])[1].value).toBe("test-bar");
});
