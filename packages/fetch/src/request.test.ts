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
})
