/**
 * Typed Web Worker message protocol.
 * See ARCHITECTURE.md §11.
 */

import type { ImageProcessInput, ImageProcessResult } from './image'

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
      error: string
    }
  | {
      type: 'cancelled'
      taskId: string
    }
