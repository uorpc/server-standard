import type { JsonValue } from './types'

export interface EventSourceErrorEventOptions extends ErrorOptions {
  message?: string
}

export class EventSourceErrorEvent extends Error {
  constructor(public data?: undefined | JsonValue, options?: EventSourceErrorEventOptions) {
    super(options?.message ?? 'An SSE error event was received', options)
  }
}
