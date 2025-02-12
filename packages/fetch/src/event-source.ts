import type { JsonValue } from '@orpc/server-standard'
import { encodeEventSource, EventSourceDecoderStream, EventSourceErrorEvent, EventSourceRetryErrorEvent, EventSourceUnknownEvent, parseEmptyableJSON } from '@orpc/server-standard'

export function toEventSourceAsyncGenerator(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<JsonValue | void, JsonValue | void, void> {
  const eventStream = stream
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new EventSourceDecoderStream())

  const reader = eventStream.getReader()

  async function* gen() {
    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          return
        }

        switch (value.event) {
          case 'message':
            yield parseEmptyableJSON(value.data)
            break

          case 'error':
            if (typeof value.retry === 'number') {
              throw new EventSourceRetryErrorEvent(value.retry, {
                data: parseEmptyableJSON(value.data),
              })
            }

            throw new EventSourceErrorEvent({
              data: parseEmptyableJSON(value.data),
            })

          case 'done':
            return parseEmptyableJSON(value.data)

          default:
            throw new EventSourceUnknownEvent(`Unknown event: ${value.event}`)
        }
      }
    }
    finally {
      await reader.cancel()
    }
  }

  return gen()
}

export function toEventSourceReadableStream(
  iterator: AsyncIterator<JsonValue | void, JsonValue | void, void>,
): ReadableStream<Uint8Array> {
  const stream = new ReadableStream<string>({
    async pull(controller) {
      try {
        const value = await iterator.next()

        if (value.done) {
          controller.enqueue(encodeEventSource({
            event: 'done',
            data: JSON.stringify(value.value),
          }))
          controller.close()
          return
        }

        controller.enqueue(encodeEventSource({
          event: 'message',
          data: JSON.stringify(value.value),
        }))
      }
      catch (err) {
        controller.enqueue(encodeEventSource({
          event: 'error',
          data: err instanceof EventSourceErrorEvent ? JSON.stringify(err.data) : undefined,
          retry: err instanceof EventSourceRetryErrorEvent ? err.retry : undefined,
        }))

        controller.close()
      }
    },
    async cancel(reason) {
      if (reason) {
        await iterator.throw?.(reason)
      }
      else {
        await iterator.return?.()
      }
    },
  }).pipeThrough(new TextEncoderStream())

  return stream
}
