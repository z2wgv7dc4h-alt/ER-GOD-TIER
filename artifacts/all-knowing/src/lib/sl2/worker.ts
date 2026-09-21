/**
 * Save-parsing Web Worker: bytes in, lean result out. The 28 MB buffer is transferred
 * (zero-copy) into the worker and never leaves the device; the parser has no write path.
 */
import { analyzeSave, type SaveResult } from './analyze'

export type SaveWorkerRequest = { buffer: ArrayBuffer; slot?: number }
export type SaveWorkerResponse =
  | { ok: true; result: SaveResult }
  | { ok: false; error: string }

type WorkerScope = {
  onmessage: ((event: MessageEvent<SaveWorkerRequest>) => void) | null
  postMessage: (message: SaveWorkerResponse) => void
}

const scope = self as unknown as WorkerScope

scope.onmessage = (event) => {
  try {
    const result = analyzeSave(event.data.buffer, event.data.slot)
    scope.postMessage({ ok: true, result })
  } catch (err) {
    scope.postMessage({
      ok: false,
      error: err instanceof Error ? err.message : 'Could not read that save.',
    })
  }
}
