import type { StandardRequest } from '@orpc/server-standard'
import { once } from '@orpc/server-standard'
import { toStandardBody } from './body'
import { toStandardHeaders } from './headers'

export function toStandardRequest(request: Request): StandardRequest {
  return {
    raw: { request },
    url: new URL(request.url),
    signal: request.signal,
    method: request.method,
    body: once(() => toStandardBody(request)),
    get headers() {
      const headers = toStandardHeaders(request.headers)
      Object.defineProperty(this, 'headers', { value: headers, writable: true })
      return headers
    },
    set headers(value) {
      Object.defineProperty(this, 'headers', { value, writable: true })
    },
  }
}
