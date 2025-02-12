import { isAsyncIteratorObject } from '@orpc/server-standard'
import { toFetchBody, toStandardBody } from './body'

describe('toStandardBody', () => {
  it('undefined', async () => {
    const request = new Request('https://example.com', {
      method: 'POST',
      body: null,
    })

    expect(await toStandardBody(request)).toBe(undefined)
  })

  it('json', async () => {
    const request = new Request('https://example.com', {
      method: 'POST',
      body: JSON.stringify({ foo: 'bar' }),
      headers: {
        'content-type': 'application/json',
      },
    })

    expect(await toStandardBody(request)).toEqual({ foo: 'bar' })
  })

  it('json but empty body', async () => {
    const request = new Request('https://example.com', {
      method: 'POST',
      body: '',
      headers: {
        'content-type': 'application/json',
      },
    })

    expect(await toStandardBody(request)).toEqual(undefined)
  })

  it('event-source', async () => {
    const stream = new ReadableStream<string>({
      async pull(controller) {
        controller.enqueue('event: message\ndata: 123\n\n')
        controller.enqueue('event: done\ndata: 456\n\n')
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

    const standardBody = await toStandardBody(request) as any
    expect(standardBody).toSatisfy(isAsyncIteratorObject)

    expect(await standardBody.next()).toEqual({ done: false, value: 123 })
    expect(await standardBody.next()).toEqual({ done: true, value: 456 })
  })

  it('text', async () => {
    const request = new Request('https://example.com', {
      method: 'POST',
      body: 'foo',
    })

    expect(await toStandardBody(request)).toBe('foo')
  })

  it('form-data', async () => {
    const form = new FormData()
    form.append('foo', 'bar')
    form.append('bar', 'baz')

    const request = new Request('https://example.com', {
      method: 'POST',
      body: form,
    })

    const standardForm = await toStandardBody(request) as any

    expect(standardForm).toBeInstanceOf(FormData)
    expect(standardForm.get('foo')).toBe('bar')
    expect(standardForm.get('bar')).toBe('baz')
  })

  it('url-search-params', async () => {
    const request = new Request('https://example.com', {
      method: 'POST',
      body: 'foo=bar&bar=baz',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
    })

    expect(await toStandardBody(request)).toEqual(new URLSearchParams('foo=bar&bar=baz'))
  })

  it('blob', async () => {
    const request = new Request('https://example.com', {
      method: 'POST',
      body: new Blob(['foo'], { type: 'application/pdf' }),
    })

    const standardBlob = await toStandardBody(request) as any
    expect(standardBlob).toBeInstanceOf(File)
    expect(standardBlob.name).toBe('blob')
    expect(standardBlob.type).toBe('application/pdf')
    expect(await standardBlob.text()).toBe('foo')
  })

  it('file', async () => {
    const request = new Request('https://example.com', {
      method: 'POST',
      body: new Blob(['foo'], { type: 'application/pdf' }),
      headers: {
        'content-disposition': 'attachment; filename="foo.pdf"',
      },
    })

    const standardFile = await toStandardBody(request) as any
    expect(standardFile).toBeInstanceOf(File)
    expect(standardFile.name).toBe('foo.pdf')
    expect(standardFile.type).toBe('application/pdf')
    expect(await standardFile.text()).toBe('foo')
  })
})

describe('toFetchBody', () => {
  const baseHeaders = new Headers({
    'content-type': 'application/json',
    'content-disposition': 'attachment; filename="foo.pdf"',
    'x-custom-header': 'custom-value',
  })

  it('undefined', () => {
    const headers = new Headers(baseHeaders)
    const body = toFetchBody(undefined, headers)

    expect(body).toBe(undefined)
    expect([...headers]).toEqual([
      ['x-custom-header', 'custom-value'],
    ])
  })

  it('json', () => {
    const headers = new Headers(baseHeaders)
    const body = toFetchBody({ foo: 'bar' }, headers)

    expect(body).toBe('{"foo":"bar"}')
    expect([...headers]).toEqual([
      ['content-type', 'application/json'],
      ['x-custom-header', 'custom-value'],
    ])
  })

  it('form-data', () => {
    const headers = new Headers(baseHeaders)
    const form = new FormData()
    form.append('foo', 'bar')
    form.append('bar', 'baz')

    const body = toFetchBody(form, headers)

    expect(body).toBe(form)
    expect([...headers]).toEqual([
      ['x-custom-header', 'custom-value'],
    ])
  })

  it('url-search-params', async () => {
    const headers = new Headers(baseHeaders)
    const query = new URLSearchParams('foo=bar&bar=baz')

    const body = toFetchBody(query, headers)

    expect(body).toBe(query)
    expect([...headers]).toEqual([
      ['x-custom-header', 'custom-value'],
    ])
  })

  it('blob', () => {
    const headers = new Headers(baseHeaders)
    const blob = new Blob(['foo'], { type: 'application/pdf' })

    const body = toFetchBody(blob, headers)

    expect(body).toBe(blob)
    expect([...headers]).toEqual([
      ['content-disposition', 'inline; filename="blob"'],
      ['content-length', '3'],
      ['content-type', 'application/pdf'],
      ['x-custom-header', 'custom-value'],
    ])
  })

  it('file', () => {
    const headers = new Headers(baseHeaders)
    const blob = new File(['foo'], 'foo.pdf', { type: 'application/pdf' })

    const body = toFetchBody(blob, headers)

    expect(body).toBe(blob)
    expect([...headers]).toEqual([
      ['content-disposition', 'inline; filename="foo.pdf"'],
      ['content-length', '3'],
      ['content-type', 'application/pdf'],
      ['x-custom-header', 'custom-value'],
    ])
  })

  it('async generator', async () => {
    async function* gen() {
      yield 123
      return 456
    }

    const headers = new Headers(baseHeaders)
    const body = toFetchBody(gen(), headers)

    expect(body).toBeInstanceOf(ReadableStream)
    expect([...headers]).toEqual([
      ['cache-control', 'no-cache'],
      ['connection', 'keep-alive'],
      ['content-type', 'text/event-stream'],
      ['x-custom-header', 'custom-value'],
    ])

    const reader = (body as ReadableStream).pipeThrough(new TextDecoderStream()).getReader()

    expect(await reader.read()).toEqual({ done: false, value: 'event: message\ndata: 123\n\n' })
    expect(await reader.read()).toEqual({ done: false, value: 'event: done\ndata: 456\n\n' })
  })
})
