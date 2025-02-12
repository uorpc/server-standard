import type { IncomingMessage, ServerResponse } from 'node:http'
import request from 'supertest'
import * as Body from './body'
import { sendStandardResponse } from './response'

const toNodeHttpBodySpy = vi.spyOn(Body, 'toNodeHttpBody')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('sendStandardResponse', () => {
  it('works with undefined', async () => {
    let endSpy: any

    const res = await request(async (req: IncomingMessage, res: ServerResponse) => {
      endSpy = vi.spyOn(res, 'end')

      await sendStandardResponse(res, {
        status: 207,
        headers: {
          'x-custom-header': 'custom-value',
        },
        body: undefined,
      })
    }).get('/')

    expect(toNodeHttpBodySpy).toBeCalledTimes(1)
    expect(toNodeHttpBodySpy).toBeCalledWith(undefined, {
      'x-custom-header': 'custom-value',
    })

    expect(endSpy).toBeCalledTimes(1)
    expect(endSpy).toBeCalledWith(toNodeHttpBodySpy.mock.results[0]!.value)

    expect(res.status).toBe(207)
    expect(res.headers).toMatchObject({
      'x-custom-header': 'custom-value',
    })

    expect(res.text).toEqual('')
  })

  it('works with json', async () => {
    let endSpy: any

    const res = await request(async (req: IncomingMessage, res: ServerResponse) => {
      endSpy = vi.spyOn(res, 'end')

      await sendStandardResponse(res, {
        status: 207,
        headers: {
          'x-custom-header': 'custom-value',
        },
        body: { foo: 'bar' },
      })
    }).get('/')

    expect(toNodeHttpBodySpy).toBeCalledTimes(1)
    expect(toNodeHttpBodySpy).toBeCalledWith({ foo: 'bar' }, {
      'content-type': 'application/json',
      'x-custom-header': 'custom-value',
    })

    expect(endSpy).toBeCalledTimes(1)
    expect(endSpy).toBeCalledWith(toNodeHttpBodySpy.mock.results[0]!.value)

    expect(res.status).toBe(207)
    expect(res.headers).toMatchObject({
      'content-type': 'application/json',
      'x-custom-header': 'custom-value',
    })

    expect(res.body).toEqual({ foo: 'bar' })
  })

  it('works with file', async () => {
    const blob = new Blob(['foo'], { type: 'text/plain' })
    let endSpy: any

    const res = await request(async (req: IncomingMessage, res: ServerResponse) => {
      endSpy = vi.spyOn(res, 'end')

      await sendStandardResponse(res, {
        status: 207,
        headers: {
          'x-custom-header': 'custom-value',
        },
        body: blob,
      })
    }).get('/')

    expect(toNodeHttpBodySpy).toBeCalledTimes(1)
    expect(toNodeHttpBodySpy).toBeCalledWith(blob, {
      'content-disposition': 'inline; filename="blob"',
      'content-length': '3',
      'content-type': 'text/plain',
      'x-custom-header': 'custom-value',
    })

    expect(endSpy).toBeCalledTimes(1)
    expect(endSpy).toBeCalledWith()

    expect(res.status).toBe(207)
    expect(res.headers).toMatchObject({
      'content-disposition': 'inline; filename="blob"',
      'content-length': '3',
      'content-type': 'text/plain',
      'x-custom-header': 'custom-value',
    })

    expect(res.text).toEqual('foo')
  })

  it('works with async generator', async () => {
    async function* gen() {
      yield 'foo'
      yield 'bar'
      return 'baz'
    }

    const generator = gen()

    let endSpy: any

    const res = await request(async (req: IncomingMessage, res: ServerResponse) => {
      endSpy = vi.spyOn(res, 'end')

      await sendStandardResponse(res, {
        status: 207,
        headers: {
          'x-custom-header': 'custom-value',
        },
        body: generator,
      })
    }).get('/')

    expect(toNodeHttpBodySpy).toBeCalledTimes(1)
    expect(toNodeHttpBodySpy).toBeCalledWith(generator, {
      'connection': 'keep-alive',
      'cache-control': 'no-cache',
      'content-type': 'text/event-stream',
      'x-custom-header': 'custom-value',
    })

    expect(endSpy).toBeCalledTimes(1)
    expect(endSpy).toBeCalledWith()

    expect(res.status).toBe(207)
    expect(res.headers).toMatchObject({
      'connection': 'keep-alive',
      'cache-control': 'no-cache',
      'content-type': 'text/event-stream',
      'x-custom-header': 'custom-value',
    })

    expect(res.text).toEqual('event: message\ndata: "foo"\n\nevent: message\ndata: "bar"\n\nevent: done\ndata: "baz"\n\n')
  })
})
