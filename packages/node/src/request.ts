import type { StandardRequest } from '@orpc/server-standard'
import type { NodeHttpRequest, NodeHttpResponse } from './types'
import { once } from '@orpc/server-standard'
import { toStandardBody } from './body'
import { toAbortSignal } from './signal'

export function toStandardRequest(
  req: NodeHttpRequest,
  res: NodeHttpResponse,
): StandardRequest {
  const method = req.method ?? 'GET'

  const protocol = ('encrypted' in req.socket && req.socket.encrypted ? 'https:' : 'http:')
  const host = req.headers.host ?? 'localhost'
  const url = new URL(req.originalUrl ?? req.url ?? '/', `${protocol}//${host}`)

  return {
    raw: { request: req, response: res },
    method,
    url,
    headers: req.headers,
    body: once(() => toStandardBody(req)),
    signal: toAbortSignal(res),
  }
}
