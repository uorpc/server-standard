import type { StandardBody } from '@orpc/server-standard'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { Buffer } from 'node:buffer'
import { Readable } from 'node:stream'
import request from 'supertest'
import { toNodeHttpBody, toStandardBody } from './body'

describe('toStandardBody', () => {
  it('undefined', async () => {
    let standardBody: StandardBody = {} as any

    await request(async (req: IncomingMessage, res: ServerResponse) => {
      standardBody = await toStandardBody(req)
      res.end()
    }).get('/')

    expect(standardBody).toBe(undefined)

    await request(async (req: IncomingMessage, res: ServerResponse) => {
      standardBody = await toStandardBody(req)
      res.end()
    }).head('/')

    expect(standardBody).toBe(undefined)

    await request(async (req: IncomingMessage, res: ServerResponse) => {
      standardBody = await toStandardBody(req)
      res.end()
    }).post('/')
  })

  it('json', async () => {
    let standardBody: StandardBody = {} as any

    await request(async (req: IncomingMessage, res: ServerResponse) => {
      standardBody = await toStandardBody(req)
      res.end()
    }).post('/').send({ foo: 'bar' })

    expect(standardBody).toEqual({ foo: 'bar' })
  })

  it('json but empty body', async () => {
    let standardBody: StandardBody = {} as any

    await request(async (req: IncomingMessage, res: ServerResponse) => {
      standardBody = await toStandardBody(req)
      res.end()
    }).post('/').type('application/json').send('')

    expect(standardBody).toEqual(undefined)
  })

  it('text', async () => {
    let standardBody: StandardBody = {} as any

    await request(async (req: IncomingMessage, res: ServerResponse) => {
      standardBody = await toStandardBody(req)
      res.end()
    })
      .delete('/')
      .type('text/plain')
      .send('foo')

    expect(standardBody).toBe('foo')
  })

  it('form-data', async () => {
    let standardBody: any

    await request(async (req: IncomingMessage, res: ServerResponse) => {
      standardBody = await toStandardBody(req)
      res.end()
    })
      .delete('/')
      .field('foo', 'bar')
      .field('bar', 'baz')

    expect(standardBody).toBeInstanceOf(FormData)
    expect(standardBody.get('foo')).toBe('bar')
    expect(standardBody.get('bar')).toBe('baz')
  })

  it('url-search-params', async () => {
    let standardBody: any

    await request(async (req: IncomingMessage, res: ServerResponse) => {
      standardBody = await toStandardBody(req)
      res.end()
    })
      .delete('/')
      .send('foo=bar&bar=baz')

    expect(standardBody).toEqual(new URLSearchParams('foo=bar&bar=baz'))
  })

  it('blob', async () => {
    let standardBody: any

    await request(async (req: IncomingMessage, res: ServerResponse) => {
      standardBody = await toStandardBody(req)
      res.end()
    })
      .delete('/')
      .type('application/pdf')
      .send(Buffer.from('foo'))

    expect(standardBody).toBeInstanceOf(File)
    expect(standardBody.name).toBe('blob')
    expect(standardBody.type).toBe('application/pdf')
    expect(await standardBody.text()).toBe('foo')
  })

  it('file', async () => {
    let standardBody: any

    await request(async (req: IncomingMessage, res: ServerResponse) => {
      standardBody = await toStandardBody(req)
      res.end()
    })
      .delete('/')
      .type('application/pdf')
      .set('content-disposition', 'attachment; filename="foo.pdf"')
      .send(Buffer.from('foo'))

    expect(standardBody).toBeInstanceOf(File)
    expect(standardBody.name).toBe('foo.pdf')
    expect(standardBody.type).toBe('application/pdf')
    expect(await standardBody.text()).toBe('foo')
  })
})

describe('toNodeHttpBody', () => {
  const baseHeaders = {
    'content-type': 'application/json',
    'content-disposition': 'attachment; filename="foo.pdf"',
    'x-custom-header': 'custom-value',
  }

  it('undefined', () => {
    const headers = { ...baseHeaders }
    const body = toNodeHttpBody(undefined, headers)

    expect(body).toBe(undefined)
    expect(headers).toEqual({
      'x-custom-header': 'custom-value',
    })
  })

  it('json', () => {
    const headers = { ...baseHeaders }
    const body = toNodeHttpBody({ foo: 'bar' }, headers)

    expect(body).toBe('{"foo":"bar"}')
    expect(headers).toEqual({
      'content-type': 'application/json',
      'x-custom-header': 'custom-value',
    })
  })

  it('form-data', async () => {
    const headers = { ...baseHeaders }
    const form = new FormData()
    form.append('foo', 'bar')
    form.append('bar', 'baz')

    const body = toNodeHttpBody(form, headers)

    expect(body).toBeInstanceOf(Readable)
    expect(headers).toEqual({
      'x-custom-header': 'custom-value',
      'content-type': expect.stringMatching(/multipart\/form-data; .+/),
    })

    const response = new Response(body, {
      headers,
    })
    const resForm = await response.formData()

    expect(resForm.get('foo')).toBe('bar')
    expect(resForm.get('bar')).toBe('baz')
  })

  it('url-search-params', async () => {
    const headers = { ...baseHeaders }
    const query = new URLSearchParams('foo=bar&bar=baz')

    const body = toNodeHttpBody(query, headers)

    expect(body).toBe('foo=bar&bar=baz')
    expect(headers).toEqual({
      'x-custom-header': 'custom-value',
      'content-type': 'application/x-www-form-urlencoded',
    })
  })

  it('blob', async () => {
    const headers = { ...baseHeaders }
    const blob = new Blob(['foo'], { type: 'application/pdf' })

    const body = toNodeHttpBody(blob, headers)

    expect(body).toBeInstanceOf(Readable)
    expect(headers).toEqual({
      'content-disposition': 'inline; filename="blob"',
      'content-length': '3',
      'content-type': 'application/pdf',
      'x-custom-header': 'custom-value',
    })

    const response = new Response(body, {
      headers,
    })
    const resBlob = await response.blob()

    expect(resBlob.type).toBe('application/pdf')
    expect(await resBlob.text()).toBe('foo')
  })

  it('file', async () => {
    const headers = { ...baseHeaders }
    const blob = new File(['foo'], 'foo.pdf', { type: 'application/pdf' })

    const body = toNodeHttpBody(blob, headers)

    expect(body).instanceOf(Readable)
    expect(headers).toEqual({
      'content-disposition': 'inline; filename="foo.pdf"',
      'content-length': '3',
      'content-type': 'application/pdf',
      'x-custom-header': 'custom-value',
    })

    const response = new Response(body, {
      headers,
    })
    const resBlob = await response.blob()

    expect(resBlob.type).toBe('application/pdf')
    expect(await resBlob.text()).toBe('foo')
  })
})
