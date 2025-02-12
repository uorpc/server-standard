import type { JsonValue } from '@orpc/server-standard'
import { encodeEventSource, EventSourceDecoderStream, EventSourceErrorEvent, EventSourceRetryErrorEvent, parseEmptyableJSON } from '@orpc/server-standard'

export function toEventSourceAsyncGenerator(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<JsonValue | undefined, JsonValue | undefined, undefined> {
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
            throw new Error(`Unknown event: ${value.event}`)
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
  iterator: AsyncIterator<JsonValue | undefined, JsonValue | undefined, undefined>,
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
        if (err instanceof EventSourceRetryErrorEvent) {
          controller.enqueue(encodeEventSource({
            event: 'error',
            data: JSON.stringify(err.data),
            retry: err.milliseconds,
          }))
          controller.close()

          return
        }

        if (!(err instanceof EventSourceErrorEvent)) {
          controller.error(err)
          return
        }

        controller.enqueue(encodeEventSource({
          event: 'error',
          data: JSON.stringify(err.data),
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
