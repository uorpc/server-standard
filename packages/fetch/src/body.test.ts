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
})
