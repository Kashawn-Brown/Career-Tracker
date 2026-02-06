import type { IncomingMessage, ServerResponse} from "node:http";

/**
 * Creates an AbortController that is aborted when the client disconnects.
 *
 * We use this to propagate cancellation into long-running work:
 * - OpenAI requests (fetch under the hood)
 * - streaming uploads (node pipeline supports AbortSignal)
 */
export function createAbortControllerFromRawRequest(
  rawReq: IncomingMessage,
  rawRes?: ServerResponse
): AbortController {
  const controller = new AbortController();

  const abort = () => {
    if (!controller.signal.aborted) controller.abort();
  };

  if ((rawReq as any).aborted) abort();

  // Cancels during request body streaming (uploads)
  rawReq.on("aborted", abort);

  // Cancels while we’re processing / waiting to reply
  rawReq.socket?.on("close", abort);
  rawRes?.on("close", abort);

  return controller;
}

/**
 * Small guard that lets services/routes bail out before doing expensive work
 * (or before persisting anything) after cancellation.
 */
export function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;

  const err = new Error("Request aborted");
  err.name = "AbortError";
  throw err;
}

/**
 * Normalizes the different AbortError shapes we may see across Node/libs.
 */
export function isAbortError(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof Error) return err.name === "AbortError";
  return (err as any)?.name === "AbortError";
}
