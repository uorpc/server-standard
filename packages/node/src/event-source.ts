import type { JsonValue } from '@orpc/server-standard'
import { Readable } from 'node:stream'
import { encodeEventSource, EventSourceErrorEvent, EventSourceParserStream, parseEmptyableJSON } from '@orpc/server-standard'

export function toEventSourceAsyncGenerator(
  stream: Readable,
): AsyncGenerator<JsonValue | undefined, JsonValue | undefined, undefined> {
  const eventStream = Readable.toWeb(stream)
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new EventSourceParserStream({ onError: 'terminate' }))

  const reader = eventStream.getReader()

  async function* gen() {
    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          return
        }

        const event = value.event ?? 'message'

        if (event === 'message') {
          yield parseEmptyableJSON(value.data)
        }
        else if (event === 'error') {
          throw new EventSourceErrorEvent(parseEmptyableJSON(value.data))
        }
        else if (event === 'done') {
          return parseEmptyableJSON(value.data)
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
): Readable {
  const stream = new ReadableStream<string>({
    async pull(controller) {
      try {
        const value = await iterator.next()

        if (value.done) {
          controller.enqueue(encodeEventSource({
            event: 'done',
            data: JSON.stringify(value.value) ?? '', // JSON.stringify still can return undefined
          }))
          controller.close()
          return
        }

        controller.enqueue(encodeEventSource({
          event: 'message',
          data: JSON.stringify(value.value) ?? '', // JSON.stringify still can return undefined
        }))
      }
      catch (err) {
        if (!(err instanceof EventSourceErrorEvent)) {
          controller.error(err)
          return
        }

        controller.enqueue(encodeEventSource({
          event: 'error',
          data: JSON.stringify(err.data) ?? '', // JSON.stringify still can return undefined
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
  })

  return Readable.fromWeb(stream)
}
