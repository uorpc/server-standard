import type { JsonValue } from './types'

export class EventSourceUnknownEvent extends Error {}

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
  public retry: number
  constructor(milliseconds: number, options?: EventSourceErrorEventOptions) {
    if (!Number.isInteger(milliseconds) || milliseconds < 0) {
      throw new TypeError('EventSourceRetryErrorEvent.milliseconds must be a integer and >= 0')
    }

    super({
      message: `An SSE retry event was received after ${milliseconds} milliseconds`,
      ...options,
    })

    this.retry = milliseconds
  }
}
