/**
 * Typed Web Worker message protocol.
 * See ARCHITECTURE.md §11.
 */

import type { ImageErrorCode, ImageProcessInput, ImageProcessResult } from './image'

export type WorkerRequest =
  | {
      type: 'process'
      taskId: string
      payload: ImageProcessInput
    }
  | {
      type: 'cancel'
      taskId: string
    }

export type WorkerResponse =
  | {
      type: 'progress'
      taskId: string
      progress: number
    }
  | {
      type: 'success'
      taskId: string
      result: ImageProcessResult
    }
  | {
      type: 'error'
      taskId: string
      /** English fallback message (used if code is unknown to the UI). */
      error: string
      /** Structured error for localized rendering on the main thread. */
      code?: ImageErrorCode
      params?: Record<string, string | number>
    }
  | {
      type: 'cancelled'
      taskId: string
    }
