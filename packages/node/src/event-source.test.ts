import { Readable } from 'node:stream'
import { EventSourceErrorEvent, EventSourceRetryErrorEvent, EventSourceUnknownEvent, isAsyncIteratorObject } from '@orpc/server-standard'
import { toEventSourceAsyncGenerator, toEventSourceReadableStream } from './event-source'

describe('toEventSourceAsyncGenerator', () => {
  it('on done', async () => {
    const stream = new ReadableStream<string>({
      async pull(controller) {
        controller.enqueue('event: message\ndata: 123\n\n')
        controller.enqueue('event: done\ndata: 456\n\n')
        controller.close()
      },
    }).pipeThrough(new TextEncoderStream())

    const generator = toEventSourceAsyncGenerator(Readable.fromWeb(stream))
    expect(generator).toSatisfy(isAsyncIteratorObject)

    expect(await generator.next()).toEqual({ done: false, value: 123 })
    expect(await generator.next()).toEqual({ done: true, value: 456 })
  })

  it('on finish', async () => {
    const stream = new ReadableStream<string>({
      async pull(controller) {
        controller.enqueue('event: message\ndata: 123\n\n')
        controller.enqueue('event: message\ndata: 456\n\n')
        controller.close()
      },
    }).pipeThrough(new TextEncoderStream())

    const generator = toEventSourceAsyncGenerator(Readable.fromWeb(stream))
    expect(generator).toSatisfy(isAsyncIteratorObject)

    expect(await generator.next()).toEqual({ done: false, value: 123 })
    expect(await generator.next()).toEqual({ done: false, value: 456 })
    expect(await generator.next()).toEqual({ done: true, value: undefined })
  })

  it('on error', async () => {
    const stream = new ReadableStream<string>({
      async pull(controller) {
        controller.enqueue('event: message\ndata: 123\n\n')
        controller.enqueue('event: error\ndata: 456\n\n')
        controller.close()
      },
    }).pipeThrough(new TextEncoderStream())

    const generator = toEventSourceAsyncGenerator(Readable.fromWeb(stream))
    expect(generator).toSatisfy(isAsyncIteratorObject)

    expect(await generator.next()).toEqual({ done: false, value: 123 })
    expect(generator.next()).rejects.toSatisfy((err: any) => {
      expect(err).toBeInstanceOf(EventSourceErrorEvent)
      expect(err.data).toBe(456)

      return true
    })
  })

  it('on retry error', async () => {
    const stream = new ReadableStream<string>({
      async pull(controller) {
        controller.enqueue('event: message\ndata: 123\n\n')
        controller.enqueue('event: error\ndata: 456\nretry: 789\n\n')
        controller.close()
      },
    }).pipeThrough(new TextEncoderStream())

    const generator = toEventSourceAsyncGenerator(Readable.fromWeb(stream))
    expect(generator).toSatisfy(isAsyncIteratorObject)

    expect(await generator.next()).toEqual({ done: false, value: 123 })
    expect(generator.next()).rejects.toSatisfy((err: any) => {
      expect(err).toBeInstanceOf(EventSourceRetryErrorEvent)
      expect(err.retry).toBe(789)
      expect(err.data).toBe(456)

      return true
    })
  })

  it('on unknown event', async () => {
    const stream = new ReadableStream<string>({
      async pull(controller) {
        controller.enqueue('event: unknown\ndata: 123\n\n')
        controller.close()
      },
    }).pipeThrough(new TextEncoderStream())

    const generator = toEventSourceAsyncGenerator(Readable.fromWeb(stream))
    expect(generator).toSatisfy(isAsyncIteratorObject)

    expect(generator.next()).rejects.toSatisfy((err: any) => {
      expect(err).toBeInstanceOf(EventSourceUnknownEvent)
      expect(err.message).toBe('Unknown event: unknown')

      return true
    })
  })
})

describe('toEventSourceReadableStream', () => {
  it('on done', async () => {
    async function* gen() {
      yield 123
      yield 456
      yield undefined
      return { value: true }
    }

    const reader = Readable.toWeb(toEventSourceReadableStream(gen()))
      .pipeThrough(new TextDecoderStream())
      .getReader()

    expect((await reader.read()).value).toEqual('event: message\ndata: 123\n\n')
    expect((await reader.read()).value).toEqual('event: message\ndata: 456\n\n')
    expect((await reader.read()).value).toEqual('event: message\ndata: \n\n')
    expect((await reader.read()).value).toEqual('event: done\ndata: {"value":true}\n\n')
    expect((await reader.read()).done).toEqual(true)
  })

  it('on error', async () => {
    async function* gen() {
      yield 123
      yield 456
      throw new Error('hello')
    }

    const reader = Readable.toWeb(toEventSourceReadableStream(gen()))
      .pipeThrough(new TextDecoderStream())
      .getReader()

    expect((await reader.read()).value).toEqual('event: message\ndata: 123\n\n')
    expect((await reader.read()).value).toEqual('event: message\ndata: 456\n\n')
    expect((await reader.read()).value).toEqual('event: error\ndata: \n\n')
    expect((await reader.read()).done).toEqual(true)
  })

  it('on retry error', async () => {
    async function* gen() {
      yield 123
      yield 456
      throw new EventSourceRetryErrorEvent(789, { data: 456 })
    }

    const reader = Readable.toWeb(toEventSourceReadableStream(gen()))
      .pipeThrough(new TextDecoderStream())
      .getReader()

    expect((await reader.read()).value).toEqual('event: message\ndata: 123\n\n')
    expect((await reader.read()).value).toEqual('event: message\ndata: 456\n\n')
    expect((await reader.read()).value).toEqual('event: error\nretry: 789\ndata: 456\n\n')
    expect((await reader.read()).done).toEqual(true)
  })

  it('on cancelled without region', async () => {
    let error: any
    let finished = false

    async function* gen() {
      try {
        yield 123
        yield 456
        yield undefined
        return { value: true }
      }
      catch (err) {
        error = err
      }
      finally {
        finished = true
      }
    }

    const original = toEventSourceReadableStream(gen())
    const stream = Readable.toWeb(original)

    const reader = stream.getReader()
    await reader.read()
    await original.destroy() // use this instead of reader.cancel can improve node.js compatibility

    await vi.waitFor(() => {
      expect(error).toEqual(undefined)
      expect(finished).toEqual(true)
    })
  })

  it('on cancelled with region', async () => {
    let error: any
    let finished = false

    async function* gen() {
      try {
        yield 123
        yield 456
        yield undefined
        return { value: true }
      }
      catch (err) {
        error = err
      }
      finally {
        finished = true
      }
    }

    const original = toEventSourceReadableStream(gen())
    const stream = Readable.toWeb(original)

    const reason = new Error('reason')
    const reader = stream.getReader()
    await reader.read()
    await original.destroy(reason) // use this instead of reader.cancel can improve node.js compatibility

    await vi.waitFor(() => {
      expect(error).toBe(reason)
      expect(finished).toEqual(true)
    })
  })
})
