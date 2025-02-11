import type { StandardBody, StandardHeaders } from '@orpc/server-standard'
import type { Buffer } from 'node:buffer'
import type { NodeHttpRequest } from './types'
import { Readable } from 'node:stream'
import { contentDisposition, parseContentDisposition, parseEmptyableJSON } from '@orpc/server-standard'

export async function toStandardBody(req: NodeHttpRequest): Promise<StandardBody> {
  const method = req.method ?? 'GET'
  if (method === 'GET' || method === 'HEAD') {
    return undefined
  }

  const contentDisposition = req.headers['content-disposition']
  const contentType = req.headers['content-type']

  if (contentDisposition) {
    const fileName = parseContentDisposition(contentDisposition).parameters.filename

    if (typeof fileName === 'string') {
      return _streamToFile(req, fileName, contentType ?? '')
    }
  }

  if (!contentType || contentType.startsWith('application/json')) {
    const text = await _streamToString(req)
    return parseEmptyableJSON(text)
  }

  if (contentType.startsWith('multipart/form-data')) {
    return _streamToFormData(req, contentType)
  }

  if (contentType.startsWith('application/x-www-form-urlencoded')) {
    const text = await _streamToString(req)
    return new URLSearchParams(text)
  }

  if (contentType.startsWith('text/')) {
    return _streamToString(req)
  }

  return _streamToFile(req, 'blob', contentType)
}

/**
 * @param body
 * @param headers - The headers can be changed by the function and effects on the original headers.
 */
export function toNodeHttpBody(body: StandardBody, headers: StandardHeaders): Readable | undefined | string {
  delete headers['content-type']
  delete headers['content-disposition']

  if (body === undefined) {
    return
  }

  if (body instanceof Blob) {
    headers['content-type'] = body.type
    headers['content-length'] = body.size.toString()
    headers['content-disposition'] = contentDisposition(
      body instanceof File ? body.name : 'blob',
      { type: 'inline' },
    )

    return Readable.fromWeb(body.stream())
  }

  if (body instanceof FormData) {
    const response = new Response(body)
    headers['content-type'] = response.headers.get('content-type')!

    return Readable.fromWeb(response.body!)
  }

  if (body instanceof URLSearchParams) {
    headers['content-type'] = 'application/x-www-form-urlencoded'

    return body.toString()
  }

  headers['content-type'] = 'application/json'

  return JSON.stringify(body)
}

function _streamToFormData(stream: Readable, contentType: string): Promise<FormData> {
  const response = new Response(stream, {
    headers: {
      'content-type': contentType,
    },
  })

  return response.formData()
}

async function _streamToString(stream: Readable): Promise<string> {
  let string = ''

  for await (const chunk of stream) {
    string += chunk.toString()
  }

  return string
}

async function _streamToFile(stream: Readable, fileName: string, contentType: string): Promise<File> {
  const chunks: Buffer[] = []

  for await (const chunk of stream) {
    chunks.push(chunk)
  }

  return new File(chunks, fileName, { type: contentType })
}
