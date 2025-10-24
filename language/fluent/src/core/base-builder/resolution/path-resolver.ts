import type { ValuePath } from "../types";
import { isAssetWrapperValue } from "../guards";

/**
 * Sets a value at a nested path in an object
 * Handles nested objects, arrays, and AssetWrapper structures
 *
 * @param obj - The target object to modify
 * @param path - Array of keys/indices representing the path
 * @param value - The value to set at the path
 *
 * @example
 * setValueAtPath(obj, ["actions", 0, "label"], "Click me")
 * // Sets obj.actions[0].label = "Click me"
 */
export function setValueAtPath(
  obj: Record<string, unknown>,
  path: ValuePath,
  value: unknown,
): void {
  if (path.length === 0) return;

  if (path.length === 1) {
    obj[path[0]] = value;
    return;
  }

  const [currentKey, ...restPath] = path;
  const nextKey = restPath[0];
  const currentValue = obj[currentKey];

  // Check if current value is an AssetWrapper containing an array
  const isAssetWrapperWithArray =
    isAssetWrapperValue(currentValue) && Array.isArray(currentValue.asset);

  if (isAssetWrapperWithArray && typeof nextKey === "number") {
    setValueInAssetWrapperArray(
      obj,
      currentKey,
      currentValue as { asset: unknown[] },
      nextKey,
      restPath,
      value,
    );
  } else if (Array.isArray(currentValue) && typeof nextKey === "number") {
    setValueInArray(obj, currentKey, currentValue, nextKey, restPath, value);
  } else {
    setValueInObject(obj, currentKey, restPath, value);
  }
}

/**
 * Sets value in an array within an AssetWrapper
 */
function setValueInAssetWrapperArray(
  obj: Record<string, unknown>,
  currentKey: string | number,
  wrappedArray: { asset: unknown[] },
  nextKey: number,
  restPath: ValuePath,
  value: unknown,
): void {
  const arrayResult = [...wrappedArray.asset];
  if (restPath.length === 1) {
    arrayResult[nextKey] = value;
  } else {
    const nestedObj = (arrayResult[nextKey] as Record<string, unknown>) ?? {};
    setValueAtPath(nestedObj, restPath.slice(1), value);
    arrayResult[nextKey] = nestedObj;
  }
  obj[currentKey] = { asset: arrayResult };
}

/**
 * Sets value in a regular array
 */
function setValueInArray(
  obj: Record<string, unknown>,
  currentKey: string | number,
  array: unknown[],
  nextKey: number,
  restPath: ValuePath,
  value: unknown,
): void {
  const arrayResult = [...array];
  if (restPath.length === 1) {
    arrayResult[nextKey] = value;
  } else {
    const nestedObj = (arrayResult[nextKey] as Record<string, unknown>) ?? {};
    setValueAtPath(nestedObj, restPath.slice(1), value);
    arrayResult[nextKey] = nestedObj;
  }
  obj[currentKey] = arrayResult;
}

/**
 * Sets value in a nested object
 */
function setValueInObject(
  obj: Record<string, unknown>,
  currentKey: string | number,
  restPath: ValuePath,
  value: unknown,
): void {
  const nestedObj = (obj[currentKey] as Record<string, unknown>) ?? {};
  setValueAtPath(nestedObj, restPath, value);
  obj[currentKey] = nestedObj;
}
