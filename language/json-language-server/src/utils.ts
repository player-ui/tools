import type { CancellationToken } from "vscode-languageserver";
import { ResponseError } from "vscode-languageserver";

/** Get a cancellation error   */
function cancel() {
  return new ResponseError(
    -32800 /* ErrorCodes.RequestCancelled */,
    "Request cancelled",
  );
}

/** Run the given function and handle being cancelled */
export async function runAndCatch<T>(
  func: () => Promise<T> | T,
  token: CancellationToken,
  errorVal: T,
): Promise<T | ResponseError<any>> {
  if (token.isCancellationRequested) {
    return cancel();
  }

  try {
    const result = await func();
    if (token.isCancellationRequested) {
      return cancel();
    }

    return result;
  } catch (e) {
    return errorVal;
  }
}
