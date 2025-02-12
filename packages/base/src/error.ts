import type { JsonValue } from './types'

export interface EventSourceErrorEventOptions extends ErrorOptions {
  message?: string
  data?: undefined | JsonValue
}

export class EventSourceErrorEvent extends Error {
  public data: undefined | JsonValue

  constructor(options?: EventSourceErrorEventOptions) {
    super(options?.message ?? 'An SSE error event was received', options)

    this.data = options?.data
  }
}

export class EventSourceRetryErrorEvent extends EventSourceErrorEvent {
  constructor(public milliseconds: number, options?: EventSourceErrorEventOptions) {
    super({
      message: `An SSE retry event was received after ${milliseconds} milliseconds`,
      ...options,
    })
  }
}
