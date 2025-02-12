import { isAsyncIteratorObject } from '@orpc/server-standard'
import * as Body from './body'
import * as Headers from './headers'
import { toStandardRequest } from './request'

const toStandardBodySpy = vi.spyOn(Body, 'toStandardBody')
const toStandardHeadersSpy = vi.spyOn(Headers, 'toStandardHeaders')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('toStandardRequest', () => {
  it('works', () => {
    const request = new Request('https://example.com', {
      method: 'POST',
      body: JSON.stringify({ foo: 'bar' }),
      headers: {
        'content-type': 'application/json',
      },
    })

    const standardRequest = toStandardRequest(request)

    expect(toStandardBodySpy).not.toBeCalled()
    expect(toStandardHeadersSpy).not.toBeCalled()

    expect(standardRequest.url).toEqual(new URL('https://example.com'))
    expect(standardRequest.url).toEqual(new URL('https://example.com'))

    expect(standardRequest.method).toBe('POST')
    expect(standardRequest.method).toBe('POST')

    expect(standardRequest.signal).toBe(request.signal)
    expect(standardRequest.signal).toBe(request.signal)

    expect(standardRequest.raw).toEqual({ request })
    expect(standardRequest.raw).toEqual({ request })

    expect(standardRequest.headers).toEqual(toStandardHeadersSpy.mock.results[0]!.value)
    expect(standardRequest.headers).toEqual(toStandardHeadersSpy.mock.results[0]!.value) // cached

    expect(standardRequest.body()).toBe(toStandardBodySpy.mock.results[0]!.value)
    expect(standardRequest.body()).toBe(toStandardBodySpy.mock.results[0]!.value) // cached

    expect(toStandardHeadersSpy).toBeCalledTimes(1)
    expect(toStandardHeadersSpy).toBeCalledWith(request.headers)

    expect(toStandardBodySpy).toBeCalledTimes(1)
    expect(toStandardBodySpy).toBeCalledWith(request)
  })

  it('can override lazy properties', () => {
    const request = new Request('https://example.com')

    const standardRequest = toStandardRequest(request)

    const overridedHeaders = { 'x-foo': 'bar' }
    const overridedBody = () => Promise.resolve('foo')
    standardRequest.headers = overridedHeaders
    standardRequest.body = overridedBody

    expect(standardRequest.headers).toBe(overridedHeaders)
    expect(standardRequest.body).toBe(overridedBody)

    expect(toStandardBodySpy).toBeCalledTimes(0)
    expect(toStandardHeadersSpy).toBeCalledTimes(0)
  })

  it('with event-source', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue('event: message\ndata: "foo"\n\n')
        controller.enqueue('event: done\ndata: "bar"\n\n')
        controller.close()
      },
    }).pipeThrough(new TextEncoderStream())

    const request = new Request('https://example.com', {
      method: 'POST',
      body: stream,
      headers: {
        'content-type': 'text/event-stream',
      },
      duplex: 'half',
    })

    const body = await toStandardRequest(request).body() as AsyncGenerator

    expect(body).toSatisfy(isAsyncIteratorObject)
    expect(await body.next()).toEqual({ done: false, value: 'foo' })
    expect(await body.next()).toEqual({ done: true, value: 'bar' })
  })
})
