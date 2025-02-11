import type { StandardBody } from '@orpc/server-standard'
import { contentDisposition, parseContentDisposition } from '@orpc/server-standard'

export async function toStandardBody(re: Request | Response): Promise<StandardBody> {
  if (!re.body) {
    return undefined
  }

  const contentDisposition = re.headers.get('content-disposition')

  if (contentDisposition) {
    const fileName = parseContentDisposition(contentDisposition).parameters.filename

    if (typeof fileName === 'string') {
      const blob = await re.blob()
      return new File([blob], fileName, {
        type: blob.type,
      })
    }
  }

  const contentType = re.headers.get('content-type')

  if (!contentType || contentType.startsWith('application/json')) {
    const text = await re.text()

    if (!text) {
      return undefined
    }

    return JSON.parse(text)
  }

  if (contentType.startsWith('multipart/form-data')) {
    return await re.formData()
  }

  if (contentType.startsWith('application/x-www-form-urlencoded')) {
    return new URLSearchParams(await re.text())
  }

  if (contentType.startsWith('text/')) {
    return await re.text()
  }

  const blob = await re.blob()
  return new File([blob], 'blob', {
    type: blob.type,
  })
}

/**
 * @param body
 * @param headers - The headers can be changed by the function and effects on the original headers.
 */
export function toFetchBody(body: StandardBody, headers: Headers): string | Blob | FormData | URLSearchParams | undefined {
  headers.delete('content-type')
  headers.delete('content-disposition')

  if (body === undefined) {
    return undefined
  }

  if (body instanceof Blob) {
    headers.set('content-type', body.type)
    headers.set('content-length', body.size.toString())
    headers.set(
      'content-disposition',
      contentDisposition(body instanceof File ? body.name : 'blob', { type: 'inline' }),
    )

    return body
  }

  if (body instanceof FormData) {
    return body
  }

  if (body instanceof URLSearchParams) {
    return body
  }

  headers.set('content-type', 'application/json')

  return JSON.stringify(body)
}
