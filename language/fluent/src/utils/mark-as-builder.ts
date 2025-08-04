import { FLUENT_BUILDER_MARKER } from "../types";

export function markAsBuilder<T>(obj: T): T {
  if (!(obj instanceof Function)) {
    throw new Error("markAsBuilder must be called on a function");
  }

  (obj as unknown as { [FLUENT_BUILDER_MARKER]: unknown })[
    FLUENT_BUILDER_MARKER
  ] = true;

  return obj;
}
